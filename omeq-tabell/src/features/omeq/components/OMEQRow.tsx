import { useMemo } from "react";
import { Box, TextField, Typography } from "@mui/material";

import styles from "../../../styles/App.module.css";

import { MedicationInput } from "./MedicationInput";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";
import { calculateOMEQ } from "../lib/calc";

export interface OMEQRowValue {
  medicationText: string;
  doseText: string;
}

interface Props {
  value: OMEQRowValue;
  onChange: (next: OMEQRowValue) => void;
}

export const OMEQRow = ({ value, onChange }: Props) => {
  const productIndex = useMemo(() => buildProductIndex(), []);

  const parsed = useMemo(
    () => parseMedicationInput(value.medicationText, productIndex),
    [value.medicationText, productIndex]
  );

  const matchedOpioid = useMemo(() => {
    if (!parsed.product) return null;

    const route = formToRoute(parsed.product.form);
    if (!route) return null;

    return (
      OPIOIDS.find(
        (o) => o.atcCode.includes(parsed.product!.atcCode as any) && o.route.includes(route)
      ) ?? null
    );
  }, [parsed.product]);

  const isPatch = parsed.product?.form?.toLowerCase() === "depotplaster";

  const dailyDose = useMemo(() => {
    const raw = value.doseText.trim();
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [value.doseText]);

  const strengthMg = useMemo(() => {
    const s = parsed.strength;
    if (!s) return null;
    const v = Number(String(s.value).replace(",", "."));
    if (!Number.isFinite(v)) return null;

    const unit = String(s.unit).toLowerCase();
    if (unit === "mg") return v;
    if (unit === "g") return v * 1000;
    if (unit === "µg" || unit === "ug") return v / 1000;
    return null;
  }, [parsed.strength]);

  const totalMg = useMemo(() => {
    if (isPatch) return null;
    if (dailyDose == null || strengthMg == null) return null;
    return dailyDose * strengthMg;
  }, [isPatch, dailyDose, strengthMg]);

  const result = useMemo(() => {
    return calculateOMEQ({
      product: parsed.product ?? null,
      dailyDose: isPatch ? null : dailyDose,
      strength: parsed.strength ?? null,
    });
  }, [parsed.product, parsed.strength, dailyDose, isPatch]);

  const omeqText = useMemo(() => {
    if (result.omeq == null) return "";
    const rounded = Math.round((result.omeq + Number.EPSILON) * 100) / 100;
    return String(rounded);
  }, [result.omeq]);

  const statusText = useMemo(() => {
    if (!parsed.product) return "";

    switch (result.reason) {
      case "missing-input":
        return isPatch ? "" : "Fyll inn døgndose for å beregne OMEQ.";
      case "missing-strength":
        return isPatch
          ? "Fant ikke plasterstyrke (µg/time) for preparatet."
          : "Fant ikke styrke (mg) for preparatet.";
      case "unsupported-form":
      case "unsupported-codeine":
      case "unsupported-methadone":
      case "unsupported-oxycodone":
        return "Ikke støttet i enkel beregning enda.";
      case "no-route":
        return "Fant ikke administrasjonsvei for preparatet.";
      case "no-omeq-factor":
        return "Fant ikke OMEQ-faktor for valgt administrasjonsvei.";
      case "ok":
        return "";
      default:
        return "";
    }
  }, [parsed.product, result.reason, isPatch]);

  const totalText = useMemo(() => {
    if (totalMg == null) return "";
    return String(Math.round((totalMg + Number.EPSILON) * 100) / 100);
  }, [totalMg]);

  return (
    <Box className={styles.omeqRow}>
      <MedicationInput
        value={value.medicationText}
        onChange={(text) => onChange({ ...value, medicationText: text })}
      />

      <Box className={styles.ratioBox}>
        <TextField
          value={matchedOpioid ? String(matchedOpioid.omeqFactor) : ""}
          label="OMEQ-faktor"
          size="small"
          InputProps={{ readOnly: true }}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "primary.main",
              },
              "&:hover fieldset": {
                borderColor: "primary.main",
              },
              "&.Mui-focused fieldset": {
                borderColor: "primary.main",
              },
            },
          }}
        />
      </Box>

      <TextField
        label={isPatch ? "Ingen døgndose" : "Døgndose"}
        placeholder={isPatch ? "" : parsed.strength?.perHour ? "F.eks. 25" : "F.eks. 200"}
        value={isPatch ? "" : value.doseText}
        onChange={(e) => onChange({ ...value, doseText: e.target.value })}
        inputProps={{ inputMode: "decimal" }}
        fullWidth
        disabled={isPatch}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "primary.main",
            },
            "&:hover fieldset": {
              borderColor: "primary.main",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.main",
            },
          },
        }}
      />

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, visibility: totalMg != null ? "visible" : "hidden" }}
      >
        {totalMg != null ? `Total: ${totalText} mg` : "Total: 0 mg"}
      </Typography>

      <TextField
        label="OMEQ"
        value={omeqText}
        InputProps={{ readOnly: true }}
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "primary.main",
            },
            "&:hover fieldset": {
              borderColor: "primary.main",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.main",
            },
          },
        }}
      />

      {!!statusText && (
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      )}
    </Box>
  );
};
