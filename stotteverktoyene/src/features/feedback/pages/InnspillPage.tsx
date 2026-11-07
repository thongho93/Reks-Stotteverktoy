import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { useAuthUser } from "../../../app/auth/useAuthUser";
import FeedbackCard from "../components/FeedbackCard";
import FeedbackThemeProvider from "../components/FeedbackThemeProvider";
import NewFeedbackForm from "../components/NewFeedbackForm";
import { FEEDBACK_ACCENT, useReadableColor } from "../components/feedbackUtils";
import { hasNewForAuthor, useFeedbackUpdates } from "../hooks/useFeedbackUpdates";
import { feedbackApi } from "../services/feedbackApi";
import { FEEDBACK_STATUSES, FEEDBACK_STATUS_COLOR, feedbackPageLabel, type Feedback } from "../types";

type Scope = "alle" | "mine";

const STATUS_HELP: Record<(typeof FEEDBACK_STATUSES)[number]["value"], string> = {
  ikke_behandlet: "Mottatt, men ikke sett på ennå.",
  under_behandling: "Eier jobber med saken og kan stille spørsmål i samtalen.",
  ferdig_behandlet: "Løst, eller besluttet at det ikke gjøres. Begrunnelsen står i samtalen.",
};

const STOP_WORDS = new Set(["det", "som", "til", "med", "for", "har", "ikke", "eller", "kan", "fra", "når", "hva", "være"]);

function words(text: string): string[] {
  return [
    ...new Set(
      text
        .toLocaleLowerCase("nb-NO")
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    ),
  ];
}

/** To ord regnes som like også i ulik bøyning eller sammensetning (legemiddel / legemiddelnavn). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.startsWith(short.slice(0, Math.max(5, short.length - 2)));
}

/** Innspill som ligner det brukeren skriver nå, så samme sak ikke meldes inn to ganger. */
function findSimilar(items: Feedback[], draft: string): Feedback[] {
  const mine = words(draft);
  if (draft.trim().length < 4 || mine.length === 0) return [];
  // Ett eneste ord holder; med flere ord må minst to være felles.
  const needed = Math.min(2, mine.length);

  return items
    .map((item) => {
      const theirs = words(`${item.message} ${feedbackPageLabel(item.pagePath)}`);
      const score = mine.filter((w) => theirs.some((t) => sameWord(w, t))).length;
      return { item, score };
    })
    .filter((x) => x.score >= needed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.item);
}

/**
 * Brukernes innspillsside: meld inn feil eller ønsker, og følg med på hva eier gjør med
 * dem. Lista er delt med alle, slik at man kan sjekke om en sak alt er meldt inn. Eiers
 * behandling – svar, status og sletting – ligger på /rekspert/feedbacks.
 */
