import * as React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import { FEEDBACK_COMMENT_MAX_LENGTH, FEEDBACK_MAX_LENGTH, feedbackApi } from "../services/feedbackApi";
import { feedbackPageLabel, FEEDBACK_STATUS_COLOR, type Feedback, type FeedbackComment } from "../types";
import FeedbackImages from "./FeedbackImages";
import FeedbackProgress from "./FeedbackProgress";
import FeedbackThread from "./FeedbackThread";
import { CategoryChip, OutlineTag, StatusPill } from "./feedbackUi";
import { FEEDBACK_ACCENT, formatDate, formatDateTime, useReadableColor } from "./feedbackUtils";
import { hasNewForAuthor, hasNewForOwner, hasOwnerUpdate } from "../hooks/useFeedbackUpdates";

// Kort blink rundt innspillet man ble sendt til fra varselet.
const flash = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(143, 59, 201, 0.55); }
  50% { box-shadow: 0 0 0 8px rgba(143, 59, 201, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(143, 59, 201, 0); }
`;

type Props = {
  item: Feedback;
  me: { uid: string; name: string } | null;
  /** Innlogget bruker er eier: kan svare, sette status og slette. */
  viewerIsOwner: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** Eiers oppdateringer nyere enn dette er nye for avsenderen. null = ikke lastet. */
  newSince: number | null;
  flashing: boolean;
};

/**
 * Ett innspill i lista, for både brukere og eier: type, side, avsender, status, tekst og
 * bilder – og en samlet samtale med fremdriftslinje når kortet er åpent.
 */
export default function FeedbackCard({
  item,
  me,
  viewerIsOwner,
  expanded,
  onToggle,
  newSince,
  flashing,
}: Props) {
  const readable = useReadableColor();
  const isMine = Boolean(me) && item.createdByUid === me?.uid;
  // Noe nytt siden betrakteren sist så siden: for eier nye innspill og kommentarer fra andre,
  // for avsenderen svar og statusendringer fra eier og kommentarer fra andre.
  const hasNew =
    newSince !== null &&
    me !== null &&
    (viewerIsOwner ? hasNewForOwner(item, me.uid, newSince) : hasNewForAuthor(item, me.uid, newSince));
  const newIsOwnerActivity =
    !viewerIsOwner && newSince !== null && hasOwnerUpdate(item) && item.updatedAtMs > newSince;
  const newLabel = viewerIsOwner
    ? item.createdAtMs > (newSince ?? 0)
      ? "Nytt innspill"
      : "Ny kommentar"
    : newIsOwnerActivity
      ? "Nytt fra eier"
      : "Ny kommentar";
  const newAt = viewerIsOwner
    ? Math.max(item.createdAtMs, item.lastCommentAtMs)
    : Math.max(newIsOwnerActivity ? item.updatedAtMs : 0, item.lastCommentAtMs);

  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Samtalen hentes først når kortet er åpent. Fremdriftslinjen øverst bruker den til datoene.
  const [comments, setComments] = React.useState<FeedbackComment[] | null>(null);
  const [commentsError, setCommentsError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!expanded) return;
    return feedbackApi.subscribeComments(
      item.id,
      (next) => {
        setComments(next);
        setCommentsError(null);
      },
      () => setCommentsError("Kunne ikke hente samtalen akkurat nå.")
    );
  }, [expanded, item.id]);

  const canEdit = isMine && item.status !== "ferdig_behandlet";
  const canDeleteOwn = isMine;
  const canComment = Boolean(me);

  // Hurtigkommentar: skriv direkte fra det lukkede kortet. Etter sending åpnes samtalen.
  const [quickDraft, setQuickDraft] = React.useState("");
  const [quickSending, setQuickSending] = React.useState(false);
  const sendQuick = async () => {
    const text = quickDraft.trim();
    if (!text || !me || quickSending) return;
    setQuickSending(true);
    setError(null);
    try {
      if (viewerIsOwner) await feedbackApi.ownerReply(item.id, text, null, me);
      else await feedbackApi.addComment(item.id, text, me, false);
      setQuickDraft("");
      if (!expanded) onToggle();
    } catch {
      setError("Kunne ikke sende kommentaren. Prøv igjen.");
    } finally {
      setQuickSending(false);
    }
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (text.length < 3 || saving) return;
    if (text === item.message.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await feedbackApi.updateMessage(item.id, text);
      setEditing(false);
    } catch {
      setError("Kunne ikke lagre endringen. Innspillet kan ha blitt behandlet i mellomtiden.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const preview = item.message.slice(0, 80);
    const text = viewerIsOwner ? "Slette dette innspillet?" : "Slette innspillet ditt?";
    if (!window.confirm(`${text}\n\n"${preview}${item.message.length > 80 ? "…" : ""}"`)) return;
    setError(null);
    try {
      await feedbackApi.remove(item.id, item.attachments);
    } catch {
      setError("Kunne ikke slette innspillet. Prøv igjen.");
    }
  };

  const quickStatus = async (status: "under_behandling" | "ferdig_behandlet") => {
    if (!me) return;
    setError(null);
    try {
      await feedbackApi.changeStatus(item.id, status, me);
    } catch {
      setError("Kunne ikke oppdatere status.");
    }
  };

  const showMenu = canEdit || canDeleteOwn;

  return (
    <Paper
      id={`innspill-${item.id}`}
      component="article"
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        scrollMarginTop: 16,
        borderColor: hasNew || expanded ? alpha(FEEDBACK_ACCENT, 0.55) : "divider",
        ...(hasNew && { boxShadow: `0 0 0 3px ${alpha(FEEDBACK_ACCENT, 0.12)}` }),
        ...(flashing && { animation: `${flash} 1s ease-in-out 3` }),
      }}
    >
      {hasNew && (
        <Box
          role="status"
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px 10px",
            px: 2.5,
            py: 1,
            fontSize: 13,
            borderBottom: 1,
            borderColor: alpha(FEEDBACK_ACCENT, 0.25),
            bgcolor: alpha(FEEDBACK_ACCENT, 0.1),
          }}
        >
          <NotificationsActiveOutlinedIcon sx={{ fontSize: 17, color: readable(FEEDBACK_ACCENT) }} />
          <Box component="strong" sx={{ fontWeight: 600, color: readable(FEEDBACK_ACCENT) }}>
            {newLabel}
          </Box>
          <Typography component="span" variant="body2" color="text.secondary">
            {formatDateTime(newAt)}
          </Typography>
          {newIsOwnerActivity && item.status !== "ikke_behandlet" && (
            <Box sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Typography component="span" variant="body2" color="text.secondary">
                Status:
              </Typography>
              <StatusPill status={item.status} small />
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2 }}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <CategoryChip category={item.category} />
            <OutlineTag>{feedbackPageLabel(item.pagePath)}</OutlineTag>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isMine ? "Du" : item.createdByName || "Ukjent bruker"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              · {formatDate(item.createdAtMs)}
            </Typography>
            {viewerIsOwner && item.createdByEmail && (
              <Typography variant="body2" color="text.secondary">
                · {item.createdByEmail}
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {expanded ? (
              <Box sx={{ width: { xs: "100%", sm: 340 } }}>
                <FeedbackProgress item={item} comments={comments ?? []} />
              </Box>
            ) : (
              <StatusPill status={item.status} />
            )}
            {showMenu && !viewerIsOwner && (
              <>
                <Tooltip title="Flere valg">
                  <IconButton
                    aria-label="Flere valg for innspillet ditt"
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                    sx={{ border: 1, borderColor: "divider", borderRadius: 2.5 }}
                  >
                    <MoreHorizRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                  {canEdit && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        setError(null);
                        setEditText(item.message);
                        setEditing(true);
                      }}
                    >
                      <ListItemIcon>
                        <EditOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Rediger</ListItemText>
                    </MenuItem>
                  )}
                  {canDeleteOwn && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        void remove();
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <ListItemIcon sx={{ color: "inherit" }}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Slett</ListItemText>
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            {viewerIsOwner && (
              <Tooltip title="Slett innspill">
                <IconButton
                  aria-label="Slett innspill"
                  onClick={() => void remove()}
                  sx={{ border: 1, borderColor: "divider", borderRadius: 2.5 }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex" }}>
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            {editing ? (
              <Box>
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value.slice(0, FEEDBACK_MAX_LENGTH))}
                  helperText={`${editText.length}/${FEEDBACK_MAX_LENGTH}`}
                  inputProps={{ "aria-label": "Rediger innspill" }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    disableElevation
                    disabled={editText.trim().length < 3 || saving}
                    onClick={() => void saveEdit()}
                    sx={{ textTransform: "none", fontWeight: 600, bgcolor: FEEDBACK_ACCENT, "&:hover": { bgcolor: "#7A2FB0" } }}
                  >
                    {saving ? "Lagrer…" : "Lagre"}
                  </Button>
                  <Button onClick={() => setEditing(false)} disabled={saving} sx={{ textTransform: "none" }}>
                    Avbryt
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 2.5,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
                }}
              >
              <Typography
                sx={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  ...(!expanded && {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }),
                }}
              >
                {item.message}
                {item.editedAtMs ? (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (redigert)
                  </Typography>
                ) : null}
              </Typography>
              </Box>
            )}
          </Box>

        </Box>

        <FeedbackImages attachments={item.attachments} />

        {expanded && (
          <FeedbackThread
            item={item}
            me={me}
            viewerIsOwner={viewerIsOwner}
            canComment={canComment}
            newSince={newSince}
            comments={comments}
            commentsError={commentsError}
          />
        )}
        {!editing && !expanded && canComment && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={6}
              placeholder="Skriv en kommentar eller svar …"
              value={quickDraft}
              onChange={(e) => setQuickDraft(e.target.value.slice(0, FEEDBACK_COMMENT_MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendQuick();
                }
              }}
              inputProps={{ "aria-label": `Kommentar til innspill fra ${item.createdByName}` }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, alignItems: "flex-end" } }}
              InputProps={{
                endAdornment: (
                  <Tooltip title="Send kommentar">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Send kommentar"
                        disabled={!quickDraft.trim() || quickSending}
                        onClick={() => void sendQuick()}
                        sx={{ color: readable(FEEDBACK_ACCENT) }}
                      >
                        <SendRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ),
              }}
            />
          </Box>
        )}

        {!editing && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            sx={{ pt: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.status === "ferdig_behandlet"
                ? `Ferdig ${formatDate(item.updatedAtMs)}`
                : hasOwnerUpdate(item)
                  ? `Oppdatert ${formatDate(item.updatedAtMs)}`
                  : "Ingen svar ennå"}
            </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
              {viewerIsOwner && !expanded && item.status === "ikke_behandlet" && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void quickStatus("under_behandling")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: readable(FEEDBACK_STATUS_COLOR.under_behandling),
                    borderColor: alpha(FEEDBACK_STATUS_COLOR.under_behandling, 0.6),
                    bgcolor: alpha(FEEDBACK_STATUS_COLOR.under_behandling, 0.12),
                  }}
                >
                  Start behandling
                </Button>
              )}
              {viewerIsOwner && !expanded && item.status === "under_behandling" && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void quickStatus("ferdig_behandlet")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: readable(FEEDBACK_STATUS_COLOR.ferdig_behandlet),
                    borderColor: alpha(FEEDBACK_STATUS_COLOR.ferdig_behandlet, 0.6),
                    bgcolor: alpha(FEEDBACK_STATUS_COLOR.ferdig_behandlet, 0.12),
                  }}
                >
                  Merk som ferdig
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={onToggle}
                aria-expanded={expanded}
                startIcon={expanded ? undefined : <ForumOutlinedIcon fontSize="small" />}
                endIcon={expanded ? <ExpandLessRoundedIcon /> : undefined}
                sx={{ textTransform: "none", fontWeight: 600, whiteSpace: "nowrap", color: readable(FEEDBACK_ACCENT), borderColor: alpha(FEEDBACK_ACCENT, 0.4) }}
              >
                {expanded ? "Skjul" : canComment ? "Samtale" : "Se samtale"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
