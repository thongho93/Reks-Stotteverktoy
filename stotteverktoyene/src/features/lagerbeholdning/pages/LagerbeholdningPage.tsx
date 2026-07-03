import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  FormControlLabel,
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

const TEAL = "#0E9F8E";

const EKSEMPEL = `489 d. 17.02.2025 169052 Pinex brusetab 500 mg 20 STK\t5\t100 STK
26 d. 22.01.2025 169052 Pinex brusetab 500 mg 20 STK\t1\t20 STK`;

const formatTall = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
};

// Doseringsperioder. Ukentlig/månedlig/intervall-dosering regnes om til et
// gjennomsnittlig dagsforbruk (antall ÷ dager i perioden) som beregningen bruker.
// "egendefinert" lar brukeren oppgi et fritt intervall i dager (hver N. dag).
const PERIODER = [
  { value: "dag", label: "per dag", dager: 1 },
  { value: "uke", label: "per uke", dager: 7 },
  { value: "2uker", label: "per 2 uker", dager: 14 },
  { value: "4uker", label: "per 4 uker", dager: 28 },
  { value: "maaned", label: "per måned", dager: 30 },
  { value: "egendefinert", label: "Egendefinert…", dager: null },
] as const;

type PeriodeValue = (typeof PERIODER)[number]["value"];

// Antall dager i valgt periode. Returnerer null hvis egendefinert intervall ikke
// er oppgitt/gyldig, slik at beregningen lar være å regne ut dagsforbruk.
const periodeDager = (value: string, egendager: string): number | null => {
  if (value === "egendefinert") {
    const n = Number(egendager.trim().replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return PERIODER.find((p) => p.value === value)?.dager ?? 1;
};

export default function LagerbeholdningPage() {
  const baseTheme = useTheme();
  const tealTheme = useMemo(
    () => createTheme(baseTheme, { palette: { primary: baseTheme.palette.augmentColor({ color: { main: TEAL } }) } }),
    [baseTheme],
  );

  const [input, setInput] = useState("");
  const [referansedatoInput, setReferansedatoInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [doseByVare, setDoseByVare] = useState<Record<string, string>>({});
  const [periodeByVare, setPeriodeByVare] = useState<Record<string, PeriodeValue>>({});
  const [egendagerByVare, setEgendagerByVare] = useState<Record<string, string>>({});
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

  const appendUttak = useCallback((text: string) => {
    setInput((prev) => {
      if (!text || prev.includes(text)) return prev;
      return prev.trim() ? `${prev.trim()}\n${text}` : text;
    });
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
      const raw = doseByVare[key]?.trim().replace(",", ".");
      const doseNum = raw ? Number(raw) : null;
      const dose = doseNum != null && Number.isFinite(doseNum) ? doseNum : null;

      const styrkeRaw = styrkeByVare[key]?.trim().replace(",", ".");
      const styrkeNum = styrkeRaw ? Number(styrkeRaw) : null;
      const styrkeOverride = styrkeNum != null && Number.isFinite(styrkeNum) ? styrkeNum : null;

      const dager = periodeDager(periodeByVare[key] ?? "dag", egendagerByVare[key] ?? "");

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
  }, [grupper, doseByVare, periodeByVare, egendagerByVare, doseEnhetByVare, styrkeByVare, referansedato]);

  const resetAll = useCallback(() => {
    setInput("");
    setDoseByVare({});
    setPeriodeByVare({});
    setEgendagerByVare({});
    setDoseEnhetByVare({});
    setStyrkeByVare({});
    setOpenHistorikk({});
    setReferansedatoInput(toDateInputValue(new Date()));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if ((e as any).isComposing) return;
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
              <strong>Nullstill</strong>: Escape
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
                  "Oppgi dosering per preparat – velg om det er per dag, uke eller måned (f.eks. 1 per uke). Ukentlig/månedlig dosering regnes om til et gjennomsnittlig dagsforbruk.",
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
              const visDagsrate =
                b.dagligForbruk != null && (mgModus || periode !== "dag");
              const harBeholdning = b.beholdning != null;
              const tom = harBeholdning && (b.beholdning as number) <= 0;
              const accent = !harBeholdning
                ? TEAL
                : tom
                  ? "#FF5E5B"
                  : (b.dagerIgjen as number) <= 14
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
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                      {mgModus && (
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
                      )}
                      <TextField
                        label="Dosering"
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
                        sx={{ width: 160 }}
                      />
                      <TextField
                        select
                        label="Periode"
                        value={periode}
                        onChange={(e) =>
                          setPeriodeByVare((prev) => ({
                            ...prev,
                            [key]: e.target.value as PeriodeValue,
                          }))
                        }
                        size="small"
                        sx={{ width: 160 }}
                      >
                        {PERIODER.map((p) => (
                          <MenuItem key={p.value} value={p.value}>
                            {p.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      {erEgendefinert && (
                        <TextField
                          label="Intervall"
                          placeholder="f.eks. 3"
                          value={egendagerByVare[key] ?? ""}
                          onChange={(e) =>
                            setEgendagerByVare((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          size="small"
                          inputProps={{ inputMode: "numeric" }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">hver</InputAdornment>,
                            endAdornment: <InputAdornment position="end">. dag</InputAdornment>,
                          }}
                          sx={{ width: 150 }}
                        />
                      )}
                    </Stack>
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
                        Oppgi intervall i dager (hver N. dag).
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
