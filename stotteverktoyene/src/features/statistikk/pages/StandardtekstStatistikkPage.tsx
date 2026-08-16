import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../../../firebase/firebase";
import { standardTeksterApi } from "../../standardtekster/services/standardTeksterApi";
import type { StandardTekst } from "../../standardtekster/types";
import {
  addDays,
  canNavigateForward,
  endOfMonth,
  formatNorDate,
  formatPeriodLabel,
  getRangeForAnchor,
  listDateKeys,
  shiftAnchorByMode,
  startOfIsoWeekMonday,
  toDateKey,
  type ViewMode,
} from "../lib/period";

const numberFormat = new Intl.NumberFormat("nb-NO");

const ALL_CATEGORIES = "__alle__";

/**
 * Kopigrad (kopieringer ÷ åpninger) er bare et signal når teksten faktisk er
 * åpnet noen ganger. Uten en terskel ville én åpning som ble kopiert gitt
 * 100 % og toppet lista foran tekster med reell bruk.
 */
const MIN_OPENS_FOR_COPY_RATE = 5;

type SortMode = "copies-desc" | "copies-asc" | "copy-rate" | "updated" | "title";

const SORT_OPTIONS: { value: SortMode; label: string; hint: string }[] = [
  { value: "copies-desc", label: "Mest kopiert", hint: "Hva brukes mest" },
  { value: "copies-asc", label: "Minst kopiert", hint: "Kandidater for opprydding" },
  {
    value: "copy-rate",
    label: "Lavest kopigrad",
    hint: `Åpnes, men kopieres sjelden – fra ${MIN_OPENS_FOR_COPY_RATE} åpninger`,
  },
  { value: "updated", label: "Sist endret", hint: "Blir nye tekster tatt i bruk?" },
  { value: "title", label: "Tittel A–Å", hint: "Finn en bestemt tekst" },
];

type RankedRow = {
  id: string;
  title: string;
  category?: string;
  copies: number;
  opens: number;
  /** Kopieringer ÷ åpninger i prosent. null når teksten er åpnet for få ganger til at tallet betyr noe. */
  copyRate: number | null;
  updatedAt: Date | null;
  /** Teksten finnes i usage-loggen, men ikke lenger i Standardtekster-biblioteket. */
  isDeleted: boolean;
};

type TextUsage = { copies: number; opens: number };

function asCount(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function compareRows(a: RankedRow, b: RankedRow, mode: SortMode): number {
  const byTitle = () => a.title.localeCompare(b.title, "nb");

  switch (mode) {
    case "copies-asc":
      return a.copies - b.copies || byTitle();

    case "copy-rate": {
      // Tekster under åpningsterskelen har ingen meningsfull kopigrad. De skyves
      // bakerst i stedet for å filtreres bort, så lista fortsatt viser helheten.
      if (a.copyRate == null || b.copyRate == null) {
        if (a.copyRate == null && b.copyRate == null) return b.opens - a.opens || byTitle();
        return a.copyRate == null ? 1 : -1;
      }
      // Flest åpninger først ved lik grad – der er problemet størst i praksis.
      return a.copyRate - b.copyRate || b.opens - a.opens || byTitle();
    }

    case "updated": {
      const at = a.updatedAt?.getTime() ?? -Infinity;
      const bt = b.updatedAt?.getTime() ?? -Infinity;
      return bt - at || byTitle();
    }

    case "title":
      return byTitle();

    case "copies-desc":
    default:
      return b.copies - a.copies || byTitle();
  }
}

/**
 * Summerer kopieringer og åpninger per standardtekst over alle datoene i
 * perioden. Ett Firestore-kall per dato – maks 31 for månedsvisning.
 *
 * Hele samlingen leses, ikke bare dokumenter med kopieringer: en tekst som blir
 * åpnet uten å bli kopiert er nettopp det kopigrad-sorteringen skal finne.
 */
async function fetchUsageByText(dateKeys: string[]): Promise<Map<string, TextUsage>> {
  const snapshots = await Promise.all(
    dateKeys.map((dateKey) => getDocs(collection(db, "usage_daily", dateKey, "standardtekster")))
  );

  const totals = new Map<string, TextUsage>();

  for (const snap of snapshots) {
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const copies = asCount(data.copies);
      const opens = asCount(data.opens);
      if (!copies && !opens) continue;

      const prev = totals.get(docSnap.id);
      if (prev) {
        prev.copies += copies;
        prev.opens += opens;
      } else {
        totals.set(docSnap.id, { copies, opens });
      }
    }
  }

  return totals;
}

