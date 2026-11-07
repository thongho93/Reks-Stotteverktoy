import { Box, Button, Chip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import type { Note } from "../types";
import {
  TRASH_RETENTION_DAYS,
  formatTrashRemaining,
  getNotePreviewText,
  trashDaysLeft,
} from "../utils/noteUtils";

type TrashListProps = {
  notes: Note[];
  now: number;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onEmpty: () => void;
};

/** «Slettede notater»: gjenopprett eller slett for godt. Notatene fjernes automatisk etter 15 dager. */
export function TrashList({ notes, now, onRestore, onDeleteForever, onEmpty }: TrashListProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Slettede notater ligger her i {TRASH_RETENTION_DAYS} dager før de fjernes for godt.
        </Typography>
        {notes.length > 0 && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteForeverRoundedIcon />}
            onClick={() => {
              if (window.confirm(`Slette ${notes.length === 1 ? "notatet" : `alle ${notes.length} notatene`} for godt? Dette kan ikke angres.`)) onEmpty();
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Tøm slettede notater
          </Button>
        )}
      </Box>

      {notes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <DeleteOutlineRoundedIcon sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
          <Typography variant="h6" sx={{ color: "text.primary", mb: 0.5 }}>
            Ingen slettede notater
          </Typography>
          <Typography variant="body2">Notater du sletter havner her, så du kan hente dem tilbake.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 2 }}>
          {notes.map((note) => {
            const preview =
              note.mode === "checklist"
                ? note.checklistItems.map((i) => `${i.done ? "✓" : "•"} ${i.text}`).join("\n")
                : getNotePreviewText(note);
            const urgent = note.deletedAtMs !== null && trashDaysLeft(note.deletedAtMs, now) <= 2;
            return (
              <Box
                key={note.id}
                component="article"
                aria-label={`Slettet notat: ${note.title || "Uten tittel"}`}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  p: 2,
                  borderRadius: "14px",
                  border: "1px dashed",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  minWidth: 0,
                }}
              >
                <Typography
                  component="h3"
                  sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.35, wordBreak: "break-word", color: "text.secondary" }}
                >
                  {note.title || "Uten tittel"}
                </Typography>
                {preview && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.disabled",
                      whiteSpace: "pre-line",
                      wordBreak: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {preview}
                  </Typography>
                )}
                {note.deletedAtMs !== null && (
                  <Chip
                    size="small"
                    label={formatTrashRemaining(note.deletedAtMs, now)}
                    sx={(theme) => ({
                      alignSelf: "flex-start",
                      fontWeight: 600,
                      color: urgent ? "error.main" : "text.secondary",
                      bgcolor: alpha(urgent ? theme.palette.error.main : theme.palette.text.primary, 0.08),
                    })}
                  />
                )}
                <Box sx={{ display: "flex", gap: 1, mt: "auto", pt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestoreFromTrashRoundedIcon />}
                    onClick={() => onRestore(note.id)}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 999 }}
                  >
                    Gjenopprett
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm("Slette notatet for godt? Dette kan ikke angres.")) onDeleteForever(note.id);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Slett for godt
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
