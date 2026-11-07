import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Collapse,
  Container,
  FormControlLabel,
  InputBase,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ListItemIcon from "@mui/material/ListItemIcon";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { alpha, createTheme, useTheme, ThemeProvider } from "@mui/material/styles";

import styles from "../../../styles/app.module.css";
import { AccentSelection } from "../../../styles/AccentSelection";

import { OMEQRow, type OMEQRowValue } from "../components/OMEQRow";
import { useAutoVnrPreference } from "../../../shared/hooks/useAutoVnrPreference";
import { useVnrAutoPaste } from "../../../shared/hooks/useVnrAutoPaste";
import {
  buildProductIndex,
  parseMedicationInput,
  type ProductIndexItem,
} from "../lib/parseMedicationInput";
import { calculateOMEQ } from "../lib/calc";
import { isParenteralForm, parseDoseInput } from "../lib/doseUnit";
import { OPIOIDS } from "../data/opioids";
import { formToRoute } from "../data/atcProducts";

type Row = OMEQRowValue & { id: string };
type OmeqPrefillState = {
  prefillRows?: Array<{ medicationText?: string; doseText?: string }>;
  prefill?: { medicationText?: string; doseText?: string };
};
const OMEQ_STANDARDTEKST_TITLE = "OMEQ overstiger vedtak";
const OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY = "standardtekster:omeqPrefill";

// Fjern et etterfølgende varenummer i navnet. Håndterer også det dobla tilfellet
// "Norspan ... (24765)24765" (rå-vnr limt inn etter et allerede utfylt navn).
const stripProductNumberSuffix = (value: string) => value.replace(/\s*\(\d+\)\d*\s*$/g, "").trim();
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