export default function StandardtekstStatistikkPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>(ALL_CATEGORIES);
  const [showUnused, setShowUnused] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<SortMode>("copies-desc");

  const [library, setLibrary] = React.useState<StandardTekst[]>([]);
  const [usageByText, setUsageByText] = React.useState<Map<string, TextUsage>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const range = React.useMemo(() => getRangeForAnchor(anchor, viewMode), [anchor, viewMode]);
  const dateKeys = React.useMemo(() => listDateKeys(range.from, range.to), [range]);

  // Perioden kan byttes mens en henting er underveis. Uten denne vakten kunne et
  // tregt svar for forrige periode landet etter et raskt svar for den nye, og
  // etterlatt tallene i utakt med etiketten. Bare den nyeste får skrive state.
  const latestRequestRef = React.useRef(0);

  const load = React.useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const [texts, totals] = await Promise.all([
        standardTeksterApi.fetchAll(),
        fetchUsageByText(dateKeys),
      ]);

      if (isStale()) return;

      setLibrary(texts);
      setUsageByText(totals);
    } catch (err) {
      if (isStale()) return;

      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.toLowerCase().includes("permission")
          ? "Du mangler tilgang til bruksloggen. Statistikken krever admin-rolle."
          : `Kunne ikke hente statistikk: ${message}`
      );
    } finally {
      // La spinneren stå hvis en nyere henting har overtatt – den slår den av.
      if (!isStale()) setIsLoading(false);
    }
  }, [dateKeys]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const text of library) {
      const value = text.category?.trim();
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "nb"));
  }, [library]);

  /** Hele biblioteket sammenstilt med bruksstallene, mest kopiert først. */
  const allRows = React.useMemo<RankedRow[]>(() => {
    const toRow = (usage: TextUsage | undefined) => {
      const copies = usage?.copies ?? 0;
      const opens = usage?.opens ?? 0;
      return {
        copies,
        opens,
        copyRate: opens >= MIN_OPENS_FOR_COPY_RATE ? (copies / opens) * 100 : null,
      };
    };

    const rows: RankedRow[] = library.map((text) => ({
      id: text.id,
      title: text.title,
      category: text.category?.trim() || undefined,
      updatedAt: text.updatedAt ?? null,
      isDeleted: false,
      ...toRow(usageByText.get(text.id)),
    }));

    // Tekster som er slettet fra biblioteket, men som har bruk i perioden.
    const knownIds = new Set(library.map((text) => text.id));
    for (const [id, usage] of usageByText) {
      if (knownIds.has(id)) continue;
      rows.push({
        id,
        title: "Slettet standardtekst",
        updatedAt: null,
        isDeleted: true,
        ...toRow(usage),
      });
    }

    // Basissorteringen holdes på kopieringer slik at "mest brukt"-KPI-en kan
    // lese første rad uansett hvilken sortering brukeren har valgt i lista.
    return rows.sort((a, b) => compareRows(a, b, "copies-desc"));
  }, [library, usageByText]);

  const totals = React.useMemo(() => {
    // Kopieringer summeres over alle rader, inkludert slettede tekster – de er
    // faktisk bruk og vises i listen. Dekning måles derimot mot biblioteket, så
    // der teller vi bare tekster som fortsatt finnes. Ellers kunne "tekster i
    // bruk" overstige biblioteket og dekningen bomme over 100 %.
    const totalCopies = allRows.reduce((sum, row) => sum + row.copies, 0);
    const usedCount = allRows.filter((row) => !row.isDeleted && row.copies > 0).length;
    const libraryCount = library.length;
    const top = allRows.find((row) => row.copies > 0);

    return {
      totalCopies,
      usedCount,
      libraryCount,
      unusedCount: Math.max(0, libraryCount - usedCount),
      coverage: libraryCount > 0 ? Math.round((usedCount / libraryCount) * 100) : 0,
      topTitle: top?.title ?? "–",
      topCopies: top?.copies ?? 0,
    };
  }, [allRows, library.length]);

  // Uten kopieringer i perioden ville "skjul ubrukte" tømt hele lista og fått
  // biblioteket til å se tomt ut. Da viser vi alt, uavhengig av knappen.
  const noCopiesInPeriod = !isLoading && !error && totals.totalCopies === 0;
  const showUnusedEffective = showUnused || noCopiesInPeriod;

  const filteredRows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    return allRows
      .filter((row) => {
        if (category !== ALL_CATEGORIES && row.category !== category) return false;
        if (needle && !row.title.toLowerCase().includes(needle)) return false;

        if (!showUnusedEffective) {
          // I kopigrad-modus er en tekst uten åpninger den ubrukte – en tekst med
          // mange åpninger og null kopieringer er tvert imot hele poenget.
          const isUnused = sortMode === "copy-rate" ? row.opens === 0 : row.copies === 0;
          if (isUnused) return false;
        }

        return true;
      })
      .sort((a, b) => compareRows(a, b, sortMode));
  }, [allRows, category, search, showUnusedEffective, sortMode]);

  const maxCopies = filteredRows.length > 0 ? Math.max(...filteredRows.map((r) => r.copies)) : 0;
  const hasHiddenUnused =
    !showUnusedEffective &&
    allRows.some((row) => (sortMode === "copy-rate" ? row.opens === 0 : row.copies === 0));

  const kpiCards = [
    {
      title: "Kopieringer",
      value: numberFormat.format(totals.totalCopies),
      description: `${dateKeys.length} ${dateKeys.length === 1 ? "dag" : "dager"} i perioden`,
    },
    {
      title: "Tekster i bruk",
      value: `${numberFormat.format(totals.usedCount)} / ${numberFormat.format(totals.libraryCount)}`,
      description: `${totals.unusedCount} tekster ble ikke brukt`,
    },
    {
      title: "Dekning",
      value: `${totals.coverage} %`,
      description: "Andel av biblioteket som ble kopiert",
    },
    {
      title: "Mest brukt",
      value: totals.topCopies > 0 ? numberFormat.format(totals.topCopies) : "–",
      description: totals.topTitle,
    },
  ];

  const forwardEnabled = canNavigateForward(anchor, viewMode);

  // Inneværende uke/måned kappes ved dagens dato. Uten dette leses etiketten
  // som om hele kalenderperioden er med i tallene.
  const periodLabel = React.useMemo(() => {
    const base = formatPeriodLabel(anchor, viewMode);
    if (viewMode === "day") return base;

    const calendarEnd =
      viewMode === "week" ? addDays(startOfIsoWeekMonday(anchor), 6) : endOfMonth(anchor);

    return toDateKey(range.to) < toDateKey(calendarEnd) ? `${base} (til i dag)` : base;
  }, [anchor, viewMode, range.to]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          width: "100%",
          flex: "1 1 auto",
          display: "flex",
          overflow: "hidden",
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
        }}
      >
        <Paper
          sx={{
            width: "100%",
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h2" gutterBottom={false}>
                Tekststatistikk
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Hvilke standardtekster som faktisk blir kopiert – og hvilke som bare blir åpnet
              </Typography>
            </Box>

            <Tooltip title="Hent på nytt">
              <IconButton
                onClick={() => void load()}
                disabled={isLoading}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
              >
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                position: "sticky",
                top: 0,
                zIndex: 5,
                backgroundColor: "background.paper",
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", lg: "center" }}
              >
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={viewMode}
                  onChange={(_, next: ViewMode | null) => {
                    if (!next) return;
                    setViewMode(next);
                    setAnchor(new Date());
                  }}
                >
                  <ToggleButton value="day">Dag</ToggleButton>
                  <ToggleButton value="week">Uke</ToggleButton>
                  <ToggleButton value="month">Måned</ToggleButton>
                </ToggleButtonGroup>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 0.5 }}
                >
                  <IconButton
                    aria-label="Forrige periode"
                    size="small"
                    onClick={() => setAnchor((prev) => shiftAnchorByMode(prev, viewMode, -1))}
                    disabled={isLoading}
                  >
                    <ChevronLeftRoundedIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{ minWidth: 190, textAlign: "center", px: 0.5, fontWeight: 600 }}
                  >
                    {periodLabel}
                  </Typography>
                  <IconButton
                    aria-label="Neste periode"
                    size="small"
                    onClick={() => setAnchor((prev) => shiftAnchorByMode(prev, viewMode, 1))}
                    disabled={isLoading || !forwardEnabled}
                  >
                    <ChevronRightRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Box sx={{ flex: 1 }} />

                <TextField
                  size="small"
                  placeholder="Søk i tittel"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: { xs: "auto", sm: 220 } }}
                />

                <TextField
                  size="small"
                  select
                  label="Kategori"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value={ALL_CATEGORIES}>Alle kategorier</MenuItem>
                  {categories.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  select
                  label="Sorter etter"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  sx={{ minWidth: 190 }}
                  SelectProps={{
                    // Uten dette ville hjelpeteksten i menyen også vises i selve feltet.
                    renderValue: (value) =>
                      SORT_OPTIONS.find((option) => option.value === value)?.label ?? "",
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body2">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.hint}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <Tooltip
                  title={
                    noCopiesInPeriod
                      ? "Ingen kopieringer i perioden – hele biblioteket vises"
                      : sortMode === "copy-rate"
                        ? "Ta med tekster som aldri ble åpnet"
                        : "Ta med tekster som aldri ble kopiert"
                  }
                >
                  <Box component="span" sx={{ display: "inline-flex" }}>
                    <ToggleButton
                      size="small"
                      value="unused"
                      selected={showUnusedEffective}
                      disabled={noCopiesInPeriod}
                      onChange={() => setShowUnused((v) => !v)}
                      sx={{ whiteSpace: "nowrap", px: 1.5 }}
                    >
                      Vis ubrukte
                    </ToggleButton>
                  </Box>
                </Tooltip>
              </Stack>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {!error && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {kpiCards.map((card) => (
                    <Paper key={card.title} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        {card.title}
                      </Typography>
                      <Typography variant="h5" sx={{ lineHeight: 1.15, fontWeight: 800, mt: 0.25 }}>
                        {card.value}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          mt: 0.75,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={card.description}
                      >
                        {card.description}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                {noCopiesInPeriod && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    Ingen kopieringer er logget i denne perioden, så hele biblioteket vises.
                    Kopiering per tekst begynner å telles først når denne versjonen er i bruk –
                    historikk fra før finnes ikke.
                  </Alert>
                )}

                {sortMode === "copy-rate" && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    Kopigrad = kopieringer ÷ åpninger, for tekster med minst{" "}
                    {MIN_OPENS_FOR_COPY_RATE} åpninger. Åpninger ble logget før kopieringer, så
                    perioder fra før kopiering per tekst begynte å telles gir kunstig lav kopigrad.
                  </Alert>
                )}

                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Rangering
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {numberFormat.format(filteredRows.length)}{" "}
                      {filteredRows.length === 1 ? "tekst" : "tekster"}
                    </Typography>
                  </Stack>

                  {filteredRows.length === 0 ? (
                    <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Ingen tekster å vise med gjeldende filtre.
                      </Typography>
                      {hasHiddenUnused && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setShowUnused(true)}
                          sx={{ mt: 1.5 }}
                        >
                          Vis ubrukte tekster
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      {filteredRows.map((row, index) => {
                        const share =
                          totals.totalCopies > 0 ? (row.copies / totals.totalCopies) * 100 : 0;

                        // Tallkolonnen og stolpen viser det kriteriet lista er
                        // sortert på – ellers ser rekkefølgen tilfeldig ut.
                        const isRateMode = sortMode === "copy-rate";
                        const barWidth = isRateMode
                          ? (row.copyRate ?? 0)
                          : maxCopies > 0
                            ? (row.copies / maxCopies) * 100
                            : 0;

                        const value = isRateMode
                          ? row.copyRate != null
                            ? `${Math.round(row.copyRate)} %`
                            : "–"
                          : numberFormat.format(row.copies);

                        const caption = isRateMode
                          ? `${numberFormat.format(row.copies)} av ${numberFormat.format(row.opens)}`
                          : sortMode === "updated"
                            ? row.updatedAt
                              ? formatNorDate(row.updatedAt)
                              : "Ukjent dato"
                            : share >= 0.1
                              ? `${share.toFixed(1)} %`
                              : "–";

                        // Førsteplassen utheves bare når lista faktisk rangerer
                        // etter mest brukt. Ellers ville "minst kopiert" fått en
                        // vinnermarkering på den svakeste teksten.
                        const isTop = index === 0 && sortMode === "copies-desc" && row.copies > 0;

                        return (
                          <Box
                            key={row.id}
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "auto minmax(0, 1fr) auto",
                              alignItems: "center",
                              gap: 1.5,
                              px: 2,
                              py: 1.25,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              transition: "background-color 140ms ease",
                              "&:last-of-type": { borderBottom: "none" },
                              "&:hover": { backgroundColor: "action.hover" },
                            }}
                          >
                            <Box
                              sx={(theme) => ({
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 13,
                                fontWeight: 800,
                                color: isTop
                                  ? theme.palette.primary.contrastText
                                  : "text.secondary",
                                backgroundColor: isTop
                                  ? theme.palette.primary.main
                                  : alpha(theme.palette.text.primary, 0.06),
                              })}
                            >
                              {index + 1}
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.75}
                                sx={{ minWidth: 0 }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    color: row.isDeleted ? "text.secondary" : "text.primary",
                                    fontStyle: row.isDeleted ? "italic" : "normal",
                                  }}
                                  title={row.isDeleted ? `${row.title} (${row.id})` : row.title}
                                >
                                  {row.title}
                                </Typography>
                                {row.category && (
                                  <Chip
                                    label={row.category}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: 11, flexShrink: 0 }}
                                  />
                                )}
                              </Stack>

                              <Box
                                sx={(theme) => ({
                                  mt: 0.75,
                                  height: 6,
                                  borderRadius: 999,
                                  backgroundColor: alpha(theme.palette.text.primary, 0.07),
                                  overflow: "hidden",
                                })}
                              >
                                <Box
                                  sx={(theme) => ({
                                    width: `${barWidth}%`,
                                    height: "100%",
                                    borderRadius: 999,
                                    transition: "width 260ms ease",
                                    background: `linear-gradient(90deg, ${alpha(
                                      theme.palette.primary.main,
                                      0.7
                                    )} 0%, ${theme.palette.primary.main} 100%)`,
                                  })}
                                />
                              </Box>
                            </Box>

                            <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 88 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                {value}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                {caption}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
