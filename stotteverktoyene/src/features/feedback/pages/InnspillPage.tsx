import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";

import { useAuthUser } from "../../../app/auth/useAuthUser";
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
 * gjør med dem. Eiers samleside ligger på /rekspert/feedbacks.
 */
export default function InnspillPage() {
  const { user, firstName } = useAuthUser();

  const [category, setCategory] = React.useState<FeedbackCategory>("bug");
  const [pagePath, setPagePath] = React.useState<string>("__annet");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const [items, setItems] = React.useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);

  const reporterName = React.useMemo(
    () => firstName?.trim() || user?.displayName?.trim() || user?.email?.trim() || "Ukjent bruker",
    [firstName, user?.displayName, user?.email]
  );

  React.useEffect(() => {
    if (!user?.uid) return undefined;

    const unsubscribe = feedbackApi.subscribeMine(
      user.uid,
      (next) => {
        setItems(next);
        setListError(null);
        setIsLoading(false);
      },
      (err) => {
        const code = (err as { code?: string } | undefined)?.code ?? "";
        setListError(
          code === "permission-denied"
            ? "Mangler tilgang til å hente dine innspill (permission-denied)."
            : "Kunne ikke hente dine innspill akkurat nå."
        );
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= 3 && !submitting && Boolean(user?.uid);

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit || !user?.uid) return;

    setSubmitting(true);
    setFormError(null);

    try {
      await feedbackApi.submit(
        { message: trimmed, category, pagePath },
        { uid: user.uid, name: reporterName, email: user.email?.trim() ?? "" }
      );

      setMessage("");
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
  }, [canSubmit, category, pagePath, reporterName, trimmed, user]);

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

                <Typography variant="caption" color="text.secondary">
                  Sendes som <strong>{reporterName}</strong>, slik at eier kan følge opp med deg.
                  Ikke skriv personopplysninger om kunder eller pasienter.
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Mine innspill ({items.length})
              </Typography>

              {listError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {listError}
                </Alert>
              )}

              {!listError && !isLoading && items.length === 0 && (
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    Du har ikke sendt inn noe ennå. Første innspill dukker opp her.
                  </Typography>
                </Paper>
              )}

              <Stack spacing={1.5}>
                {items.map((item) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderLeft: "4px solid",
                      borderLeftColor: FEEDBACK_STATUS_COLOR[item.status],
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
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(item.createdAtMs)}
                      </Typography>
                    </Stack>

                    <Typography sx={{ whiteSpace: "pre-wrap", mb: 1.5 }}>{item.message}</Typography>

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
