import * as React from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import AlarmRoundedIcon from "@mui/icons-material/AlarmRounded";
import AutoDeleteRoundedIcon from "@mui/icons-material/AutoDeleteRounded";
import AlarmOffRoundedIcon from "@mui/icons-material/AlarmOffRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import type { Note } from "../types";
import { NOTE_COLOR_ACCENTS, formatDeleteOn, formatNoteDate, formatReminder, getNotePreviewText, isReminderDue } from "../utils/noteUtils";
import { ColorPicker } from "./ColorPicker";
import { Highlight } from "./Highlight";
import { getHighlightTerms, snippetAround } from "../utils/highlight";

export type NoteCardActions = {
  onSelect: (id: string) => void;
  /** Åpner notatet i editoren (brukes av Rediger-knappen i «ett klikk kopierer»-modus). */
  onEdit: (id: string) => void;
  onCopy: (id: string, withTitle?: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onClearReminder: (id: string) => void;
  onClearDeleteOn: (id: string) => void;
  onToggleChecklistItem: (id: string, itemId: string) => void;
  onColor: (id: string, color: string | null) => void;
  onMoveToFront: (id: string) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onDragStart: (id: string, event: React.DragEvent) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
};

type NoteCardProps = {
  note: Note;
  selected: boolean;
  dragging: boolean;
  dragOver: boolean;
  query: string;
  canMoveToFront: boolean;
  /** Ett klikk på kortet kopierer notatet; redigering skjer via Rediger-knappen. */
  oneClickCopy: boolean;
  /** Gjeldende tid (ms), oppdatert jevnlig, så forfalte påminnelser vises riktig. */
  now: number;
  actions: NoteCardActions;
};

const MAX_CHECKLIST_ROWS = 5;
const MAX_TAGS = 3;

function NoteCardImpl({ note, selected, dragging, dragOver, query, canMoveToFront, oneClickCopy, now, actions }: NoteCardProps) {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const terms = React.useMemo(() => getHighlightTerms(query), [query]);
  const accent = note.color ? NOTE_COLOR_ACCENTS[note.color] : null;

  const preview = React.useMemo(
    () => snippetAround(getNotePreviewText(note), terms),
    [note, terms],
  );

  const checklistActive = note.checklistItems.filter((i) => !i.done);
  const checklistDone = note.checklistItems.length - checklistActive.length;
  const checklistTotal = note.checklistItems.length;
  const shownChecklist = [...checklistActive, ...note.checklistItems.filter((i) => i.done)].slice(0, MAX_CHECKLIST_ROWS);
  const hiddenChecklist = checklistTotal - shownChecklist.length;

  const triggerCopy = () => {
    actions.onCopy(note.id);
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), oneClickCopy ? 1100 : 1600);
  };

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    triggerCopy();
  };

  const handleCardActivate = () => {
    if (oneClickCopy) triggerCopy();
    else actions.onSelect(note.id);
  };

  const closeMenu = () => setMenuAnchor(null);

  const revealOnHover = {
    opacity: { xs: 1, md: 0 },
    transition: "opacity 140ms",
    "@media (hover: none)": { opacity: 1 },
  };

  return (
    <Box
      component="article"
      data-note-id={note.id}
      tabIndex={0}
      aria-label={`${oneClickCopy ? "Kopier notat" : "Notat"}: ${note.title || "Uten tittel"}`}
      aria-current={selected || undefined}
      onClick={handleCardActivate}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardActivate();
        }
      }}
      draggable
      onDragStart={(e: React.DragEvent) => actions.onDragStart(note.id, e)}
      onDragEnter={() => actions.onDragEnter(note.id)}
      onDragOver={(e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        actions.onDrop(note.id);
      }}
      onDragEnd={actions.onDragEnd}
      sx={(theme) => {
        const dark = theme.palette.mode === "dark";
        const tint = note.color
          ? dark
            ? `linear-gradient(${alpha(accent ?? "#888", 0.16)}, ${alpha(accent ?? "#888", 0.16)})`
            : `linear-gradient(${note.color}, ${note.color})`
          : "none";
        return {
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 2,
          pb: 1.25,
          minWidth: 0,
          borderRadius: "14px",
          border: "1px solid",
          borderColor: dragOver ? "primary.main" : selected ? "primary.main" : "divider",
          borderStyle: dragOver ? "dashed" : "solid",
          bgcolor: "background.paper",
          backgroundImage: tint,
          boxShadow: selected
            ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`
            : dark
              ? "0 1px 2px rgba(0,0,0,0.3)"
              : "0 1px 2px rgba(15,23,42,0.05)",
          cursor: dragging ? "grabbing" : oneClickCopy ? "copy" : "pointer",
          opacity: dragging ? 0.45 : 1,
          outline: "none",
          transition: "box-shadow 150ms, border-color 150ms, transform 150ms",
          "&:hover": {
            boxShadow: selected
              ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`
              : dark
                ? "0 8px 22px rgba(0,0,0,0.4)"
                : "0 8px 22px rgba(15,23,42,0.10)",
            "& .note-reveal": { opacity: 1 },
          },
          "&:focus-visible": {
            borderColor: "primary.main",
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`,
            "& .note-reveal": { opacity: 1 },
          },
          "&:focus-within .note-reveal": { opacity: 1 },
        };
      }}
    >
      {oneClickCopy && (
        <Box
          aria-hidden
          sx={(theme) => ({
            position: "absolute",
            inset: 0,
            zIndex: 2,
            borderRadius: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            fontWeight: 700,
            color: "#fff",
            bgcolor: alpha(theme.palette.success.main, 0.93),
            opacity: copied ? 1 : 0,
            pointerEvents: "none",
            transition: "opacity 160ms",
          })}
        >
          <CheckRoundedIcon /> Kopiert
        </Box>
      )}

      {/* Tittel + favoritt */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
        <Typography
          component="h3"
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.35,
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "text.primary",
          }}
        >
          <Highlight text={note.title || "Uten tittel"} terms={terms} />
        </Typography>
        <Tooltip title={note.isFavorite ? "Fjern fra favoritter" : "Legg til i favoritter"}>
          <IconButton
            size="small"
            aria-label={note.isFavorite ? "Fjern fra favoritter" : "Legg til i favoritter"}
            aria-pressed={note.isFavorite}
            className={note.isFavorite ? undefined : "note-reveal"}
            onClick={(e) => {
              e.stopPropagation();
              actions.onToggleFavorite(note.id);
            }}
            sx={{
              mt: -0.5,
              mr: -0.75,
              color: note.isFavorite ? "warning.main" : "text.secondary",
              ...(note.isFavorite ? {} : revealOnHover),
            }}
          >
            {note.isFavorite ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Innhold */}
      {note.mode === "checklist" ? (
        checklistTotal > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={(checklistDone / checklistTotal) * 100}
                aria-label="Fremdrift"
                sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: "action.hover" }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {checklistDone}/{checklistTotal}
              </Typography>
            </Box>
            {shownChecklist.map((item) => (
              <Box key={item.id} sx={{ display: "flex", alignItems: "flex-start", gap: 0.25, ml: -0.5 }}>
                <Checkbox
                  size="small"
                  checked={item.done}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => actions.onToggleChecklistItem(note.id, item.id)}
                  inputProps={{ "aria-label": item.text }}
                  sx={{ p: 0.5, color: "text.disabled" }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    pt: 0.4,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    color: item.done ? "text.disabled" : "text.secondary",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  <Highlight text={item.text} terms={terms} />
                </Typography>
              </Box>
            ))}
            {hiddenChecklist > 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5 }}>
                +{hiddenChecklist} til
              </Typography>
            )}
          </Box>
        )
      ) : (
        preview && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.55,
              whiteSpace: "pre-line",
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <Highlight text={preview} terms={terms} />
          </Typography>
        )
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {note.tags.slice(0, MAX_TAGS).map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                actions.onTagClick(tag);
              }}
              sx={{
                height: 22,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "primary.main",
                bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1),
                "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2) },
              }}
            />
          ))}
          {note.tags.length > MAX_TAGS && (
            <Typography variant="caption" color="text.disabled" sx={{ alignSelf: "center" }}>
              +{note.tags.length - MAX_TAGS}
            </Typography>
          )}
        </Box>
      )}

      {/* Påminnelse og automatisk sletting */}
      {(note.reminderAtMs !== null || note.deleteOn !== null) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {note.reminderAtMs !== null && (
          <Box
            sx={(theme) => {
              const due = isReminderDue(note.reminderAtMs, now);
              return {
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: due ? "error.main" : "primary.main",
                bgcolor: alpha(due ? theme.palette.error.main : theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.12),
              };
            }}
          >
            <AlarmRoundedIcon sx={{ fontSize: 14 }} />
            {isReminderDue(note.reminderAtMs, now) ? `Forfalt · ${formatReminder(note.reminderAtMs, now)}` : formatReminder(note.reminderAtMs, now)}
          </Box>
          )}
          {note.deleteOn !== null && (
            <Box
              sx={(theme) => ({
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "warning.dark",
                bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.22 : 0.16),
              })}
            >
              <AutoDeleteRoundedIcon sx={{ fontSize: 14 }} />
              {formatDeleteOn(note.deleteOn, now)}
            </Box>
          )}
        </Box>
      )}

      {/* Bunn: dato + handlinger */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: "auto", pt: 0.25, minHeight: 32 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.85 }}>
            {formatNoteDate(note.updatedAtMs)}
          </Typography>
        </Box>
        {oneClickCopy ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mr: -0.75, position: "relative", zIndex: 1 }}>
            <Button
              size="small"
              variant={selected ? "contained" : "outlined"}
              disableElevation
              startIcon={<EditRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={(e) => {
                e.stopPropagation();
                actions.onEdit(note.id);
              }}
              sx={{
                minWidth: 0,
                py: 0.1,
                px: 1.25,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.78rem",
                bgcolor: selected ? undefined : "background.paper",
              }}
            >
              {selected ? "Redigerer" : "Rediger"}
            </Button>
            <Tooltip title="Flere valg">
              <IconButton
                size="small"
                aria-label="Flere valg"
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
                sx={{ color: "text.secondary" }}
              >
                <MoreHorizRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dra for å flytte">
              <Box
                aria-hidden
                sx={{ display: { xs: "none", sm: "flex" }, color: "text.disabled", cursor: "grab", pl: 0.25 }}
              >
                <DragIndicatorRoundedIcon fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Box className="note-reveal" sx={{ display: "flex", alignItems: "center", gap: 0.25, mr: -0.75, ...revealOnHover }}>
            <Tooltip title={copied ? "Kopiert!" : "Kopier innhold"}>
              <IconButton
                size="small"
                onClick={handleCopy}
                aria-label="Kopier innhold"
                sx={{ color: copied ? "success.main" : "text.secondary" }}
              >
                {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Flere valg">
              <IconButton
                size="small"
                aria-label="Flere valg"
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
                sx={{ color: "text.secondary" }}
              >
                <MoreHorizRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dra for å flytte">
              <Box
                aria-hidden
                sx={{ display: { xs: "none", sm: "flex" }, color: "text.disabled", cursor: "grab", pl: 0.25 }}
              >
                <DragIndicatorRoundedIcon fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { minWidth: 230, borderRadius: 2 } } }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            actions.onCopy(note.id);
          }}
        >
          <ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Kopier innhold</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            actions.onCopy(note.id, true);
          }}
        >
          <ListItemIcon><SubjectRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Kopier med tittel</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            actions.onToggleFavorite(note.id);
          }}
        >
          <ListItemIcon>
            {note.isFavorite ? <StarBorderRoundedIcon fontSize="small" /> : <StarRoundedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{note.isFavorite ? "Fjern fra favoritter" : "Legg til i favoritter"}</ListItemText>
        </MenuItem>
        {note.reminderAtMs !== null && (
          <MenuItem
            onClick={() => {
              closeMenu();
              actions.onClearReminder(note.id);
            }}
          >
            <ListItemIcon><AlarmOffRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{isReminderDue(note.reminderAtMs, now) ? "Marker påminnelse som ferdig" : "Fjern påminnelse"}</ListItemText>
          </MenuItem>
        )}
        {note.deleteOn !== null && (
          <MenuItem
            onClick={() => {
              closeMenu();
              actions.onClearDeleteOn(note.id);
            }}
          >
            <ListItemIcon><AutoDeleteRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Fjern automatisk sletting</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          disabled={!canMoveToFront}
          onClick={() => {
            closeMenu();
            actions.onMoveToFront(note.id);
          }}
        >
          <ListItemIcon><VerticalAlignTopRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Flytt først</ListItemText>
        </MenuItem>
        <Divider />
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
            Farge
          </Typography>
          <ColorPicker value={note.color} onChange={(color) => actions.onColor(note.id, color)} size={20} />
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu();
            actions.onDelete(note.id);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Slett</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export const NoteCard = React.memo(NoteCardImpl);
