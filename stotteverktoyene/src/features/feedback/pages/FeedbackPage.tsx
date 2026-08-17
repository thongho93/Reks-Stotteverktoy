import * as React from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { feedbackApi, FEEDBACK_REPLY_MAX_LENGTH } from "../services/feedbackApi";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_COLOR,
  feedbackPageLabel,
  type Feedback,
  type FeedbackStatus,
} from "../types";

const ALL = "__alle__";

function formatDateTime(ms: number): string {
  if (!ms) return "–";
  return new Date(ms).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Eiers samleside for innspill sendt fra /innspill.
 * Ruten er gatet av RequireOwner. Alle brukere leser hele samlingen på /innspill,
 * men bare eier kan sette status, svare og slette.
 */
export default function FeedbackPage() {
  const [items, setItems] = React.useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = React.useState<string>(ALL);
  const [search, setSearch] = React.useState("");

  // Svarfeltet skrives lokalt mens man taster og lagres når feltet forlates.
  // Uten dette ville hver tast utløst en Firestore-skriving.
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const unsubscribe = feedbackApi.subscribeAll(
      (next) => {
        setItems(next);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        const code = (err as { code?: string } | undefined)?.code ?? "";
        setError(
          code === "permission-denied"
            ? "Du mangler tilgang til innspill. Siden krever eier-rolle."
            : "Kunne ikke hente innspill akkurat nå."
        );
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("nb-NO");

    return items.filter((item) => {
      if (statusFilter !== ALL && item.status !== statusFilter) return false;
      if (categoryFilter !== ALL && item.category !== categoryFilter) return false;
      if (!needle) return true;

      const haystack = `${item.message} ${item.createdByName} ${item.createdByEmail} ${item.pagePath}`
        .toLocaleLowerCase("nb-NO");
      return haystack.includes(needle);
    });
  }, [categoryFilter, items, search, statusFilter]);

  const counts = React.useMemo(() => {
    const byStatus = new Map<FeedbackStatus, number>();
    for (const item of items) byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
    return byStatus;
  }, [items]);

  const handleStatusChange = React.useCallback(async (id: string, status: FeedbackStatus) => {
    try {
      await feedbackApi.setStatus(id, status);
    } catch {
      setError("Kunne ikke oppdatere status.");
    }
  }, []);

  const handleReplyBlur = React.useCallback(
    async (item: Feedback) => {
      const draft = replyDrafts[item.id];
      if (draft === undefined || draft === item.ownerReply) return;

      try {
        await feedbackApi.setOwnerReply(item.id, draft);
      } catch {
        setError("Kunne ikke lagre svaret.");
      }
    },
    [replyDrafts]
  );

  const handleDelete = React.useCallback(async (item: Feedback) => {
    const preview = item.message.slice(0, 80);
    if (!window.confirm(`Slette dette innspillet?\n\n"${preview}${item.message.length > 80 ? "…" : ""}"`)) {
      return;
    }

    try {
      await feedbackApi.remove(item.id);
    } catch {
      setError("Kunne ikke slette innspillet.");
    }
  }, []);

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
              Innspill fra brukerne – status og svar vises til alle på /innspill
            </Typography>
          </Box>

          {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                position: "sticky",
                top: 0,
                zIndex: 5,
                backgroundColor: "background.paper",
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", lg: "center" }}
              >
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={statusFilter}
                  onChange={(_, next: string | null) => next && setStatusFilter(next)}
                  sx={{ flexWrap: "wrap" }}
                >
                  <ToggleButton value={ALL}>Alle ({items.length})</ToggleButton>
                  {FEEDBACK_STATUSES.map((status) => (
                    <ToggleButton key={status.value} value={status.value}>
                      {status.label} ({counts.get(status.value) ?? 0})
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Box sx={{ flex: 1 }} />

                <TextField
                  size="small"
                  placeholder="Søk i innspill eller avsender"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: { xs: "auto", sm: 260 } }}
                />

                <TextField
                  size="small"
                  select
                  label="Type"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value={ALL}>Alle typer</MenuItem>
                  {FEEDBACK_CATEGORIES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {!error && !isLoading && filtered.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {items.length === 0
                    ? "Ingen innspill er sendt inn ennå."
                    : "Ingen innspill passer filtrene."}
                </Typography>
              </Paper>
            )}

            <Stack spacing={1.5}>
              {filtered.map((item) => (
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
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.createdByName || "Ukjent bruker"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(item.createdAtMs)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        select
                        value={item.status}
                        onChange={(e) =>
                          void handleStatusChange(item.id, e.target.value as FeedbackStatus)
                        }
                        sx={{ minWidth: 175 }}
                        aria-label={`Status for innspill fra ${item.createdByName}`}
                      >
                        {FEEDBACK_STATUSES.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </TextField>

                      <Tooltip title="Slett innspill">
                        <IconButton size="small" onClick={() => void handleDelete(item)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Typography sx={{ whiteSpace: "pre-wrap", mb: 1.5 }}>{item.message}</Typography>

                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={1}
                    label="Svar til bruker (synlig for alle)"
                    placeholder="Fikset i neste versjon, eller: trenger mer info om …"
                    value={replyDrafts[item.id] ?? item.ownerReply}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value.slice(0, FEEDBACK_REPLY_MAX_LENGTH),
                      }))
                    }
                    onBlur={() => void handleReplyBlur(item)}
                  />

                  {item.createdByEmail && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      {item.createdByEmail} · sist oppdatert {formatDateTime(item.updatedAtMs)}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
