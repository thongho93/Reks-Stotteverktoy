import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
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
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { alpha, createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

import styles from "../../../styles/app.module.css";
import { AccentSelection } from "../../../styles/AccentSelection";
import { parseUttakInput } from "../lib/parse";
import {
  beregnVare,
  finnGruppeMaal,
  formatDato,
  gruppeStyrke,
  fromDateInputValue,
  groupByVare,
  slaaSammenGrupper,
  styrkeFaktor,
  toDateInputValue,
  type VareBeregning,
  type VareMedlem,
} from "../lib/calc";
import {
  buildVirkestoffResolver,
  type FestMed,
  type VirkestoffResolver,
} from "../lib/festVirkestoff";
import { useVnrAutoPaste } from "../../../shared/hooks/useVnrAutoPaste";
import { useAutoVnrPreference } from "../../../shared/hooks/useAutoVnrPreference";
import { loadMedicationItems } from "../../fest/components/MedicationSearch";
import {
  deriveFormuleringBase,
  formatPreparatForTemplate,
} from "../../standardtekster/utils/preparat";

const TEAL = "#0E9F8E";

// Overføring til standardtekster: tittelen brukes til å matche malen, og nøkkelen
// deles med StandardTekstPage via sessionStorage (samme mønster som OMEQ →
// standardtekst). Ved nok dekning (≥ terskel) tilbys disse malene.
const HAR_FATT_NOK_TITLE = "Hyppig uttak - Har fått nok til..";
const OVER_3_MND_TITLE = "Over 3 mnds bruk, nedjustere?";
const HYPPIG_UTTAK_KANSELLERE_TITLE = "Hyppig uttak - fått nok til - kansellere";
const NEDJUSTERING_TITLE = "Nedjustering - For mange pakninger ifht. dosering";
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

// Eksempel med datoer relativt til i dag, slik at det alltid gir fornuftige resultater.
const lagEksempel = (): string => {
  const linje = (dagerSiden: number, vnr: string, navn: string, pakke: string, antall: number, mengde: string) => {
    const d = new Date();
    d.setDate(d.getDate() - dagerSiden);
    const dato = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    return `${dagerSiden} d. / ${dato} — ${vnr} — ${navn} — ${pakke} — ${antall} — ${mengde}`;
  };
  return [
    linje(84, "22293", "Norvasc tab 5 mg", "100 STK", 1, "100 STK"),
    linje(30, "22293", "Norvasc tab 5 mg", "100 STK", 1, "100 STK"),
    linje(12, "169052", "Pinex brusetab 500 mg", "20 STK", 5, "100 STK"),
  ].join("\n");
};

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

// Standardtekstene som tilbys når dekningen er god nok. `label` brukes på knappene.
const STANDARDTEKSTER = [
  { title: HAR_FATT_NOK_TITLE, label: "Har fått nok til…", medDato: true },
  { title: OVER_3_MND_TITLE, label: "Over 3 mnds bruk", medDato: false },
  { title: HYPPIG_UTTAK_KANSELLERE_TITLE, label: "Hyppig uttak – kansellere", medDato: true },
  { title: NEDJUSTERING_TITLE, label: "Nedjustering – for mange pakninger", medDato: false },
] as const;

type StatusKind = "mangler" | "tom" | "rod" | "gul" | "gronn";

// Samme terskler som før: grønn ≥ 45 dager, gul 10–44, rød < 10 (tom er alltid rød).
const statusKind = (b: VareBeregning): StatusKind => {
  if (b.beholdning == null || b.dagerIgjen == null) return "mangler";
  if (b.beholdning <= 0) return "tom";
  if (b.dagerIgjen < 10) return "rod";
  if (b.dagerIgjen < HAR_FATT_NOK_MIN_DAGER) return "gul";
  return "gronn";
};

const STATUS_FARGER: Record<StatusKind, { main: string; light: string; dark: string }> = {
  mangler: { main: "#94A3A6", light: "#3A4D51", dark: "#CBD5D6" },
  tom: { main: "#DC2626", light: "#991B1B", dark: "#FCA5A5" },
  rod: { main: "#DC2626", light: "#991B1B", dark: "#FCA5A5" },
  gul: { main: "#F59E0B", light: "#8A4A07", dark: "#FCD34D" },
  gronn: { main: "#16A34A", light: "#14532D", dark: "#86EFAC" },
};

const dagTekst = (n: number): string => `${formatTall(n)} ${n === 1 ? "dag" : "dager"}`;

const statusTekst = (b: VareBeregning, kind: StatusKind): string => {
  if (kind === "mangler") return "Mangler dosering";
  const d = b.dagerIgjen as number;
  if (kind === "tom") {
    return Math.abs(d) < 1 ? "Tom i dag" : `Tom for ${dagTekst(Math.abs(d))} siden`;
  }
  return `${dagTekst(d)} igjen`;
};

const scrollTilKort = (key: string) => {
  document
    .getElementById(`kort-${key}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function StatusPill({
  label,
  kind,
  dark,
}: {
  label: string;
  kind: StatusKind;
  dark: boolean;
}) {
  const c = STATUS_FARGER[kind];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 999,
        px: 1.5,
        py: 0.5,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: dark ? c.dark : c.light,
        backgroundColor: alpha(c.main, dark ? 0.18 : 0.12),
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          boxSizing: "border-box",
          ...(kind === "mangler"
            ? { border: `2px solid ${dark ? c.dark : c.light}` }
            : { backgroundColor: c.main }),
        }}
      />
      {label}
    </Box>
  );
}

// Tidslinje fra første uttak til «dekket til», med markør for i dag.
function Tidslinje({
  b,
  kind,
  dark,
}: {
  b: VareBeregning;
  kind: StatusKind;
  dark: boolean;
}) {
  const c = STATUS_FARGER[kind];
  const brukt = b.dagerSidenForsteUttak ?? 0;
  const igjen = Math.max(b.dagerIgjen ?? 0, 0);
  const total = brukt + igjen;
  const tom = kind === "tom";
  const pct = tom || total <= 0 ? 100 : Math.min(100, Math.max(0, (brukt / total) * 100));
  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          height: 20,
          fontSize: 12,
          color: "text.secondary",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{formatDato(b.forsteUttak)} · første uttak</span>
        {!tom && (
          <Box
            component="span"
            sx={{
              position: "absolute",
              left: `${pct}%`,
              transform: "translateX(-50%)",
              color: "text.primary",
              fontWeight: 600,
              display: { xs: "none", sm: "inline" },
            }}
          >
            I dag
          </Box>
        )}
        <span>{tom ? `I dag ${formatDato(b.dekketTil)}` : `${formatDato(b.dekketTil)} · dekket til`}</span>
      </Box>
      <Box
        role="img"
        aria-label={tom ? "Beholdningen er brukt opp" : `${formatTall(brukt)} av ${formatTall(total)} dager brukt`}
        sx={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          backgroundColor: alpha(c.main, dark ? 0.25 : 0.2),
        }}
      >
        {tom ? (
          <Box sx={{ flex: 1, backgroundColor: c.main }} />
        ) : (
          <>
            <Box sx={{ width: `${pct}%`, backgroundColor: dark ? "#52646A" : "#B9C6C8" }} />
            <Box sx={{ width: 2, backgroundColor: "text.primary" }} />
            <Box sx={{ flex: 1, backgroundColor: c.main }} />
          </>
        )}
      </Box>
    </Box>
  );
}

function ResultTile({
  label,
  value,
  suffix,
  kind,
  dark,
  small,
}: {
  label: string;
  value: string;
  suffix?: string;
  kind: StatusKind;
  dark: boolean;
  small?: boolean;
}) {
  const c = STATUS_FARGER[kind];
  return (
    <Box
      sx={{
        borderRadius: "8px",
        p: 2,
        backgroundColor: alpha(c.main, dark ? 0.14 : 0.09),
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          mt: 0.5,
          fontSize: small ? 22 : 28,
          lineHeight: "32px",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: dark ? c.dark : c.light,
        }}
      >
        {value}
        {suffix ? (
          <Box component="span" sx={{ fontSize: 14, fontWeight: 600, ml: 0.5 }}>
            {suffix}
          </Box>
        ) : null}
      </Typography>
    </Box>
  );
}

export default function LagerbeholdningPage() {
  const baseTheme = useTheme();
  const tealTheme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: { primary: baseTheme.palette.augmentColor({ color: { main: TEAL } }) },
        // Mindre avrunding enn resten av appen: boksene på denne siden skal ha
        // skarpere hjørner.
        shape: { borderRadius: 6 },
        components: {
          // Basistemaet hardkoder rosa hover/fokus på OutlinedInput. Overstyr til
          // sidens teal så feltene matcher resten av lagerbeholdning-siden.
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 6,
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

  const eksempel = useMemo(() => lagEksempel(), []);
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
  // Manuell sammenslåing: gruppenøkkel → gruppa den er slått inn i.
  const [sammenslaing, setSammenslaing] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [openHistorikk, setOpenHistorikk] = useState<Record<string, boolean>>({});
  const [sortering, setSortering] = useState<"navn" | "hastegrad">("navn");
  // Meny for «Svar til kunde» i hurtigoversikten og «Flere valg» på kortene.
  const [svarMeny, setSvarMeny] = useState<{ anchor: HTMLElement; b: VareBeregning } | null>(null);
  // Slått sammen gruppe: velg hvilket preparat som skal med i standardteksten.
  const [velgPreparat, setVelgPreparat] = useState<{
    b: VareBeregning;
    title: string;
    medDato: boolean;
    valgt: string[];
  } | null>(null);
  const [flereMeny, setFlereMeny] = useState<{ anchor: HTMLElement; key: string } | null>(null);

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
  const grupperAuto = useMemo(() => groupByVare(uttak, resolver), [uttak, resolver]);
  const grupper = useMemo(
    () => slaaSammenGrupper(grupperAuto, sammenslaing),
    [grupperAuto, sammenslaing],
  );

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
  // Visningsrekkefølge: alfabetisk (standard) eller etter hastegrad – de som er
  // tomme eller snart tomme først, og de uten dosering sist.
  const visning = useMemo<VareBeregning[]>(() => {
    if (sortering === "navn") return beregninger;
    return [...beregninger].sort((a, b) => {
      const da = a.dagerIgjen ?? Number.POSITIVE_INFINITY;
      const db = b.dagerIgjen ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.varenavn.localeCompare(b.varenavn, "nb");
    });
  }, [beregninger, sortering]);

  useEffect(() => {
    if (!pendingDoseFocusRef.current || visning.length === 0) return;
    const el = doseInputRefs.current[visning[0].key];
    if (el) {
      el.focus();
      pendingDoseFocusRef.current = false;
    }
  }, [visning]);

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
    setSammenslaing({});
    setOpenHistorikk({});
    setReferansedatoInput(toDateInputValue(new Date()));
  }, []);

  // Åpner en standardtekst (matchet på tittel) med preparat forhåndsutfylt.
  // Preparatet slås opp på varenummer i samme katalog som preparatsøket i
  // Standardtekster; faller tilbake på navnet fra lagerbeholdning hvis vnr ikke
  // finnes i katalogen. `medDato` styrer om måneden fra "dekket til" sendes med
  // (kun relevant for "Har fått nok til.." som har et DATO-token).
  const openStandardtekst = useCallback(
    async (
      b: VareBeregning,
      templateTitle: string,
      medDato: boolean,
      medlemmer?: Array<VareMedlem & { erFlytende?: boolean }>,
    ) => {
      setOpeningStandardtekstKey(`${b.key}::${templateTitle}`);

      const valgte: Array<VareMedlem & { erFlytende?: boolean }> = medlemmer?.length
        ? medlemmer
        : [{ varenr: b.varenr ?? "", varenavn: b.varenavn ?? "" }];

      let meds: Awaited<ReturnType<typeof loadMedicationItems>> = [];
      try {
        meds = await loadMedicationItems();
      } catch {
        // Katalogen kunne ikke lastes – behold lagerbeholdning-navnene.
      }

      // Slår opp hvert preparat på varenummer (samme katalog som preparatsøket i
      // Standardtekster) og faller tilbake på navnet fra lagerbeholdning.
      const preparater = valgte.map((m) => {
        let text = (m.varenavn ?? "").trim();
        let formulering = "";
        const vnr = (m.varenr ?? "").replace(/\D/g, "");
        if (vnr) {
          const hit = meds.find((x) => String(x.farmaloggNumber ?? "").replace(/\D/g, "") === vnr);
          const formatted = hit ? formatPreparatForTemplate(hit) : "";
          if (formatted) text = formatted;
          if (hit) formulering = deriveFormuleringBase(hit);
        }
        // Formulering utledes fra preparatnavnet hvis katalogen ikke ga treff.
        // Flytende preparat doseres i ml.
        if (m.erFlytende ?? b.erFlytende) formulering = "ml";
        else if (!formulering) formulering = deriveFormuleringBase({ name: text });
        return {
          preparat: text,
          preparatKey: (m.varenr ?? "").trim() || text,
          formulering,
        };
      });
      const [forste, ...ekstra] = preparater;

      const payload = {
        requestId: Date.now(),
        templateTitle,
        preparat: forste.preparat,
        preparatKey: forste.preparatKey,
        // Ytterligere preparater når flere er valgt i en sammenslått gruppe.
        ekstraPreparater: ekstra,
        datoInput: medDato ? datoMndFromDate(b.dekketTil) : "",
        // Dagsforbruk (ANT) – tomt hvis dosering ikke er oppgitt.
        antall: b.dagligForbruk != null && b.dagligForbruk > 0 ? formatTall(b.dagligForbruk) : "",
        formulering: forste.formulering,
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

  // Standardtekst kan inneholde flere preparater – også ulike legemidler. Finnes det
  // mer enn ett å velge mellom (flere i gruppa, eller flere grønne legemidler),
  // får brukeren velge hvilke som skal med. Det klikkede legemidlet er forhåndsvalgt.
  const startStandardtekst = useCallback(
    (b: VareBeregning, templateTitle: string, medDato: boolean) => {
      const andreGronne = beregninger.filter((g) => g.key !== b.key && statusKind(g) === "gronn");
      if (b.members.length > 1 || andreGronne.length > 0) {
        setVelgPreparat({
          b,
          title: templateTitle,
          medDato,
          valgt: b.members.map((m) => `${b.key}::${m.varenr || m.varenavn}`),
        });
      } else {
        void openStandardtekst(b, templateTitle, medDato);
      }
    },
    [beregninger, openStandardtekst],
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

  const dark = baseTheme.palette.mode === "dark";
  const harInput = input.trim().length > 0;
  const harResultat = visning.length > 0;

  const doseSuffix = (b: VareBeregning, periode: PeriodeValue): string => {
    const enhet = b.erFlytende && (doseEnhetByVare[b.key] ?? "ml") === "mg" ? "mg" : b.enhet || "enheter";
    const per =
      periode === "egendefinert"
        ? "/intervall"
        : (PERIODER.find((p) => p.value === periode)?.label ?? "per dag").replace(/^per /, "/");
    return `${enhet}${per}`;
  };

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
      <Container maxWidth={false} className={styles.appContainer} sx={{ maxWidth: "1600px !important" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            mb: 2.5,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h1" sx={{ m: 0 }}>
              Beregning av lagerbeholdning
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Regn ut beholdning og dekning fra uttakshistorikken til kunden.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              <strong>Uttakshistorikk</strong>: Ctrl + S · <strong>Nullstill</strong>: Escape
            </Typography>

            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => setShowHelp((v) => !v)}
              endIcon={showHelp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", borderRadius: "6px", borderColor: "divider" }}
            >
              {showHelp ? "Skjul bruksanvisning" : "Bruksanvisning"}
            </Button>
          </Box>
        </Box>

        <Collapse in={showHelp} timeout="auto" unmountOnExit>
          <Paper variant="outlined" sx={{ mb: 2.5, p: 2.5, borderRadius: "10px" }}>
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(240px, 270px) minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Venstre: innlesing */}
          <Paper
            component="aside"
            aria-label="Innlesing"
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              position: { lg: "sticky" },
              top: { lg: 16 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Uttakshistorikk</Typography>
              {uttak.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {uttak.length} uttak funnet
                </Typography>
              )}
            </Box>

            <TextField
              placeholder={eksempel}
              inputRef={uttakInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={() => {
                pendingDoseFocusRef.current = true;
              }}
              onFocus={() => setIsUttakFocused(true)}
              onBlur={() => setIsUttakFocused(false)}
              multiline
              minRows={harInput ? 6 : 8}
              maxRows={14}
              fullWidth
              InputProps={{ sx: { fontSize: 13, borderRadius: "6px" } }}
              inputProps={{ "aria-label": "Uttakshistorikk" }}
            />

            {!harInput && (
              <Button
                variant="contained"
                disableElevation
                startIcon={<ContentPasteIcon />}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    const blokk = extractUttakBlock(text);
                    if (blokk) appendUttak(blokk);
                    else uttakInputRef.current?.focus();
                  } catch {
                    uttakInputRef.current?.focus();
                  }
                }}
                sx={{ textTransform: "none", borderRadius: "6px", height: 44, fontWeight: 600 }}
              >
                Lim inn fra utklippstavle
              </Button>
            )}
            {!harInput && (
              <Button
                variant="text"
                size="small"
                onClick={() => setInput(eksempel)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Sett inn eksempel
              </Button>
            )}

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Auto-lim inn</Typography>
              <Tooltip title="Når feltet er aktivt, limes kopiert uttakshistorikk automatisk inn.">
                <Switch
                  checked={autoPasteUttak}
                  onChange={(e) => setAutoPasteUttak(e.target.checked)}
                  inputProps={{ "aria-label": "Auto-lim inn" }}
                />
              </Tooltip>
            </Box>

            <Box sx={{ height: 1, backgroundColor: "divider" }} />

            <TextField
              label="Referansedato"
              type="date"
              value={referansedatoInput}
              onChange={(e) => setReferansedatoInput(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: "6px" } }}
              fullWidth
            />

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RestartAltIcon />}
              onClick={resetAll}
              sx={{ textTransform: "none", borderRadius: "6px", height: 44, fontWeight: 600, borderColor: "divider" }}
            >
              Nullstill alt
            </Button>
          </Paper>

          {/* Høyre: resultater */}
          <Box component="main" sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {!harResultat ? (
              harInput ? (
                <Typography variant="body2" color="error">
                  Klarte ikke å tolke noen uttakslinjer. Sjekk at hver linje har dato, varenummer og
                  mengde.
                </Typography>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: "10px",
                    px: { xs: 2.5, md: 5 },
                    py: { xs: 4, md: 7 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    textAlign: "center",
                  }}
                >
                  <Box>
                    <Typography variant="h2" sx={{ m: 0, fontSize: 22, fontWeight: 600 }}>
                      Start med å lime inn uttakshistorikken
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mt: 1, mx: "auto", maxWidth: 520 }}
                    >
                      Preparater med samme virkestoff og styrke slås sammen automatisk, og du ser hvor
                      lenge kunden har nok.
                    </Typography>
                  </Box>
                  <Box
                    component="ol"
                    sx={{
                      listStyle: "none",
                      m: 0,
                      p: 0,
                      width: "100%",
                      maxWidth: 860,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 2,
                      textAlign: "left",
                    }}
                  >
                    {[
                      {
                        t: "Lim inn",
                        d: "Kopier fra fagsystemet og trykk Ctrl + S, eller slå på auto-lim inn.",
                      },
                      {
                        t: "Oppgi dosering",
                        d: "Fast eller varierende dose per legemiddel. Ulik styrke kan slås sammen og regnes om.",
                      },
                      {
                        t: "Svar kunden",
                        d: "Ved 45 dagers dekning eller mer åpnes standardtekst med preparat og dosering utfylt.",
                      },
                    ].map((steg, i) => (
                      <Box
                        component="li"
                        key={steg.t}
                        sx={{
                          borderRadius: "8px",
                          p: 2.5,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.25,
                          backgroundColor: alpha(TEAL, dark ? 0.1 : 0.06),
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            color: dark ? "#5FD3C6" : "#0B7F72",
                            backgroundColor: alpha(TEAL, dark ? 0.22 : 0.16),
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{steg.t}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {steg.d}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              )
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Typography variant="h2" sx={{ m: 0, fontSize: 18, fontWeight: 600 }}>
                    {visning.length} {visning.length === 1 ? "legemiddel" : "legemidler"}
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={sortering}
                    aria-label="Sortering"
                    onChange={(_e, val) => {
                      if (val) setSortering(val);
                    }}
                    sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, py: 0.5 } }}
                  >
                    <ToggleButton value="navn">Navn</ToggleButton>
                    <Tooltip title="Tomme og snart tomme legemidler øverst">
                      <ToggleButton value="hastegrad">Hastegrad</ToggleButton>
                    </Tooltip>
                  </ToggleButtonGroup>
                </Box>

                {/* Hurtigoversikt: alle legemidler på én linje */}
                <Paper variant="outlined" sx={{ borderRadius: "10px", overflow: "hidden" }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      px: 2,
                      pt: 2,
                      pb: 1.5,
                    }}
                  >
                    <Typography variant="h3" sx={{ m: 0, fontSize: 15, fontWeight: 600 }}>
                      Hurtigoversikt
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fyll inn dose direkte her. «Svar» åpner standardtekstene for legemidler med{" "}
                      {HAR_FATT_NOK_MIN_DAGER} dager eller mer.
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{
                        "& td, & th": { fontVariantNumeric: "tabular-nums", px: 1.25, py: 0.75, fontSize: 13 },
                        "& th": { fontWeight: 600, color: "text.secondary", textTransform: "none", letterSpacing: 0, whiteSpace: "nowrap" },
                        "& td": { verticalAlign: "middle" },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Legemiddel</TableCell>
                          <TableCell>Dose</TableCell>
                          <TableCell align="right">Beholdning</TableCell>
                          <TableCell align="right">Dekket til</TableCell>
                          <TableCell padding="checkbox" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visning.map((b) => {
                          const kind = statusKind(b);
                          const periode = periodeByVare[b.key] ?? "dag";
                          const erVar = periode === "varierende";
                          const kanSvare = kind === "gronn";
                          return (
                            <TableRow key={b.key} hover>
                              <TableCell>
                                <StatusPill label={statusTekst(b, kind)} kind={kind} dark={dark} />
                              </TableCell>
                              <TableCell>
                                <Box
                                  component="a"
                                  href={`#kort-${b.key}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    scrollTilKort(b.key);
                                  }}
                                  sx={{ color: "text.primary", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                                >
                                  {b.varenavn}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  {b.merged
                                    ? `${b.members.length} preparater slått sammen`
                                    : /^(\d{5,7})$/.test(b.varenr)
                                      ? `Varenr ${b.varenr}`
                                      : `${b.antallUttak} uttak`}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {erVar ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Varierende dose
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                                    <TextField
                                      size="small"
                                      placeholder="Dose"
                                      value={doseByVare[b.key] ?? ""}
                                      onChange={(e) =>
                                        setDoseByVare((prev) => ({ ...prev, [b.key]: e.target.value }))
                                      }
                                      inputRef={(el: HTMLInputElement | null) => {
                                        doseInputRefs.current[b.key] = el;
                                      }}
                                      inputProps={{
                                        inputMode: "decimal",
                                        "aria-label": `Dose for ${b.varenavn}`,
                                      }}
                                      sx={{
                                        width: 56,
                                        "& .MuiOutlinedInput-root": { borderRadius: "6px" },
                                        "& input": { py: 0.5, px: 1, fontSize: 13, fontWeight: 600, textAlign: "center" },
                                        "& input::placeholder": { fontSize: 12, fontWeight: 400, opacity: 0.6 },
                                      }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                      {doseSuffix(b, periode)}
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {b.beholdning != null
                                  ? `${formatTall(b.beholdning)}${b.enhet ? ` ${b.enhet}` : ""}`
                                  : "–"}
                              </TableCell>
                              <TableCell align="right">{b.dekketTil ? formatDato(b.dekketTil) : "–"}</TableCell>
                              <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                {kanSvare && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DescriptionOutlinedIcon />}
                                    endIcon={<KeyboardArrowDownIcon />}
                                    onClick={(e) => setSvarMeny({ anchor: e.currentTarget, b })}
                                    sx={{
                                      textTransform: "none",
                                      fontWeight: 600,
                                      borderRadius: "6px",
                                      mr: 0.5,
                                      borderColor: alpha(STATUS_FARGER.gronn.main, 0.5),
                                      color: dark ? STATUS_FARGER.gronn.dark : STATUS_FARGER.gronn.light,
                                    }}
                                  >
                                    Svar
                                  </Button>
                                )}
                                <IconButton
                                  size="small"
                                  aria-label={`Åpne detaljer for ${b.varenavn}`}
                                  onClick={() => scrollTilKort(b.key)}
                                >
                                  <ChevronRightIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {visning.map((b) => {
                  const key = b.key;
                  const kind = statusKind(b);
                  const c = STATUS_FARGER[kind];
                  const accent = c.main;
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
                  const tom = kind === "tom";
                  const gruppeNavn = (k: string) =>
                    grupperAuto.get(k)?.uttak.find((u) => u.varenavn)?.varenavn ?? k;
                  const innslatt = [...grupperAuto.keys()].filter(
                    (k) => k !== key && finnGruppeMaal(grupperAuto, sammenslaing, k) === key,
                  );
                  const kandidater = beregninger.filter((o) => o.key !== key);

                  // Forslag om sammenslåing: samme virkestoff (ATC). Gruppa med lavest
                  // styrke slås inn i den med høyest (10 mg inn i 20 mg), og forslaget
                  // vises på begge kortene med tydelig retning. Dosen angis da i
                  // målgruppas styrke.
                  let forslag: { gjest: string; vert: string; tekst: string; knapp: string } | null = null;
                  if (!b.merged && b.atc) {
                    const denne = grupper.get(key);
                    const denneStyrke = denne ? gruppeStyrke(denne) : null;
                    for (const o of kandidater) {
                      if (o.atc !== b.atc || o.merged) continue;
                      const annen = grupper.get(o.key);
                      const annenStyrke = annen ? gruppeStyrke(annen) : null;
                      const denneErGjest =
                        denneStyrke && annenStyrke && denneStyrke.verdi !== annenStyrke.verdi
                          ? denneStyrke.verdi < annenStyrke.verdi
                          : key > o.key;
                      const gjestKey = denneErGjest ? key : o.key;
                      const vertKey = denneErGjest ? o.key : key;
                      const gjestG = denneErGjest ? denne : annen;
                      const vertG = denneErGjest ? annen : denne;
                      const gjestNavn = denneErGjest ? b.varenavn : o.varenavn;
                      const vertNavn = denneErGjest ? o.varenavn : b.varenavn;
                      const gS = gjestG ? gruppeStyrke(gjestG) : null;
                      const vS = vertG ? gruppeStyrke(vertG) : null;
                      const faktor = gjestG && vertG ? styrkeFaktor(gjestG, vertG) : 1;
                      const omregning =
                        faktor !== 1 && gS && vS
                          ? `1 stk à ${formatTall(gS.verdi)} ${gS.enhet} teller som ${formatTall(faktor)} stk à ${formatTall(vS.verdi)} ${vS.enhet}. Dosen angis i ${formatTall(vS.verdi)} ${vS.enhet}.`
                          : "Samme styrke og form, så forbruket ikke telles to ganger.";
                      forslag = {
                        gjest: gjestKey,
                        vert: vertKey,
                        tekst: denneErGjest
                          ? `Slå inn i ${vertNavn}. ${omregning}`
                          : `${gjestNavn} kan slås inn her. ${omregning}`,
                        knapp: denneErGjest ? "Slå inn i " + (vS ? `${formatTall(vS.verdi)} ${vS.enhet}` : "den andre") : "Slå inn her",
                      };
                      break;
                    }
                  }

                  const metaDeler = [
                    !b.merged && b.virkestoff ? b.virkestoff.charAt(0).toUpperCase() + b.virkestoff.slice(1) : null,
                    b.atc ? `ATC ${b.atc}` : null,
                    !b.merged && /^(\d{5,7})$/.test(b.varenr) ? `Varenr ${b.varenr}` : null,
                    `${b.antallUttak} uttak`,
                    `${formatTall(b.totaltHentet)}${b.enhet ? ` ${b.enhet}` : ""} hentet`,
                    b.sisteUttak ? `siste ${formatDato(b.sisteUttak)}` : null,
                  ].filter(Boolean);

                  return (
                    <Paper
                      key={key}
                      id={`kort-${key}`}
                      component="section"
                      aria-label={b.varenavn}
                      variant="outlined"
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: "10px",
                        borderLeft: `4px solid ${accent}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2.5,
                        scrollMarginTop: 16,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 1.5,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              flex: "none",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: dark ? c.dark : c.light,
                              backgroundColor: alpha(accent, dark ? 0.18 : 0.12),
                            }}
                          >
                            <Inventory2OutlinedIcon />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h3" sx={{ m: 0, fontSize: 19, lineHeight: "24px", fontWeight: 600 }}>
                              {b.varenavn}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                              {metaDeler.join(" · ")}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <StatusPill label={statusTekst(b, kind)} kind={kind} dark={dark} />
                          <Tooltip title="Flere valg">
                            <IconButton
                              aria-label={`Flere valg for ${b.varenavn}`}
                              onClick={(e) => setFlereMeny({ anchor: e.currentTarget, key })}
                              sx={{ border: 1, borderColor: "divider", borderRadius: "6px" }}
                            >
                              <MoreHorizIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {kind === "gronn" && (
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 1.25,
                            borderRadius: "8px",
                            px: 1.75,
                            py: 1.25,
                            border: `1px solid ${alpha(TEAL, 0.3)}`,
                            backgroundColor: alpha(TEAL, dark ? 0.12 : 0.07),
                          }}
                        >
                          <Typography
                            sx={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: dark ? "#5FD3C6" : "#0B6B60" }}
                          >
                            Svar til kunde
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {STANDARDTEKSTER.map(({ title, label, medDato }) => {
                              const busyAny = Boolean(openingStandardtekstKey?.startsWith(`${key}::`));
                              const busy = openingStandardtekstKey === `${key}::${title}`;
                              return (
                                <Button
                                  key={title}
                                  variant="outlined"
                                  size="small"
                                  onClick={() => startStandardtekst(b, title, medDato)}
                                  disabled={busyAny}
                                  startIcon={
                                    busy ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : (
                                      <DescriptionOutlinedIcon />
                                    )
                                  }
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "6px",
                                    height: 36,
                                    backgroundColor: "background.paper",
                                    borderColor: alpha(TEAL, 0.45),
                                    color: dark ? "#5FD3C6" : "#0B6B60",
                                    "&:hover": { borderColor: TEAL },
                                  }}
                                >
                                  {label}
                                </Button>
                              );
                            })}
                          </Box>
                        </Box>
                      )}

                      {b.merged ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Typography variant="caption" color="text.secondary">
                            Slått sammen:
                          </Typography>
                          {b.members.map((m) => (
                            <Chip
                              key={m.varenr || m.varenavn}
                              size="small"
                              variant="outlined"
                              label={
                                /^(\d{5,7})$/.test(m.varenr) ? `${m.varenavn} · ${m.varenr}` : m.varenavn
                              }
                              sx={{ maxWidth: "100%" }}
                            />
                          ))}
                        </Box>
                      ) : null}

                      {innslatt.length > 0 ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          {innslatt.map((k) => (
                            <Chip
                              key={k}
                              size="small"
                              variant="outlined"
                              label={`Manuelt slått inn: ${gruppeNavn(k)}`}
                              onDelete={() =>
                                setSammenslaing((prev) => {
                                  const next = { ...prev };
                                  delete next[k];
                                  return next;
                                })
                              }
                              sx={{ maxWidth: "100%" }}
                            />
                          ))}
                        </Box>
                      ) : null}

                      {forslag && (
                        <Box
                          role="note"
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 1.5,
                            borderRadius: "8px",
                            px: 2,
                            py: 1.25,
                            border: `1px solid ${alpha(TEAL, 0.3)}`,
                            backgroundColor: alpha(TEAL, dark ? 0.12 : 0.07),
                          }}
                        >
                          <CallMergeIcon sx={{ color: dark ? "#5FD3C6" : "#0B7F72" }} />
                          <Typography variant="body2" sx={{ flex: "1 1 260px" }}>
                            <strong>Samme virkestoff.</strong> {forslag.tekst}
                          </Typography>
                          <Button
                            variant="contained"
                            disableElevation
                            size="small"
                            onClick={() =>
                              setSammenslaing((prev) => ({ ...prev, [forslag!.gjest]: forslag!.vert }))
                            }
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "6px", height: 36 }}
                          >
                            {forslag.knapp}
                          </Button>
                        </Box>
                      )}

                      {harBeholdning && <Tidslinje b={b} kind={kind} dark={dark} />}

                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 3,
                          alignItems: "stretch",
                        }}
                      >
                        <Box
                          sx={{
                            flex: "1 1 300px",
                            borderRadius: "8px",
                            p: 2,
                            backgroundColor: dark ? alpha("#fff", 0.04) : "#F6F9F9",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Dosering</Typography>
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
                                              sx={{ "& .MuiToggleButton-root": { textTransform: "none", py: 0.25, px: 1.25, fontSize: 13 } }}
                                            >
                                              <ToggleButton value="fast">
                                                <Tooltip title="Samme mengde med jevne mellomrom – f.eks. 1 tablett hver dag eller 2 per uke.">
                                                  <span>Fast</span>
                                                </Tooltip>
                                              </ToggleButton>
                                              <ToggleButton value="varierende">
                                                <Tooltip title="Ulik mengde gjennom uka eller måneden – f.eks. Marevan 1 tablett 5 dager + ½ tablett 2 dager i uka.">
                                                  <span>Varierende</span>
                                                </Tooltip>
                                              </ToggleButton>
                                            </ToggleButtonGroup>
                          </Box>
                  <Box>
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

                    {mgModus && (
                      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 1 }}>
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
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <TextField
                          label="Dose"
                          placeholder="f.eks. 1"
                          value={doseByVare[key] ?? ""}
                          onChange={(e) =>
                            setDoseByVare((prev) => ({ ...prev, [key]: e.target.value }))
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
                          sx={{ flex: "1 1 120px", minWidth: 0 }}
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
                          sx={{ flex: "1 1 130px", minWidth: 0 }}
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
                              sx={{ flex: "1 1 100px", minWidth: 0 }}
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
                              sx={{ flex: "1 1 100px", minWidth: 0 }}
                            >
                              {EGEN_ENHETER.map((enh) => (
                                <MenuItem key={enh.value} value={enh.value}>
                                  {enh.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ mt: 0.25 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Én linje per dosenivå. Summen regnes om til snitt-dagsforbruk over{" "}
                          {varierendeGrunnInfo.iLabel}.
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
                          sx={{ width: "100%", mb: 1.5 }}
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
                            <Box
                              key={i}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto",
                                alignItems: "center",
                                gap: 1,
                              }}
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
                                      dager
                                    </InputAdornment>
                                  ),
                                }}
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
                            </Box>
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
                        </Box>

                        <Box sx={{ flex: "2 1 420px" }}>
                          {harBeholdning ? (
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                                gap: 1.5,
                              }}
                            >
                              <ResultTile
                                label="Beholdning nå"
                                value={formatTall(b.beholdning as number)}
                                suffix={b.enhet || undefined}
                                kind={kind}
                                dark={dark}
                              />
                              <ResultTile
                                label="Dager igjen"
                                value={tom ? "Tom" : formatTall(b.dagerIgjen as number)}
                                suffix={tom ? undefined : "dager"}
                                kind={kind}
                                dark={dark}
                              />
                              <ResultTile
                                label={tom ? "Tom siden" : "Dekket til"}
                                value={formatDato(b.dekketTil)}
                                kind={kind}
                                dark={dark}
                                small
                              />
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "8px",
                                p: 2,
                                border: "1.5px dashed",
                                borderColor: "divider",
                              }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                <strong>Oppgi dosering</strong> for å se beholdning, dager igjen og dekning.
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {harBeholdning && kind !== "gronn" && (
                        <Typography variant="caption" color="text.secondary">
                          Standardtekster vises når dekningen er {HAR_FATT_NOK_MIN_DAGER} dager eller mer.
                        </Typography>
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
                                  {u.mengde != null ? `${formatTall(u.mengde)}${u.enhet ? ` ${u.enhet}` : ""}${u.omregningsfaktor ? ` (×${formatTall(u.omregningsfaktor)})` : ""}` : "–"}
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
              </>
            )}
          </Box>
        </Box>

        {/* Valg av preparater: fra flere preparater i gruppa og fra andre legemidler */}
        {(() => {
          const v = velgPreparat;
          const grupperValg = v
            ? [
                v.b,
                ...beregninger.filter((g) => g.key !== v.b.key && statusKind(g) === "gronn"),
              ]
            : [];
          const alle = grupperValg.flatMap((g) =>
            g.members.map((m) => ({ g, m, id: `${g.key}::${m.varenr || m.varenavn}` })),
          );
          return (
            <Dialog open={Boolean(v)} onClose={() => setVelgPreparat(null)} fullWidth maxWidth="xs">
              <DialogTitle sx={{ pb: 0.5 }}>Hvilke preparater skal med i teksten?</DialogTitle>
              <DialogContent sx={{ px: 1, pb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1 }}>
                  Du kan velge flere, også fra ulike legemidler. Dosering og dato hentes fra{" "}
                  {v?.b.varenavn}.
                </Typography>
                {grupperValg.map((g, gi) => (
                  <Box key={g.key} sx={{ mb: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", px: 2, pt: gi === 0 ? 0 : 1, fontWeight: 600 }}
                    >
                      {g.varenavn}
                      {gi === 0 ? " · valgt" : ""}
                    </Typography>
                    <List disablePadding>
                      {g.members.map((m) => {
                        const id = `${g.key}::${m.varenr || m.varenavn}`;
                        const valgt = Boolean(v?.valgt.includes(id));
                        return (
                          <ListItemButton
                            key={id}
                            onClick={() =>
                              setVelgPreparat((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      valgt: valgt
                                        ? prev.valgt.filter((x) => x !== id)
                                        : [...prev.valgt, id],
                                    }
                                  : prev,
                              )
                            }
                            sx={{ borderRadius: "6px", py: 0.25 }}
                          >
                            <Checkbox edge="start" checked={valgt} tabIndex={-1} disableRipple sx={{ mr: 1 }} />
                            <ListItemText
                              primary={m.varenavn}
                              secondary={/^(\d{5,7})$/.test(m.varenr) ? `Varenr ${m.varenr}` : undefined}
                              primaryTypographyProps={{ fontWeight: 600 }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Box>
                ))}
              </DialogContent>
              <DialogActions sx={{ px: 2.5, pb: 2 }}>
                <Button onClick={() => setVelgPreparat(null)} sx={{ textTransform: "none" }}>
                  Avbryt
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={!v || v.valgt.length === 0}
                  onClick={() => {
                    if (!v) return;
                    setVelgPreparat(null);
                    const medlemmer = alle
                      .filter((x) => v.valgt.includes(x.id))
                      .map((x) => ({ ...x.m, erFlytende: x.g.erFlytende }));
                    void openStandardtekst(v.b, v.title, v.medDato, medlemmer);
                  }}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Åpne standardtekst
                </Button>
              </DialogActions>
            </Dialog>
          );
        })()}

        {/* «Svar»-meny fra hurtigoversikten */}
        <Menu
          anchorEl={svarMeny?.anchor ?? null}
          open={Boolean(svarMeny)}
          onClose={() => setSvarMeny(null)}
        >
          <ListSubheader sx={{ lineHeight: "32px" }}>Svar til kunde</ListSubheader>
          {STANDARDTEKSTER.map(({ title, label, medDato }) => (
            <MenuItem
              key={title}
              onClick={() => {
                const valgt = svarMeny?.b;
                setSvarMeny(null);
                if (valgt) startStandardtekst(valgt, title, medDato);
              }}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>

        {/* «Flere valg» på kortene: manuell sammenslåing */}
        <Menu
          anchorEl={flereMeny?.anchor ?? null}
          open={Boolean(flereMeny)}
          onClose={() => setFlereMeny(null)}
        >
          {(() => {
            const mk = flereMeny?.key;
            if (!mk) return null;
            const kand = beregninger.filter((o) => o.key !== mk);
            if (kand.length === 0) {
              return (
                <MenuItem disabled>Ingen andre legemidler å slå sammen med</MenuItem>
              );
            }
            const items = [
              <ListSubheader key="hdr" sx={{ lineHeight: "32px" }}>
                Slå sammen med…
              </ListSubheader>,
              ...kand.map((o) => {
                const fra = grupper.get(o.key);
                const til = grupper.get(mk);
                const faktor = fra && til ? styrkeFaktor(fra, til) : 1;
                const fraStyrke = fra ? gruppeStyrke(fra) : null;
                const tilStyrke = til ? gruppeStyrke(til) : null;
                return (
                  <MenuItem
                    key={o.key}
                    onClick={() => {
                      setSammenslaing((prev) => ({ ...prev, [o.key]: mk }));
                      setFlereMeny(null);
                    }}
                    sx={{ whiteSpace: "normal", maxWidth: 420 }}
                  >
                    <Box>
                      {o.varenavn}
                      {faktor !== 1 && fraStyrke && tilStyrke ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {`Ulik styrke: 1 stk à ${formatTall(fraStyrke.verdi)} ${fraStyrke.enhet} teller som ${formatTall(faktor)} stk à ${formatTall(tilStyrke.verdi)} ${tilStyrke.enhet}`}
                        </Typography>
                      ) : null}
                    </Box>
                  </MenuItem>
                );
              }),
            ];
            return items;
          })()}
        </Menu>
      </Container>
    </ThemeProvider>
  );

}
