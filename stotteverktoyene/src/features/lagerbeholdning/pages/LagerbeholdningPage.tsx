import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { alpha, createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

import styles from "../../../styles/app.module.css";
import { AccentSelection } from "../../../styles/AccentSelection";
import { parseUttakInput } from "../lib/parse";
import {
  beregnVare,
  formatDato,
  fromDateInputValue,
  groupByVare,
  toDateInputValue,
  type VareBeregning,
} from "../lib/calc";
import {
  buildVirkestoffResolver,
  type FestMed,
  type VirkestoffResolver,
} from "../lib/festVirkestoff";
import { useVnrAutoPaste } from "../../../shared/hooks/useVnrAutoPaste";
import { useAutoVnrPreference } from "../../../shared/hooks/useAutoVnrPreference";
import { loadMedicationItems } from "../../fest/components/MedicationSearch";
import { formatPreparatForTemplate } from "../../standardtekster/utils/preparat";

const TEAL = "#0E9F8E";

// Overføring til standardtekster: tittelen brukes til å matche malen, og nøkkelen
// deles med StandardTekstPage via sessionStorage (samme mønster som OMEQ →
// standardtekst). Ved nok dekning (≥ terskel) tilbys begge disse malene.
const HAR_FATT_NOK_TITLE = "Hyppig uttak - Har fått nok til..";
const OVER_3_MND_TITLE = "Over 3 mnds bruk, nedjustere?";
const LAGER_STANDARDTEKST_PREFILL_STORAGE_KEY = "standardtekster:lagerPrefill";
// Terskel (dager igjen) for å tilby overføring – samme som grønn fargekode.
const HAR_FATT_NOK_MIN_DAGER = 45;

// Måned + år fra "dekket til" som MM.YYYY, som DATO-tokenet rendrer som
// f.eks. "desember 2026".
const datoMndFromDate = (d: Date | null): string => {
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${mm}.${d.getFullYear()}`;
};

const EKSEMPEL = `489 d. 17.02.2025 169052 Pinex brusetab 500 mg 20 STK\t5\t100 STK
26 d. 22.01.2025 169052 Pinex brusetab 500 mg 20 STK\t1\t20 STK`;

const formatTall = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
};

// Doseringsperioder. Ukentlig/månedlig/intervall-dosering regnes om til et
// gjennomsnittlig dagsforbruk (antall ÷ dager i perioden) som beregningen bruker.
// "egendefinert" lar brukeren oppgi et fritt intervall (hver N. dag/uke/måned).
const PERIODER = [
  { value: "dag", label: "per dag", dager: 1 },
  { value: "uke", label: "per uke", dager: 7 },
  { value: "2uker", label: "per 2 uker", dager: 14 },
  { value: "4uker", label: "per 4 uker", dager: 28 },
  { value: "maaned", label: "per måned", dager: 30 },
  { value: "varierende", label: "Varierende…", dager: null },
  { value: "egendefinert", label: "Annet intervall…", dager: null },
] as const;

type PeriodeValue = (typeof PERIODER)[number]["value"];

// Intervallene som vises i «Fast dose»-nedtrekket. «varierende» er nå et eget
// dosering-modusvalg (egen toggle), ikke et punkt i intervall-lista.
const FAST_PERIODER = PERIODER.filter((p) => p.value !== "varierende");

// Grunnperiode for varierende dosering: brukeren bygger flere linjer
// «N enheter × M dager i <uken/måneden>». Summen deles på grunnperiodens dager
// for å få snitt-dagsforbruk.
const VARIERENDE_GRUNN = [
  { value: "uke", selectLabel: "per uke", iLabel: "uken", dager: 7 },
  { value: "maaned", selectLabel: "per måned", iLabel: "måneden", dager: 30 },
] as const;

type VarierendeGrunn = (typeof VARIERENDE_GRUNN)[number]["value"];

type DoseLinje = { antall: string; dager: string };

// Sum av «antall × dager» over gyldige linjer, eller null hvis ingen gyldige.
const sumVarierendeDoser = (linjer: DoseLinje[]): number | null => {
  let sum = 0;
  let harGyldig = false;
  for (const l of linjer) {
    const a = Number((l.antall ?? "").trim().replace(",", "."));
    const d = Number((l.dager ?? "").trim().replace(",", "."));
    if (Number.isFinite(a) && a > 0 && Number.isFinite(d) && d > 0) {
      sum += a * d;
      harGyldig = true;
    }
  }
  return harGyldig ? sum : null;
};

// Enhet for det egendefinerte intervallet: brukeren oppgir "hver N. <enhet>", og
// hver enhet tilsvarer et antall dager. Slik slipper man å regne om selv (f.eks.
// 2 uker = 14 dager eller 2 måneder = 60 dager).
const EGEN_ENHETER = [
  { value: "dag", label: "dag", dager: 1 },
  { value: "uke", label: "uke", dager: 7 },
  { value: "maaned", label: "måned", dager: 30 },
] as const;

type EgenEnhet = (typeof EGEN_ENHETER)[number]["value"];

// Antall dager i valgt periode. Returnerer null hvis egendefinert intervall ikke
// er oppgitt/gyldig, slik at beregningen lar være å regne ut dagsforbruk.
const periodeDager = (
  value: string,
  egendager: string,
  egenEnhet: EgenEnhet = "dag",
): number | null => {
  if (value === "egendefinert") {
    const n = Number(egendager.trim().replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    const enhetDager = EGEN_ENHETER.find((e) => e.value === egenEnhet)?.dager ?? 1;
    return n * enhetDager;
  }
  return PERIODER.find((p) => p.value === value)?.dager ?? 1;
};

export default function LagerbeholdningPage() {
  const baseTheme = useTheme();
  const tealTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: { primary: baseTheme.palette.augmentColor({ color: { main: TEAL } }) },
        components: {
          // Basistemaet hardkoder rosa hover/fokus på OutlinedInput. Overstyr til
          // sidens teal så feltene matcher resten av lagerbeholdning-siden.
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(TEAL, 0.6),
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: TEAL,
                },
              },
            },
          },
        },
      }),
    [baseTheme],
  );

  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [referansedatoInput, setReferansedatoInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  // Hvilken knapp vi holder på å åpne standardtekst for (viser spinner på riktig
  // knapp mens preparat-katalogen slås opp). Nøkkel = `${b.key}::${maltittel}`
  // slik at kun den klikkede knappen spinner når et kort har flere maler.
  const [openingStandardtekstKey, setOpeningStandardtekstKey] = useState<string | null>(null);
  const [doseByVare, setDoseByVare] = useState<Record<string, string>>({});
  const [periodeByVare, setPeriodeByVare] = useState<Record<string, PeriodeValue>>({});
  const [egendagerByVare, setEgendagerByVare] = useState<Record<string, string>>({});
  const [egenEnhetByVare, setEgenEnhetByVare] = useState<Record<string, EgenEnhet>>({});
  // Varierende dosering: liste av «antall × dager»-linjer + valgt grunnperiode.
  const [doseLinjerByVare, setDoseLinjerByVare] = useState<Record<string, DoseLinje[]>>({});
  const [varierendeGrunnByVare, setVarierendeGrunnByVare] = useState<Record<string, VarierendeGrunn>>({});
  const [doseEnhetByVare, setDoseEnhetByVare] = useState<Record<string, "ml" | "mg">>({});
  const [styrkeByVare, setStyrkeByVare] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [openHistorikk, setOpenHistorikk] = useState<Record<string, boolean>>({});

  // Auto-lim inn: kopier uttakshistorikk i fagsystemet og alt-tab tilbake – blokken
  // limes automatisk inn når feltet er aktivt, uten manuell Ctrl+V.
  const [isUttakFocused, setIsUttakFocused] = useState(false);
  const [autoPasteUttak, setAutoPasteUttak] = useAutoVnrPreference("lagerbeholdning");

  // Godtar kun tekst som faktisk inneholder minst én tolkbar uttakslinje, slik at
  // urelatert utklippstavleinnhold ikke limes inn ved et uhell.
  const extractUttakBlock = useCallback((text: string): string => {
    const trimmed = text.trim();
    if (!trimmed || parseUttakInput(trimmed).length === 0) return "";
    return trimmed;
  }, []);

  // Etter en innliming flyttes fokus til første doseringsfelt, så neste steg
  // (oppgi dosering) er klart uten ekstra klikk. Settes ved innliming, utføres
  // i en effekt når resultatkortene (og dermed dose-inputene) er rendret.
  const doseInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingDoseFocusRef = useRef(false);
  const uttakInputRef = useRef<HTMLTextAreaElement | null>(null);

  const appendUttak = useCallback((text: string) => {
    setInput((prev) => {
      if (!text || prev.includes(text)) return prev;
      return prev.trim() ? `${prev.trim()}\n${text}` : text;
    });
    pendingDoseFocusRef.current = true;
  }, []);

  useVnrAutoPaste({
    enabled: autoPasteUttak,
    isFocused: isUttakFocused,
    onVnr: appendUttak,
    extract: extractUttakBlock,
  });

  const referansedato = useMemo(
    () => fromDateInputValue(referansedatoInput) ?? new Date(),
    [referansedatoInput],
  );

  // FEST-katalogen lastes lazy (≈2,5 MB) og brukes til å gruppere uttak på
  // virkestoff. Til den er klar grupperes det per varenummer som fallback.
  const [resolver, setResolver] = useState<VirkestoffResolver | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("../../fest/meds.json")
      .then((mod) => {
        if (cancelled) return;
        const meds = ((mod as { default?: FestMed[] }).default ?? mod) as FestMed[];
        setResolver(() => buildVirkestoffResolver(meds));
      })
      .catch(() => {
        /* Fallback til varenr-gruppering hvis katalogen ikke kan lastes. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const uttak = useMemo(() => parseUttakInput(input), [input]);
  const grupper = useMemo(() => groupByVare(uttak, resolver), [uttak, resolver]);

  const beregninger = useMemo<VareBeregning[]>(() => {
    const result: VareBeregning[] = [];
    for (const [key, gruppe] of grupper.entries()) {
      const periode = periodeByVare[key] ?? "dag";

      const styrkeRaw = styrkeByVare[key]?.trim().replace(",", ".");
      const styrkeNum = styrkeRaw ? Number(styrkeRaw) : null;
      const styrkeOverride = styrkeNum != null && Number.isFinite(styrkeNum) ? styrkeNum : null;

      let dose: number | null;
      let dager: number | null;

      if (periode === "varierende") {
        // Sum av alle dose-linjer over grunnperioden → snitt-dagsforbruk via
        // beregnVare (dose = ukes-/måneds-sum, periodeDager = grunnperiodens dager).
        const grunn = varierendeGrunnByVare[key] ?? "uke";
        dager = VARIERENDE_GRUNN.find((g) => g.value === grunn)?.dager ?? 7;
        dose = sumVarierendeDoser(doseLinjerByVare[key] ?? []);
      } else {
        const raw = doseByVare[key]?.trim().replace(",", ".");
        const doseNum = raw ? Number(raw) : null;
        dose = doseNum != null && Number.isFinite(doseNum) ? doseNum : null;
        dager = periodeDager(periode, egendagerByVare[key] ?? "", egenEnhetByVare[key] ?? "dag");
      }

      result.push(
        beregnVare(key, gruppe, referansedato, {
          dose,
          doseEnhet: doseEnhetByVare[key] ?? "ml",
          styrkeOverride,
          periodeDager: dager ?? 0,
        }),
      );
    }
    return result.sort((a, b) => a.varenavn.localeCompare(b.varenavn, "nb"));
  }, [grupper, doseByVare, periodeByVare, egendagerByVare, egenEnhetByVare, doseLinjerByVare, varierendeGrunnByVare, doseEnhetByVare, styrkeByVare, referansedato]);

  // Når en innliming nettopp skjedde og det finnes minst ett resultat, flytt
  // fokus til første doseringsfelt (dose-inputene rendres først nå).
  useEffect(() => {
    if (!pendingDoseFocusRef.current || beregninger.length === 0) return;
    const el = doseInputRefs.current[beregninger[0].key];
    if (el) {
      el.focus();
      pendingDoseFocusRef.current = false;
    }
  }, [beregninger]);

  const resetAll = useCallback(() => {
    setInput("");
    setDoseByVare({});
    setPeriodeByVare({});
    setEgendagerByVare({});
    setEgenEnhetByVare({});
    setDoseLinjerByVare({});
    setVarierendeGrunnByVare({});
    setDoseEnhetByVare({});
    setStyrkeByVare({});
    setOpenHistorikk({});
    setReferansedatoInput(toDateInputValue(new Date()));
  }, []);

  // Åpner en standardtekst (matchet på tittel) med preparat forhåndsutfylt.
  // Preparatet slås opp på varenummer i samme katalog som preparatsøket i
  // Standardtekster; faller tilbake på navnet fra lagerbeholdning hvis vnr ikke
  // finnes i katalogen. `medDato` styrer om måneden fra "dekket til" sendes med
  // (kun relevant for "Har fått nok til.." som har et DATO-token).
  const openStandardtekst = useCallback(
    async (b: VareBeregning, templateTitle: string, medDato: boolean) => {
      setOpeningStandardtekstKey(`${b.key}::${templateTitle}`);

      let preparatText = (b.varenavn ?? "").trim();
      try {
        const meds = await loadMedicationItems();
        const vnr = (b.varenr ?? "").replace(/\D/g, "");
        if (vnr) {
          const hit = meds.find(
            (m) => String(m.farmaloggNumber ?? "").replace(/\D/g, "") === vnr,
          );
          const formatted = hit ? formatPreparatForTemplate(hit) : "";
          if (formatted) preparatText = formatted;
        }
      } catch {
        // Katalogen kunne ikke lastes – behold lagerbeholdning-navnet.
      }

      const payload = {
        requestId: Date.now(),
        templateTitle,
        preparat: preparatText,
        preparatKey: (b.varenr ?? "").trim() || preparatText,
        datoInput: medDato ? datoMndFromDate(b.dekketTil) : "",
      };

      try {
        sessionStorage.setItem(
          LAGER_STANDARDTEKST_PREFILL_STORAGE_KEY,
          JSON.stringify(payload),
        );
      } catch {
        // ignore
      }

      setOpeningStandardtekstKey(null);
      navigate("/standardtekster", { state: { lagerPrefill: payload } });
    },
    [navigate],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e as any).isComposing) return;

      // Ctrl+S (Windows) / Cmd+S (Mac) -> fokuser Uttakshistorikk-feltet.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const el = uttakInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
        return;
      }

      if (e.key !== "Escape") return;
      e.preventDefault();
      resetAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetAll]);

  return (
    <ThemeProvider theme={tealTheme}>
      <AccentSelection />
      <Box
        sx={(theme) => ({
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(160deg, rgba(14,159,142,0.10) 0%, rgba(14,159,142,0.04) 100%)"
              : "linear-gradient(160deg, rgba(14,159,142,0.08) 0%, rgba(14,159,142,0.03) 100%)",
        })}
      />
      <Container maxWidth={false} className={styles.appContainer}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h1" sx={{ m: 0 }}>
            Beregning av lagerbeholdning
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              <strong>Uttakshistorikk</strong>: Ctrl + S · <strong>Nullstill</strong>: Escape
            </Typography>

            <Button
              variant="text"
              size="small"
              onClick={() => setShowHelp((v) => !v)}
              endIcon={showHelp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {showHelp ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
            </Button>
          </Box>
        </Box>

        <Paper elevation={3} className={styles.appCard}>
          <Collapse in={showHelp} timeout="auto" unmountOnExit>
            <Paper
              variant="outlined"
              sx={(theme) => ({
                mb: 2,
                p: 2,
                borderRadius: 2,
                borderColor: theme.palette.divider,
              })}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Slik bruker du lagerberegneren
              </Typography>
              <List dense disablePadding>
                {[
                  "Lim inn uttakshistorikken – én linje per uttak (dager, dato, varenr, varenavn, pakker, mengde).",
                  "Flere varer kan limes inn samtidig – preparater med samme virkestoff, styrke og form slås sammen (ulike merkenavn og pakningsstørrelser teller som ett).",
                  "Oppgi dosering per preparat. Velg «Fast dose» for lik mengde med jevne mellomrom (f.eks. 1 per uke), eller «Annet intervall…» for skjeve intervaller (f.eks. hver 3. dag).",
                  "Velg «Varierende dose» når mengden endrer seg gjennom uka eller måneden (f.eks. Marevan) – da legger du inn én linje per dosenivå. Alt regnes om til et gjennomsnittlig dagsforbruk.",
                  "Beholdning = totalt hentet − dagsforbruk × dager siden første uttak.",
                  "«Dekket til» = referansedato + dager igjen.",
                ].map((text) => (
                  <ListItem key={text} disableGutters>
                    <ListItemIcon sx={{ minWidth: 20, color: "text.secondary" }}>
                      <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="Uttakshistorikk"
                placeholder={EKSEMPEL}
                inputRef={uttakInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={() => {
                  pendingDoseFocusRef.current = true;
                }}
                onFocus={() => setIsUttakFocused(true)}
                onBlur={() => setIsUttakFocused(false)}
                multiline
                minRows={5}
                fullWidth
              />
              <Tooltip title="Når feltet er aktivt, limes kopiert uttakshistorikk automatisk inn.">
                <FormControlLabel
                  sx={{ m: 0, mt: 0.5 }}
                  control={
                    <Switch
                      size="small"
                      checked={autoPasteUttak}
                      onChange={(e) => setAutoPasteUttak(e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Auto-lim inn</Typography>}
                />
              </Tooltip>
            </Box>
            <Stack spacing={1.5} sx={{ width: { xs: "100%", md: 240 } }}>
              <TextField
                label="Referansedato (i dag)"
                type="date"
                value={referansedatoInput}
                onChange={(e) => setReferansedatoInput(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RestartAltIcon />}
                onClick={resetAll}
                sx={{ textTransform: "none" }}
              >
                Nullstill
              </Button>
              {!input.trim() && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setInput(EKSEMPEL)}
                  sx={{ textTransform: "none" }}
                >
                  Sett inn eksempel
                </Button>
              )}
            </Stack>
          </Stack>

          {input.trim() && beregninger.length === 0 && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Klarte ikke å tolke noen uttakslinjer. Sjekk at hver linje har dato, varenummer og
              mengde.
            </Typography>
          )}

          <Stack spacing={2} sx={{ mt: beregninger.length ? 2 : 0 }}>
            {beregninger.map((b) => {
              const key = b.key;
              const doseEnhet = b.erFlytende ? doseEnhetByVare[key] ?? "ml" : "ml";
              const mgModus = b.erFlytende && doseEnhet === "mg";
              const styrkeVisning =
                styrkeByVare[key] ?? (b.styrkeMgPerMl != null ? formatTall(b.styrkeMgPerMl) : "");
              const periode = periodeByVare[key] ?? "dag";
              const erEgendefinert = periode === "egendefinert";
              const erVarierende = periode === "varierende";
              const varierendeLinjer = doseLinjerByVare[key] ?? [{ antall: "", dager: "" }];
              const varierendeGrunn = varierendeGrunnByVare[key] ?? "uke";
              const varierendeGrunnInfo =
                VARIERENDE_GRUNN.find((g) => g.value === varierendeGrunn) ?? VARIERENDE_GRUNN[0];
              const visDagsrate =
                b.dagligForbruk != null && (mgModus || periode !== "dag");
              const harBeholdning = b.beholdning != null;
              const tom = harBeholdning && (b.beholdning as number) <= 0;
              // Fargekoding etter dager igjen: grønn ≥ 45, gul 10–44, rød < 10
              // (tom beholdning er alltid rød).
              const accent = !harBeholdning
                ? TEAL
                : tom || (b.dagerIgjen as number) < 10
                  ? "#FF5E5B"
                  : (b.dagerIgjen as number) < 45
                    ? "#FFA726"
                    : "#4BC76A";

              return (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderColor: alpha(accent, 0.4),
                    backgroundColor: alpha(accent, 0.05),
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      mb: b.merged ? 1 : 1.5,
                    }}
                  >
                    <Inventory2OutlinedIcon sx={{ color: accent }} />
                    <Typography variant="h6" sx={{ m: 0 }}>
                      {b.varenavn}
                    </Typography>
                    {b.atc ? (
                      <Chip size="small" label={`ATC ${b.atc}`} variant="outlined" />
                    ) : null}
                    {!b.merged && /^(\d{5,7})$/.test(b.varenr) ? (
                      <Chip size="small" label={`Varenr ${b.varenr}`} variant="outlined" />
                    ) : null}
                  </Box>

                  {b.merged ? (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Slått sammen ({b.members.length} preparater):
                      </Typography>
                      {b.members.map((m) => (
                        <Chip
                          key={m.varenr || m.varenavn}
                          size="small"
                          variant="outlined"
                          label={
                            /^(\d{5,7})$/.test(m.varenr)
                              ? `${m.varenavn} · ${m.varenr}`
                              : m.varenavn
                          }
                          sx={{ maxWidth: "100%" }}
                        />
                      ))}
                    </Box>
                  ) : null}

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Metric
                      label="Totalt hentet"
                      value={`${formatTall(b.totaltHentet)}${b.enhet ? ` ${b.enhet}` : ""}`}
                      sub={`${b.antallUttak} uttak`}
                    />
                    <Metric label="Første uttak" value={formatDato(b.forsteUttak)} />
                    <Metric label="Siste uttak" value={formatDato(b.sisteUttak)} />
                    <Metric
                      label="Dager siden første"
                      value={b.dagerSidenForsteUttak != null ? `${b.dagerSidenForsteUttak}` : "–"}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    {b.erFlytende && (
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={doseEnhet}
                        onChange={(_e, val) => {
                          if (!val) return;
                          setDoseEnhetByVare((prev) => ({ ...prev, [key]: val as "ml" | "mg" }));
                        }}
                        sx={{ mb: 1, "& .MuiToggleButton-root": { textTransform: "none", py: 0.25 } }}
                      >
                        <ToggleButton value="ml">Dose i ml</ToggleButton>
                        <ToggleButton value="mg">Dose i mg</ToggleButton>
                      </ToggleButtonGroup>
                    )}

                    {/* Dosering-modus: gjør de to prinsipielt ulike inntastingene
                        tydelige – fast dose vs. varierende dose gjennom perioden. */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      Hvordan doseres preparatet?
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={erVarierende ? "varierende" : "fast"}
                      onChange={(_e, val) => {
                        if (!val) return;
                        setPeriodeByVare((prev) => ({
                          ...prev,
                          [key]: val === "varierende" ? "varierende" : "dag",
                        }));
                      }}
                      sx={{ mb: 1, "& .MuiToggleButton-root": { textTransform: "none", py: 0.25 } }}
                    >
                      <ToggleButton value="fast">
                        <Tooltip title="Samme mengde med jevne mellomrom – f.eks. 1 tablett hver dag eller 2 per uke.">
                          <span>Fast dose</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value="varierende">
                        <Tooltip title="Ulik mengde gjennom uka eller måneden – f.eks. Marevan 1 tablett 5 dager + ½ tablett 2 dager i uka.">
                          <span>Varierende dose</span>
                        </Tooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>

                    {mgModus && (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 1 }}>
                        <TextField
                          label="Styrke"
                          placeholder="f.eks. 10"
                          value={styrkeVisning}
                          onChange={(e) =>
                            setStyrkeByVare((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          size="small"
                          inputProps={{ inputMode: "decimal" }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">mg/ml</InputAdornment>,
                          }}
                          helperText={
                            b.styrkeMgPerMl != null && styrkeByVare[key] == null
                              ? "Hentet fra preparatnavn"
                              : " "
                          }
                          sx={{ width: 150 }}
                        />
                      </Stack>
                    )}

                    {!erVarierende ? (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                        <TextField
                          label="Dose"
                          placeholder="f.eks. 1"
                          value={doseByVare[key] ?? ""}
                          onChange={(e) =>
                            setDoseByVare((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          inputRef={(el: HTMLInputElement | null) => {
                            doseInputRefs.current[key] = el;
                          }}
                          size="small"
                          inputProps={{ inputMode: "decimal" }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                {mgModus ? "mg" : b.enhet ? b.enhet : "enheter"}
                              </InputAdornment>
                            ),
                          }}
                          sx={{ width: 160 }}
                        />
                        <TextField
                          select
                          label="Intervall"
                          value={periode}
                          onChange={(e) =>
                            setPeriodeByVare((prev) => ({
                              ...prev,
                              [key]: e.target.value as PeriodeValue,
                            }))
                          }
                          size="small"
                          sx={{ width: 170 }}
                        >
                          {FAST_PERIODER.map((p) => (
                            <MenuItem key={p.value} value={p.value}>
                              {p.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        {erEgendefinert && (
                          <>
                            <TextField
                              label="Hvor ofte"
                              placeholder="f.eks. 3"
                              value={egendagerByVare[key] ?? ""}
                              onChange={(e) =>
                                setEgendagerByVare((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              size="small"
                              inputProps={{ inputMode: "numeric" }}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">hver</InputAdornment>,
                                endAdornment: <InputAdornment position="end">.</InputAdornment>,
                              }}
                              sx={{ width: 110 }}
                            />
                            <TextField
                              select
                              label="Enhet"
                              value={egenEnhetByVare[key] ?? "dag"}
                              onChange={(e) =>
                                setEgenEnhetByVare((prev) => ({
                                  ...prev,
                                  [key]: e.target.value as EgenEnhet,
                                }))
                              }
                              size="small"
                              sx={{ width: 120 }}
                            >
                              {EGEN_ENHETER.map((enh) => (
                                <MenuItem key={enh.value} value={enh.value}>
                                  {enh.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </>
                        )}
                      </Stack>
                    ) : (
                      <Box sx={{ mt: 0.25 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Legg til én linje per dosenivå. Summen fordeles jevnt over{" "}
                          {varierendeGrunnInfo.iLabel} og regnes om til snitt-dagsforbruk.
                        </Typography>
                        <TextField
                          select
                          label="Grunnperiode"
                          value={varierendeGrunn}
                          onChange={(e) =>
                            setVarierendeGrunnByVare((prev) => ({
                              ...prev,
                              [key]: e.target.value as VarierendeGrunn,
                            }))
                          }
                          size="small"
                          sx={{ width: 150, mb: 1 }}
                        >
                          {VARIERENDE_GRUNN.map((g) => (
                            <MenuItem key={g.value} value={g.value}>
                              {g.selectLabel}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    )}

                    {erVarierende && (
                      <Box sx={{ mt: 0.5 }}>
                        <Stack spacing={1}>
                          {varierendeLinjer.map((linje, i) => (
                            <Stack
                              key={i}
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ flexWrap: "wrap", gap: 1 }}
                            >
                              <TextField
                                label="Antall"
                                placeholder="f.eks. 1"
                                value={linje.antall}
                                onChange={(e) =>
                                  setDoseLinjerByVare((prev) => {
                                    const next = [...(prev[key] ?? [{ antall: "", dager: "" }])];
                                    next[i] = { ...next[i], antall: e.target.value };
                                    return { ...prev, [key]: next };
                                  })
                                }
                                size="small"
                                inputProps={{ inputMode: "decimal" }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      {mgModus ? "mg" : b.enhet ? b.enhet : "enheter"}
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{ width: 150 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                ×
                              </Typography>
                              <TextField
                                label="Dager"
                                placeholder="f.eks. 5"
                                value={linje.dager}
                                onChange={(e) =>
                                  setDoseLinjerByVare((prev) => {
                                    const next = [...(prev[key] ?? [{ antall: "", dager: "" }])];
                                    next[i] = { ...next[i], dager: e.target.value };
                                    return { ...prev, [key]: next };
                                  })
                                }
                                size="small"
                                inputProps={{ inputMode: "numeric" }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      dager i {varierendeGrunnInfo.iLabel}
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{ width: 210 }}
                              />
                              <Tooltip title="Fjern linje">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="Fjern doseringslinje"
                                    disabled={varierendeLinjer.length <= 1}
                                    onClick={() =>
                                      setDoseLinjerByVare((prev) => {
                                        const cur = prev[key] ?? [{ antall: "", dager: "" }];
                                        const next = cur.filter((_, idx) => idx !== i);
                                        return { ...prev, [key]: next.length ? next : [{ antall: "", dager: "" }] };
                                      })
                                    }
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          ))}
                        </Stack>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() =>
                            setDoseLinjerByVare((prev) => ({
                              ...prev,
                              [key]: [...(prev[key] ?? [{ antall: "", dager: "" }]), { antall: "", dager: "" }],
                            }))
                          }
                          sx={{ textTransform: "none", mt: 0.5 }}
                        >
                          Legg til dosering
                        </Button>
                      </Box>
                    )}
                    {visDagsrate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        = {formatTall(b.dagligForbruk as number)} {b.enhet ? b.enhet : "enheter"}/dag i snitt
                      </Typography>
                    )}
                    {mgModus && styrkeVisning.trim() === "" && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                        Oppgi styrke (mg/ml) for å regne om dosen.
                      </Typography>
                    )}
                    {erEgendefinert && (egendagerByVare[key] ?? "").trim() === "" && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                        Oppgi intervall (hver N. dag/uke/måned).
                      </Typography>
                    )}
                    {erVarierende && sumVarierendeDoser(varierendeLinjer) == null && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                        Oppgi minst én doseringslinje (antall × dager i {varierendeGrunnInfo.iLabel}).
                      </Typography>
                    )}
                  </Box>

                  {harBeholdning ? (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                        gap: 1.5,
                      }}
                    >
                      <ResultBox
                        label="Beholdning nå"
                        value={`${formatTall(b.beholdning as number)}${b.enhet ? ` ${b.enhet}` : ""}`}
                        accent={accent}
                        emphasis
                      />
                      <ResultBox
                        label="Dager igjen"
                        value={
                          tom
                            ? `Tom (${formatTall(Math.abs(b.dagerIgjen as number))} d siden)`
                            : `${formatTall(b.dagerIgjen as number)} dager`
                        }
                        accent={accent}
                      />
                      <ResultBox
                        label={tom ? "Tom siden" : "Dekket til"}
                        value={formatDato(b.dekketTil)}
                        accent={accent}
                        emphasis
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Oppgi dagsforbruk for å regne ut beholdning, dager igjen og dekning.
                    </Typography>
                  )}

                  {harBeholdning && !tom && (b.dagerIgjen as number) >= HAR_FATT_NOK_MIN_DAGER && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                      {[
                        { title: HAR_FATT_NOK_TITLE, label: "Åpne standardtekst «Har fått nok til…»", medDato: true },
                        { title: OVER_3_MND_TITLE, label: "Åpne standardtekst «Over 3 mnds bruk, nedjustere?»", medDato: false },
                      ].map(({ title, label, medDato }) => {
                        const busy = openingStandardtekstKey === `${key}::${title}`;
                        return (
                          <Button
                            key={title}
                            variant="outlined"
                            size="small"
                            onClick={() => openStandardtekst(b, title, medDato)}
                            disabled={busy}
                            startIcon={
                              busy ? <CircularProgress size={16} color="inherit" /> : undefined
                            }
                            sx={{
                              textTransform: "none",
                              borderRadius: 2,
                              borderColor: alpha(accent, 0.5),
                              color: accent,
                              "&:hover": { borderColor: accent },
                            }}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </Stack>
                  )}

                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() =>
                        setOpenHistorikk((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      endIcon={openHistorikk[key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ textTransform: "none" }}
                    >
                      {openHistorikk[key] ? "Skjul historikk" : "Vis historikk"}
                    </Button>
                    <Collapse in={openHistorikk[key]} timeout="auto" unmountOnExit>
                      <TableContainer sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Dato</TableCell>
                              <TableCell align="right">Pakker</TableCell>
                              <TableCell align="right">Mengde</TableCell>
                              <TableCell align="right">Dager</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {b.uttak.map((u, i) => (
                              <TableRow
                                key={`${u.raw}-${i}`}
                                sx={{ opacity: u.annullert ? 0.5 : 1 }}
                              >
                                <TableCell>
                                  {formatDato(u.dato)}
                                  {u.annullert && (
                                    <Chip
                                      size="small"
                                      label="Annullert"
                                      color="error"
                                      variant="outlined"
                                      sx={{ ml: 1, height: 18, "& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" } }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="right">{u.antallPakker ?? "–"}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ textDecoration: u.annullert ? "line-through" : "none" }}
                                >
                                  {u.mengde != null ? `${formatTall(u.mengde)}${u.enhet ? ` ${u.enhet}` : ""}` : "–"}
                                </TableCell>
                                <TableCell align="right">{u.dager ?? "–"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function ResultBox({
  label,
  value,
  accent,
  emphasis,
}: {
  label: string;
  value: string;
  accent: string;
  emphasis?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 2,
        borderColor: alpha(accent, 0.4),
        backgroundColor: emphasis ? alpha(accent, 0.12) : "transparent",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: accent, fontWeight: 700 }}>
        {value}
      </Typography>
    </Paper>
  );
}