// Klippebord-innhold som er (kun) et tall, f.eks. "67" eller "67,5"/"67.5".
// Maks 3 siffer i heltallsdelen (vedtak-OMEQ er aldri firesifret), slik at
// f.eks. et kopiert varenummer (5-7 siffer) ikke ved en feil fylles inn her.
const extractVedtakNumber = (text: string): string => {
  const compact = String(text ?? "").trim();
  return /^-?\d{1,3}(?:[.,]\d+)?$/.test(compact) ? compact : "";
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
  // Når avhaket legges en ekstra linje til i auto-kopien om at oppgitt lege er
  // kundens fastlege / jobber ved fastlegens kontor.
  const [erFastlege, setErFastlege] = useState(false);
  const [autoPasteNumericClipboard, setAutoPasteNumericClipboard] = useAutoVnrPreference("omeq");
  const [isVedtakFocused, setIsVedtakFocused] = useState(false);
  const vedtakInputRef = useRef<HTMLInputElement | null>(null);
  const productIndex = useMemo(() => buildProductIndex(), []);

  useVnrAutoPaste({
    enabled: autoPasteNumericClipboard,
    isFocused: isVedtakFocused,
    onVnr: setVedtakOmeq,
    extract: extractVedtakNumber,
  });

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

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    // Siste rad tømmes i stedet for å fjernes.
    const blank = makeRow();
    setRows([blank]);
    setFocusRowId(blank.id);
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
    setErFastlege(false);
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


  // Always compute a number (0 when nothing is valid), so we can show Total OMEQ even with 1 row
  const totalOmeq = useMemo(() => {
    const sum = rows.reduce((acc, r) => {
      const parsed = parseMedicationInput(r.medicationText, productIndex);

      const isPatch = parsed.product?.form?.toLowerCase() === "depotplaster";

      if (!isPatch) {
        // Tall («8») eller produkt («2x4» = 8)
        const dailyDose = parseDoseInput(r.doseText);
        if (dailyDose == null) return acc;

        // Block if over-limit and user has not explicitly confirmed the high value.
        // Gjelder ikke injeksjon/infusjon, der dosen er legens dosering i µg/mg.
        if (dailyDose > 20 && !r.confirmedHighDose && !isParenteralForm(parsed.product?.form)) {
          return acc;
        }

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

  // Helfo tillater at vedtaket rundes opp til nærmeste hele tall: vedtak 25 og beregnet 25,1–25,9
  // godkjennes (vedtaket rundes opp til 26). Beregnet 26 mot vedtak 25 godkjennes ikke.
  const vedtakWithinTolerance =
    hasVedtak && totalOmeq > vedtakNum && Math.floor(totalOmeq) <= vedtakNum;
  const roundedVedtak = vedtakWithinTolerance ? Math.ceil(totalOmeq) : null;
  const vedtakCovers = vedtakIsOk || vedtakWithinTolerance;

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

  const vedtakSummaryText = useMemo(
    () =>
      `Total beregnet omeq: ${totalOmeqText} mg\nVedtaket dekker: ${debouncedVedtakOmeq} mg` +
      (roundedVedtak != null ? ` (rundet opp til ${roundedVedtak} mg)` : "") +
      "\nOppgitt lege er kundens fastlege eller jobber ved fastlegens kontor.",
    [totalOmeqText, debouncedVedtakOmeq, roundedVedtak],
  );

  // Kan kopieres (automatisk og manuelt) når alt er utfylt: Total OMEQ > 0,
  // vedtaket dekker, og fastlege-boksen er avhaket.
  const canCopyVedtakSummary = totalOmeq > 0 && vedtakCovers && erFastlege;

  useEffect(() => {
    // Auto-kopier kun når alt er utfylt. Uten avhaking skjer ingen auto-kopi.
    if (!canCopyVedtakSummary) {
      lastCopiedVedtakSummaryRef.current = null;
      return;
    }
    if (lastCopiedVedtakSummaryRef.current === vedtakSummaryText) return;
    void copyVedtakSummary(vedtakSummaryText).then((ok) => {
      if (ok) {
        lastCopiedVedtakSummaryRef.current = vedtakSummaryText;
      }
      setCopyToastMessage(ok ? "Kopiert til utklippstavle" : "Kunne ikke kopiere automatisk");
    });
  }, [canCopyVedtakSummary, vedtakSummaryText, copyVedtakSummary]);

  // Manuell kopiering: nyttig når utklippstavlen har blitt overskrevet siden auto-kopien.
  const copyVedtakSummaryAgain = useCallback(() => {
    void copyVedtakSummary(vedtakSummaryText).then((ok) => {
      if (ok) {
        lastCopiedVedtakSummaryRef.current = vedtakSummaryText;
      }
      setCopyToastMessage(ok ? "Kopiert til utklippstavle" : "Kunne ikke kopiere");
    });
  }, [copyVedtakSummary, vedtakSummaryText]);

  const canOpenOmeqStandardtekst =
    selectedPreparats.length > 0 && totalOmeq > 0 && hasVedtak && !vedtakCovers;

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
  const blueTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: { primary: baseTheme.palette.augmentColor({ color: { main: BLUE } }) },
      }),
    [baseTheme],
  );

  const showStatus = hasVedtak && totalOmeq > 0;
  const marginText = hasVedtak
    ? String(Math.round((Math.abs(vedtakNum - totalOmeq) + Number.EPSILON) * 100) / 100).replace(".", ",")
    : "";

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
      {/* Topp: tittel + rolige verktøy */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px 24px",
          mb: 2.5,
        }}
      >
        <Typography variant="h1" sx={{ m: 0 }}>
          Beregning av OMEQ
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
          <Button
            variant="text"
            onClick={() => setShowHelp((v) => !v)}
            startIcon={<HelpOutlineIcon />}
            endIcon={showHelp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ minHeight: 44, textTransform: "none", borderRadius: 2.5 }}
          >
            Bruksanvisning
          </Button>

          <Button
            variant="text"
            onClick={() => setShowInfoTable((v) => !v)}
            startIcon={<TableChartOutlinedIcon />}
            endIcon={showInfoTable ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ minHeight: 44, textTransform: "none", borderRadius: 2.5 }}
          >
            OMEQ-tabell
          </Button>

          <Tooltip title="Når feltet er aktivt, limes kopiert varenummer automatisk inn i preparatfeltet.">
            <FormControlLabel
              sx={{ m: 0, minHeight: 44, px: 1 }}
              control={
                <Checkbox
                  size="small"
                  checked={autoPasteNumericClipboard}
                  onChange={(e) => setAutoPasteNumericClipboard(e.target.checked)}
                />
              }
              label={<Typography variant="body2">Lim inn varenummer automatisk</Typography>}
            />
          </Tooltip>

          <Button
            variant="outlined"
            color="inherit"
            onClick={resetAll}
            startIcon={<RestartAltIcon />}
            sx={(theme) => ({
              minHeight: 44,
              textTransform: "none",
              borderRadius: 2.5,
              borderColor: theme.palette.divider,
            })}
          >
            Nullstill
            <Box
              component="span"
              sx={(theme) => ({
                ml: 1,
                px: 0.75,
                fontSize: "0.75rem",
                color: "text.secondary",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              })}
            >
              Esc
            </Box>
          </Button>
        </Box>
      </Box>

      {/* Utvidbart innhold (bruksanvisning og OMEQ-tabell) */}
      <Collapse in={showHelp} timeout="auto" unmountOnExit>
        <Paper
          variant="outlined"
          sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: "background.paper" }}
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
                primary="Flere preparater kan legges til – total OMEQ summeres i panelet til høyre"
                primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
              />
            </ListItem>
          </List>
        </Paper>
      </Collapse>

      <Collapse in={showInfoTable} timeout="auto" unmountOnExit>
        <Paper
          variant="outlined"
          sx={{ mb: 2, borderRadius: 2, backgroundColor: "background.paper", overflow: "hidden" }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Virkestoff</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Administrasjonsvei</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 180 }}>Ekvianalgetisk ratio</TableCell>
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

      {/* Hovedflate: preparater til venstre, sum og vedtak til høyre */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 3 }}>
        <Box sx={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {rows.map((r, idx) => (
            <OMEQRow
              key={r.id}
              value={r}
              onChange={(next) => setRowById(r.id, next)}
              onRemove={() => removeRow(r.id)}
              autoFocusMedicationInput={idx === 0 || r.id === focusRowId}
              autoPasteNumericClipboard={autoPasteNumericClipboard}
            />
          ))}

          <Button
            variant="outlined"
            onClick={addRow}
            startIcon={<AddIcon />}
            sx={(theme) => ({
              minHeight: 52,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "14px",
              borderStyle: "dashed",
              borderWidth: 1.5,
              borderColor: alpha(theme.palette.primary.main, 0.55),
              "&:hover": { borderStyle: "dashed", borderWidth: 1.5 },
            })}
          >
            Legg til preparat
          </Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            flex: "1 1 320px",
            minWidth: 0,
            p: 2.5,
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            gap: 1.75,
          }}
        >
          {/* Beregnet (kun visning) og vedtak (inndata) har ulik stil, men samme størrelse */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 2,
            }}
          >
            {/* Beregnet: fylt, uten fokus-/hover-effekt */}
            <Box
              sx={(theme) => ({
                p: 2.5,
                borderRadius: "12px",
                backgroundColor: alpha(theme.palette.primary.main, 0.07),
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              })}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Total OMEQ
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Beregnet fra preparatene
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75 }}>
                <Typography
                  component="span"
                  aria-live="polite"
                  sx={{
                    fontSize: "2.5rem",
                    lineHeight: 1.15,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {totalOmeqText}
                </Typography>
                <Typography component="span" color="text.secondary" sx={{ fontSize: "0.9375rem", mb: "6px" }}>
                  mg
                </Typography>
              </Box>
            </Box>

            {/* Vedtak: hvit inndataboks med ramme som reagerer på hover og fokus */}
            <Tooltip title="Skriv eller lim inn OMEQ fra vedtaket" placement="bottom-start">
              <Box
                onClick={() => vedtakInputRef.current?.focus()}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: "12px",
                  backgroundColor: theme.palette.background.paper,
                  border: `1.5px solid ${
                    isVedtakFocused ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.28)
                  }`,
                  boxShadow: isVedtakFocused
                    ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`
                    : "none",
                  cursor: "text",
                  transition: "border-color .15s ease, box-shadow .15s ease",
                  "&:hover": { borderColor: theme.palette.primary.main },
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                })}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography
                      component="label"
                      htmlFor="omeq-vedtak"
                      variant="body2"
                      sx={{ fontWeight: 600, display: "block" }}
                    >
                      OMEQ i vedtaket
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Skriv inn fra vedtaket
                    </Typography>
                  </Box>
                  <EditOutlinedIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.25 }} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75 }}>
                  <InputBase
                    id="omeq-vedtak"
                    value={vedtakOmeq}
                    onChange={(e) => setVedtakOmeq(e.target.value)}
                    onFocus={() => setIsVedtakFocused(true)}
                    onBlur={() => setIsVedtakFocused(false)}
                    inputRef={vedtakInputRef}
                    placeholder="0"
                    inputProps={{ inputMode: "decimal" }}
                    sx={{
                      // Vokser med innholdet, så «mg» alltid står rett etter tallet
                      width: `${Math.max(2, vedtakOmeq.length) + 0.5}ch`,
                      minWidth: 0,
                      fontSize: "2.5rem",
                      lineHeight: 1.15,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums",
                      // Samme linjehøyde som Total-tallet (MUI gir ellers inputen 1,4375em)
                      "& input": { height: "1.15em", padding: 0 },
                      "& input::placeholder": { opacity: 0.3 },
                    }}
                  />
                  <Typography component="span" color="text.secondary" sx={{ fontSize: "0.9375rem", mb: "6px" }}>
                    mg
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
          </Box>

          {hasVedtak && !showStatus && (
            <Typography variant="body2" color="text.secondary">
              Legg inn preparat og antall per døgn.
            </Typography>
          )}

          {/* Status: kun én av tre vises */}

          {showStatus && vedtakCovers && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
              {vedtakWithinTolerance ? (
                <Alert severity="warning">
                  <AlertTitle sx={{ mb: 0 }}>Vedtaket dekker etter avrunding</AlertTitle>
                  {marginText} mg over. Helfo tillater at vedtaket rundes opp til hele tall ({roundedVedtak} mg).
                </Alert>
              ) : (
                <Alert severity="success">
                  <AlertTitle sx={{ mb: 0 }}>Vedtaket dekker</AlertTitle>
                  {marginText} mg margin
                </Alert>
              )}

              <FormControlLabel
                sx={{ m: 0, alignItems: "flex-start" }}
                control={
                  <Checkbox
                    checked={erFastlege}
                    onChange={(e) => setErFastlege(e.target.checked)}
                    sx={{ py: 0, pl: 0, pr: 1.25 }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                    Oppgitt lege er kundens fastlege eller jobber ved fastlegens kontor
                  </Typography>
                }
              />

              {!erFastlege && (
                <Typography variant="caption" color="text.secondary">
                  Når du huker av, kopieres teksten til utklippstavlen.
                </Typography>
              )}

              {canCopyVedtakSummary && (
                <>
                  <Button
                    variant="outlined"
                    onClick={copyVedtakSummaryAgain}
                    startIcon={<ContentCopyIcon />}
                    sx={{ minHeight: 48, textTransform: "none", fontWeight: 600, borderRadius: 2.5 }}
                  >
                    Kopier teksten igjen
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Kopiert automatisk da du huket av. Trykk igjen hvis du har kopiert noe annet i
                    mellomtiden.
                  </Typography>
                </>
              )}
            </Box>
          )}

          {showStatus && !vedtakCovers && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
              <Alert severity="error">
                <AlertTitle sx={{ mb: 0 }}>Over vedtaket</AlertTitle>
                {marginText} mg for mye
              </Alert>

              <Button
                variant="contained"
                disabled={!canOpenOmeqStandardtekst}
                onClick={openOmeqStandardtekst}
                sx={{ minHeight: 48, textTransform: "none", fontWeight: 600, borderRadius: 2.5 }}
              >
                Åpne standardtekst
              </Button>
              <Typography variant="caption" color="text.secondary">
                Åpnes ferdig utfylt med preparat og total OMEQ.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

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
