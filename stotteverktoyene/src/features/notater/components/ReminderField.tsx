import * as React from "react";
import { Box, Button, Chip, Popover, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AlarmAddRoundedIcon from "@mui/icons-material/AlarmAddRounded";
import AlarmRoundedIcon from "@mui/icons-material/AlarmRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  formatReminder,
  fromDateTimeLocalValue,
  getReminderPresets,
  isReminderDue,
  toDateTimeLocalValue,
} from "../utils/noteUtils";
import { getNotificationPermission, requestNotificationPermission } from "../utils/browserNotifications";

type ReminderFieldProps = {
  value: number | null;
  onChange: (reminderAtMs: number | null) => void;
};

/** Rad i editoren: «Påminnelse» med valgt tidsfrist, og en popup for å sette/endre/fjerne den. */
export function ReminderField({ value, onChange }: ReminderFieldProps) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [permission, setPermission] = React.useState(getNotificationPermission);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const due = isReminderDue(value, now);

  const open = (el: HTMLElement) => {
    const current = Date.now();
    setNow(current);
    const initial = value ?? getReminderPresets(current).find((p) => p.label.startsWith("I morgen"))?.at ?? current + 3_600_000;
    setInput(toDateTimeLocalValue(initial));
    setError(null);
    setPermission(getNotificationPermission());
    setAnchor(el);
  };
  const close = () => setAnchor(null);

  const commit = (ms: number) => {
    onChange(ms);
    close();
    // Må kalles fra en brukerhandling (klikk) for at Chrome skal vise spørsmålet.
    void requestNotificationPermission().then(setPermission);
  };

  const save = () => {
    const ms = fromDateTimeLocalValue(input);
    if (ms === null) {
      setError("Velg dato og klokkeslett");
      return;
    }
    commit(ms);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Påminnelse
      </Typography>
      {value === null ? (
        <Chip
          icon={<AlarmAddRoundedIcon sx={{ fontSize: 16 }} />}
          label="Sett tidsfrist"
          size="small"
          variant="outlined"
          onClick={(e) => open(e.currentTarget)}
          sx={{ borderStyle: "dashed" }}
        />
      ) : (
        <>
          <Chip
            icon={<AlarmRoundedIcon sx={{ fontSize: 16 }} />}
            label={due ? `Forfalt · ${formatReminder(value, now)}` : formatReminder(value, now)}
            size="small"
            onClick={(e) => open(e.currentTarget)}
            onDelete={() => onChange(null)}
            sx={(theme) => ({
              fontWeight: 600,
              color: due ? "error.main" : "primary.main",
              bgcolor: alpha(due ? theme.palette.error.main : theme.palette.primary.main, 0.12),
              "& .MuiChip-icon": { color: "inherit" },
            })}
          />
          {due && (
            <Tooltip title="Fjerner påminnelsen">
              <Button
                size="small"
                startIcon={<CheckRoundedIcon sx={{ fontSize: 16 }} />}
                onClick={() => onChange(null)}
                sx={{ textTransform: "none", fontWeight: 600, py: 0 }}
              >
                Ferdig
              </Button>
            </Tooltip>
          )}
        </>
      )}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Påminnelse", sx: { p: 2, width: 330, borderRadius: 2 } } as object }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
          Når trenger du en påminnelse?
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {getReminderPresets(now).map((preset) => (
            <Chip key={preset.label} label={preset.label} size="small" variant="outlined" onClick={() => commit(preset.at)} />
          ))}
        </Box>
        <TextField
          fullWidth
          size="small"
          type="datetime-local"
          label="Dato og klokkeslett"
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
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {permission === "denied" && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
            Varsler er blokkert i Chrome for denne siden. Du får fortsatt varsel i appen, men ikke i Chrome.
          </Typography>
        )}
        {permission === "default" && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Chrome spør om tillatelse til å vise varsler når du lagrer.
          </Typography>
        )}
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
