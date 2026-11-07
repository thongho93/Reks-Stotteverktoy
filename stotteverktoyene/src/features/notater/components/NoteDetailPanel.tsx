import * as React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded";
import type { Note, NoteDraft } from "../types";
import { draftFromNote, formatNoteDateFull, NOTE_COLOR_ACCENTS, normalizeChecklistItems } from "../utils/noteUtils";
import { NoteEditor } from "./NoteEditor";

type NoteDetailPanelProps = {
  note: Note;
  saving: boolean;
  canMoveToFront: boolean;
  tagSuggestions: string[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<NoteDraft>) => Promise<boolean>;
  onCopy: (id: string, withTitle?: boolean) => void;
  onMoveToFront: (id: string) => void;
  onDelete: (id: string) => void;
};

const AUTOSAVE_DELAY_MS = 600;

/**
 * Redigerer ett notat med automatisk lagring. Monteres på nytt (key = note.id)
 * for hvert notat, og lagrer ventende endringer når den fjernes.
 */
function PanelBody({
  note,
  saving,
  canMoveToFront,
  tagSuggestions,
  onClose,
  onSave,
  onCopy,
  onMoveToFront,
  onDelete,
  fullScreen,
}: NoteDetailPanelProps & { fullScreen: boolean }) {
  const [draft, setDraft] = React.useState<NoteDraft>(() => draftFromNote(note));
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<number | undefined>(undefined);

  const draftRef = React.useRef(draft);
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef<number | undefined>(undefined);
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const noteId = note.id;

  const flush = React.useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const { title, content, mode, checklistItems, tags } = draftRef.current;
    void onSaveRef.current(noteId, { title, content, mode, checklistItems, tags });
  }, [noteId]);

  // Lagre ventende endringer når notatet byttes/lukkes.
  React.useEffect(() => () => flush(), [flush]);
  React.useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const handleChange = React.useCallback(
    (patch: Partial<NoteDraft>) => {
      // Favoritt og farge kan også endres fra kortet – skriv dem direkte, ikke via utkastet.
      const { color, isFavorite, reminderAtMs, deleteOn, ...textPatch } = patch;
      if (color !== undefined) void onSaveRef.current(noteId, { color });
      if (isFavorite !== undefined) void onSaveRef.current(noteId, { isFavorite });
      if (reminderAtMs !== undefined) void onSaveRef.current(noteId, { reminderAtMs });
      if (deleteOn !== undefined) void onSaveRef.current(noteId, { deleteOn });
      if (Object.keys(textPatch).length === 0) return;

      const next = { ...draftRef.current, ...textPatch };
      draftRef.current = next;
      dirtyRef.current = true;
      setDraft(next);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush, noteId],
  );

  // Sjekkliste endret fra kortet mens panelet er åpent og urørt → synkroniser.
  const storedChecklist = JSON.stringify(note.checklistItems);
  React.useEffect(() => {
    if (dirtyRef.current || draftRef.current.mode !== "checklist") return;
    const local = JSON.stringify(normalizeChecklistItems(draftRef.current.checklistItems));
    if (local === storedChecklist) return;
    const next = { ...draftRef.current, checklistItems: note.checklistItems };
    draftRef.current = next;
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedChecklist]);

  const editorDraft: NoteDraft = { ...draft, color: note.color, isFavorite: note.isFavorite, reminderAtMs: note.reminderAtMs, deleteOn: note.deleteOn };
  const accent = note.color ? NOTE_COLOR_ACCENTS[note.color] : null;

  const handleCopy = () => {
    flush();
    onCopy(note.id);
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      {/* Topplinje */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          borderTop: accent ? `3px solid ${accent}` : "3px solid transparent",
        }}
      >
        <Tooltip title="Lukk (Esc)">
          <IconButton size="small" onClick={() => { flush(); onClose(); }} aria-label="Lukk notat">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", flex: 1 }} aria-live="polite">
          {saving || dirtyRef.current ? (
            <>
              <CircularProgress size={12} thickness={5} color="inherit" />
              <Typography variant="caption">Lagrer…</Typography>
            </>
          ) : (
            <>
              <CheckRoundedIcon sx={{ fontSize: 14, color: "success.main" }} />
              <Typography variant="caption">Lagret</Typography>
            </>
          )}
        </Box>
        <Button
          variant="contained"
          size="small"
          disableElevation
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          onClick={handleCopy}
          color={copied ? "success" : "primary"}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, minWidth: 96 }}
        >
          {copied ? "Kopiert" : "Kopier"}
        </Button>
        <IconButton size="small" aria-label="Flere valg" aria-haspopup="menu" onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreHorizRoundedIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} slotProps={{ paper: { sx: { minWidth: 210, borderRadius: 2 } } }}>
          <MenuItem onClick={() => { setMenuAnchor(null); flush(); onCopy(note.id, true); }}>
            <ListItemIcon><SubjectRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Kopier med tittel</ListItemText>
          </MenuItem>
          <MenuItem disabled={!canMoveToFront} onClick={() => { setMenuAnchor(null); onMoveToFront(note.id); }}>
            <ListItemIcon><VerticalAlignTopRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Flytt først</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              dirtyRef.current = false;
              window.clearTimeout(timerRef.current);
              onDelete(note.id);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Slett notat</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Editor */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2.5, py: 2 }}>
        <NoteEditor
          draft={editorDraft}
          onChange={handleChange}
          resetKey={note.id}
          minContentHeight={fullScreen ? 260 : 200}
          tagSuggestions={tagSuggestions}
        />
      </Box>

      <Box sx={{ px: 2.5, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          Sist endret {formatNoteDateFull(note.updatedAtMs)}
        </Typography>
      </Box>
    </Box>
  );
}

export function NoteDetailPanel(props: NoteDetailPanelProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  if (!isDesktop) {
    return (
      <Dialog open fullScreen onClose={props.onClose}>
        <PanelBody key={props.note.id} {...props} fullScreen />
      </Dialog>
    );
  }

  return (
    <Paper
      component="aside"
      aria-label="Notat"
      variant="outlined"
      sx={{
        position: "sticky",
        top: 16,
        alignSelf: "flex-start",
        width: 440,
        flexShrink: 0,
        maxHeight: "calc(100dvh - 32px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "16px",
        boxShadow: `0 12px 32px ${alpha("#000", theme.palette.mode === "dark" ? 0.45 : 0.1)}`,
      }}
    >
      <PanelBody key={props.note.id} {...props} fullScreen={false} />
    </Paper>
  );
}
