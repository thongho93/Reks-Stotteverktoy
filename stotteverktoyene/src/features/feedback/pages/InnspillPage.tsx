import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import { useAuthUser } from "../../../app/auth/useAuthUser";
import FeedbackComments from "../components/FeedbackComments";
import FeedbackImages from "../components/FeedbackImages";
import { hasOwnerUpdate, useFeedbackUpdates } from "../hooks/useFeedbackUpdates";
import ImagePicker from "../components/ImagePicker";
import { feedbackApi, FEEDBACK_MAX_LENGTH } from "../services/feedbackApi";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_PAGES,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_COLOR,
  feedbackPageLabel,
  feedbackStatusLabel,
  type Feedback,
  type FeedbackCategory,
} from "../types";

type Scope = "alle" | "mine";

// Kort blink rundt innspillet man ble sendt til fra varselet.
const flash = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(14, 159, 142, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(14, 159, 142, 0.25); }
  100% { box-shadow: 0 0 0 0 rgba(14, 159, 142, 0); }
`;

function formatDateTime(ms: number): string {
  if (!ms) return "–";
  return new Date(ms).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}

/** Tre punkter som viser hvor langt eier har kommet med innspillet. */
function StatusTrail({ status }: { status: Feedback["status"] }) {
  const activeIndex = FEEDBACK_STATUSES.findIndex((s) => s.value === status);

  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexWrap: "wrap" }} useFlexGap>
      {FEEDBACK_STATUSES.map((step, index) => {
        const reached = index <= activeIndex;
        const color = FEEDBACK_STATUS_COLOR[step.value];

        return (
          <React.Fragment key={step.value}>
            {index > 0 && (
              <Box
                sx={{
                  width: 18,
                  height: 2,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    reached ? color : alpha(theme.palette.text.primary, 0.16),
                }}
              />
            )}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: (theme) => (reached ? color : alpha(theme.palette.text.primary, 0.2)),
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: reached ? "text.primary" : "text.secondary",
                  fontWeight: index === activeIndex ? 700 : 400,
                }}
              >
                {step.label}
              </Typography>
            </Stack>
          </React.Fragment>
        );
      })}
    </Stack>
  );
}

/**
 * Brukernes innspillsside: meld inn feil eller ønsker, og følg med på hva eier
 * gjør med dem. Lista er delt med alle brukere, slik at man kan sjekke om en sak
 * alt er meldt inn. Eiers samleside – med status, svar og sletting – ligger på
 * /rekspert/feedbacks.
 */
export default function InnspillPage() {
  const { user, firstName, isOwner } = useAuthUser();

  const [category, setCategory] = React.useState<FeedbackCategory>("bug");
  const [pagePath, setPagePath] = React.useState<string>("__annet");
  const [message, setMessage] = React.useState("");
  const [images, setImages] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const [items, setItems] = React.useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<Scope>("alle");
  const [search, setSearch] = React.useState("");

  // Oppdateringer fra eier siden forrige besøk utheves på denne visningen. Tidspunktet
  // fryses første gang det er lastet, og siden merkes deretter som sett.
  const { seenAtMs, markSeen } = useFeedbackUpdates(user?.uid);
  const [highlightSince, setHighlightSince] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (seenAtMs === null || highlightSince !== null) return;
    setHighlightSince(seenAtMs);
    markSeen();
  }, [highlightSince, markSeen, seenAtMs]);

  // Innspillene med nye svar siden sist, og hopp til et av dem (fra varselet på
  // «Innspill»-fanen, eller fra knappen i meldingen øverst i lista).
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("innspill");
  const [flashId, setFlashId] = React.useState<string | null>(null);

  // Redigering og sletting av egne innspill.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [itemError, setItemError] = React.useState<string | null>(null);

  const startEdit = (item: Feedback) => {
    setItemError(null);
    setEditingId(item.id);
    setEditText(item.message);
  };

  const saveEdit = async (item: Feedback) => {
    const text = editText.trim();
    if (text.length < 3 || editSaving) return;
    if (text === item.message.trim()) {
      setEditingId(null);
      return;
    }
    setEditSaving(true);
    setItemError(null);
    try {
      await feedbackApi.updateMessage(item.id, text);
      setEditingId(null);
    } catch {
      setItemError("Kunne ikke lagre endringen. Innspillet kan ha blitt behandlet i mellomtiden.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteOwn = async (item: Feedback) => {
    const preview = item.message.slice(0, 80);
    if (!window.confirm(`Slette innspillet ditt?\n\n"${preview}${item.message.length > 80 ? "…" : ""}"`)) return;
    setItemError(null);
    try {
      await feedbackApi.remove(item.id, item.attachments);
    } catch {
      setItemError("Kunne ikke slette innspillet. Det kan ha blitt behandlet i mellomtiden.");
    }
  };

  const jumpTo = React.useCallback((id: string) => {
    // Liten pause, slik at lista er ferdig tegnet (og scope/søk nullstilt) før vi scroller.
    window.setTimeout(() => {
      document
        .getElementById(`innspill-${id}`)
        ?.scrollIntoView({ block: "center" });
      setFlashId(id);
      window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 3000);
    }, 80);
  }, []);

  const reporterName = React.useMemo(
    () => firstName?.trim() || user?.displayName?.trim() || user?.email?.trim() || "Ukjent bruker",
    [firstName, user?.displayName, user?.email]
  );

  React.useEffect(() => {
    const unsubscribe = feedbackApi.subscribeAll(
      (next) => {
        setItems(next);
        setListError(null);
        setIsLoading(false);
      },
      (err) => {
        const code = (err as { code?: string } | undefined)?.code ?? "";
        setListError(
          code === "permission-denied"
            ? "Mangler tilgang til å hente innspill (permission-denied)."
            : "Kunne ikke hente innspill akkurat nå."
        );
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const updatedItems = React.useMemo(
    () =>
      highlightSince === null
        ? []
        : items.filter(
            (item) =>
              item.createdByUid === user?.uid &&
              hasOwnerUpdate(item) &&
              item.updatedAtMs > highlightSince
          ),
    [highlightSince, items, user?.uid]
  );

  // Kom du hit fra varselet (?innspill=<id>), scrolles det aktuelle innspillet frem.
  React.useEffect(() => {
    if (!focusId || isLoading || !items.some((item) => item.id === focusId)) return;
    setScope("alle");
    setSearch("");
    jumpTo(focusId);
    setSearchParams({}, { replace: true });
  }, [focusId, isLoading, items, jumpTo, setSearchParams]);

  const mineCount = React.useMemo(
    () => items.filter((item) => item.createdByUid === user?.uid).length,
    [items, user?.uid]
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("nb-NO");

    return items.filter((item) => {
      if (scope === "mine" && item.createdByUid !== user?.uid) return false;
      if (!needle) return true;

      const haystack = `${item.message} ${item.createdByName} ${feedbackPageLabel(item.pagePath)}`
        .toLocaleLowerCase("nb-NO");
      return haystack.includes(needle);
    });
  }, [items, scope, search, user?.uid]);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= 3 && !submitting && Boolean(user?.uid);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || !user?.uid) return;

    setSubmitting(true);
    setFormError(null);

    try {
      await feedbackApi.submit(
        { message: trimmed, category, pagePath, images },
        { uid: user.uid, name: reporterName, email: user.email?.trim() ?? "" }
      );

      setMessage("");
      setImages([]);
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code ?? "";
      setFormError(
        code === "permission-denied"
          ? "Du mangler tilgang til å sende innspill. Kontakt eier."
          : "Kunne ikke sende innspillet. Prøv igjen."
      );
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, category, images, pagePath, reporterName, trimmed, user]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          width: "100%",
          flex: "1 1 auto",
          display: "flex",
          overflow: "hidden",
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
        }}
      >
        <Paper
          sx={{
            width: "100%",
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h2" gutterBottom={false}>
              Innspill
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Meld inn feil eller ønsker, og følg med på hva som skjer med dem
            </Typography>
          </Box>

          <Box
            sx={{
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "auto",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 420px) minmax(0, 1fr)" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Nytt innspill
              </Typography>

              <Stack spacing={2}>
                {formError && <Alert severity="error">{formError}</Alert>}

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    Hva gjelder det?
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    exclusive
                    value={category}
                    onChange={(_, next: FeedbackCategory | null) => next && setCategory(next)}
                  >
                    {FEEDBACK_CATEGORIES.map((option) => (
                      <ToggleButton key={option.value} value={option.value} sx={{ gap: 0.75 }}>
                        {option.value === "bug" ? (
                          <BugReportRoundedIcon fontSize="small" />
                        ) : (
                          <LightbulbRoundedIcon fontSize="small" />
                        )}
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Hvilken side gjelder det?"
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                >
                  {FEEDBACK_PAGES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  multiline
                  minRows={5}
                  fullWidth
                  label={category === "bug" ? "Beskriv feilen" : "Beskriv ønsket"}
                  placeholder={
                    category === "bug"
                      ? "Hva skjedde, og hva forventet du skulle skje?"
                      : "Hva savner du, og hva ville det hjulpet deg med?"
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, FEEDBACK_MAX_LENGTH))}
                  helperText={`${message.length}/${FEEDBACK_MAX_LENGTH}`}
                />

                <ImagePicker
                  files={images}
                  onChange={setImages}
                  onError={setFormError}
                  disabled={submitting}
                />

                <Typography variant="caption" color="text.secondary">
                  Sendes som <strong>{reporterName}</strong>, og er synlig for alle i appen slik at
                  samme sak ikke meldes inn to ganger. Ikke skriv personopplysninger om kunder eller
                  pasienter.
                </Typography>

                <Button
                  variant="contained"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                >
                  {submitting ? "Sender…" : "Send innspill"}
                </Button>
              </Stack>
            </Paper>

            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mb: 1.5 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  {scope === "mine" ? `Mine innspill (${mineCount})` : `Alle innspill (${items.length})`}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={scope}
                  onChange={(_, next: Scope | null) => next && setScope(next)}
                >
                  <ToggleButton value="alle">Alle</ToggleButton>
                  <ToggleButton value="mine">Mine</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <TextField
                size="small"
                fullWidth
                placeholder="Søk – er saken alt meldt inn?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />

              {updatedItems.length > 0 && (
                <Alert
                  severity="success"
                  icon={false}
                  sx={{ mb: 1.5, borderRadius: 2, alignItems: "center" }}
                  action={
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => jumpTo(updatedItems[0].id)}
                      sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {updatedItems.length === 1 ? "Gå til svaret" : "Gå til første"}
                    </Button>
                  }
                >
                  <strong>
                    {updatedItems.length === 1
                      ? "Du har ett nytt svar eller en statusendring"
                      : `Du har ${updatedItems.length} nye svar eller statusendringer`}
                  </strong>{" "}
                  på innspillene dine siden sist.
                </Alert>
              )}

              {listError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {listError}
                </Alert>
              )}

              {!listError && !isLoading && filtered.length === 0 && (
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    {search.trim()
                      ? "Ingen innspill passer søket."
                      : scope === "mine"
                        ? "Du har ikke sendt inn noe ennå. Første innspill dukker opp her."
                        : "Ingen innspill er meldt inn ennå."}
                  </Typography>
                </Paper>
              )}

              <Stack spacing={1.5}>
                {filtered.map((item) => (
                  <Paper
                    key={item.id}
                    id={`innspill-${item.id}`}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderLeft: "4px solid",
                      borderLeftColor: FEEDBACK_STATUS_COLOR[item.status],
                      scrollMarginTop: 16,
                      ...(updatedItems.some((u) => u.id === item.id) && {
                        borderColor: "success.main",
                        borderLeftColor: "success.main",
                      }),
                      ...(flashId === item.id && { animation: `${flash} 1s ease-in-out 3` }),
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mb: 1 }}
                    >
                      <Chip
                        size="small"
                        icon={
                          item.category === "bug" ? (
                            <BugReportRoundedIcon fontSize="small" />
                          ) : (
                            <LightbulbRoundedIcon fontSize="small" />
                          )
                        }
                        label={item.category === "bug" ? "Feil / bug" : "Ny funksjon"}
                      />
                      <Chip size="small" variant="outlined" label={feedbackPageLabel(item.pagePath)} />
                      {item.createdByUid === user?.uid && (
                        <Chip size="small" color="primary" variant="outlined" label="Ditt innspill" />
                      )}
                      {item.createdByUid === user?.uid &&
                        highlightSince !== null &&
                        hasOwnerUpdate(item) &&
                        item.updatedAtMs > highlightSince && (
                          <Chip size="small" color="success" label="Ny oppdatering" />
                        )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.createdByName || "Ukjent bruker"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(item.createdAtMs)}
                      </Typography>
                    </Stack>

                    {editingId === item.id ? (
                      <Box sx={{ mb: 1.5 }}>
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
                            size="small"
                            variant="contained"
                            disableElevation
                            disabled={editText.trim().length < 3 || editSaving}
                            onClick={() => void saveEdit(item)}
                          >
                            {editSaving ? "Lagrer…" : "Lagre"}
                          </Button>
                          <Button size="small" onClick={() => setEditingId(null)} disabled={editSaving}>
                            Avbryt
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Typography sx={{ whiteSpace: "pre-wrap", mb: 1.5 }}>
                        {item.message}
                        {item.editedAtMs ? (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            (redigert)
                          </Typography>
                        ) : null}
                      </Typography>
                    )}

                    <FeedbackImages attachments={item.attachments} />

                    <StatusTrail status={item.status} />

                    {item.ownerReply && (
                      <Paper
                        variant="outlined"
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          Svar fra eier
                        </Typography>
                        <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                          {item.ownerReply}
                        </Typography>
                      </Paper>
                    )}

                    {!item.ownerReply && item.status === "ferdig_behandlet" && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Merket som {feedbackStatusLabel(item.status).toLowerCase()} uten kommentar.
                      </Typography>
                    )}

                    {itemError && editingId === null && item.createdByUid === user?.uid && (
                      <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} onClose={() => setItemError(null)}>
                        {itemError}
                      </Alert>
                    )}

                    {item.createdByUid === user?.uid && editingId !== item.id && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        {item.status !== "ferdig_behandlet" && (
                          <Button
                            size="small"
                            color="inherit"
                            startIcon={<EditOutlinedIcon fontSize="small" />}
                            onClick={() => startEdit(item)}
                            sx={{ textTransform: "none" }}
                          >
                            Rediger
                          </Button>
                        )}
                        {item.status === "ikke_behandlet" && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                            onClick={() => void deleteOwn(item)}
                            sx={{ textTransform: "none" }}
                          >
                            Slett
                          </Button>
                        )}
                      </Stack>
                    )}

                    <FeedbackComments
                      feedbackId={item.id}
                      me={user?.uid ? { uid: user.uid, name: reporterName } : null}
                      canComment={isOwner || item.createdByUid === user?.uid}
                      isOwner={isOwner}
                      defaultOpen={updatedItems.some((u) => u.id === item.id) || flashId === item.id}
                    />
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={sent}
        autoHideDuration={4000}
        onClose={() => setSent(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSent(false)} variant="filled">
          Takk! Innspillet er sendt.
        </Alert>
      </Snackbar>
    </Box>
  );
}
