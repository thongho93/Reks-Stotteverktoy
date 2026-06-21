import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ListItemIcon from "@mui/material/ListItemIcon";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { alpha, createTheme, useTheme, ThemeProvider } from "@mui/material/styles";

import styles from "../../../styles/app.module.css";
import { AccentSelection } from "../../../styles/AccentSelection";

import { OMEQRow, type OMEQRowValue } from "../components/OMEQRow";
import {
  buildProductIndex,
  parseMedicationInput,
  type ProductIndexItem,
} from "../lib/parseMedicationInput";
import { calculateOMEQ } from "../lib/calc";
import { OPIOIDS } from "../data/opioids";
import { formToRoute } from "../data/atcProducts";

type Row = OMEQRowValue & { id: string };
type OmeqPrefillState = {
  prefillRows?: Array<{ medicationText?: string; doseText?: string }>;
  prefill?: { medicationText?: string; doseText?: string };
};
const OMEQ_STANDARDTEKST_TITLE = "OMEQ overstiger vedtak";
const OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY = "standardtekster:omeqPrefill";

const stripProductNumberSuffix = (value: string) => value.replace(/\s*\(\d+\)\s*$/g, "").trim();
const normalizeMedicationIdentityText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();
const normalizeStrengthIdentity = (
  strength: ReturnType<typeof parseMedicationInput>["strength"],
): string | null => {
  if (!strength) return null;

  const numeric = Number(String(strength.value).replace(",", ".").trim());
  if (!Number.isFinite(numeric)) return null;

  const unitRaw = String(strength.unit).trim().toLowerCase();
  const unit = unitRaw === "ug" ? "µg" : unitRaw;
  const perHourSuffix = strength.perHour ? "/time" : "";
  return `${numeric}${unit}${perHourSuffix}`;
};
const resolveMedicationIdentity = (
  medicationText: string,
  productIndex: ProductIndexItem[],
): {
  substance: string | null;
  formulation: string | null;
  strength: string | null;
} => {
  const raw = medicationText.trim();
  if (!raw) {
    return {
      substance: null,
      formulation: null,
      strength: null,
    };
  }

  const parsed = parseMedicationInput(raw, productIndex);
  const formulation = parsed.product?.form ? normalizeMedicationIdentityText(parsed.product.form) : null;
  const route = parsed.product?.form ? formToRoute(parsed.product.form) : undefined;
  const substance = parsed.product && route
    ? normalizeMedicationIdentityText(
        OPIOIDS.find((o) => o.atcCode.includes(parsed.product!.atcCode) && o.route.includes(route))
          ?.substance ?? "",
      ) || null
    : null;
  const strength = normalizeStrengthIdentity(parsed.strength);

  return { substance, formulation, strength };
};
const isDuplicateMedicationEntry = (
  rows: Row[],
  rowId: string,
  medicationText: string,
  productIndex: ProductIndexItem[],
) => {
  const nextIdentity = resolveMedicationIdentity(medicationText, productIndex);
  if (!nextIdentity.substance || !nextIdentity.formulation || !nextIdentity.strength) return false;

  return rows.some((row) => {
    if (row.id === rowId) return false;
    if (!row.medicationText.trim()) return false;

    const existingIdentity = resolveMedicationIdentity(row.medicationText, productIndex);

    return (
      !!existingIdentity.substance &&
      !!existingIdentity.formulation &&
      !!existingIdentity.strength &&
      nextIdentity.substance === existingIdentity.substance &&
      nextIdentity.formulation === existingIdentity.formulation &&
      nextIdentity.strength === existingIdentity.strength
    );
  });
};

const makeRow = (): Row => ({
  id: crypto.randomUUID(),
  medicationText: "",
  doseText: "",
});

const normalizeVedtakText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d+[,.]0$/.test(trimmed)) {
    return trimmed.replace(/[,.]0$/, "");
  }
  return trimmed;
};

