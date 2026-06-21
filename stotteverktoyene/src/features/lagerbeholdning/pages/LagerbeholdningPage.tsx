import { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { alpha, createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

import styles from "../../../styles/app.module.css";
import { parseUttakInput } from "../lib/parse";
import {
  beregnVare,
  formatDato,
  fromDateInputValue,
  groupByVare,
  toDateInputValue,
  type VareBeregning,
} from "../lib/calc";

const TEAL = "#0E9F8E";

const EKSEMPEL = `489 d. 17.02.2025 169052 Pinex brusetab 500 mg 20 STK\t5\t100 STK
26 d. 22.01.2025 169052 Pinex brusetab 500 mg 20 STK\t1\t20 STK`;

const formatTall = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
};

export default function LagerbeholdningPage() {
  const baseTheme = useTheme();
  const tealTheme = useMemo(
    () => createTheme(baseTheme, { palette: { primary: { main: TEAL } } }),
    [baseTheme],
  );

  const [input, setInput] = useState("");
  const [referansedatoInput, setReferansedatoInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [doseByVare, setDoseByVare] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [openHistorikk, setOpenHistorikk] = useState<Record<string, boolean>>({});

  const referansedato = useMemo(
    () => fromDateInputValue(referansedatoInput) ?? new Date(),
    [referansedatoInput],
  );

  const uttak = useMemo(() => parseUttakInput(input), [input]);
  const grupper = useMemo(() => groupByVare(uttak), [uttak]);

  const beregninger = useMemo<VareBeregning[]>(() => {
    const result: VareBeregning[] = [];
    for (const [key, liste] of grupper.entries()) {
      const raw = doseByVare[key]?.trim().replace(",", ".");
      const dose = raw ? Number(raw) : null;
      const dagligForbruk = dose != null && Number.isFinite(dose) ? dose : null;
      result.push(beregnVare(key, liste, referansedato, dagligForbruk));
    }
    return result.sort((a, b) => a.varenavn.localeCompare(b.varenavn, "nb"));
  }, [grupper, doseByVare, referansedato]);

  const resetAll = useCallback(() => {
    setInput("");
    setDoseByVare({});
    setOpenHistorikk({});
    setReferansedatoInput(toDateInputValue(new Date()));
  }, []);

  return (
    <ThemeProvider theme={tealTheme}>
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
                  "Flere varer kan limes inn samtidig – de grupperes automatisk på varenummer.",
                  "Oppgi dagsforbruk (enheter/dag) per vare for å regne ut beholdning og dekning.",
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
            <TextField
              label="Uttakshistorikk"
              placeholder={EKSEMPEL}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              multiline
              minRows={5}
              fullWidth
              sx={{ flex: 1 }}
            />
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
              const key = b.varenr;
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
                      mb: 1.5,
                    }}
                  >
                    <Inventory2OutlinedIcon sx={{ color: accent }} />
                    <Typography variant="h6" sx={{ m: 0 }}>
                      {b.varenavn}
                    </Typography>
                    {b.varenr && (
                      <Chip size="small" label={`Varenr ${b.varenr}`} variant="outlined" />
                    )}
                  </Box>

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

                  <TextField
                    label="Dagsforbruk"
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
                          {b.enhet ? `${b.enhet}/dag` : "enheter/dag"}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ width: 220, mb: 1.5 }}
                  />

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
