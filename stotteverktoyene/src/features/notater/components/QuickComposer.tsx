import * as React from "react";
import { Box, Button, Dialog, DialogContent, IconButton, Paper, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import type { Note, NoteDraft } from "../types";
import { createId, EMPTY_DRAFT, NOTE_COLOR_ACCENTS } from "../utils/noteUtils";
import { isDraftEmpty } from "../hooks/useNotes";
import { NoteEditor } from "./NoteEditor";

export type QuickComposerHandle = {
  open: (mode?: "text" | "checklist") => void;
};

type QuickComposerProps = {
  tagSuggestions: string[];
  /** Lagrer og returnerer det opprettede notatet (eller null om ingenting ble lagret). */
  onCreate: (draft: NoteDraft) => Promise<Note | null>;
  onCreated: (note: Note) => void;
  initialTags?: string[];
  /** Kalles når komponisten åpnes, slik at siden kan lukke et åpent notatpanel. */
  onOpen?: () => void;
};

export const QuickComposer = React.forwardRef<QuickComposerHandle, QuickComposerProps>(function QuickComposer(
  { tagSuggestions, onCreate, onCreated, initialTags, onOpen },
  ref,
) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [expanded, setExpanded] = React.useState(false);
  const [draft, setDraft] = React.useState<NoteDraft>(EMPTY_DRAFT);
  const [session, setSession] = React.useState(0);
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const submittingRef = React.useRef(false);

  const open = React.useCallback(
    (mode: "text" | "checklist" = "text") => {
      const base: NoteDraft = {
        ...EMPTY_DRAFT,
        mode,
        tags: initialTags ?? [],
        checklistItems: mode === "checklist" ? [{ id: createId(), text: "", done: false }] : [],
      };
      draftRef.current = base;
      setDraft(base);
      setSession((s) => s + 1);
      setExpanded(true);
      onOpen?.();
    },
    [initialTags, onOpen],
  );

  React.useImperativeHandle(ref, () => ({ open }), [open]);

  const close = React.useCallback(() => {
    setExpanded(false);
    setDraft(EMPTY_DRAFT);
  }, []);

  const saveAndClose = React.useCallback(async () => {
    if (submittingRef.current) return;
    const current = draftRef.current;
    if (isDraftEmpty(current)) {
      close();
      return;
    }
    submittingRef.current = true;
    try {
      const created = await onCreate(current);
      close();
      if (created) onCreated(created);
    } finally {
      submittingRef.current = false;
    }
  }, [close, onCreate, onCreated]);

  const accent = draft.color ? NOTE_COLOR_ACCENTS[draft.color] : null;

  const trigger = (
      <Paper
        variant="outlined"
        role="button"
        tabIndex={0}
        aria-label="Skriv et nytt notat"
        onClick={() => open("text")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open("text");
          }
        }}
        sx={(theme) => ({
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: "14px",
          cursor: "text",
          color: "text.secondary",
          borderColor: alpha(theme.palette.primary.main, 0.35),
          bgcolor: "background.paper",
          boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.08)}`,
          transition: "box-shadow 150ms, border-color 150ms",
          "&:hover": { borderColor: "primary.main", boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.16)}` },
          "&:focus-visible": { outline: "none", borderColor: "primary.main", boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}` },
        })}
      >
        <Typography sx={{ flex: 1, fontSize: "0.975rem" }}>Skriv et nytt notat…</Typography>
        <Typography
          component="kbd"
          variant="caption"
          sx={{
            display: { xs: "none", md: "inline-block" },
            px: 0.75,
            py: 0.1,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            fontFamily: "inherit",
            color: "text.disabled",
          }}
        >
          N
        </Typography>
        <Tooltip title="Ny sjekkliste">
          <IconButton
            size="small"
            aria-label="Ny sjekkliste"
            onClick={(e) => {
              e.stopPropagation();
              open("checklist");
            }}
            sx={{ color: "text.secondary" }}
          >
            <ChecklistRoundedIcon />
          </IconButton>
        </Tooltip>
      </Paper>
  );

  return (
    <>
      {trigger}
      <Dialog
        open={expanded}
        onClose={() => void saveAndClose()}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
        slotProps={{
          paper: {
            "aria-label": "Nytt notat",
            sx: {
              borderRadius: fullScreen ? 0 : "16px",
              borderTop: accent ? `4px solid ${accent}` : "4px solid transparent",
              backgroundImage:
                draft.color && theme.palette.mode === "light" ? `linear-gradient(${draft.color}, ${draft.color})` : "none",
            },
          },
        }}
      >
        <DialogContent sx={{ px: 2.5, pt: 2, pb: 1 }}>
          <NoteEditor
            draft={draft}
            resetKey={`composer-${session}`}
            autoFocus="content"
            minContentHeight={fullScreen ? 240 : 160}
            tagSuggestions={tagSuggestions}
            titleTrailing={
              <Tooltip title="Lukk og lagre (Esc)">
                <IconButton size="small" aria-label="Lukk og lagre" onClick={() => void saveAndClose()} sx={{ flexShrink: 0 }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
            onSubmit={() => void saveAndClose()}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        </DialogContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.5 }}>
          <Tooltip title="Forkast notatet">
            <Button
              size="small"
              color="inherit"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={close}
              sx={{ textTransform: "none", color: "text.secondary", borderRadius: 2 }}
            >
              Forkast
            </Button>
          </Tooltip>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              Ctrl + Enter lagrer
            </Typography>
            <Button
              variant="contained"
              disableElevation
              size="small"
              onClick={() => void saveAndClose()}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, px: 2.5 }}
            >
              Lagre
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
});
