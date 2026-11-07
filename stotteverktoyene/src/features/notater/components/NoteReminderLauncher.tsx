import * as React from "react";
import { Box, Tooltip } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import AlarmRoundedIcon from "@mui/icons-material/AlarmRounded";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthUser } from "../../../app/auth/useAuthUser";
import { useNoteReminders, type NoteReminder } from "../hooks/useNoteReminders";
import { formatReminder } from "../utils/noteUtils";
import { showBrowserNotification } from "../utils/browserNotifications";

export const NOTES_ROUTE = "/tilbakemelding";
const ACCENT = "#B648E8";
const NOTIFIED_STORAGE_KEY = "notater.notifiedReminders";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.65); }
  70% { box-shadow: 0 0 0 10px rgba(229, 57, 53, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0); }
`;

/** Hvilke påminnelser (id → tidspunkt) Chrome allerede har varslet om på denne maskinen. */
function readNotified(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(NOTIFIED_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeNotified(map: Record<string, number>) {
  try {
    window.localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* lagring utilgjengelig – verst fall er et ekstra varsel */
  }
}

/**
 * Fane på høyre kant (som «Innspill») som viser antall notater med forfalt tidsfrist,
 * og sender et Chrome-varsel når en frist inntreffer mens appen er åpen i nettleseren.
 */
export default function NoteReminderLauncher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthUser();
  const { reminders, due } = useNoteReminders(user?.uid);
  const onNotesPage = location.pathname === NOTES_ROUTE;

  const openNote = React.useCallback(
    (id: string) => navigate(NOTES_ROUTE, { state: { selectedNoteId: id } }),
    [navigate],
  );
  const openNoteRef = React.useRef(openNote);
  React.useEffect(() => {
    openNoteRef.current = openNote;
  }, [openNote]);

  // Chrome-varsel én gang per påminnelse (og per nytt tidspunkt hvis den utsettes).
  React.useEffect(() => {
    const notified = readNotified();
    let changed = false;

    // Rydd bort påminnelser som er slettet eller flyttet.
    const active = new Map(reminders.map((r) => [r.id, r.reminderAtMs]));
    for (const id of Object.keys(notified)) {
      if (active.get(id) !== notified[id]) {
        delete notified[id];
        changed = true;
      }
    }

    due.forEach((reminder: NoteReminder) => {
      if (notified[reminder.id] === reminder.reminderAtMs) return;
      const shown = showBrowserNotification(`Tidsfrist: ${reminder.title}`, {
        body: `Påminnelse ${formatReminder(reminder.reminderAtMs)} · Klikk for å åpne notatet`,
        tag: `note-reminder-${reminder.id}`,
        requireInteraction: true,
        onClick: () => openNoteRef.current(reminder.id),
      });
      if (shown) {
        notified[reminder.id] = reminder.reminderAtMs;
        changed = true;
      }
    });

    if (changed) writeNotified(notified);
  }, [reminders, due]);

  if (onNotesPage || due.length === 0) return null;

  const tooltip =
    due.length === 1
      ? `Tidsfrist på «${due[0].title}». Klikk for å åpne notatet.`
      : `${due.length} notater har tidsfrist. Klikk for å åpne det eldste.`;

  return (
    <Tooltip title={tooltip} placement="left">
      <Box
        component="button"
        type="button"
        aria-label={`Gå til notater, ${due.length} med tidsfrist`}
        onClick={() => openNote(due[0].id)}
        sx={{
          position: "fixed",
          right: 0,
          bottom: "240px",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1,
          py: 1.75,
          border: "none",
          borderRadius: "8px 0 0 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.82rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#fff",
          bgcolor: ACCENT,
          writingMode: "vertical-rl",
          boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.common.black, 0.28)}`,
          transition: "background-color 150ms ease, padding-right 150ms ease",
          "&:hover": { bgcolor: "#9A35C8", pr: 1.5 },
          "&:focus-visible": { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
        }}
      >
        <AlarmRoundedIcon sx={{ fontSize: 18, transform: "rotate(90deg)" }} />
        Tidsfrist
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -7,
            left: -7,
            minWidth: 20,
            height: 20,
            px: 0.5,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "horizontal-tb",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: 0,
            color: "#fff",
            bgcolor: "#E53935",
            border: "2px solid #fff",
            boxSizing: "border-box",
            animation: `${pulse} 1.6s ease-out infinite`,
          }}
        >
          {due.length}
        </Box>
      </Box>
    </Tooltip>
  );
}
