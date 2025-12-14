import { useMemo, useState } from "react";
import { Box, Container, Divider, IconButton, Paper, Typography, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import styles from "../styles/App.module.css";

import { OMEQRow, type OMEQRowValue } from "../features/omeq/components/OMEQRow";
import { buildProductIndex, parseMedicationInput } from "../features/omeq/lib/parseMedicationInput";
import { calculateOMEQ } from "../features/omeq/lib/calc";

type Row = OMEQRowValue & { id: string };

const makeRow = (): Row => ({
  id: crypto.randomUUID(),
  medicationText: "",
  doseText: "",
});

function App() {
  const [rows, setRows] = useState<Row[]>([makeRow()]);

  const setRowById = (id: string, next: OMEQRowValue) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const resetAll = () => {
    window.location.reload();
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

        const result = calculateOMEQ({
          product: parsed.product ?? null,
          dailyDose,
          strength: parsed.strength ?? null,
        });

        return acc + (typeof result.omeq === "number" ? result.omeq : 0);
      } else {
        const result = calculateOMEQ({
          product: parsed.product ?? null,
          dailyDose: null,
          strength: parsed.strength ?? null,
        });
        return acc + (typeof result.omeq === "number" ? result.omeq : 0);
      }
    }, 0);

    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [rows, productIndex]);

  return (
    <Container maxWidth={false} className={styles.appContainer}>
      <Paper elevation={3} className={styles.appCard}>
        <Typography variant="h4" gutterBottom>
          OMEQ – preparatsøk
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Lim inn varenummeret, og legg inn total døgndose for beregning.
        </Typography>

        {rows.map((r, idx) => (
          <Box key={r.id}>
            <OMEQRow value={r} onChange={(next) => setRowById(r.id, next)} />

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

export default App;
