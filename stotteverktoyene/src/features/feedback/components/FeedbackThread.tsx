import * as React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import { FEEDBACK_COMMENT_MAX_LENGTH, feedbackApi } from "../services/feedbackApi";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_COLOR,
  feedbackStatusLabel,
  type Feedback,
  type FeedbackComment,
  type FeedbackStatus,
} from "../types";
import { FEEDBACK_ACCENT, formatDateTime, useReadableColor } from "./feedbackUtils";

type Me = { uid: string; name: string };

type Props = {
  item: Feedback;
  me: Me | null;
  /** Er innlogget bruker eier? */
  viewerIsOwner: boolean;
  /** Kan innlogget bruker skrive her (avsender eller eier)? */
  canComment: boolean;
  /** Meldinger fra andre nyere enn dette utheves som «Ny». */
  newSince: number | null;
  /** Kommentarene under innspillet (null mens de hentes). */
  comments: FeedbackComment[] | null;
  /** Feil ved henting av kommentarene. */
  commentsError: string | null;
};

function Avatar({ name, owner }: { name: string; owner: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        flex: "none",
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        color: owner ? "#fff" : "text.secondary",
        bgcolor: owner ? FEEDBACK_ACCENT : (theme) => alpha(theme.palette.text.primary, 0.1),
      }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </Box>
  );
}

/**
 * Samlet samtale under et innspill: eiers svar, statusendringer og kommentarer fra
 * avsenderen i én tråd – med fremdriftslinje øverst. Eier svarer og setter status i
 * samme felt.
 */
