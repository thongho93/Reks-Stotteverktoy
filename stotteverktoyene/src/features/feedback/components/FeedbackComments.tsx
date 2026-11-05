import * as React from "react";
import { Alert, Box, Button, Chip, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import { FEEDBACK_COMMENT_MAX_LENGTH, feedbackApi } from "../services/feedbackApi";
import type { FeedbackComment } from "../types";

type Props = {
  feedbackId: string;
  /** Innlogget bruker. */
  me: { uid: string; name: string } | null;
  /** Kan brukeren skrive kommentarer her (avsender eller eier)? */
  canComment: boolean;
  /** Er innlogget bruker eier? Eiers kommentarer varsler avsenderen. */
  isOwner: boolean;
  /** Åpne tråden med en gang, f.eks. når det er nytt der. */
  defaultOpen?: boolean;
};

function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Kommentartråd under et innspill. Tråden hentes først når den åpnes, slik at lista ikke
 * må lytte på kommentarer for hvert innspill.
 */
export default function FeedbackComments({ feedbackId, me, canComment, isOwner, defaultOpen }: Props) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [comments, setComments] = React.useState<FeedbackComment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Åpnes tråden utenfra (nytt svar), følger vi med.
  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  React.useEffect(() => {
    if (!open) return;
    return feedbackApi.subscribeComments(
      feedbackId,
      (next) => {
        setComments(next);
        setError(null);
      },
      () => setError("Kunne ikke hente kommentarer akkurat nå.")
    );
  }, [feedbackId, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !me || sending) return;
    setSending(true);
    setError(null);
    try {
      await feedbackApi.addComment(feedbackId, text, me, isOwner);
      setDraft("");
    } catch {
      setError("Kunne ikke sende kommentaren. Prøv igjen.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: FeedbackComment) => {
    if (!window.confirm("Slette kommentaren?")) return;
    try {
      await feedbackApi.removeComment(feedbackId, comment.id);
    } catch {
      setError("Kunne ikke slette kommentaren.");
    }
  };

  const count = comments?.length;

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        color="inherit"
        onClick={() => setOpen((v) => !v)}
        startIcon={<ForumOutlinedIcon fontSize="small" />}
        endIcon={open ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
        sx={{ textTransform: "none", color: "text.secondary", px: 0.5 }}
      >
        {open
          ? count
            ? `Kommentarer (${count})`
            : "Kommentarer"
          : canComment
            ? "Kommentarer / legg til"
            : "Kommentarer"}
      </Button>

      {open && (
        <Box sx={{ mt: 0.5, pl: { xs: 0, sm: 1 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {comments?.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {canComment ? "Ingen kommentarer ennå." : "Ingen kommentarer."}
            </Typography>
          )}

          <Stack spacing={1} sx={{ mb: canComment ? 1.5 : 0 }}>
            {comments?.map((comment) => {
              const mine = comment.createdByUid === me?.uid;
              return (
                <Box
                  key={comment.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      alpha(
                        comment.isOwner ? theme.palette.primary.main : theme.palette.text.primary,
                        comment.isOwner ? 0.07 : 0.05
                      ),
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {comment.createdByName || "Ukjent bruker"}
                    </Typography>
                    {comment.isOwner && <Chip size="small" color="primary" label="Eier" sx={{ height: 20 }} />}
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {formatDateTime(comment.createdAtMs)}
                    </Typography>
                    {(mine || isOwner) && (
                      <Tooltip title="Slett kommentar">
                        <IconButton
                          size="small"
                          aria-label="Slett kommentar"
                          onClick={() => void remove(comment)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{comment.message}</Typography>
                </Box>
              );
            })}
          </Stack>

          {canComment && (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                fullWidth
                multiline
                maxRows={5}
                placeholder="Skriv en kommentar…"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, FEEDBACK_COMMENT_MAX_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                inputProps={{ "aria-label": "Ny kommentar" }}
              />
              <Button
                variant="contained"
                disableElevation
                disabled={!draft.trim() || sending}
                onClick={() => void send()}
                startIcon={<SendRoundedIcon />}
                sx={{ textTransform: "none", whiteSpace: "nowrap", height: 40 }}
              >
                {sending ? "Sender…" : "Send"}
              </Button>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
