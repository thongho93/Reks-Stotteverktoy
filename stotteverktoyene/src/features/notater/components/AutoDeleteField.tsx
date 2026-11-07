import * as React from "react";
import { Box, Button, Chip, Popover, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoDeleteRoundedIcon from "@mui/icons-material/AutoDeleteRounded";
import { formatDeleteOn, getDeletePresets, toLocalDateString } from "../utils/noteUtils";

type AutoDeleteFieldProps = {
  value: string | null;
  onChange: (deleteOn: string | null) => void;
};

/** «Slett automatisk»: velg en dato (uten klokkeslett). Notatet slettes ved midnatt etter datoen. */
export function AutoDeleteField({ value, onChange }: AutoDeleteFieldProps) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [today, setToday] = React.useState(() => toLocalDateString(Date.now()));

  const open = (el: HTMLElement) => {
    const now = Date.now();
    setToday(toLocalDateString(now));
    // Foreslår ikke «i dag» som standard, siden det ville slettet notatet ved midnatt.
    setInput(value ?? getDeletePresets(now)[0].value);
    setError(null);
    setAnchor(el);
  };
  const close = () => setAnchor(null);

  const commit = (date: string) => {
    onChange(date);
    close();
  };

  const save = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      setError("Velg en dato");
      return;
    }
    if (input < today) {
      setError("Datoen kan ikke ligge bak i tid");
      return;
    }
    commit(input);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Slett automatisk
      </Typography>
      {value === null ? (
        <Chip
          icon={<AutoDeleteRoundedIcon sx={{ fontSize: 16 }} />}
          label="Velg dato"
          size="small"
          variant="outlined"
          onClick={(e) => open(e.currentTarget)}
          sx={{ borderStyle: "dashed" }}
        />
      ) : (
        <Chip
          icon={<AutoDeleteRoundedIcon sx={{ fontSize: 16 }} />}
          label={formatDeleteOn(value)}
          size="small"
          onClick={(e) => open(e.currentTarget)}
          onDelete={() => onChange(null)}
          sx={(theme) => ({
            fontWeight: 600,
            color: "warning.dark",
            bgcolor: alpha(theme.palette.warning.main, 0.16),
            "& .MuiChip-icon": { color: "inherit" },
          })}
        />
      )}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Slett automatisk", sx: { p: 2, width: 330, borderRadius: 2 } } as object }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
          Når skal notatet slettes?
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {getDeletePresets().map((preset) => (
            <Chip key={preset.label} label={preset.label} size="small" variant="outlined" onClick={() => commit(preset.value)} />
          ))}
        </Box>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Dato"
          value={input}
          error={Boolean(error)}
          helperText={error ?? undefined}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
        />
        <Typography variant="caption" color="warning.dark" sx={{ display: "block", mt: 1 }}>
          Notatet slettes permanent ved midnatt etter denne datoen, første gang appen er åpen.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
          {value !== null ? (
            <Button
              size="small"
              color="error"
              onClick={() => {
                onChange(null);
                close();
              }}
              sx={{ textTransform: "none" }}
            >
              Fjern
            </Button>
          ) : (
            <span />
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" color="inherit" onClick={close} sx={{ textTransform: "none", color: "text.secondary" }}>
              Avbryt
            </Button>
            <Button size="small" variant="contained" disableElevation onClick={save} sx={{ textTransform: "none", fontWeight: 600 }}>
              Lagre
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
