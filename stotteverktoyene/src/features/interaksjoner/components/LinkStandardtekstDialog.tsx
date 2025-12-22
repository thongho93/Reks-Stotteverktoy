import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { normalizeStandardtekstTitle, type StandardtekstDoc } from "../utils/standardtekster";

type Props = {
  open: boolean;
  loading: boolean;
  error: string | null;
  standardtekster: StandardtekstDoc[];
  chosenStd: StandardtekstDoc | null;
  saving: boolean;
  onClose: () => void;
  onChoose: (v: StandardtekstDoc | null) => void;
  onSave: () => void;
};

export function LinkStandardtekstDialog(props: Props) {
  const { open, loading, error, standardtekster, chosenStd, saving, onClose, onChoose, onSave } =
    props;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Knytt standardtekst</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Velg en standardtekst som skal få denne interaksjonens ID lagt til i feltet interactionIds.
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
            <CircularProgress size={18} />
            <Typography color="text.secondary">Henter standardtekster…</Typography>
          </Box>
        ) : (
          <Autocomplete
            options={standardtekster}
            value={chosenStd}
            onChange={(_, v) => onChoose(v)}
            getOptionLabel={(o) => normalizeStandardtekstTitle(o)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} label="Standardtekst" placeholder="Søk etter tittel" />
            )}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Avbryt
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !chosenStd}>
          Lagre
        </Button>
      </DialogActions>
    </Dialog>
  );
}