export default function OMEQPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<Row[]>([makeRow()]);
  const [vedtakOmeq, setVedtakOmeq] = useState<string>("");
  const [debouncedVedtakOmeq, setDebouncedVedtakOmeq] = useState<string>("");
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfoTable, setShowInfoTable] = useState(false);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const lastCopiedVedtakSummaryRef = useRef<string | null>(null);
  const [autoPasteNumericClipboard, setAutoPasteNumericClipboard] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("omeq.autoPasteNumericClipboard");
      return raw === "true";
    } catch {
      return false;
    }
  });
  const productIndex = useMemo(() => buildProductIndex(), []);

  const setRowById = useCallback(
    (id: string, next: OMEQRowValue) => {
      setRows((prev) => {
        const existingRow = prev.find((r) => r.id === id);
        if (!existingRow) return prev;

        const medicationChanged = existingRow.medicationText !== next.medicationText;
        if (
          medicationChanged &&
          next.medicationText.trim() &&
          isDuplicateMedicationEntry(prev, id, next.medicationText, productIndex)
        ) {
          return prev;
        }

        return prev.map((r) => (r.id === id ? { ...r, ...next } : r));
      });
    },
    [productIndex],
  );

  const addRow = () => {
    const newRow = makeRow();
    setRows((prev) => [...prev, newRow]);
    setFocusRowId(newRow.id);
  };

  useEffect(() => {
    if (!focusRowId) return;

    const t = setTimeout(() => setFocusRowId(null), 0);
    return () => clearTimeout(t);
  }, [focusRowId]);

  // Pre-fill rows when navigated from the global command palette
  useEffect(() => {
    const state = (location.state as OmeqPrefillState | null) ?? null;
    const prefillRows = (state?.prefillRows ?? [])
      .map((row) => ({
        medicationText: String(row?.medicationText ?? "").trim(),
        doseText: String(row?.doseText ?? "").trim(),
      }))
      .filter((row) => row.medicationText.length > 0);

    if (prefillRows.length > 0) {
      setRows(
        prefillRows.map((row) => ({
          ...makeRow(),
          medicationText: row.medicationText,
          doseText: row.doseText,
        })),
      );
      return;
    }

    const prefill = state?.prefill;
    if (!prefill?.medicationText) return;
    setRows([
      {
        ...makeRow(),
        medicationText: prefill.medicationText,
        doseText: prefill.doseText ?? "",
      },
    ]);
  }, [location.state]);

  const resetAll = useCallback(() => {
    // Reset to initial state without reloading the whole app
    const firstRow = makeRow();
    setRows([firstRow]);
    setShowHelp(false);
    setShowInfoTable(false);
    setFocusRowId(firstRow.id);
    setVedtakOmeq("");
    setDebouncedVedtakOmeq("");
    setCopyToastMessage(null);
    lastCopiedVedtakSummaryRef.current = null;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Don't interfere with IME composition etc.
      if ((e as any).isComposing) return;

      // Prevent unwanted side-effects (e.g. closing popovers) when we intentionally reset.
      e.preventDefault();

      resetAll();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetAll]);

  useEffect(() => {
    try {
      localStorage.setItem("omeq.autoPasteNumericClipboard", String(autoPasteNumericClipboard));
    } catch {
      // ignore
    }
  }, [autoPasteNumericClipboard]);

  const showDividers = useMemo(() => rows.length > 1, [rows.length]);

  // Always compute a number (0 when nothing is valid), so we can show Total OMEQ even with 1 row
  const totalOmeq = useMemo(() => {
    const sum = rows.reduce((acc, r) => {
      const parsed = parseMedicationInput(r.medicationText, productIndex);

      const isPatch = parsed.product?.form?.toLowerCase() === "depotplaster";

      if (!isPatch) {
        const raw = r.doseText.trim();
        if (!raw) return acc;

        const dailyDose = Number(raw.replace(",", "."));
        if (!Number.isFinite(dailyDose)) return acc;

        // Hard limit to prevent mg-mistake (user should type units/day, not mg).
        if (dailyDose > 20) return acc;

        const result = calculateOMEQ({
          product: parsed.product ?? null,
          dailyDose,
          strength: parsed.strength ?? null,
        });

        return acc + (typeof result.omeq === "number" ? result.omeq : 0);
      }

      const result = calculateOMEQ({
        product: parsed.product ?? null,
        dailyDose: null,
        strength: parsed.strength ?? null,
      });

      return acc + (typeof result.omeq === "number" ? result.omeq : 0);
    }, 0);

    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [rows, productIndex]);

  const selectedPreparats = useMemo(
    () => rows.map((row) => stripProductNumberSuffix(row.medicationText.trim())).filter(Boolean),
    [rows],
  );

  const totalOmeqText = useMemo(() => String(totalOmeq).replace(".", ","), [totalOmeq]);

  useEffect(() => {
    const id = setTimeout(() => {
      const normalized = normalizeVedtakText(vedtakOmeq);
      setDebouncedVedtakOmeq(normalized);
      if (normalized !== vedtakOmeq) {
        setVedtakOmeq(normalized);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [vedtakOmeq]);

  const vedtakNum = useMemo(() => parseFloat(debouncedVedtakOmeq.replace(",", ".")), [debouncedVedtakOmeq]);
  const hasVedtak = useMemo(
    () => debouncedVedtakOmeq.trim() !== "" && Number.isFinite(vedtakNum),
    [debouncedVedtakOmeq, vedtakNum],
  );
  const vedtakIsOk = useMemo(() => hasVedtak && totalOmeq <= vedtakNum, [hasVedtak, totalOmeq, vedtakNum]);

  const copyVedtakSummary = useCallback(async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      if (typeof document === "undefined") return false;
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!vedtakIsOk) {
      lastCopiedVedtakSummaryRef.current = null;
      return;
    }
    const text = `Total beregnet omeq: ${totalOmeqText} mg\nVedtaket dekker: ${debouncedVedtakOmeq} mg`;
    if (lastCopiedVedtakSummaryRef.current === text) return;
    void copyVedtakSummary(text).then((ok) => {
      if (ok) {
        lastCopiedVedtakSummaryRef.current = text;
      }
      setCopyToastMessage(ok ? "Kopiert til utklippstavle" : "Kunne ikke kopiere automatisk");
    });
  }, [vedtakIsOk, totalOmeqText, debouncedVedtakOmeq, copyVedtakSummary]);

  const canOpenOmeqStandardtekst =
    selectedPreparats.length > 0 && totalOmeq > 0 && hasVedtak && !vedtakIsOk;

  const openOmeqStandardtekst = useCallback(() => {
    if (!canOpenOmeqStandardtekst) return;

    const payload = {
      requestId: Date.now(),
      templateTitle: OMEQ_STANDARDTEKST_TITLE,
      preparats: selectedPreparats,
      totalOmeq: totalOmeqText,
      vedtakOmeq,
    };

    try {
      sessionStorage.setItem(OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    navigate("/standardtekster", {
      state: {
        omeqPrefill: payload,
      },
    });
  }, [canOpenOmeqStandardtekst, navigate, selectedPreparats, totalOmeqText, vedtakOmeq]);

  const formatFactor = (n: number) => {
    // display with comma for decimals
    const s = String(n);
    return s.includes(".") ? s.replace(".", ",") : s;
  };

  const routeLabel = (routes: string[]) => {
    const set = new Set(routes.map((r) => r.toLowerCase()));
    if (set.has("sublingval") && set.has("intranasal")) return "Sublingval/intranasal";
    if (set.has("oral") && set.has("rektal")) return "Oral/rektal";

    const one = routes[0]?.toLowerCase();
    switch (one) {
      case "oral":
        return "Oral";
      case "rektal":
        return "Rektal";
      case "parenteral":
        return "Parenteral";
      case "transdermal":
        return "Transdermal";
      case "sublingval":
        return "Sublingval";
      case "intranasal":
        return "Intranasal";
      default:
        return routes.join("/");
    }
  };

  const opioidGroups = useMemo(() => {
    const bySubstance = new Map<string, any[]>();

    OPIOIDS.forEach((o) => {
      const key = o.substance;
      const current = bySubstance.get(key) ?? [];
      current.push(o);
      bySubstance.set(key, current);
    });

    // Keep stable order as in the source array
    const seen = new Set<string>();
    const orderedKeys: string[] = [];
    OPIOIDS.forEach((o) => {
      if (!seen.has(o.substance)) {
        seen.add(o.substance);
        orderedKeys.push(o.substance);
      }
    });

    return orderedKeys.map((substance) => {
      const items = bySubstance.get(substance) ?? [];
      const atc = Array.from(new Set(items.flatMap((x) => x.atcCode))).join(", ");
      return { substance, atc, items };
    });
  }, []);

  const BLUE = "#29A1FF";
  const baseTheme = useTheme();
  const blueTheme = useMemo(() => createTheme(baseTheme, { palette: { primary: { main: BLUE } } }), [baseTheme]);

  return (
  <ThemeProvider theme={blueTheme}>
    <AccentSelection />
    <Box sx={(theme) => ({
      position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
      background: theme.palette.mode === "dark"
        ? "linear-gradient(160deg, rgba(41,161,255,0.1) 0%, rgba(41,161,255,0.04) 100%)"
        : "linear-gradient(160deg, rgba(41,161,255,0.08) 0%, rgba(41,161,255,0.03) 100%)",
    })} />
    <Container maxWidth={false} className={styles.appContainer}>
      {/* Header row (outside card) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
          gap: 2,
        }}
      >
        <Typography variant="h1" sx={{ m: 0 }}>
          Beregning av OMEQ
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            <strong>Nullstill</strong>: Escape
          </Typography>

          <Button
            variant="text"
            size="small"
            onClick={() => setShowHelp((v) => !v)}
            endIcon={showHelp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              minWidth: "auto",
              padding: "2px 6px",
              fontSize: "0.75rem",
              borderRadius: 2,
              textTransform: "none",
              lineHeight: 1.4,
              "& .MuiButton-endIcon": { marginLeft: 0.5 },
              "& .MuiSvgIcon-root": { fontSize: 16 },
            }}
          >
            {showHelp ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={() => setShowInfoTable((v) => !v)}
            endIcon={showInfoTable ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              minWidth: "auto",
              padding: "2px 6px",
              fontSize: "0.75rem",
              borderRadius: 2,
              textTransform: "none",
              lineHeight: 1.4,
              "& .MuiButton-endIcon": { marginLeft: 0.5 },
              "& .MuiSvgIcon-root": { fontSize: 16 },
            }}
          >
            {showInfoTable ? "Skjul OMEQ-tabell" : "Vis OMEQ-tabell"}
          </Button>

          <Tooltip title="Når feltet er aktivt, limes kopiert varenummer automatisk inn i preparatfeltet.">
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  size="small"
                  checked={autoPasteNumericClipboard}
                  onChange={(e) => setAutoPasteNumericClipboard(e.target.checked)}
                />
              }
              label={<Typography variant="caption">Auto vnr</Typography>}
            />
          </Tooltip>
        </Box>
      </Box>

      <Paper elevation={3} className={styles.appCard}>
        {/* Expandable content – ALWAYS below header */}
        <Box sx={{ mb: 2 }}>
          <Collapse in={showHelp} timeout="auto" unmountOnExit>
            <Paper
              variant="outlined"
              sx={(theme) => ({
                mt: 1,
                p: 2,
                borderRadius: 2,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
              })}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Slik bruker du OMEQ-beregneren
              </Typography>

              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Lim inn varenummer eller preparatnavn i feltet «Preparat og styrke»"
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>

                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="OMEQ-faktor fylles automatisk basert på valgt preparat"
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>

                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Legg inn total døgndose – beregnet OMEQ vises til høyre"
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>

                <ListItem disableGutters sx={{ pl: 4 }}>
                  <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                    <FiberManualRecordIcon sx={{ fontSize: 6 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="For depotplaster er døgndose ikke nødvendig"
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>

                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Flere preparater kan legges til – total OMEQ summeres nederst"
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Collapse>

          <Collapse in={showInfoTable} timeout="auto" unmountOnExit>
            <Paper
              variant="outlined"
              sx={(theme) => ({
                mt: 1,
                borderRadius: 2,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
                overflow: "hidden",
              })}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Virkestoff</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Administrasjonsvei</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 180 }}>
                        Ekvianalgetisk ratio
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {opioidGroups.map((g) =>
                      g.items.map((item, i) => (
                        <TableRow key={item.id}>
                          {i === 0 ? (
                            <TableCell rowSpan={g.items.length} sx={{ verticalAlign: "top" }}>
                              {g.substance}
                              {g.atc ? ` (${g.atc})` : ""}
                            </TableCell>
                          ) : null}

                          <TableCell>{routeLabel(item.route)}</TableCell>
                          <TableCell>{formatFactor(item.omeqFactor)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Collapse>
        </Box>

        {rows.map((r, idx) => (
          <Box key={r.id}>
            <OMEQRow
              value={r}
              onChange={(next) => setRowById(r.id, next)}
              autoFocusMedicationInput={idx === 0 || r.id === focusRowId}
              autoPasteNumericClipboard={autoPasteNumericClipboard}
            />

            {idx < rows.length - 1 && showDividers && <Divider sx={{ my: 2 }} />}

            {idx === rows.length - 1 && (
              <Box className={styles.totalOmeqWrapper}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.25,
                    justifyItems: "center",
                    width: "100%",
                    maxWidth: 560,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    <Tooltip title="Legg til ny linje">
                      <IconButton
                        aria-label="Legg til ny linje"
                        onClick={addRow}
                        sx={{
                          backgroundColor: "primary.main",
                          color: "white",
                          "&:hover": { backgroundColor: "primary.dark" },
                        }}
                        className={styles.addRowButton}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Nullstill beregning">
                      <IconButton
                        aria-label="Nullstill beregning"
                        onClick={resetAll}
                        sx={{
                          border: "1px solid",
                          borderColor: "primary.main",
                          color: "primary.main",
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                        className={styles.addRowButton}
                      >
                        <RestartAltIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box className={styles.omeqCompareRow}>
                    <Box className={styles.totalOmeqBox}>
                      <Typography variant="subtitle2" className={styles.totalOmeqLabel}>
                        Total OMEQ
                      </Typography>
                      <Typography variant="h5" className={styles.totalOmeqValue}>
                        {totalOmeq}
                      </Typography>
                    </Box>

                    {hasVedtak && (
                      vedtakIsOk
                        ? <CheckCircleIcon className={styles.omeqCheckOk} />
                        : <CancelIcon className={styles.omeqCheckFail} />
                    )}
                    <Box className={styles.vedtakOmeqBox}>
                      <Typography variant="subtitle2" className={styles.totalOmeqLabel}>
                        OMEQ vedtak
                      </Typography>
                      <TextField
                        variant="standard"
                        value={vedtakOmeq}
                        onChange={(e) => setVedtakOmeq(e.target.value)}
                        placeholder="0"
                        inputProps={{ inputMode: "decimal", style: { textAlign: "center", fontWeight: 700, fontSize: "1.25rem" } }}
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: 72 }}
                      />
                    </Box>
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={(theme) => ({
                      width: "100%",
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    })}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Standardtekst ved for høy OMEQ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                      Hvis total OMEQ overstiger det vedtaket dekker, kan du bruke denne knappen
                      for å åpne standardteksten ferdig utfylt med preparat og total OMEQ.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!canOpenOmeqStandardtekst}
                      onClick={openOmeqStandardtekst}
                      sx={{ textTransform: "none" }}
                    >
                      Bruk standardtekst
                    </Button>
                  </Paper>
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Paper>
      <Snackbar
        open={Boolean(copyToastMessage)}
        onClose={() => setCopyToastMessage(null)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={copyToastMessage ?? ""}
      />
    </Container>
  </ThemeProvider>
  );
}
