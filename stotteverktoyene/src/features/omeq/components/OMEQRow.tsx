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
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import styles from "../../../styles/app.module.css";

import { MedicationInput } from "./MedicationInput";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";
import { calculateOMEQ } from "../lib/calc";

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
}

export const OMEQRow = ({
  value,
  onChange,
  autoFocusMedicationInput,
  autoPasteNumericClipboard,
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
  const isMixture =
    formLower.includes("mikstur") || formLower.includes("oral") || formLower.includes("dråpe");

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
    if (isPatch) return false;
    if (dailyDose == null) return false;
    return dailyDose > MAX_UNITS_PER_DAY;
  }, [isPatch, dailyDose]);

  const isOverLimitConfirmed = doseOverLimit && !!value.confirmedHighDose;
  const isBlockedByOverLimit = doseOverLimit && !isOverLimitConfirmed;

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

    if (strengthMg == null) return null;

    // For tablets/capsules etc. ensure calculator receives mg
    return {
      value: strengthMg,
      unit: "mg",
      perHour: parsed.strength.perHour,
    };
  }, [parsed.strength, strengthMg, isPatch]);

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

  const mlHintText = `Skriv antall ml per døgn.`;

  const mgWarningText = isMixture
    ? `Det ser ut som du har skrevet mg. Skriv antall ml per døgn.`
    : `Det ser ut som du har skrevet mg. Skriv antall tablett/kapsel/dose per døgn.`;

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

    const raw = value.doseText.trim();

    // Only show helper text when the dose field is active (focused) or the user has typed something.
    if (!isDoseFocused && !raw) return "";

    // While focused but empty: show a short guidance.
    if (!raw)
      return isMixture ? `${mlHintText}` : "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";

    if (isBlockedByOverLimit) return mgWarningText;

    // When user has typed a value but we can't compute mg yet.
    if (dailyDose == null || strengthMg == null)
      return isMixture ? `${mlHintText}` : "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";
    const impliedTotalMg = dailyDose * strengthMg;
    const roundedTotal = Math.round((impliedTotalMg + Number.EPSILON) * 100) / 100;
    const substance = substanceText || "virkestoff";

    if (!Number.isFinite(roundedTotal))
      return isMixture ? `${mlHintText}` : "Skriv antall tablett/kapsel/dose per døgn (ikke mg).";

    return `Tilsvarer ${roundedTotal} mg ${substance} per døgn.`;
  }, [
    isPatch,
    isMixture,
    value.doseText,
    isDoseFocused,
    dailyDose,
    strengthMg,
    substanceText,
    isBlockedByOverLimit,
  ]);

  return (
    <Box className={styles.omeqRow}>
      <Box sx={{ width: "100%" }}>
        <MedicationInput
          value={value.medicationText}
          onChange={(text) => onChange({ ...value, medicationText: text })}
          autoFocus={autoFocusMedicationInput}
          autoPasteNumericClipboard={autoPasteNumericClipboard}
          onAutoPastedVnr={requestDoseFocusFromAutoVnr}
        />
      </Box>

      <Box className={styles.ratioBox}>
        <TextField
          value={
            matchedOpioid &&
            matchedOpioid.id !== "hydromorfon-parenteral" &&
            result.reason !== "unsupported-ketobemidone" &&
            result.reason !== "unsupported-morphine-drops-or-parenteral"
              ? String(matchedOpioid.omeqFactor)
              : ""
          }
          label="Faktor"
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={{ readOnly: true }}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "primary.main",
                height: "125%",
              },
              "&:hover fieldset": {
                borderColor: "primary.main",
              },
              "&.Mui-focused fieldset": {
                borderColor: "primary.main",
              },
              "& .MuiOutlinedInput-input": {
                textAlign: "center",
              },
            },
          }}
        />
      </Box>

      {isPatch ? (
        <Box sx={{ width: "100%" }} aria-hidden />
      ) : (
        <Tooltip
          title={doseHelperText}
          open={!!doseHelperText && isDoseFocused}
          placement="top-start"
          arrow
          PopperProps={{
            modifiers: [
              {
                name: "offset",
                options: { offset: [0, 8] },
              },
            ],
          }}
          componentsProps={{
            tooltip: {
              sx: (theme) => ({
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(230, 237, 250, 0.95)"
                    : "rgba(97, 97, 97, 1)",
                color: theme.palette.mode === "dark" ? "#0f1622" : "#fff",
              }),
            },
            arrow: {
              sx: (theme) => ({
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(230, 237, 250, 0.95)"
                    : "rgba(97, 97, 97, 1)",
              }),
            },
          }}
          disableFocusListener
          disableHoverListener
          disableTouchListener
        >
          <Box sx={{ width: "100%" }}>
            <TextField
              label={isMixture ? "Antall ml per døgn" : "Antall per døgn"}
              inputRef={doseInputRef}
              value={value.doseText}
              onChange={(e) => {
                onChange({ ...value, doseText: e.target.value, confirmedHighDose: false });
              }}
              inputProps={{
                inputMode: "decimal",
                "aria-label": "Antall per døgn",
                style: { textAlign: "center" },
              }}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={doseLooksLikeMg}
              // Keep helperText empty to avoid truncation; tooltip shows the full guidance when active.
              helperText={""}
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
                      <Box component="span" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        {isMixture ? "ml/døgn" : "stk/døgn"}
                      </Box>
                    </Box>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "primary.main",
                    height: "125%",
                  },
                  "&:hover fieldset": {
                    borderColor: "primary.main",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.main",
                  },
                  "& .MuiOutlinedInput-input": {
                    paddingRight: "6px",
                    textAlign: "center",
                  },
                },
              }}
            />
          </Box>
        </Tooltip>
      )}

      <TextField
        label="OMEQ"
        value={omeqText}
        size="small"
        InputLabelProps={{ shrink: true }}
        InputProps={{ readOnly: true }}
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "primary.main",
              height: "125%",
            },
            "&:hover fieldset": {
              borderColor: "primary.main",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.main",
            },
            "& .MuiOutlinedInput-input": {
              textAlign: "center",
            },
          },
        }}
      />

      {(!!substanceText || !!infoText) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
            flexWrap: "nowrap",
          }}
        >
          {!!substanceText && (
            <Typography variant="overline" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              Virkestoff: {substanceText}
            </Typography>
          )}

          {!!infoText && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                width: "fit-content",
                maxWidth: "100%",
                px: 1,
                py: 0.35,
                borderRadius: 1.5,
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(96, 165, 250, 0.18)"
                    : "rgba(25, 118, 210, 0.08)",
                color: "text.primary",
                fontSize: "0.7rem",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
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
            Du har lagt inn <strong>{dailyDose} {isMixture ? "ml" : "stk"}/døgn</strong>.{" "}
            {isMixture
              ? "Det ser ut som du har skrevet mg. Skriv antall ml per døgn, ikke mg."
              : "Det ser ut som du har skrevet mg. Skriv antall tablett/kapsel/dose per døgn, ikke mg."}
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
            Bekreft {dailyDose} {isMixture ? "ml" : "stk"}/døgn
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