export default function FeedbackThread({
  item,
  me,
  viewerIsOwner,
  canComment,
  newSince,
  comments,
  commentsError,
}: Props) {
  const readable = useReadableColor();
  const [sendError, setSendError] = React.useState<string | null>(null);
  const error = sendError ?? commentsError;
  const [draft, setDraft] = React.useState("");
  const [nextStatus, setNextStatus] = React.useState<FeedbackStatus>(item.status);
  const [sending, setSending] = React.useState(false);

  // Statusvalget følger innspillets status når den endres utenfra.
  React.useEffect(() => setNextStatus(item.status), [item.status]);

  const statusChanged = viewerIsOwner && nextStatus !== item.status;
  const canSend = Boolean(me) && !sending && (draft.trim().length > 0 || statusChanged);

  const send = async () => {
    if (!me || !canSend) return;
    setSending(true);
    setSendError(null);
    try {
      if (viewerIsOwner) {
        await feedbackApi.ownerReply(item.id, draft, statusChanged ? nextStatus : null, me);
      } else {
        await feedbackApi.addComment(item.id, draft, me, false);
      }
      setDraft("");
    } catch {
      setSendError("Kunne ikke sende. Prøv igjen.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: FeedbackComment) => {
    if (!window.confirm("Slette meldingen?")) return;
    try {
      await feedbackApi.removeComment(item.id, comment.id);
    } catch {
      setSendError("Kunne ikke slette meldingen.");
    }
  };

  const list = comments ?? [];

  return (
    <Stack spacing={2}>
      <Box
        component="section"
        aria-label="Samtale"
        sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Samtale
        </Typography>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Svar fra før samtalen fantes lå i feltet ownerReply. */}
        {item.ownerReply.trim() && (
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Avatar name="Eier" owner />
            <Box
              sx={{
                flex: 1,
                borderRadius: "4px 14px 14px 14px",
                px: 2,
                py: 1.5,
                border: 1,
                borderColor: alpha(FEEDBACK_ACCENT, 0.3),
                bgcolor: alpha(FEEDBACK_ACCENT, 0.08),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Eier
                </Typography>
                <Box
                  component="span"
                  sx={{ px: 1, borderRadius: 999, bgcolor: FEEDBACK_ACCENT, color: "#fff", fontSize: 11, fontWeight: 600 }}
                >
                  Eier
                </Box>
              </Stack>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{item.ownerReply}</Typography>
            </Box>
          </Box>
        )}

        {comments === null && !error && (
          <Typography variant="body2" color="text.secondary">
            Henter samtalen …
          </Typography>
        )}

        {comments !== null && list.length === 0 && !item.ownerReply.trim() && (
          <Typography variant="body2" color="text.secondary">
            Ingen meldinger ennå.
          </Typography>
        )}

        {list.map((comment) => {
          if (comment.kind === "status" && comment.status) {
            const color = FEEDBACK_STATUS_COLOR[comment.status];
            return (
              <Stack key={comment.id} direction="row" spacing={1.25} alignItems="center" sx={{ pl: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flex: "none" }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Eier</strong> satte status til{" "}
                  <Box component="strong" sx={{ color: readable(color) }}>
                    {feedbackStatusLabel(comment.status)}
                  </Box>{" "}
                  · {formatDateTime(comment.createdAtMs)}
                </Typography>
              </Stack>
            );
          }

          const mine = comment.createdByUid === me?.uid;
          const isNew = !mine && newSince !== null && comment.createdAtMs > newSince;
          return (
            <Box key={comment.id} sx={{ display: "flex", gap: 1.5 }}>
              <Avatar name={comment.createdByName} owner={comment.isOwner} />
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: "4px 14px 14px 14px",
                  px: 2,
                  py: 1.5,
                  ...(comment.isOwner
                    ? { border: 1, borderColor: alpha(FEEDBACK_ACCENT, 0.3), bgcolor: alpha(FEEDBACK_ACCENT, 0.08) }
                    : { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05) }),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {comment.createdByName || "Ukjent bruker"}
                  </Typography>
                  {comment.isOwner && (
                    <Box
                      component="span"
                      sx={{ px: 1, borderRadius: 999, bgcolor: FEEDBACK_ACCENT, color: "#fff", fontSize: 11, fontWeight: 600 }}
                    >
                      Eier
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {formatDateTime(comment.createdAtMs)}
                  </Typography>
                  {isNew && (
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        borderRadius: 999,
                        border: 1,
                        borderColor: alpha(FEEDBACK_ACCENT, 0.4),
                        color: readable(FEEDBACK_ACCENT),
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Ny
                    </Box>
                  )}
                  {(mine || viewerIsOwner) && (
                    <Tooltip title="Slett melding">
                      <IconButton size="small" aria-label="Slett melding" onClick={() => void remove(comment)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{comment.message}</Typography>
              </Box>
            </Box>
          );
        })}

        {canComment && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              p: 1.5,
            }}
          >
            <TextField
              multiline
              minRows={2}
              maxRows={8}
              fullWidth
              variant="standard"
              placeholder={
                viewerIsOwner
                  ? "Skriv et svar til bruker … Brukeren får varsel."
                  : "Skriv en kommentar eller svar …"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, FEEDBACK_COMMENT_MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
              inputProps={{ "aria-label": viewerIsOwner ? "Svar til bruker" : "Ny kommentar" }}
              InputProps={{ disableUnderline: true }}
            />
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              {viewerIsOwner ? (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Sett status
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={nextStatus}
                    aria-label="Status"
                    onChange={(_, next: FeedbackStatus | null) => next && setNextStatus(next)}
                    sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.25, py: 0.5 } }}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <ToggleButton key={s.value} value={s.value}>
                        {s.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
              ) : (
                <span />
              )}
              <Button
                variant="contained"
                disableElevation
                disabled={!canSend}
                onClick={() => void send()}
                endIcon={<SendRoundedIcon />}
                sx={{ textTransform: "none", fontWeight: 600, bgcolor: FEEDBACK_ACCENT, "&:hover": { bgcolor: "#7A2FB0" } }}
              >
                {sending ? "Sender…" : viewerIsOwner ? "Send svar" : "Send"}
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
