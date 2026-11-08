import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useAuthUser } from "../../../app/auth/useAuthUser";
import FeedbackCard from "../components/FeedbackCard";
import FeedbackThemeProvider from "../components/FeedbackThemeProvider";
import { FEEDBACK_ACCENT, formatDate, useReadableColor } from "../components/feedbackUtils";
import { hasNewForOwner, useOwnerFeedbackAlerts } from "../hooks/useFeedbackUpdates";
import { feedbackApi } from "../services/feedbackApi";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_COLOR,
  feedbackPageLabel,
  type Feedback,
  type FeedbackStatus,
} from "../types";
import { pageFrameSx } from "../../../app/pageLayout";

const ALL = "__alle__";

/**
 * Eiers samleside for innspill sendt fra /innspill. Ruten er gatet av RequireOwner.
 * Alle brukere leser hele samlingen på /innspill, men bare eier kan svare, sette status
 * og slette. Svar og statusendringer skjer i samme felt, i samtalen under innspillet.
 */
export default function FeedbackPage() {
  const { user, firstName } = useAuthUser();
  const readable = useReadableColor();

  const [items, setItems] = React.useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [statusFilter, setStatusFilter] = React.useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = React.useState<string>(ALL);
  const [search, setSearch] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const me = user?.uid
    ? { uid: user.uid, name: firstName?.trim() || user.displayName?.trim() || "Eier" }
    : null;

  // Nye innspill og kommentarer fra andre siden eier sist var her utheves. Tidspunktet
  // fryses første gang det er lastet, og siden merkes deretter som sett.
  const uid = user?.uid ?? null;
  const { seenAtMs, markSeen } = useOwnerFeedbackAlerts(uid, true);
  const [highlightSince, setHighlightSince] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (seenAtMs === null || highlightSince !== null) return;
    setHighlightSince(seenAtMs);
    markSeen();
  }, [highlightSince, markSeen, seenAtMs]);

  const newCount =
    highlightSince === null || !uid
      ? 0
      : items.filter((item) => hasNewForOwner(item, uid, highlightSince)).length;

  // Kom du hit fra varselet (?innspill=<id>), åpnes og vises det aktuelle innspillet.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("innspill");
  React.useEffect(() => {
    if (!focusId || isLoading || !items.some((item) => item.id === focusId)) return;
    setStatusFilter(ALL);
    setCategoryFilter(ALL);
    setSearch("");
    setExpandedId(focusId);
    window.setTimeout(() => {
      document.getElementById(`innspill-${focusId}`)?.scrollIntoView({ block: "center" });
      setFlashId(focusId);
      window.setTimeout(() => setFlashId((cur) => (cur === focusId ? null : cur)), 3000);
    }, 120);
    setSearchParams({}, { replace: true });
  }, [focusId, isLoading, items, setSearchParams]);

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
      const haystack = `${item.message} ${item.createdByName} ${item.createdByEmail} ${feedbackPageLabel(item.pagePath)}`
        .toLocaleLowerCase("nb-NO");
      return haystack.includes(needle);
    });
  }, [categoryFilter, items, search, statusFilter]);

  // Tellerne er også filtre. Under tallet står det som hjelper eier å prioritere.
  const tiles = React.useMemo(() => {
    const byStatus = new Map<FeedbackStatus, Feedback[]>();
    for (const item of items) byStatus.set(item.status, [...(byStatus.get(item.status) ?? []), item]);
    const oldest = (list: Feedback[]) =>
      list.length ? formatDate(Math.min(...list.map((i) => i.createdAtMs).filter(Boolean))) : "";
    const latest = (list: Feedback[]) =>
      list.length ? formatDate(Math.max(...list.map((i) => i.updatedAtMs))) : "";

    return FEEDBACK_STATUSES.map((s) => {
      const list = byStatus.get(s.value) ?? [];
      const hint =
        s.value === "ikke_behandlet"
          ? list.length
            ? `Eldste: ${oldest(list)}`
            : "Ingenting venter"
          : s.value === "ferdig_behandlet"
            ? list.length
              ? `Siste: ${latest(list)}`
              : "–"
            : `${list.length} pågår`;
      return { status: s.value, label: s.label, count: list.length, hint };
    });
  }, [items]);

  return (
    <FeedbackThemeProvider>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box
          sx={{
            width: "100%",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <Box sx={{ ...pageFrameSx, display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <Typography variant="h2" gutterBottom={false} sx={{ m: 0 }}>
                Innspill
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Eier · behandle, svar og vis fremdrift
                {newCount > 0 && (
                  <Box component="strong" sx={{ ml: 1.5, color: readable(FEEDBACK_ACCENT), fontWeight: 600 }}>
                    {newCount === 1 ? "1 nytt siden sist" : `${newCount} nye siden sist`}
                  </Box>
                )}
              </Typography>
            </Box>

            {isLoading && <LinearProgress sx={{ borderRadius: 999 }} />}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Tellere som filtre */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 1.75,
              }}
            >
              {tiles.map((tile) => {
                const active = statusFilter === tile.status;
                const color = FEEDBACK_STATUS_COLOR[tile.status];
                return (
                  <Box
                    key={tile.status}
                    component="button"
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(active ? ALL : tile.status)}
                    sx={{
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      color: "text.primary",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      px: 2.25,
                      py: 2,
                      borderRadius: 3.5,
                      border: active ? 2 : 1,
                      borderColor: active ? "text.primary" : "divider",
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: alpha(color, 0.08) },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", fontSize: 13 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                      {tile.label}
                    </Box>
                    <Typography sx={{ fontSize: 32, lineHeight: "38px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {tile.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tile.hint}
                    </Typography>
                  </Box>
                );
              })}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Søk i innspill"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  inputProps={{ "aria-label": "Søk i innspill" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  inputProps={{ "aria-label": "Type" }}
                >
                  <MenuItem value={ALL}>Alle typer</MenuItem>
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            {!isLoading && !error && filtered.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
                <Typography color="text.secondary">Ingen innspill passer filteret.</Typography>
              </Paper>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
              {filtered.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  me={me}
                  viewerIsOwner
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
                  newSince={highlightSince}
                  flashing={flashId === item.id}
                />
              ))}
            </Box>

            <Typography variant="caption" sx={{ color: readable(FEEDBACK_ACCENT) }}>
              Svar og statusendringer sendes til avsenderen som varsel.
            </Typography>
          </Box>
        </Box>
      </Box>
    </FeedbackThemeProvider>
  );
}