export default function InnspillPage() {
  const { user, firstName } = useAuthUser();
  const readable = useReadableColor();

  const [items, setItems] = React.useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<Scope>("alle");
  const [search, setSearch] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const reporterName =
    firstName?.trim() || user?.displayName?.trim() || user?.email?.trim() || "Ukjent bruker";
  const me = user?.uid ? { uid: user.uid, name: reporterName } : null;

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

  // Oppdateringer fra eier siden forrige besøk utheves. Tidspunktet fryses første gang
  // det er lastet, og siden merkes deretter som sett.
  const { seenAtMs, markSeen } = useFeedbackUpdates(user?.uid);
  const [highlightSince, setHighlightSince] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (seenAtMs === null || highlightSince !== null) return;
    setHighlightSince(seenAtMs);
    markSeen();
  }, [highlightSince, markSeen, seenAtMs]);

  const uidNow = user?.uid ?? "";
  const updatedItems = React.useMemo(
    () =>
      highlightSince === null
        ? []
        : items.filter((item) => uidNow !== "" && hasNewForAuthor(item, uidNow, highlightSince)),
    [highlightSince, items, uidNow]
  );

  const jumpTo = React.useCallback((id: string) => {
    setExpandedId(id);
    // Liten pause, slik at kortet er åpnet og tegnet før vi scroller.
    window.setTimeout(() => {
      document.getElementById(`innspill-${id}`)?.scrollIntoView({ block: "center" });
      setFlashId(id);
      window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 3000);
    }, 120);
  }, []);

  // Kom du hit fra varselet (?innspill=<id>), åpnes og vises det aktuelle innspillet.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("innspill");
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

  const similar = React.useMemo(() => findSimilar(items, draft), [draft, items]);

  const author = user?.uid
    ? { uid: user.uid, name: reporterName, email: user.email?.trim() ?? "" }
    : null;

  return (
    <FeedbackThemeProvider>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box
          sx={{
            width: "100%",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "auto",
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ maxWidth: 1240, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h2" gutterBottom={false} sx={{ m: 0 }}>
              Innspill
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 300px" },
                gap: 3.5,
                alignItems: "start",
              }}
            >
              {/* Liste */}
              <Box component="main" sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <NewFeedbackForm author={author} onDraftChange={setDraft} similar={similar} onOpenSimilar={jumpTo} />

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={scope}
                    aria-label="Vis"
                    onChange={(_, next: Scope | null) => next && setScope(next)}
                    sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 2 } }}
                  >
                    <ToggleButton value="alle">Alle</ToggleButton>
                    <ToggleButton value="mine">Mine {mineCount}</ToggleButton>
                  </ToggleButtonGroup>

                  <TextField
                    size="small"
                    placeholder="Søk – er saken alt meldt inn?"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    inputProps={{ "aria-label": "Søk i innspill" }}
                    sx={{ width: { xs: "100%", sm: 340 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {listError && <Alert severity="error">{listError}</Alert>}

                {!listError && !isLoading && filtered.length === 0 && (
                  <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      {search.trim()
                        ? "Ingen innspill passer søket."
                        : scope === "mine"
                          ? "Du har ikke sendt inn noe ennå. Første innspill dukker opp her."
                          : "Ingen innspill er meldt inn ennå."}
                    </Typography>
                  </Paper>
                )}

                {filtered.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    me={me}
                    viewerIsOwner={false}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
                    newSince={highlightSince}
                    flashing={flashId === item.id}
                  />
                ))}
              </Box>

              {/* Sidekolonne */}
              <Box
                component="aside"
                aria-label="Om innspill"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  position: { lg: "sticky" },
                  top: { lg: 0 },
                }}
              >
                {updatedItems.length > 0 && (
                  <Paper
                    role="status"
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 4, borderWidth: 2, borderColor: FEEDBACK_ACCENT, display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          bgcolor: FEEDBACK_ACCENT,
                        }}
                      >
                        <NotificationsActiveOutlinedIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {updatedItems.length === 1 ? "1 nytt svar" : `${updatedItems.length} nye svar`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          på innspillene dine
                        </Typography>
                      </Box>
                    </Stack>
                    {updatedItems.map((item) => (
                      <Box
                        key={item.id}
                        component="button"
                        type="button"
                        onClick={() => jumpTo(item.id)}
                        sx={{
                          textAlign: "left",
                          cursor: "pointer",
                          font: "inherit",
                          color: "text.primary",
                          bgcolor: "transparent",
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 3,
                          px: 1.5,
                          py: 1.25,
                          "&:hover": { bgcolor: alpha(FEEDBACK_ACCENT, 0.08) },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: readable(FEEDBACK_ACCENT), fontWeight: 600 }}>
                          Nytt svar
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
                  <Typography sx={{ fontWeight: 600, mb: 1.5 }}>Slik følger du saken</Typography>
                  <Stack spacing={1.75} component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
                    {FEEDBACK_STATUSES.map((status) => (
                      <Stack key={status.value} component="li" direction="row" spacing={1.5}>
                        <Box
                          sx={{
                            flex: "none",
                            mt: 0.75,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: FEEDBACK_STATUS_COLOR[status.value],
                          }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {status.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {STATUS_HELP[status.value]}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>

              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </FeedbackThemeProvider>
  );
}
