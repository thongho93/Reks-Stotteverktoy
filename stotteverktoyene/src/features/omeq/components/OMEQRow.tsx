import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import { MedicationInput } from "./MedicationInput";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";
import { calculateOMEQ } from "../lib/calc";
import { isParenteralForm, parenteralDoseUnit } from "../lib/doseUnit";

export interface OMEQRowValue {
  medicationText: string;
  doseText: string;
  confirmedHighDose?: boolean;
}

interface Props {
  value: OMEQRowValue;
  onChange: (next: OMEQRowValue) => void;
  autoFocusMedicationInput?: boolean;
  autoPasteNumericClipboard?: boolean;
  onRemove?: () => void;
}

export const OMEQRow = ({
  value,
  onChange,
  autoFocusMedicationInput,
  autoPasteNumericClipboard,
  onRemove,
}: Props) => {
  const productIndex = useMemo(() => buildProductIndex(), []);

  const doseInputRef = useRef<HTMLInputElement | null>(null);
  const prevSelectedProductKeyRef = useRef<string>("");
  const autoVnrFocusRequestedRef = useRef(false);

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

  const substanceText = matchedOpioid?.substance ?? "";

  const formLower = parsed.product?.form?.toLowerCase() ?? "";
  const isPatch = formLower === "depotplaster";
  // Injeksjon/infusjon: brukeren skriver inn legens dosering i µg eller mg (følger styrken),
  // og beregningen regner µg om til mg.
  const isParenteral = isParenteralForm(formLower);
  const isLiquidForm =
    formLower.includes("mikstur") || formLower.includes("oral") || formLower.includes("dråpe");

  // Doseenheten følger styrken, ikke formuleringen. "1 mg/ml" er en konsentrasjon
  // og doseres i ml, mens "10 mg" på en mikstur er en endose som doseres i antall
  // beholdere (Metadon Nordic Drugs). Da formuleringen alene styrte dette, ba
  // feltet om ml for endoser – og et innskrevet volum ga da for høy OMEQ.
  // Uten kjent styrke faller vi tilbake på formuleringen.
  const dosesInMl = parsed.strength ? parsed.strength.perMl === true : isLiquidForm;

  // Hva brukeren skal skrive i dosefeltet.
  const doseUnitNoun = dosesInMl ? "ml" : isLiquidForm ? "endoser" : "tablett/kapsel/dose";

  // Kort enhet som vises i dosefeltet, tilpasset formuleringen:
  // tbl (alle tabletter), kps (kapsler), ml (mikstur/konsentrasjon), supp (stikkpiller),
  // dose (dråper, nesespray, endoser og injeksjoner/infusjoner), ellers stk.
  const doseUnit = (() => {
    if (isParenteral) return parenteralDoseUnit(parsed.strength);
    if (formLower.includes("dråpe")) return "dose";
    if (dosesInMl) return "ml";
    if (formLower.includes("kapsel")) return "kps";
    if (formLower.includes("tablett")) return "tbl";
    if (formLower.includes("stikkpille")) return "supp";
    if (
      formLower.includes("nesespray") ||
      formLower.includes("mikstur") ||
      formLower.includes("injeks") ||
      formLower.includes("infus")
    ) {
      return "dose";
    }
    return "stk";
  })();

  useEffect(() => {
    // When the user selects a valid product (or it becomes uniquely identified),
    // automatically move focus to "Antall per døgn" for faster input.
    if (isPatch) return;

    const key = parsed.product
      ? `${parsed.product.atcCode ?? ""}|${parsed.product.name ?? ""}|${parsed.product.form ?? ""}`
      : "";

    // Only focus when we transition to a new selected product
    if (!key || key === prevSelectedProductKeyRef.current) return;

    prevSelectedProductKeyRef.current = key;

    // Wait a tick so MUI input is mounted/updated before focusing
    requestAnimationFrame(() => {
      doseInputRef.current?.focus();
      doseInputRef.current?.select?.();
    });
  }, [parsed.product, isPatch]);

  const requestDoseFocusFromAutoVnr = useCallback(() => {
    autoVnrFocusRequestedRef.current = true;
  }, []);

  useEffect(() => {
    if (!autoVnrFocusRequestedRef.current) return;
    if (!parsed.product) return;

    // Request is consumed once product is resolved from the pasted varenummer.
    autoVnrFocusRequestedRef.current = false;
    if (isPatch) return;

    requestAnimationFrame(() => {
      doseInputRef.current?.focus();
      doseInputRef.current?.select?.();
    });
  }, [parsed.product, isPatch]);

  const [isDoseFocused, setIsDoseFocused] = useState(false);
  const [showOverLimitDialog, setShowOverLimitDialog] = useState(false);
  const MAX_UNITS_PER_DAY = 20;

  const dailyDose = useMemo(() => {
    const raw = value.doseText.trim();
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [value.doseText]);

  const doseOverLimit = useMemo(() => {
    if (isPatch || isParenteral) return false;
    if (dailyDose == null) return false;
    return dailyDose > MAX_UNITS_PER_DAY;
  }, [isPatch, isParenteral, dailyDose]);

  const isOverLimitConfirmed = doseOverLimit && !!value.confirmedHighDose;
  const isBlockedByOverLimit = doseOverLimit && !isOverLimitConfirmed;

  useEffect(() => {
    if (!isBlockedByOverLimit) return;
    const id = setTimeout(() => setShowOverLimitDialog(true), 500);
    return () => clearTimeout(id);
  }, [isBlockedByOverLimit, value.doseText]);

  // Use this value everywhere in calculations so we stop computing when the input is clearly wrong.
  const effectiveDailyDose = useMemo(() => {
    if (isBlockedByOverLimit) return null;
    return dailyDose;
  }, [isBlockedByOverLimit, dailyDose]);

  const strengthMg = useMemo(() => {
    const s = parsed.strength;
    if (!s) return null;
    const v = Number(String(s.value).replace(",", "."));
    if (!Number.isFinite(v)) return null;

    const unit = String(s.unit).toLowerCase();
    if (unit === "mg") return v;
    if (unit === "g") return v * 1000;
    if (unit === "µg" || unit === "ug" || unit === "mcg") return v / 1000;
    return null;
  }, [parsed.strength]);

  const strengthForCalc = useMemo(() => {
    if (!parsed.strength) return null;

    // For depotplaster the calculator typically expects µg/mcg per time (perHour=true).
    // Do NOT normalize to mg here.
    if (isPatch) {
      const unitLower = String(parsed.strength.unit).toLowerCase();
      const normalizedUnit = unitLower === "ug" ? "µg" : parsed.strength.unit;

      return {
        value: parsed.strength.value,
        unit: normalizedUnit,
        perHour: parsed.strength.perHour,
      };
    }

    // Parenteral: kalkulatoren trenger kun enheten (µg eller mg) for å regne dosen om til mg.
    if (isParenteral) {
      return {
        value: parsed.strength.value,
        unit: parenteralDoseUnit(parsed.strength),
        perHour: parsed.strength.perHour,
      };
    }

    if (strengthMg == null) return null;

    // For tablets/capsules etc. ensure calculator receives mg
    return {
      value: strengthMg,
      unit: "mg",
      perHour: parsed.strength.perHour,
    };
  }, [parsed.strength, strengthMg, isPatch, isParenteral]);

  const result = useMemo(() => {
    return calculateOMEQ({
      product: parsed.product ?? null,
      dailyDose: isPatch ? null : effectiveDailyDose,
      strength: strengthForCalc,
    });
  }, [parsed.product, strengthForCalc, effectiveDailyDose, isPatch]);

  const omeqText = useMemo(() => {
    if (result.omeq == null) return "";
    const rounded = Math.round((result.omeq + Number.EPSILON) * 100) / 100;
    return String(rounded);
  }, [result.omeq]);

  const statusText = useMemo(() => {
    if (!parsed.product) return "";

    switch (result.reason) {
      case "missing-strength":
        return isPatch
          ? "Fant ikke plasterstyrke (µg/time) for preparatet."
          : "Fant ikke styrke (mg) for preparatet.";
      case "unsupported-form":
      case "unsupported-codeine":
      case "unsupported-methadone":
      case "unsupported-oxycodone":
      case "unsupported-hydromorphone-parenteral":
      case "unsupported-ketobemidone":
      case "unsupported-morphine-drops-or-parenteral":
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
  }, [parsed.product, result.reason, isPatch, doseOverLimit]);

  // Kort nok til å stå under dosefeltet uten å brytes over mange linjer.
  const doseHintText = isParenteral
    ? `Dosering i ${doseUnit} per døgn`
    : `Antall ${doseUnit}, ikke mg`;
  const doseMgShortWarning = `Ser ut som mg. Skriv antall ${doseUnit}.`;

  const mgWarningText = `Det ser ut som du har skrevet mg. Skriv antall ${doseUnitNoun} per døgn.`;

  const infoText = useMemo(() => {
    if (!matchedOpioid?.helpText) return "";

    // Bruk helpText også for depotplaster
    if (isPatch) return matchedOpioid.helpText;

    // Vis kun når produktet er gjenkjent og raden ellers er brukbar
    if (result.reason === "ok" || result.reason === "missing-input") return matchedOpioid.helpText;

    return "";
  }, [isPatch, matchedOpioid?.helpText, result.reason]);

  const doseLooksLikeMg = useMemo(() => {
    return isBlockedByOverLimit;
  }, [isBlockedByOverLimit]);

  const doseHelperText = useMemo(() => {
    if (isPatch) return "";

    // Advarselen blir stående til antallet er rettet; veiledningen vises kun mens feltet er aktivt.
    if (isBlockedByOverLimit) return doseMgShortWarning;
    if (isDoseFocused) return doseHintText;

    // "Tilsvarer X mg per døgn" vises fast i linjen under raden (hintText).
    return "";
  }, [isPatch, doseHintText, doseMgShortWarning, isDoseFocused, isBlockedByOverLimit]);

  // Faktor vises som dempet tekst under raden i stedet for eget felt.
  const factorText = useMemo(() => {
    if (!matchedOpioid) return "";
    if (matchedOpioid.id === "hydromorfon-parenteral") return "";
    if (
      result.reason === "unsupported-ketobemidone" ||
      result.reason === "unsupported-morphine-drops-or-parenteral"
    ) {
      return "";
    }
    return String(matchedOpioid.omeqFactor).replace(".", ",");
  }, [matchedOpioid, result.reason]);

  const impliedMgText = useMemo(() => {
    if (isPatch || isBlockedByOverLimit) return "";
    if (isParenteral) {
      // Dosen er allerede i mg eller µg; vis kun omregningen når den oppgis i µg.
      if (dailyDose == null || doseUnit !== "µg") return "";
      const mg = Math.round((dailyDose / 1000 + Number.EPSILON) * 10000) / 10000;
      return `tilsvarer ${String(mg).replace(".", ",")} mg per døgn`;
    }
    if (dailyDose == null || strengthMg == null) return "";
    const total = Math.round((dailyDose * strengthMg + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(total)) return "";
    return `tilsvarer ${String(total).replace(".", ",")} mg per døgn`;
  }, [isPatch, isParenteral, doseUnit, isBlockedByOverLimit, dailyDose, strengthMg]);

  const hintText = useMemo(
    () =>
      [substanceText, factorText ? `faktor ${factorText}` : "", impliedMgText]
        .filter(Boolean)
        .join(" · "),
    [substanceText, factorText, impliedMgText],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: "14px",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2.5 }}>
        <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
          <MedicationInput
            value={value.medicationText}
            onChange={(text) => onChange({ ...value, medicationText: text })}
            autoFocus={autoFocusMedicationInput}
            autoPasteNumericClipboard={autoPasteNumericClipboard}
            onAutoPastedVnr={requestDoseFocusFromAutoVnr}
          />
        </Box>

        {!isPatch && (
          <Box sx={{ flex: "0 0 140px" }}>
              <TextField
                label="Antall per døgn"
                inputRef={doseInputRef}
                value={value.doseText}
                onChange={(e) => {
                  onChange({ ...value, doseText: e.target.value, confirmedHighDose: false });
                }}
                inputProps={{
                  inputMode: "decimal",
                  "aria-label": "Antall per døgn",
                  style: { textAlign: "center", fontWeight: 600 },
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={doseLooksLikeMg}
                // Veiledningen står rett under feltet (ikke som svevende tooltip), så det
                // er tydelig at den hører til dette feltet.
                helperText={doseHelperText || undefined}
                FormHelperTextProps={{ sx: { mx: 0.5, mt: 0.5, lineHeight: 1.35 } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 48,
                    "&:hover fieldset, &.Mui-focused fieldset": {
                      borderColor: doseLooksLikeMg ? "error.main" : "primary.main",
                    },
                  },
                }}
                onFocus={() => setIsDoseFocused(true)}
                onBlur={() => {
                  setIsDoseFocused(false);
                  if (isBlockedByOverLimit) setShowOverLimitDialog(true);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {doseLooksLikeMg && (
                          <Tooltip title={mgWarningText} placement="top" arrow>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                color: "warning.main",
                                cursor: "help",
                              }}
                            >
                              <WarningAmberOutlinedIcon fontSize="small" />
                            </Box>
                          </Tooltip>
                        )}
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", whiteSpace: "nowrap", fontSize: "0.8125rem" }}
                        >
                          {doseUnit}/døgn
                        </Box>
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
        )}

        <Box sx={{ flex: "0 0 120px" }}>
          <TextField
            label="OMEQ"
            value={omeqText ? omeqText.replace(".", ",") : ""}
            placeholder="–"
            fullWidth
            InputLabelProps={{ shrink: true }}
            InputProps={{ readOnly: true }}
            inputProps={{
              "aria-live": "polite",
              tabIndex: -1,
              style: { textAlign: "center", fontWeight: 700, fontSize: "1.125rem" },
            }}
            sx={(theme) => ({
              "& .MuiOutlinedInput-root": {
                height: 48,
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                cursor: "default",
                "& fieldset, &:hover fieldset, &.Mui-focused fieldset": {
                  borderColor: theme.palette.divider,
                },
              },
            })}
          />
        </Box>

        {onRemove && (
          <Tooltip title="Fjern preparat" placement="top">
            <IconButton
              aria-label="Fjern preparat"
              onClick={onRemove}
              sx={(theme) => ({
                mt: "4px",
                width: 40,
                height: 40,
                color: "text.secondary",
                transition: "color .15s ease, background-color .15s ease",
                // Rosa/rødlig ved hover for å signalisere at knappen sletter raden.
                "&:hover, &:focus-visible": {
                  color: theme.palette.error.main,
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
              })}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {(!!hintText || !!infoText) && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 1.25,
            pt: 2,
            pl: 0.25,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          {!!hintText && (
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {hintText}
            </Typography>
          )}

          {!!infoText && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                width: "fit-content",
                maxWidth: "100%",
                px: 1.75,
                py: 0.75,
                borderRadius: 2,
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(96, 165, 250, 0.18)"
                    : "rgba(25, 118, 210, 0.08)",
                color: "text.primary",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                border: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {infoText}
            </Alert>
          )}
        </Box>
      )}

      {!!statusText && (
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      )}

      <Dialog
        open={showOverLimitDialog}
        onClose={() => setShowOverLimitDialog(false)}
        aria-labelledby="over-limit-dialog-title"
      >
        <DialogTitle id="over-limit-dialog-title">Høyt antall registrert</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Du har lagt inn <strong>{dailyDose} {doseUnit}/døgn</strong>.{" "}
            {`Det ser ut som du har skrevet mg. Skriv antall ${doseUnitNoun} per døgn, ikke mg.`}
            <br />
            <br />
            Vil du likevel bekrefte at dette er riktig antall?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOverLimitDialog(false)} color="inherit">
            Endre antall
          </Button>
          <Button
            onClick={() => {
              onChange({ ...value, confirmedHighDose: true });
              setShowOverLimitDialog(false);
            }}
            color="primary"
            variant="contained"
          >
            Bekreft {dailyDose} {doseUnit}/døgn
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
