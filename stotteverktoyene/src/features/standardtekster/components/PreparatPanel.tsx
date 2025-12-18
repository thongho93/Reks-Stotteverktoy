import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import MedicationSearch from "../../fest/components/MedicationSearch";
import styles from "../../../styles/standardTekstPage.module.css";
import { formatPreparatForTemplate } from "../utils/preparat";


type PreparatRowId = string | number;

type PreparatRowLike = {
  id: PreparatRowId;
  picked?: string | null;
};

type Props = {
  preparatRows: PreparatRowLike[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPickText: (text: string) => void;
  onClear: () => void;
  onRemove: (id: PreparatRowId) => void;
};

export default function PreparatPanel({
  preparatRows,
  inputRef,
  onPickText,
  onClear,
  onRemove,
}: Props) {
  const hasPicked = preparatRows.some((r) => r.picked);

  return (
    <Paper className={styles.preparatPaper}>
      <Box className={styles.preparatHeader}>
        <Typography variant="subtitle2" className={styles.preparatTitle}>
          Preparater
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="flex-start" className={styles.preparatSearchRow}>
        <Box className={styles.preparatSingleSearch} style={{ flex: 1 }}>
          <MedicationSearch
            inputRef={inputRef}
            onPick={(med) => {
              const text = formatPreparatForTemplate(med);
              if (!text) return;
              onPickText(text);
            }}
          />
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={onClear}
          disabled={!hasPicked}
          startIcon={<ClearAllIcon fontSize="small" />}
          title="Tøm alle (Escape når fokus er i preparatfeltet)"
        >
          Tøm
        </Button>
      </Stack>

      <Box className={styles.preparatChipsWrap}>
        {preparatRows
          .filter((r) => r.picked)
          .map((r) => (
            <Chip
              key={String(r.id)}
              label={r.picked as string}
              onDelete={() => onRemove(r.id)}
              className={styles.preparatChip}
            />
          ))}
      </Box>

      <Typography variant="caption" color="text.secondary" className={styles.preparatHint}>
        <span className={styles.preparatHintTip}>
          Tips: Lim inn hele produktlinjen – søket rydder opp automatisk.
        </span>
        <span className={styles.preparatHintKeys}>
          <span className={styles.preparatHintKeyLabel}>Hurtigsøk:</span> ⌥F / Alt+F ·{" "}
          <span className={styles.preparatHintKeyLabel}>Tøm:</span> Escape
        </span>
      </Typography>
    </Paper>
  );
}
