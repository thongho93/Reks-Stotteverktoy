import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Snackbar,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import IndeterminateCheckBoxOutlinedIcon from "@mui/icons-material/IndeterminateCheckBoxOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";

import {
  CreateStandardtekstDialog,
  EditStandardtekstDialog,
} from "../components/CreateStandardtekstDialog";
import { useInteractions } from "../services/useInteractions";
import { useStandardtekster } from "../hooks/useStandardtekster";
import {
  matchInteractionsBySelectedTerms,
  type InteractionEntity,
  type MatchResult,
} from "../../fest/mappers/interactionsToIndex";

import {
  isActionableRelevance,
  RelevanceIcon,
  relevanceKind,
} from "../utils/relevance";
import { normalizeStandardtekstTitle } from "../utils/standardtekster";

import { replaceFirstName } from "../../standardtekster/utils/content";
import { useAuthUser } from "../../../app/auth/useAuthUser";

const HISTORY_KEY_PREFIX = "interaksjoner_history_v1";

type HistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  interactionIndex: number;
  selected: InteractionEntity[];
  createdAt: number;
};

export default function InteraksjonerPage() {
  const { index, loading, error, reload } = useInteractions();
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const getEntityId = React.useCallback(
    (entity: InteractionEntity) => entity.id ?? (entity.atc ? `atc:${entity.atc}` : `name:${entity.key}`),
    []
  );

  const { user, isAdmin } = useAuthUser();
  const lastKnownUidRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (user?.uid) lastKnownUidRef.current = user.uid;
  }, [user?.uid]);

  const firstName = (user?.firstName ?? null) as string | null;

  const historyKey = React.useMemo(() => {
    const uid = user?.uid ?? lastKnownUidRef.current;
    return uid ? `${HISTORY_KEY_PREFIX}:${uid}` : `${HISTORY_KEY_PREFIX}:anon`;
  }, [user?.uid]);

  const [selected, setSelected] = React.useState<InteractionEntity[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [results, setResults] = React.useState<MatchResult[]>([]);
  const [activeResult, setActiveResult] = React.useState<number>(0);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [activeLinkedStdId, setActiveLinkedStdId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const lastAutoHistoryKeyRef = React.useRef<string | null>(null);

  const [copySnackOpen, setCopySnackOpen] = React.useState(false);
  const [copySnackMsg, setCopySnackMsg] = React.useState<string>("Tekst kopiert");
  const [standardtekstFilter, setStandardtekstFilter] = React.useState("");

  const { standardtekster, reload: reloadStandardtekster } = useStandardtekster();

  const activeCtx = React.useMemo(() => {
    if (!index || results.length === 0) return null;
    const r = results[Math.min(activeResult, results.length - 1)];
    const it = index.interactions[r.interactionIndex];

    const interactionId = it?.interaksjonId ?? null;

    const groups = (r.matchedGroups ?? []).slice(0, 2);
    const names = groups
      .map((gi) => {
        const g = it.substansgrupper?.[gi];
        return g?.navn || g?.substanser?.[0]?.substans || "";
      })
      .filter(Boolean);

    const prefillTitle = names.length === 2 ? `${names[0]} × ${names[1]}` : "Interaksjon";

    return { r, it, interactionId, prefillTitle };
  }, [index, results, activeResult]);

  const labelByTerm = React.useMemo(() => {
    // Map both name-key and ATC to a nice display label (for "søkeinput ...")
    const map = new Map<string, string>();
    for (const s of selected) {
      map.set(s.key, s.label);
      if (s.atc) map.set(s.atc, `${s.label}`);
    }
    return map;
  }, [selected]);

  const isExactAtc7 = (v: string) => {
    const s = v.trim().toUpperCase();
    // Eksakt ATC (7 tegn): f.eks. C09AA01 / N02AA03
    return /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/.test(s);
  };

  const normalizeAtcInput = (v: string) => {
    const raw = v ?? "";
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    // Only collapse whitespace if the result looks like an ATC code/prefix.
    // Examples users paste/type: "C03A A", "C03A B", "C03A B01".
    const collapsed = trimmed.replace(/\s+/g, "");
    const looksAtcPrefix = /^[A-Z][0-9]{2}[A-Z0-9]{1,4}$/.test(collapsed.toUpperCase());

    if (looksAtcPrefix && /\s/.test(trimmed)) {
      return collapsed;
    }

    return raw;
  };

  const handleReset = React.useCallback(() => {
    setSelected([]);
    setResults([]);
    setActiveResult(0);
    setExpanded({});
    setInputValue("");
    setActiveLinkedStdId(null);
    setCreateOpen(false);
    setEditOpen(false);
  }, []);

  // Hotkey: Escape => reset search
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't interfere while dialogs are open
      if (createOpen || editOpen) return;

      e.preventDefault();
      handleReset();

      // Refocus search for fast re-entry
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleReset, createOpen, editOpen]);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(historyKey);
      if (!raw) {
        setHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (!Array.isArray(parsed)) {
        setHistory([]);
        return;
      }
      setHistory(parsed.slice(0, 5));
    } catch {
      setHistory([]);
    }
  }, [historyKey]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 5)));
    } catch {
      // ignore
    }
  }, [history, historyKey]);

  const getMatchTitle = React.useCallback(
    (r: MatchResult) => {
      if (!index) return "Interaksjon";
      const it = index.interactions[r.interactionIndex];
      const gA = it.substansgrupper?.[r.matchedGroups?.[0]];
      const gB = it.substansgrupper?.[r.matchedGroups?.[1]];

      const nameFromGroup = (g?: any) => {
        if (!g) return "";
        if (g.navn) return g.navn;
        return g.substanser?.[0]?.substans || "";
      };

      const a = nameFromGroup(gA);
      const b = nameFromGroup(gB);
      return [a, b].filter(Boolean).join(" × ") || "Interaksjon";
    },
    [index]
  );

  const pushHistory = React.useCallback(
    (r: MatchResult) => {
      if (!index) return;
      const it = index.interactions[r.interactionIndex];
      const title = getMatchTitle(r);

      const item: HistoryItem = {
        id: `${it.interaksjonId ?? r.interactionIndex}:${Date.now()}`,
        title,
        subtitle: it.kliniskKonsekvens ?? undefined,
        interactionIndex: r.interactionIndex,
        selected: selected,
        createdAt: Date.now(),
      };

      setHistory((prev) => {
        const withoutDup = prev.filter((x) => x.interactionIndex !== item.interactionIndex);
        return [item, ...withoutDup].slice(0, 5);
      });
    },
    [index, getMatchTitle, selected]
  );

  // Auto-lagre til historikk når det kun finnes 1 treff.
  // Når det finnes flere treff, krever vi at bruker klikker på et spesifikt treff.
  React.useEffect(() => {
    if (!index) return;
    if (selected.length < 2) {
      lastAutoHistoryKeyRef.current = null;
      return;
    }

    if (results.length !== 1) {
      lastAutoHistoryKeyRef.current = null;
      return;
    }

    const r = results[0];
    const selKey = selected
      .map((s) => (s.atc ? `atc:${s.atc}` : `name:${s.key}`))
      .sort()
      .join("|");
    const key = `${r.interactionIndex}::${selKey}`;

    if (lastAutoHistoryKeyRef.current === key) return;
    lastAutoHistoryKeyRef.current = key;

    pushHistory(r);
  }, [index, results, selected, pushHistory]);

  const showHistory = selected.length === 0 && inputValue.trim().length === 0 && history.length > 0;
  const searchProgressLabel =
    selected.length === 0
      ? null
      : selected.length === 1
        ? "1 av 2 valgt"
        : "Interaksjonssøk aktiv";
  const searchProgressColor = selected.length >= 2 ? "success" : "warning";

  const handleSearch = React.useCallback(() => {
    if (!index) return;
    const terms = selected.flatMap((s) => (s.atc ? [s.key, s.atc] : [s.key]));

    const allMatches = matchInteractionsBySelectedTerms(index, terms);
    const matches = allMatches.filter((m) => {
      const it = index.interactions[m.interactionIndex];
      return isActionableRelevance(it.relevansV, it.relevansDn);
    });

    setResults(matches);
    setActiveResult(0);
    setActiveLinkedStdId(null);
    setExpanded({});
  }, [index, selected]);

  const toggleExpanded = React.useCallback((interactionIndex: number) => {
    setExpanded((prev) => ({
      ...prev,
      [interactionIndex]: !prev[interactionIndex],
    }));
  }, []);

  const showCopySnack = React.useCallback((msg?: string) => {
    setCopySnackMsg(msg ?? "Tekst kopiert");
    setCopySnackOpen(true);
  }, []);

  const handleCopy = React.useCallback(
    async (interactionIndex: number) => {
      if (!index) return;
      const it = index.interactions[interactionIndex];
      const text = [
        `Klinisk konsekvens: ${it.kliniskKonsekvens ?? "-"}`,
        it.handtering ? `Håndtering: ${it.handtering}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await navigator.clipboard.writeText(text);
        showCopySnack("Interaksjonstekst kopiert");
      } catch {
        // ignore
      }
    },
    [index, showCopySnack]
  );

  const handleCopyStandardtekst = React.useCallback(
    async (text: string) => {
      const raw = (text ?? "").trim();
      if (!raw) return;
      const rendered = replaceFirstName(raw, firstName);
      try {
        await navigator.clipboard.writeText(rendered);
        showCopySnack("Standardtekst kopiert");
      } catch {
        // ignore
      }
    },
    [showCopySnack, firstName]
  );

  // Auto-run search when selected changes and at least 2 are selected
  React.useEffect(() => {
    if (!index) return;

    // Need at least 2 selections to search
    if (selected.length < 2) {
      setResults([]);
      setActiveResult(0);
      setExpanded({});
      setActiveLinkedStdId(null);
      return;
    }

    handleSearch();
  }, [index, selected, handleSearch]);

  React.useEffect(() => {
    // Ensure input is focused when the page mounts
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  React.useEffect(() => {
    // Reset standardtekst-filter when active interaction changes
    setStandardtekstFilter("");
  }, [activeCtx?.interactionId]);

  return (
    <Box
      sx={{
        maxWidth: 1440,
        mx: "auto",
        mt: 4,
        px: 2,
        height: { xs: "auto", md: "calc(100vh - 32px)" },
        maxHeight: { xs: "none", md: "90vh" },
        overflow: { xs: "visible", md: "hidden" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h2">Interaksjonssøk</Typography>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            Nullstill
          </Box>
          : Escape
        </Typography>
      </Box>

      <Box
        sx={{
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "1fr 2fr" },
          gap: 4,
          alignItems: "start",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left: Search */}
        <Paper
          sx={{
            p: 3,
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
          }}
        >
          {error ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={reload}>
                  Prøv igjen
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          <Stack spacing={2}>
            <Autocomplete
              multiple
              loading={loading}
              options={index?.entities ?? []}
              value={selected}
              inputValue={inputValue}
              open={inputValue.trim().length > 0}
              onInputChange={(_, v) => {
                const normalized = normalizeAtcInput(v);
                setInputValue(normalized);

                const q = normalized.trim().toUpperCase();
                // Auto-velg kun ved eksakt 7-tegns ATC. Ved kortere prefix (f.eks. C09AA)
                // skal vi la dropdownen være åpen slik at bruker kan velge riktig kode.
                if (!q || !isExactAtc7(q) || !index?.entities?.length) return;

                // Finn eksakt ATC-match
                const exactAtcMatches = index.entities.filter(
                  (e) => e.kind !== "product" && (e.atc ?? "").toUpperCase() === q
                );

                if (exactAtcMatches.length !== 1) return;

                const match = exactAtcMatches[0];

                // Legg til hvis ikke allerede valgt
                setSelected((prev) => {
                  const id = getEntityId(match);
                  const seen = new Set(prev.map((p) => getEntityId(p)));
                  if (seen.has(id)) return prev;
                  return [...prev, match];
                });

                // Tøm input så det føles som et “valg”
                setInputValue("");
              }}
              onChange={(_, values) => {
                // Dedupe by entity identity so preparatnavn can coexist with substance/ATC inputs
                const seen = new Set<string>();
                const deduped: InteractionEntity[] = [];
                for (const e of values) {
                  const id = getEntityId(e);
                  if (seen.has(id)) continue;
                  seen.add(id);
                  deduped.push(e);
                }
                setSelected(deduped);
              }}
              isOptionEqualToValue={(a, b) => {
                return getEntityId(a) === getEntityId(b);
              }}
              getOptionLabel={(o) => (o.kind === "product" ? o.label : o.atc ? `${o.label} (${o.atc})` : o.label)}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return [];
                const starts = options.filter((o) => o.label.toLowerCase().startsWith(q));
                const includes = options.filter(
                  (o) =>
                    !o.label.toLowerCase().startsWith(q) &&
                    (o.label.toLowerCase().includes(q) ||
                      (o.atc ? o.atc.toLowerCase().includes(q) : false))
                );
                return [...starts, ...includes].slice(0, 12);
              }}
              renderTags={() => null}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Velg legemiddel, virkestoff eller ATC-kode"
                  placeholder={selected.length === 0 ? "Søk etter preparat" : ""}
                  autoFocus
                  inputRef={searchInputRef}
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
              Tips: Søk på preparatnavn, virkestoff eller ATC-kode direkte i søkefeltet.
            </Typography>
            {searchProgressLabel ? (
              <Chip
                size="small"
                label={searchProgressLabel}
                color={searchProgressColor}
                variant="outlined"
                sx={{ alignSelf: "flex-start", fontWeight: 700 }}
              />
            ) : null}
            {showHistory ? (
              <Box sx={{ pt: 1 }}>
                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 800 }}>Historikk</Typography>
                    <Chip size="small" label={`${history.length}`} sx={{ fontWeight: 700 }} />
                  </Stack>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    borderColor: "divider",
                    boxShadow: "none",
                    mt: 1,
                  }}
                >
                  <List disablePadding>
                    {history.slice(0, 5).map((h) => (
                      <React.Fragment key={h.id}>
                        <ListItemButton
                          onClick={() => {
                            setSelected(h.selected);
                            setInputValue("");
                            setActiveLinkedStdId(null);
                            setExpanded({});
                            setCreateOpen(false);
                            setEditOpen(false);
                          }}
                          sx={{ py: 1.5, alignItems: "flex-start" }}
                        >
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                {h.title}
                              </Typography>
                            }
                            secondary={
                              h.subtitle ? (
                                <Typography
                                  color="text.secondary"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    mt: 0.25,
                                  }}
                                >
                                  {h.subtitle}
                                </Typography>
                              ) : null
                            }
                          />
                        </ListItemButton>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>

                <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                  Historikk skjules når du begynner å søke.
                </Typography>
              </Box>
            ) : null}
            {selected.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {selected.map((option) => {
                  const key = getEntityId(option);
                  const label = option.kind === "product" ? option.label : option.atc ? `${option.label} ${option.atc}` : option.label;

                  return (
                    <Chip
                      key={key}
                      label={label}
                      onDelete={() =>
                        setSelected((prev) =>
                          prev.filter((p) => getEntityId(p) !== key)
                        )
                      }
                      size="medium"
                      sx={{
                        bgcolor: "action.selected",
                        borderRadius: 999,
                        px: 0.5,
                        "& .MuiChip-label": { px: 1 },
                        "& .MuiChip-deleteIcon": { opacity: 0.7 },
                        "& .MuiChip-deleteIcon:hover": { opacity: 1 },
                      }}
                    />
                  );
                })}
              </Box>
            ) : null}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1.5,
                pt: 1,
              }}
            >
              <Button
                variant="text"
                onClick={handleReset}
                disabled={selected.length === 0}
                sx={{ color: "text.primary", fontWeight: 700 }}
              >
                NULLSTILL
              </Button>
            </Box>

            {/* Treff-liste (under søkekortet) */}
            {index && results.length > 0 ? (
              <Box sx={{ pt: 1 }}>
                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 800 }}>Treff</Typography>
                    <Chip
                      size="small"
                      label={`${results.length} treff`}
                      sx={{ fontWeight: 700, ml: 1 }}
                    />
                  </Stack>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    borderColor: "divider",
                    boxShadow: "none",
                    mt: 2,
                  }}
                >
                  <List disablePadding>
                    {results.map((r, i) => {
                      const it = index.interactions[r.interactionIndex];
                      const gA = it.substansgrupper?.[r.matchedGroups?.[0]];
                      const gB = it.substansgrupper?.[r.matchedGroups?.[1]];
                      const kind = relevanceKind(it.relevansV, it.relevansDn);

                      const nameFromGroup = (g?: any) => {
                        if (!g) return "";
                        // Prioriter gruppenavn hvis det finnes
                        if (g.navn) return g.navn;
                        // Fallback: bruk substans-navn (første substans i gruppen)
                        const subst = g.substanser?.[0]?.substans;
                        return subst || "";
                      };

                      const titleA = nameFromGroup(gA);
                      const titleB = nameFromGroup(gB);

                      const label = [titleA, titleB].filter(Boolean).join(" × ") || "Interaksjon";

                      return (
                        <React.Fragment key={`hit:${r.interactionIndex}:${i}`}>
                          <ListItemButton
                            selected={i === activeResult}
                            onClick={() => {
                              setActiveResult(i);
                              setActiveLinkedStdId(null);
                              pushHistory(r);
                            }}
                            sx={{
                              py: 1.25,
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography
                                  sx={{
                                    fontWeight: 800,
                                    lineHeight: 1.2,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {label}
                                </Typography>
                              }
                              secondary={
                                it.kliniskKonsekvens ? (
                                  <Typography
                                    color="text.secondary"
                                    sx={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      mt: 0.25,
                                    }}
                                  >
                                    {it.kliniskKonsekvens}
                                  </Typography>
                                ) : null
                              }
                            />
                            {kind ? (
                              <Chip
                                size="small"
                                icon={<RelevanceIcon kind={kind} />}
                                label={it.relevansDn ?? ""}
                                variant="outlined"
                                sx={{
                                  mt: 0.25,
                                  fontWeight: 700,
                                  maxWidth: 180,
                                  "& .MuiChip-label": {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  },
                                }}
                              />
                            ) : null}
                          </ListItemButton>
                          {i !== results.length - 1 ? <Divider /> : null}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Paper>
              </Box>
            ) : null}

            {selected.length === 1 ? (
              <Typography color="text.secondary" sx={{ pt: 1 }}>
                Velg ett legemiddel til for å søke etter interaksjoner.
              </Typography>
            ) : null}

            {selected.length >= 2 && results.length === 0 ? (
              <Typography color="text.secondary" sx={{ pt: 1 }}>
                Ingen treff.
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        {/* Right: Results + Details */}
        <Paper
          sx={{
            p: 3,
            minHeight: 360,
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
          }}
        >
          {selected.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 360,
                px: 2,
              }}
            >
              <Box sx={{ width: "100%", maxWidth: 560 }}>
                <Typography
                  color="text.secondary"
                  sx={{ fontWeight: 600, textAlign: "center", fontSize: 23, mt: 1 }}
                >
                  Søk minst 2 ATC-koder/virkestoffer fra ulike grupper for å få treff.
                </Typography>
              </Box>
              <Box
                component="img"
                alt="Venter"
                src="/img/imwaiting.gif"
                loading="lazy"
                decoding="async"
                sx={{
                  width: 340,
                  maxWidth: "85%",
                  mb: 2,
                  opacity: 0.95,
                  mt: 5,
                }}
              />
              <Box sx={{ width: "100%", maxWidth: 560 }}>
                <Typography color="text.secondary" sx={{ textAlign: "center", fontSize: 23 }}>
                  Kom igjen. Jeg har ikke hele dagen.{" "}
                </Typography>
              </Box>
            </Box>
          ) : null}

          {index && results.length > 0 ? (
            <Stack spacing={2}>
              {/* Active result details */}
              {(() => {
                const r = activeCtx?.r;
                const it = activeCtx?.it;
                if (!r || !it) return null;
                const kind = relevanceKind(it.relevansV, it.relevansDn);
                // Compute linked standardtekster for the current interaction
                const linkedStandardtekster = activeCtx.interactionId
                  ? standardtekster.filter((s) =>
                      (s.interactionIds ?? []).includes(activeCtx.interactionId!)
                    )
                  : [];
                const filterNeedle = standardtekstFilter.trim().toLowerCase();
                const filteredLinkedStandardtekster =
                  filterNeedle.length > 0
                    ? linkedStandardtekster.filter((s) =>
                        normalizeStandardtekstTitle(s).toLowerCase().includes(filterNeedle)
                      )
                    : linkedStandardtekster;
                const activeLinkedStd = activeLinkedStdId
                  ? filteredLinkedStandardtekster.find((s) => s.id === activeLinkedStdId)
                  : null;

                const groupLines = r.matchedGroups.slice(0, 2).map((gi) => {
                  const group = it.substansgrupper?.[gi];
                  const name = group?.navn || group?.substanser?.[0]?.substans || "(Ukjent)";

                  const selectedTerms = (r.groupToSelectedTerms[gi] ?? [])
                    .map((t) => labelByTerm.get(t) ?? t)
                    .filter(Boolean);
                  const uniqueSelectedTerms = Array.from(new Set(selectedTerms));

                  const suffix =
                    uniqueSelectedTerms.length > 0
                      ? `(søkeinput ${uniqueSelectedTerms.join(", ")})`
                      : "";

                  // Prefer to show ATC (first substans ATC) when available
                  // In our indexed JSON, `atc` may be either a string (code) or an object with `{ v }`.
                  const atcRaw = group?.substanser?.[0]?.atc as unknown;
                  const atcMaybe =
                    typeof atcRaw === "string"
                      ? atcRaw
                      : (atcRaw as { v?: string } | null | undefined)?.v;
                  const atcDisplay = atcMaybe ? ` ${atcMaybe}` : "";

                  return { gi, nameOnly: name, title: `${name}${atcDisplay}`, suffix };
                });

                const isOpen = !!expanded[r.interactionIndex];

                return (
                  <Box sx={{ width: "100%" }}>
                    <Card variant="outlined" sx={{ borderRadius: 1.5, borderColor: "divider" }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {groupLines.map((g) => (
                              <Typography
                                key={`g:${r.interactionIndex}:${g.gi}`}
                                sx={{ fontWeight: 800, mb: 0.5, lineHeight: 1.2 }}
                              >
                                {g.title}{" "}
                                {g.suffix ? (
                                  <Typography
                                    component="span"
                                    sx={{ fontWeight: 500, opacity: 0.85 }}
                                  >
                                    {g.suffix}
                                  </Typography>
                                ) : null}
                              </Typography>
                            ))}

                            <Box sx={{ mt: 2 }}>
                              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                Klinisk konsekvens
                              </Typography>
                              <Typography>{it.kliniskKonsekvens ?? "-"}</Typography>
                            </Box>

                            <Box
                              sx={{
                                mt: 2,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {isAdmin ? (
                                <Button
                                  variant="contained"
                                  onClick={() => {
                                    if (!activeCtx.interactionId) return;
                                    setCreateOpen(true);
                                  }}
                                  sx={{ fontWeight: 800 }}
                                >
                                  Ny standardtekst
                                </Button>
                              ) : null}

                              <Button
                                variant="outlined"
                                onClick={() => toggleExpanded(r.interactionIndex)}
                                startIcon={
                                  isOpen ? (
                                    <IndeterminateCheckBoxOutlinedIcon />
                                  ) : (
                                    <AddBoxOutlinedIcon />
                                  )
                                }
                                sx={{
                                  color: "text.primary",
                                  borderColor: "divider",
                                  px: 1.25,
                                  fontWeight: 700,
                                }}
                              >
                                Vis detaljer
                              </Button>
                            </Box>
                          </Box>

                          <Stack spacing={1} alignItems="flex-end">
                            {kind ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: "action.hover",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <RelevanceIcon kind={kind} />
                                <Typography sx={{ fontWeight: 700 }}>
                                  {it.relevansDn ?? ""}
                                </Typography>
                              </Box>
                            ) : null}
                            <Tooltip title="Kopier interaksjonstekst" arrow>
                              <IconButton
                                aria-label="Kopier interaksjonstekst"
                                onClick={() => handleCopy(r.interactionIndex)}
                              >
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        {isOpen ? (
                          <Box
                            sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}
                          >
                            <Stack spacing={1.5}>
                              {it.interaksjonsmekanisme ? (
                                <Box>
                                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                    Interaksjonsmekanisme
                                  </Typography>
                                  <Typography>{it.interaksjonsmekanisme}</Typography>
                                </Box>
                              ) : null}

                              {it.handtering ? (
                                <Box>
                                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                    Håndtering
                                  </Typography>
                                  <Typography>{it.handtering}</Typography>
                                </Box>
                              ) : null}

                              <Box>
                                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                  Interaksjon-ID
                                </Typography>
                                <Typography color="text.secondary">
                                  {it.interaksjonId ?? "-"}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        ) : null}
                      </CardContent>
                    </Card>

                    {it.interaksjonId ? (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Box
                          sx={{
                            width: "100%",
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "action.hover",
                          }}
                        >
                          <Box sx={{ mb: 1 }}>
                            <Typography sx={{ fontWeight: 800 }} variant="h3">
                              Knyttet standardtekst ({linkedStandardtekster.length})
                            </Typography>
                          </Box>

                          {linkedStandardtekster.length > 0 ? (
                            <Box sx={{ width: "100%" }}>
                              {linkedStandardtekster.length > 4 ? (
                                <TextField
                                  size="small"
                                  fullWidth
                                  label="Filtrer standardtekster"
                                  placeholder="Søk på tittel"
                                  value={standardtekstFilter}
                                  onChange={(e) => setStandardtekstFilter(e.target.value)}
                                  sx={{ mb: 1.5, maxWidth: 420 }}
                                />
                              ) : null}

                              {filteredLinkedStandardtekster.length === 0 ? (
                                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                  Ingen standardtekster matcher søket.
                                </Typography>
                              ) : null}

                              <Box
                                sx={{ display: "flex", flexWrap: "wrap", gap: 1, width: "100%" }}
                              >
                                {filteredLinkedStandardtekster.map((s) => {
                                  const isOpenStd = activeLinkedStdId === s.id;
                                  const label = normalizeStandardtekstTitle(s);

                                  return (
                                    <Tooltip
                                      key={s.id}
                                      title={
                                        isOpenStd ? "Skjul standardtekst" : "Vis standardtekst"
                                      }
                                      arrow
                                    >
                                      <Chip
                                        size="medium"
                                        icon={<DescriptionOutlinedIcon />}
                                        label={label}
                                        clickable
                                        onClick={() =>
                                          setActiveLinkedStdId((prev) =>
                                            prev === s.id ? null : s.id
                                          )
                                        }
                                        deleteIcon={
                                          isOpenStd ? (
                                            <ExpandLessRoundedIcon />
                                          ) : (
                                            <ExpandMoreRoundedIcon />
                                          )
                                        }
                                        onDelete={() =>
                                          setActiveLinkedStdId((prev) =>
                                            prev === s.id ? null : s.id
                                          )
                                        }
                                        sx={{
                                          borderRadius: 999,
                                          border: "1px solid",
                                          borderColor: isOpenStd ? "text.primary" : "divider",
                                          bgcolor: isOpenStd
                                            ? "action.selected"
                                            : "background.paper",
                                          height: 38,
                                          px: 0.5,
                                          maxWidth: "100%",
                                          cursor: "pointer",
                                          transition:
                                            "background-color 120ms ease, border-color 120ms ease, transform 120ms ease",
                                          "&:hover": {
                                            bgcolor: "action.hover",
                                            transform: "translateY(-1px)",
                                          },
                                          "& .MuiChip-label": {
                                            px: 1,
                                            fontWeight: 800,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          },
                                          "& .MuiChip-icon": {
                                            opacity: 0.9,
                                          },
                                          "& .MuiChip-deleteIcon": {
                                            opacity: 0.9,
                                          },
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                              {!activeLinkedStd && filteredLinkedStandardtekster.length > 0 ? (
                                <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                                  Trykk på en tittel for å vise standardteksten.
                                </Typography>
                              ) : null}

                              {activeLinkedStd
                                ? (() => {
                                    // Compute the text to copy for the standardtekst preview box
                                    const copyText =
                                      (activeLinkedStd as any).text ??
                                      (activeLinkedStd as any).content ??
                                      (activeLinkedStd as any).melding ??
                                      (activeLinkedStd as any).body ??
                                      (activeLinkedStd as any).template ??
                                      "";
                                    const renderedCopyText = replaceFirstName(copyText, firstName);
                                    return (
                                      <Box
                                        sx={{
                                          mt: 1.5,
                                          p: 2,
                                          borderRadius: 2,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          bgcolor: "background.paper",
                                          width: "100%",
                                          cursor: "copy",
                                          userSelect: "text",
                                          "&:hover": {
                                            bgcolor: "action.hover",
                                          },
                                        }}
                                        onClick={() => handleCopyStandardtekst(copyText)}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                          }}
                                        >
                                          <Typography sx={{ fontWeight: 800, mb: 0.75 }}>
                                            {normalizeStandardtekstTitle(activeLinkedStd)}
                                          </Typography>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.5,
                                              ml: 1,
                                            }}
                                          >
                                            {isAdmin ? (
                                              <Tooltip title="Rediger standardtekst" arrow>
                                                <IconButton
                                                  aria-label="Rediger standardtekst"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditOpen(true);
                                                  }}
                                                  size="small"
                                                >
                                                  <EditOutlinedIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            ) : null}
                                            <Tooltip title="Kopier standardtekst" arrow>
                                              <IconButton
                                                aria-label="Kopier standardtekst"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopyStandardtekst(copyText);
                                                }}
                                                size="small"
                                              >
                                                <ContentCopyIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </Box>
                                        <Typography sx={{ whiteSpace: "pre-line" }}>
                                          {renderedCopyText}
                                        </Typography>
                                      </Box>
                                    );
                                  })()
                                : null}
                            </Box>
                          ) : (
                            <Typography color="text.secondary">
                              Ingen standardtekster knyttet til denne interaksjonen.
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : null}
                  </Box>
                );
              })()}
            </Stack>
          ) : null}
        </Paper>
      </Box>
      <Snackbar
        open={copySnackOpen}
        autoHideDuration={1800}
        onClose={() => setCopySnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopySnackOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {copySnackMsg}
        </Alert>
      </Snackbar>
      <CreateStandardtekstDialog
        open={createOpen}
        interactionId={activeCtx?.interactionId ?? null}
        prefillTitle={activeCtx?.prefillTitle ?? "Interaksjon"}
        onClose={() => setCreateOpen(false)}
        onCreated={(createdId) => {
          setActiveLinkedStdId(createdId);
          void reloadStandardtekster();
          showCopySnack("Standardtekst opprettet og knyttet");
        }}
      />
      <EditStandardtekstDialog
        open={editOpen}
        standardtekst={
          activeLinkedStdId && activeCtx?.interactionId
            ? (() => {
                const linked = standardtekster.filter((s) =>
                  (s.interactionIds ?? []).includes(activeCtx.interactionId!)
                );
                const s = linked.find((x) => x.id === activeLinkedStdId);
                if (!s) return null;
                return {
                  id: s.id,
                  title: s.title,
                  category: (s as any).category,
                  content:
                    (s as any).content ??
                    (s as any).text ??
                    (s as any).melding ??
                    (s as any).body ??
                    (s as any).template ??
                    "",
                  followUps: (s as any).followUps ?? [],
                };
              })()
            : null
        }
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          void reloadStandardtekster();
          showCopySnack("Standardtekst oppdatert");
        }}
      />
    </Box>
  );
}
