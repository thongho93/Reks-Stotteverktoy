import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
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
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ListItemIcon from "@mui/material/ListItemIcon";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

import styles from "../../../styles/app.module.css";

import { OMEQRow, type OMEQRowValue } from "../components/OMEQRow";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { calculateOMEQ } from "../lib/calc";
import { OPIOIDS } from "../data/opioids";

type Row = OMEQRowValue & { id: string };

const makeRow = (): Row => ({
  id: crypto.randomUUID(),
  medicationText: "",
  doseText: "",
});

export default function OMEQPage() {
  const [rows, setRows] = useState<Row[]>([makeRow()]);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfoTable, setShowInfoTable] = useState(false);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const setRowById = (id: string, next: OMEQRowValue) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  };

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

  const resetAll = () => {
    // Reset to initial state without reloading the whole app
    const firstRow = makeRow();
    setRows([firstRow]);
    setShowHelp(false);
    setShowInfoTable(false);
    setFocusRowId(firstRow.id);
  };

  const showDividers = useMemo(() => rows.length > 1, [rows.length]);

  const productIndex = useMemo(() => buildProductIndex(), []);

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

  return (
    <Container maxWidth={false} className={styles.appContainer}>
      <Paper elevation={3} className={styles.appCard}>
        {/* Header row */}
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
          </Box>
        </Box>

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
            />

            {idx < rows.length - 1 && showDividers && <Divider sx={{ my: 2 }} />}

            {idx === rows.length - 1 && (
              <Box className={styles.totalOmeqWrapper}>
                <Box className={styles.totalOmeqBox}>
                  <Typography variant="subtitle2" className={styles.totalOmeqLabel}>
                    Total OMEQ
                  </Typography>
                  <Typography variant="h5" className={styles.totalOmeqValue}>
                    {totalOmeq}
                  </Typography>
                </Box>
              </Box>
            )}

            {idx === rows.length - 1 && (
              <Box className={styles.addRowGrid}>
                <Box className={styles.addRowButtonCell} style={{ gap: 8 }}>
                  <Tooltip title="Legg til ny linje">
                    <IconButton
                      aria-label="Legg til ny linje"
                      onClick={addRow}
                      sx={{
                        backgroundColor: "primary.main",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "primary.main",
                        },
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
                        ml: 2,
                        border: "1px solid",
                        borderColor: "primary.main",
                        color: "primary.main",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      className={styles.addRowButton}
                    >
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Paper>
    </Container>
  );
}
