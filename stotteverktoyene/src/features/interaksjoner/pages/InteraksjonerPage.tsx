import * as React from "react";
import { createTheme, useTheme, ThemeProvider, alpha, type Theme } from "@mui/material/styles";
import { AccentSelection } from "../../../styles/AccentSelection";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  LinearProgress,
  Tooltip,
  Snackbar,
  CircularProgress,
  Switch,
  FormControlLabel,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
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
import { loadMedicationItems, type Med } from "../../fest/components/MedicationSearch";
import { useVnrAutoPaste } from "../../../shared/hooks/useVnrAutoPaste";
import { useAutoVnrPreference } from "../../../shared/hooks/useAutoVnrPreference";
import {
  matchInteractionsBySelectedTerms,
  type InteractionEntity,
  type MatchResult,
} from "../../fest/mappers/interactionsToIndex";
import { resolveSearchInput } from "../utils/resolveSearchInput";
import InteractionSearchField from "../components/InteractionSearchField";
import { generateKundetekst } from "../services/claudeService";

import {
  isAvoidRelevance,
  RelevanceIcon,
  relevanceKind,
} from "../utils/relevance";
import { normalizeStandardtekstTitle } from "../utils/standardtekster";

import { replaceFirstName } from "../../standardtekster/utils/content";
import { useAuthUser } from "../../../app/auth/useAuthUser";

const HISTORY_KEY_PREFIX = "interaksjoner_history_v1";
const HISTORY_LAST_UID_KEY = "interaksjoner_last_uid_v1";
const SPLIT_RATIO_STORAGE_KEY = "interaksjoner_split_ratio_v1";
const DEFAULT_SPLIT_RATIO = 0.35;
const MIN_SPLIT_RATIO = 0.2;
const MAX_SPLIT_RATIO = 0.8;
const DIVIDER_WIDTH_PX = 16;
const MIN_LEFT_PANEL_PX = 380;
const MIN_RIGHT_PANEL_PX = 520;

const PREPARAT_SUFFIX_RE = /\s*\(preparatnavn\)\s*$/i;

function cleanMatchTerm(value: string): string {
  return String(value ?? "")
    .replace(PREPARAT_SUFFIX_RE, "")
    .trim();
}

// Ord som ikke er virkestoffnavn og ikke skal telle/merkes.
const SUBSTANCE_STOPWORDS = new Set([
  "og", "med", "mot", "eller", "samt", "pluss", "for", "ved",
]);

// Normaliserer et virkestoffnavn til en språk-uavhengig form, slik at engelsk/
// latinsk og norsk skrivemåte gjenkjennes som det samme. Konservative, høy-
// sikkerhets-regler (bryter f.eks. ikke "paracetamol"):
//   ph → f   (phenidat → fenidat)
//   th → t   (methyl → metyl)
//   -ine → -in, -ate → -at, -ide → -id  (suffikser: codeine→kodein-mønster)
// Eksempel: "metylphenidate" og "metylfenidat" gir begge "metylfenidat".
function normalizeSubstanceName(word: string): string {
  let s = word.toLowerCase().replace(/[^a-zøæå]/g, "");
  s = s.replace(/th/g, "t").replace(/ph/g, "f");
  if (s.endsWith("ine")) s = `${s.slice(0, -3)}in`;
  else if (s.endsWith("ate")) s = `${s.slice(0, -3)}at`;
  else if (s.endsWith("ide")) s = `${s.slice(0, -3)}id`;
  return s;
}

// Del en tekst i ord (unicode-bokstaver). Beholder kun ord som kan være
// virkestoff-/gruppenavn (≥ 4 tegn, ikke stoppord).
function substanceWords(value: string): string[] {
  return (cleanMatchTerm(value).match(/\p{L}+/gu) ?? []).filter(
    (w) => w.length >= 4 && !SUBSTANCE_STOPWORDS.has(w.toLowerCase()),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function renderHighlightedText(label: string, matchedTerms: string[]): React.ReactNode {
  const terms = Array.from(
    new Set(
      matchedTerms
        .map((t) => cleanMatchTerm(t))
        .map((t) => t.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
    )
  );
  if (terms.length === 0) return label;

  const pattern = new RegExp(`(${terms.map((t) => escapeRegExp(t)).join("|")})`, "ig");
  const parts = label.split(pattern);
  if (parts.length <= 1) return label;

  return (
    <Box component="span">
      {parts.map((part, idx) => {
        const isHit = terms.some((t) => t.toLowerCase() === part.toLowerCase());
        if (!isHit) return <React.Fragment key={idx}>{part}</React.Fragment>;
        return (
          <Box
            key={idx}
            component="span"
            sx={{
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(160,58,56,0.12)",
              color: (t) => t.palette.mode === "dark" ? "#FFFFFF" : "#6B2020",
              borderRadius: 0.75,
              px: 0.4,
              fontWeight: 800,
            }}
          >
            {part}
          </Box>
        );
      })}
    </Box>
  );
}

type HistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  interactionIndex: number;
  selected: InteractionEntity[];
  createdAt: number;
};

export default function InteraksjonerPage() {
  const RED = "#FF5E5B";
  const baseTheme = useTheme();
  const redTheme = React.useMemo(() => createTheme(baseTheme, { palette: { primary: baseTheme.palette.augmentColor({ color: { main: RED } }) } }), [baseTheme]);

  const { index, loading, error, reload } = useInteractions();
  const location = useLocation();
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const splitContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isResizingSplit, setIsResizingSplit] = React.useState(false);
  const [splitRatio, setSplitRatio] = React.useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
      if (!raw) return DEFAULT_SPLIT_RATIO;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? clamp(parsed, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO) : DEFAULT_SPLIT_RATIO;
    } catch {
      return DEFAULT_SPLIT_RATIO;
    }
  });

  const getEntityId = React.useCallback(
    (entity: InteractionEntity) => entity.id ?? (entity.atc ? `atc:${entity.atc}` : `name:${entity.key}`),
    []
  );

  const getSplitRatioFromClientX = React.useCallback((clientX: number): number | null => {
    const container = splitContainerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const availableWidth = rect.width - DIVIDER_WIDTH_PX;
    if (availableWidth <= 0) return null;

    const minLeft = Math.min(MIN_LEFT_PANEL_PX, availableWidth * 0.45);
    const minRight = Math.min(MIN_RIGHT_PANEL_PX, availableWidth * 0.55);
    const maxLeft = availableWidth - minRight;
    const safeMinLeft = Math.min(minLeft, maxLeft);
    const leftPx = clamp(clientX - rect.left, safeMinLeft, maxLeft);
    return clamp(leftPx / availableWidth, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO);
  }, []);

  const { user, isAdmin, isOwner } = useAuthUser();
  const lastKnownUidRef = React.useRef<string | null>(null);
  const [historyReadyKey, setHistoryReadyKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    lastKnownUidRef.current = user.uid;
    try {
      window.sessionStorage.setItem(HISTORY_LAST_UID_KEY, user.uid);
    } catch {
      // ignore
    }
  }, [user?.uid]);

  const firstName = (user?.firstName ?? null) as string | null;

  const historyKey = React.useMemo(() => {
    let persistedUid: string | null = null;
    try {
      persistedUid = window.sessionStorage.getItem(HISTORY_LAST_UID_KEY);
    } catch {
      // ignore
    }
    const uid = user?.uid ?? lastKnownUidRef.current ?? persistedUid;
    return uid ? `${HISTORY_KEY_PREFIX}:${uid}` : `${HISTORY_KEY_PREFIX}:anon`;
  }, [user?.uid]);

  const [selected, setSelected] = React.useState<InteractionEntity[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [pendingActiveInteractionIndex, setPendingActiveInteractionIndex] = React.useState<number | null>(null);

  // Auto vnr: paste/type a varenummer and resolve it to the matching substance/ATC.
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [autoPasteVnr, setAutoPasteVnr] = useAutoVnrPreference("interaksjoner");

  // vnr (farmaloggNumber) → ATC, sourced from PIM/FEST medication items.
  const [medItems, setMedItems] = React.useState<Med[]>([]);
  const [medsReady, setMedsReady] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    loadMedicationItems()
      .then((items) => {
        if (alive) setMedItems(items);
      })
      .catch(() => {
        /* vnr-oppslag er valgfritt; ignorer lastefeil */
      })
      .finally(() => {
        if (alive) setMedsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const vnrToAtc = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medItems) {
      if (!m.farmaloggNumber || !m.atc) continue;
      const norm = String(m.farmaloggNumber).trim().replace(/^0+/, "") || "0";
      if (!map.has(norm)) map.set(norm, m.atc);
    }
    return map;
  }, [medItems]);

  // Resolve a varenummer to the matching (non-product) entity in the index, or null.
  const resolveVnrEntity = React.useCallback(
    (digits: string): InteractionEntity | null => {
      const norm = digits.replace(/^0+/, "") || "0";
      const atc = vnrToAtc.get(norm);
      if (!atc) return null;
      const up = atc.toUpperCase();
      const match = (index?.entities ?? []).find(
        (e) => e.kind !== "product" && (e.atc ?? "").toUpperCase() === up,
      );
      return match ?? null;
    },
    [vnrToAtc, index],
  );

  // Pre-fill search when navigated from the global command palette
  React.useEffect(() => {
    const state = location.state as {
      searchQuery?: string;
      selectedEntities?: InteractionEntity[];
      activeInteractionIndex?: number;
    } | null;
    if (!state) return;

    if (Array.isArray(state.selectedEntities) && state.selectedEntities.length > 0) {
      setSelected(state.selectedEntities);
      if (typeof state.activeInteractionIndex === "number") {
        setPendingActiveInteractionIndex(state.activeInteractionIndex);
      } else {
        setPendingActiveInteractionIndex(null);
      }
      setInputValue("");
      return;
    }

    if (state.searchQuery) {
      setInputValue(state.searchQuery);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [location.state]);
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

  // AI-generert kundetekst
  const [aiText, setAiText] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiLatencyMs, setAiLatencyMs] = React.useState<number | null>(null);

  const { standardtekster, reload: reloadStandardtekster } = useStandardtekster();

  const [searchNotice, setSearchNotice] = React.useState<string | null>(null);
  // Tekst som kom inn før interaksjonsdata/varenummer-oppslag var lastet (f.eks. auto-lim
  // rett etter sidelast) – tolkes så snart alt er klart.
  const pendingTextsRef = React.useRef<Array<{ text: string; ambient: boolean }>>([]);

  // Ett felt for alt: tolker innlimt/skrevet tekst (varenummer, navn, ATC, lister, FEST-linjer).
  const addFromText = React.useCallback(
    (text: string, opts?: { ambient?: boolean }) => {
      const ambient = Boolean(opts?.ambient);
      if (!index || !medsReady) {
        pendingTextsRef.current.push({ text, ambient });
        return;
      }

      const { entities, unmatched } = resolveSearchInput(text, index, resolveVnrEntity, {
        // Ambient (utklippstavle) skal aldri gjette: kun eksakte treff.
        allowPrefix: !ambient,
      });

      if (entities.length > 0) {
        setSelected((prev) => {
          // Flere treff fra én innliming (f.eks. en hel FEST-linje) er et nytt søk;
          // ett enkelt treff legges til i det som allerede er valgt.
          const base = entities.length >= 2 ? [] : prev;
          const seen = new Set(base.map(getEntityId));
          return [...base, ...entities.filter((e) => !seen.has(getEntityId(e)))];
        });
        setInputValue("");
        setActiveLinkedStdId(null);
        setExpanded({});
        setSearchNotice(unmatched.length > 0 ? `Fant ikke: ${unmatched.join(", ")}` : null);
        return;
      }

      if (ambient) return;

      // Ingenting å tolke: la teksten bli stående i feltet, så forslagene hjelper videre.
      const shown = text.trim().replace(/\s+/g, " ");
      setInputValue(shown.slice(0, 80));
      setSearchNotice(
        `Fant ikke «${shown.length > 40 ? `${shown.slice(0, 40)}…` : shown}». Velg blant forslagene, eller prøv virkestoff, ATC-kode eller varenummer.`,
      );
    },
    [index, medsReady, resolveVnrEntity, getEntityId],
  );

  React.useEffect(() => {
    if (!index || !medsReady || pendingTextsRef.current.length === 0) return;
    const queued = pendingTextsRef.current;
    pendingTextsRef.current = [];
    for (const q of queued) addFromText(q.text, { ambient: q.ambient });
  }, [index, medsReady, addFromText]);

  // Innliming i søkefeltet: tolk umiddelbart når teksten kjennes igjen. Ellers (f.eks. en
  // delvis skrevet «escit») skrives den inn som vanlig, slik at forslagene vises.
  const handleFieldPaste = React.useCallback(
    (text: string): boolean => {
      if (!index || !medsReady) {
        addFromText(text);
        return true;
      }
      const { entities } = resolveSearchInput(text, index, resolveVnrEntity);
      if (entities.length === 0) return false;
      addFromText(text);
      return true;
    },
    [index, medsReady, resolveVnrEntity, addFromText],
  );

  useVnrAutoPaste({
    enabled: autoPasteVnr,
    isFocused: isSearchFocused,
    onVnr: (text) => addFromText(text, { ambient: true }),
    extract: (text) => {
      const t = text.trim();
      return t && t.length <= 1500 ? t : "";
    },
  });


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

  const handleReset = React.useCallback(() => {
    setSelected([]);
    setResults([]);
    setActiveResult(0);
    setExpanded({});
    setInputValue("");
    setSearchNotice(null);
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
    setHistoryReadyKey(null);
    try {
      const raw = window.localStorage.getItem(historyKey);
      if (!raw) {
        setHistory([]);
        setHistoryReadyKey(historyKey);
        return;
      }
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (!Array.isArray(parsed)) {
        setHistory([]);
        setHistoryReadyKey(historyKey);
        return;
      }
      setHistory(parsed.slice(0, 5));
      setHistoryReadyKey(historyKey);
    } catch {
      setHistory([]);
      setHistoryReadyKey(historyKey);
    }
  }, [historyKey]);

  React.useEffect(() => {
    if (historyReadyKey !== historyKey) return;
    try {
      window.localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 5)));
    } catch {
      // ignore
    }
  }, [history, historyKey, historyReadyKey]);

  const getMatchTitle = React.useCallback(
    (r: MatchResult, selectedForTitle: InteractionEntity[]) => {
      if (!index) return "Interaksjon";
      const it = index.interactions[r.interactionIndex];
      const gA = it.substansgrupper?.[r.matchedGroups?.[0]];
      const gB = it.substansgrupper?.[r.matchedGroups?.[1]];
      const labelBySelectedTerm = new Map<string, string>();
      for (const s of selectedForTitle) {
        const cleanedLabel = s.label.replace(/\s*\(preparatnavn\)\s*$/i, "").trim();
        if (s.key) labelBySelectedTerm.set(s.key, cleanedLabel);
        if (s.atc) labelBySelectedTerm.set(s.atc, cleanedLabel);
      }

      const nameFromGroup = (g?: any) => {
        if (!g) return "";
        if (g.navn) return g.navn;
        return g.substanser?.[0]?.substans || "";
      };

      const selectedLabelForGroup = (groupIndex: number): string => {
        const terms = r.groupToSelectedTerms[groupIndex] ?? [];
        for (const t of terms) {
          const lbl = labelBySelectedTerm.get(t);
          if (lbl) return lbl;
        }
        return "";
      };

      const a = selectedLabelForGroup(r.matchedGroups?.[0]) || nameFromGroup(gA);
      const b = selectedLabelForGroup(r.matchedGroups?.[1]) || nameFromGroup(gB);
      return [a, b].filter(Boolean).join(" × ") || "Interaksjon";
    },
    [index]
  );

  const pushHistory = React.useCallback(
    (r: MatchResult) => {
      if (!index) return;
      const it = index.interactions[r.interactionIndex];
      const title = getMatchTitle(r, selected);

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

  const handleSearch = React.useCallback(() => {
    if (!index) return;
    const terms = selected.flatMap((s) => (s.atc ? [s.key, s.atc] : [s.key]));

    const allMatches = matchInteractionsBySelectedTerms(index, terms);
    const matches = allMatches.filter((m) => {
      const it = index.interactions[m.interactionIndex];
      return isAvoidRelevance(it.relevansV, it.relevansDn);
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

  const handleGenerateAi = React.useCallback(async () => {
    if (!activeCtx?.it || !activeCtx.r) return;
    const it = activeCtx.it;
    const r = activeCtx.r;

    const substanser = (r.matchedGroups ?? [])
      .slice(0, 2)
      .map((gi) => {
        const g = it.substansgrupper?.[gi];
        return g?.navn || g?.substanser?.[0]?.substans || "";
      })
      .filter(Boolean);

    const linked = activeCtx.interactionId
      ? standardtekster.filter((s) =>
          (s.interactionIds ?? []).includes(activeCtx.interactionId!)
        )
      : [];
    const styleExample = linked.length
      ? (() => {
          const doc = linked[0] as Record<string, unknown>;
          const candidates = [doc.text, doc.content, doc.melding, doc.body, doc.template];
          const first = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
          return typeof first === "string" ? first : null;
        })()
      : null;

    setAiLoading(true);
    setAiError(null);
    setAiText("");
    setAiLatencyMs(null);

    const res = await generateKundetekst({
      relevansDn: it.relevansDn,
      substanser,
      kliniskKonsekvens: it.kliniskKonsekvens,
      interaksjonsmekanisme: it.interaksjonsmekanisme,
      handtering: it.handtering,
      styleExample,
      firstName,
    });

    setAiLoading(false);
    if (res.ok) {
      setAiText(res.text);
      setAiLatencyMs(res.latencyMs);
    } else {
      setAiError(res.error);
    }
  }, [activeCtx, standardtekster, firstName]);

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
    if (pendingActiveInteractionIndex == null || results.length === 0) return;
    const matchIdx = results.findIndex((r) => r.interactionIndex === pendingActiveInteractionIndex);
    if (matchIdx === -1) return;
    setActiveResult(matchIdx);
    setPendingActiveInteractionIndex(null);
  }, [pendingActiveInteractionIndex, results]);

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

  React.useEffect(() => {
    // Reset AI-generert utkast når aktiv interaksjon endres
    setAiText("");
    setAiError(null);
    setAiLatencyMs(null);
    setAiLoading(false);
  }, [activeCtx?.interactionId]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(splitRatio));
    } catch {
      // ignore
    }
  }, [splitRatio]);

  React.useEffect(() => {
    if (!isResizingSplit) return;

    const onPointerMove = (event: PointerEvent) => {
      const nextRatio = getSplitRatioFromClientX(event.clientX);
      if (nextRatio === null) return;
      setSplitRatio(nextRatio);
    };

    const stopResizing = () => {
      setIsResizingSplit(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSplit, getSplitRatioFromClientX]);

  const accentText = (t: Theme) => (t.palette.mode === "dark" ? "#E08A88" : "#A03A38");
  const panelSx = {
    bgcolor: (t: Theme) => (t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF"),
    border: (t: Theme) =>
      `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)"}`,
  } as const;

  const searchField = (hero: boolean) => (
    <InteractionSearchField
      hero={hero}
      entities={index?.entities ?? []}
      loading={loading}
      selected={selected}
      onSelectedChange={setSelected}
      inputValue={inputValue}
      onInputValueChange={(v) => {
        setInputValue(v);
        setSearchNotice(null);
      }}
      onSubmitText={(text) => addFromText(text)}
      onPasteText={handleFieldPaste}
      inputRef={searchInputRef}
      onFocus={() => setIsSearchFocused(true)}
      onBlur={() => setIsSearchFocused(false)}
    />
  );

  const autoToggle = (
    <Tooltip title="Når feltet er aktivt, limes kopiert varenummer, navn eller ATC-kode automatisk inn og søkes opp.">
      <FormControlLabel
        sx={{ m: 0, flexShrink: 0 }}
        control={
          <Switch size="small" checked={autoPasteVnr} onChange={(e) => setAutoPasteVnr(e.target.checked)} />
        }
        label={<Typography variant="caption">Auto-lim inn</Typography>}
      />
    </Tooltip>
  );

  const noticeAlert = searchNotice ? (
    <Alert
      severity="warning"
      variant="outlined"
      onClose={() => setSearchNotice(null)}
      sx={{ borderRadius: "12px", py: 0.25, alignItems: "center" }}
    >
      {searchNotice}
    </Alert>
  ) : null;

  const openHistoryItem = (h: HistoryItem) => {
    setSelected(h.selected);
    setInputValue("");
    setSearchNotice(null);
    setActiveLinkedStdId(null);
    setExpanded({});
    setCreateOpen(false);
    setEditOpen(false);
  };

  const heroView = (
    <Paper
      sx={{
        ...panelSx,
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "visible", md: "auto" },
        p: { xs: 2.5, md: 4 },
        borderRadius: "24px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 740,
          mx: "auto",
          my: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2.25,
          py: { xs: 1, md: 2 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.75, mb: 0.5 }}>
          <Box
            sx={(t) => ({
              width: 52,
              height: 52,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: t.palette.mode === "dark" ? "rgba(200,70,70,0.18)" : "rgba(255,94,91,0.1)",
              border: `1px solid ${t.palette.mode === "dark" ? "rgba(220,90,90,0.28)" : "rgba(200,80,80,0.18)"}`,
            })}
          >
            <CompareArrowsIcon sx={{ fontSize: 28, color: accentText }} />
          </Box>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: accentText, lineHeight: 1.15 }}>
              Interaksjonssøk
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14.5 }}>
              Sjekk om legemidler bør unngås sammen
            </Typography>
          </Box>
        </Box>

        {error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={reload}>
                Prøv igjen
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        {searchField(true)}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 0.5 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13.5 }}>
            Skriv, eller lim inn legemiddel, virkestoff, ATC-kode, varenummer – eller en hel interaksjonslinje fra FEST.
          </Typography>
          {autoToggle}
        </Box>

        {noticeAlert}

        {loading ? (
          <Box sx={{ px: 0.5 }}>
            <LinearProgress sx={{ borderRadius: 999, height: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Laster interaksjonsdata … du kan allerede lime inn, så søkes det opp straks dataene er klare.
            </Typography>
          </Box>
        ) : null}

        {history.length > 0 ? (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary", px: 0.5 }}
            >
              Nylige søk
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 0.75 }}>
              {history.slice(0, 5).map((h) => (
                <ButtonBase
                  key={h.id}
                  onClick={() => openHistoryItem(h)}
                  sx={(t) => ({
                    display: "block",
                    textAlign: "left",
                    width: "100%",
                    px: 1.75,
                    py: 1.1,
                    borderRadius: "12px",
                    border: `1px solid ${t.palette.divider}`,
                    transition: "background-color 120ms ease, border-color 120ms ease",
                    "&:hover": {
                      bgcolor: alpha(t.palette.primary.main, 0.06),
                      borderColor: alpha(t.palette.primary.main, 0.4),
                    },
                  })}
                >
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5 }}>
                    {h.title}
                  </Typography>
                  {h.subtitle ? (
                    <Typography noWrap color="text.secondary" sx={{ fontSize: 13 }}>
                      {h.subtitle}
                    </Typography>
                  ) : null}
                </ButtonBase>
              ))}
            </Stack>
          </Box>
        ) : null}

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 1.5 }}>
          <Box
            component="img"
            alt="Venter"
            src="/img/imwaiting.gif"
            loading="lazy"
            decoding="async"
            sx={{
              width: 230,
              maxWidth: "70%",
              borderRadius: "16px",
              border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.18)" : "rgba(200,80,80,0.1)"}`,
              boxShadow: (t) =>
                t.palette.mode === "dark"
                  ? "0 10px 36px rgba(180,50,50,0.13), 0 2px 10px rgba(0,0,0,0.45)"
                  : "0 8px 28px rgba(200,80,80,0.09), 0 2px 8px rgba(0,0,0,0.05)",
              display: "block",
            }}
          />
          <Typography
            sx={{
              mt: 1.5,
              textAlign: "center",
              fontSize: 15,
              fontWeight: 500,
              color: (t) => (t.palette.mode === "dark" ? "#A86A68" : "#B87A78"),
            }}
          >
            Kom igjen. Jeg har ikke hele dagen.
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  const resultsView =
    index && results.length > 0 ? (
      <Box sx={{ pt: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
          <Typography sx={{ fontWeight: 800, color: accentText }}>Treff</Typography>
          <Chip
            size="small"
            label={`${results.length}`}
            sx={{
              fontWeight: 700,
              bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(200,70,70,0.22)" : "rgba(200,70,70,0.1)"),
              color: accentText,
            }}
          />
        </Box>
        <Stack spacing={1}>
          {results.map((r, i) => {
            const it = index.interactions[r.interactionIndex];
            const gA = it.substansgrupper?.[r.matchedGroups?.[0]];
            const gB = it.substansgrupper?.[r.matchedGroups?.[1]];
            const kind = relevanceKind(it.relevansV, it.relevansDn);
            const nameFromGroup = (g?: any) => (g ? g.navn || g.substanser?.[0]?.substans || "" : "");
            const label =
              [nameFromGroup(gA), nameFromGroup(gB)].filter(Boolean).join(" × ") || "Interaksjon";
            const active = i === activeResult;

            return (
              <ButtonBase
                key={`hit:${r.interactionIndex}:${i}`}
                onClick={() => {
                  setActiveResult(i);
                  setActiveLinkedStdId(null);
                  pushHistory(r);
                }}
                sx={(t) => ({
                  display: "block",
                  width: "100%",
                  minWidth: 0,
                  textAlign: "left",
                  px: 1.75,
                  py: 1.5,
                  borderRadius: "14px",
                  border: `1px solid ${active ? alpha(t.palette.primary.main, 0.7) : t.palette.divider}`,
                  bgcolor: active ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.16 : 0.07) : "transparent",
                  boxShadow: active ? `0 0 0 3px ${alpha(t.palette.primary.main, 0.12)}` : "none",
                  transition: "background-color 120ms ease, border-color 120ms ease",
                  "&:hover": {
                    bgcolor: alpha(t.palette.primary.main, active ? 0.1 : 0.05),
                  },
                })}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1.25, minWidth: 0, overflowWrap: "anywhere" }}>
                    {label}
                  </Typography>
                  {kind ? (
                    <Chip
                      size="small"
                      icon={<RelevanceIcon kind={kind} />}
                      label={it.relevansDn ?? ""}
                      variant="outlined"
                      sx={{
                        flexShrink: 0,
                        fontWeight: 700,
                        maxWidth: 170,
                        "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                      }}
                    />
                  ) : null}
                </Box>
                {it.kliniskKonsekvens ? (
                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      fontSize: 14,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {it.kliniskKonsekvens}
                  </Typography>
                ) : null}
              </ButtonBase>
            );
          })}
        </Stack>
      </Box>
    ) : null;

  return (
  <ThemeProvider theme={redTheme}>
    <AccentSelection />
    <Box
      sx={{
        position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
        bgcolor: (t) => t.palette.mode === "dark" ? "#0F1213" : "#FBF5F5",
        backgroundImage: (t) => t.palette.mode === "dark"
          ? "radial-gradient(circle at 6% -10%, rgba(200,60,60,0.11) 0%, rgba(200,60,60,0) 38%), radial-gradient(circle at 92% -6%, rgba(150,40,40,0.09) 0%, rgba(150,40,40,0) 32%)"
          : "radial-gradient(circle at 6% -10%, rgba(255,94,91,0.16) 0%, rgba(255,94,91,0) 38%), radial-gradient(circle at 92% -6%, rgba(200,60,60,0.12) 0%, rgba(200,60,60,0) 32%)",
      }}
    />
    <Box
      sx={{
        maxWidth: 1760,
        width: "100%",
        mx: "auto",
        mt: { xs: 2, md: 1.5 },
        px: { xs: 1.5, md: 2.5 },
        pt: { xs: 2, md: 2 },
        height: { xs: "auto", md: "calc(100vh - 20px)" },
        overflow: { xs: "visible", md: "hidden" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      {selected.length === 0 ? (
        heroView
      ) : (
      <Box
        ref={splitContainerRef}
        sx={{
          display: { xs: "block", md: "flex" },
          gap: { xs: 2.5, md: 0 },
          alignItems: { xs: "stretch", md: "stretch" },
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left: Search + treff */}
        <Paper
          sx={{
            ...panelSx,
            p: { xs: 2.5, md: 3 },
            flex: { xs: "initial", md: `0 0 calc((100% - ${DIVIDER_WIDTH_PX}px) * ${splitRatio})` },
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
            borderRadius: "20px",
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

          <Stack spacing={1.75}>
            {searchField(false)}

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 0.5 }}>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                {selected.length === 1
                  ? "Legg til minst ett legemiddel til for å se interaksjoner."
                  : `${selected.length} valgt`}
              </Typography>
              {autoToggle}
            </Box>

            {noticeAlert}

            {resultsView}

            {selected.length >= 2 && results.length === 0 ? (
              <Typography color="text.secondary" sx={{ pt: 1, px: 0.5 }}>
                Ingen interaksjoner å unngå mellom de valgte.
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Juster bredde mellom panelene"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const nextRatio = getSplitRatioFromClientX(event.clientX);
            if (nextRatio !== null) setSplitRatio(nextRatio);
            setIsResizingSplit(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSplitRatio((prev) => clamp(prev - 0.02, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO));
              return;
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setSplitRatio((prev) => clamp(prev + 0.02, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO));
            }
          }}
          sx={{
            display: { xs: "none", md: "flex" },
            width: DIVIDER_WIDTH_PX,
            cursor: "col-resize",
            alignSelf: "stretch",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            outline: "none",
            position: "relative",
            zIndex: 2,
            "&::before": {
              content: '""',
              width: 2,
              height: "100%",
              borderRadius: 999,
              bgcolor: "divider",
              transition: "background-color 120ms ease",
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
            },
            "&::after": {
              content: '""',
              width: 6,
              height: 46,
              borderRadius: 999,
              bgcolor: "action.disabled",
              boxShadow: 1,
              transition: "background-color 120ms ease",
            },
            "&:hover::before, &:focus-visible::before": {
              bgcolor: "text.secondary",
            },
            "&:hover::after, &:focus-visible::after": {
              bgcolor: "text.secondary",
            },
          }}
        />

        {/* Right: Results + Details */}
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.5 },
            flex: {
              xs: "initial",
              md: `0 0 calc((100% - ${DIVIDER_WIDTH_PX}px) * ${1 - splitRatio})`,
            },
            minHeight: { xs: 420, md: 560 },
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
            bgcolor: (t) => t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF",
            border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)"}`,
          }}
        >
          {results.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                minHeight: { xs: 160, md: 320 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 1,
                color: "text.secondary",
                px: 2,
              }}
            >
              <CompareArrowsIcon sx={{ fontSize: 36, opacity: 0.4 }} />
              <Typography sx={{ fontWeight: 700, color: "text.primary" }}>
                {selected.length === 1 ? "Legg til ett legemiddel til" : "Ingen interaksjoner å unngå"}
              </Typography>
              <Typography sx={{ fontSize: 14, maxWidth: 360 }}>
                {selected.length === 1
                  ? "Interaksjoner vises når minst to legemidler eller virkestoff er valgt."
                  : "Det finnes ingen «bør unngås»-interaksjon mellom de valgte. Prøv å legge til eller bytte ut ett."}
              </Typography>
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
                const matchTermsFromGroups = Array.from(
                  new Set(
                    r.matchedGroups
                      .flatMap((gi) => r.groupToSelectedTerms[gi] ?? [])
                      .map((t) => labelByTerm.get(t) ?? t)
                      .map((t) => cleanMatchTerm(t))
                      .filter(Boolean)
                  )
                );
                const matchTerms =
                  matchTermsFromGroups.length > 0
                    ? matchTermsFromGroups
                    : Array.from(
                        new Set(
                          selected
                            .map((s) => cleanMatchTerm(s.label))
                            .filter(Boolean)
                        )
                      );

                // Kandidat-ord fra søketermene, normalisert språk-uavhengig.
                // «Kodein og paracetamol» → {kodein, paracetamol}; håndterer også
                // engelsk↔norsk (metylphenidate = metylfenidat).
                const candidateNorms = new Set(
                  matchTerms.flatMap(substanceWords).map(normalizeSubstanceName).filter(Boolean),
                );

                const linkedWithScore = linkedStandardtekster.map((s) => {
                  const title = normalizeStandardtekstTitle(s);
                  const copyText =
                    (s as any).text ??
                    (s as any).content ??
                    (s as any).melding ??
                    (s as any).body ??
                    (s as any).template ??
                    "";

                  // Ord-nivå match: merk hvert ord i tittelen hvis den normaliserte
                  // formen finnes blant kandidatordene (også kryss-språk).
                  const matchedTitleWords: string[] = [];
                  const matchedNorms = new Set<string>();
                  for (const w of substanceWords(title)) {
                    const n = normalizeSubstanceName(w);
                    if (candidateNorms.has(n)) {
                      matchedTitleWords.push(w);
                      matchedNorms.add(n);
                    }
                  }
                  // Body-treff (uten tittel-treff) surfacer relevante tekster lavere.
                  for (const w of substanceWords(copyText)) {
                    const n = normalizeSubstanceName(w);
                    if (candidateNorms.has(n)) matchedNorms.add(n);
                  }

                  let score = matchedTitleWords.length * 12;
                  score += (matchedNorms.size - new Set(matchedTitleWords.map(normalizeSubstanceName)).size) * 5;
                  if (candidateNorms.size > 0 && matchedNorms.size === candidateNorms.size) {
                    score += 10;
                  }

                  return {
                    doc: s,
                    title,
                    copyText,
                    score,
                    matchedTerms: Array.from(new Set(matchedTitleWords)),
                  };
                });

                const sortedLinkedWithScore = [...linkedWithScore].sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  return a.title.localeCompare(b.title, "nb");
                });
                const filterNeedle = standardtekstFilter.trim().toLowerCase();
                const filteredLinkedWithScore =
                  filterNeedle.length > 0
                    ? sortedLinkedWithScore.filter((s) =>
                        s.title.toLowerCase().includes(filterNeedle)
                      )
                    : sortedLinkedWithScore;
                const activeLinkedStd = activeLinkedStdId
                  ? filteredLinkedWithScore.find((s) => s.doc.id === activeLinkedStdId)?.doc ?? null
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
                    <Card variant="outlined" sx={{
                      borderRadius: 2,
                      borderColor: (t) => t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)",
                      bgcolor: (t) => t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF",
                    }}>
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
                              {isOwner ? (
                                <Button
                                  variant="contained"
                                  onClick={handleGenerateAi}
                                  disabled={aiLoading}
                                  startIcon={
                                    aiLoading ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : (
                                      <AutoAwesomeIcon />
                                    )
                                  }
                                  sx={{
                                    fontWeight: 800,
                                    bgcolor: (t) =>
                                      t.palette.mode === "dark" ? "rgba(200,70,70,0.7)" : "#B04442",
                                    color: "#fff",
                                    "&:hover": {
                                      bgcolor: (t) =>
                                        t.palette.mode === "dark" ? "rgba(200,70,70,0.9)" : "#8A3230",
                                    },
                                    boxShadow: "none",
                                  }}
                                >
                                  {aiLoading ? "Genererer …" : "Generer kundetekst"}
                                </Button>
                              ) : null}

                              {isAdmin ? (
                                <Button
                                  variant="contained"
                                  onClick={() => {
                                    if (!activeCtx.interactionId) return;
                                    setCreateOpen(true);
                                  }}
                                  sx={{
                                    fontWeight: 800,
                                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.7)" : "#B04442",
                                    color: "#fff",
                                    "&:hover": {
                                      bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.9)" : "#8A3230",
                                    },
                                    boxShadow: "none",
                                  }}
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
                                  px: 1.25,
                                  fontWeight: 700,
                                  color: (t) => t.palette.mode === "dark" ? "#E08A88" : "#A03A38",
                                  borderColor: (t) => t.palette.mode === "dark" ? "rgba(220,90,90,0.35)" : "rgba(176,68,66,0.3)",
                                  "&:hover": {
                                    borderColor: (t) => t.palette.mode === "dark" ? "rgba(220,90,90,0.6)" : "rgba(176,68,66,0.55)",
                                    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.1)" : "rgba(255,94,91,0.06)",
                                  },
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
                                  borderRadius: 1.5,
                                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.14)" : "rgba(255,94,91,0.07)",
                                  border: "1px solid",
                                  borderColor: (t) => t.palette.mode === "dark" ? "rgba(220,90,90,0.28)" : "rgba(200,80,80,0.16)",
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

                    {aiLoading || aiText || aiError ? (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Box
                          sx={{
                            width: "100%",
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: (t) =>
                              t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)",
                            bgcolor: (t) =>
                              t.palette.mode === "dark" ? "rgba(200,70,70,0.06)" : "rgba(255,94,91,0.03)",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AutoAwesomeIcon
                                fontSize="small"
                                sx={{ color: (t) => (t.palette.mode === "dark" ? "#E08A88" : "#B04442") }}
                              />
                              <Typography sx={{ fontWeight: 800 }} variant="h3">
                                Generert kundetekst (utkast)
                              </Typography>
                            </Stack>
                            {aiText ? (
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Generer på nytt" arrow>
                                  <span>
                                    <IconButton
                                      aria-label="Generer på nytt"
                                      size="small"
                                      onClick={handleGenerateAi}
                                      disabled={aiLoading}
                                    >
                                      <AutoAwesomeIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Kopier" arrow>
                                  <IconButton
                                    aria-label="Kopier generert tekst"
                                    size="small"
                                    onClick={() => handleCopyStandardtekst(aiText)}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : null}
                          </Box>

                          {aiError ? (
                            <Alert severity="error" sx={{ mb: 1 }}>
                              {aiError}
                            </Alert>
                          ) : null}

                          {aiLoading && !aiText ? (
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                              <CircularProgress size={18} />
                              <Typography color="text.secondary">
                                Genererer utkast grunnet i FEST-data …
                              </Typography>
                            </Stack>
                          ) : null}

                          {aiText ? (
                            <>
                              <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                value={aiText}
                                onChange={(e) => setAiText(e.target.value)}
                                sx={{
                                  bgcolor: (t) => (t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF"),
                                  borderRadius: 1,
                                }}
                              />
                              <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                                Utkast generert med Claude basert på FEST-feltene over – ingen kliniske
                                fakta er lagt til av modellen. Må kvalitetssikres av farmasøyt før
                                sending. Lim aldri inn kundeopplysninger.
                                {aiLatencyMs != null ? ` (${(aiLatencyMs / 1000).toFixed(1)} s)` : ""}
                              </Typography>
                            </>
                          ) : null}
                        </Box>
                      </Box>
                    ) : null}

                    {it.interaksjonId ? (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Box
                          sx={{
                            width: "100%",
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: (t) => t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)",
                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.06)" : "rgba(255,94,91,0.03)",
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

                              {filteredLinkedWithScore.length === 0 ? (
                                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                  Ingen standardtekster matcher søket.
                                </Typography>
                              ) : null}

                              <Box
                                sx={{ display: "flex", flexWrap: "wrap", gap: 1, width: "100%" }}
                              >
                                {filteredLinkedWithScore.map((s) => {
                                  const isOpenStd = activeLinkedStdId === s.doc.id;
                                  const label = s.title;

                                  return (
                                    <Tooltip
                                      key={s.doc.id}
                                      title={
                                        isOpenStd ? "Skjul standardtekst" : "Vis standardtekst"
                                      }
                                      arrow
                                    >
                                      <Chip
                                        size="medium"
                                        icon={<DescriptionOutlinedIcon />}
                                        label={renderHighlightedText(label, s.matchedTerms)}
                                        clickable
                                        onClick={() =>
                                          setActiveLinkedStdId((prev) =>
                                            prev === s.doc.id ? null : s.doc.id
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
                                            prev === s.doc.id ? null : s.doc.id
                                          )
                                        }
                                        sx={{
                                          borderRadius: 999,
                                          border: "1px solid",
                                          borderColor: isOpenStd
                                            ? (t) => t.palette.mode === "dark" ? "rgba(220,90,90,0.7)" : "rgba(176,68,66,0.55)"
                                            : (t) => t.palette.mode === "dark" ? "rgba(200,80,80,0.25)" : "rgba(200,80,80,0.16)",
                                          bgcolor: isOpenStd
                                            ? (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.22)" : "rgba(255,94,91,0.1)"
                                            : "background.paper",
                                          color: (t) => t.palette.mode === "dark" ? "#E08A88" : "#8A3230",
                                          height: 38,
                                          px: 0.5,
                                          maxWidth: "100%",
                                          cursor: "pointer",
                                          transition:
                                            "background-color 120ms ease, border-color 120ms ease, transform 120ms ease",
                                          "&:hover": {
                                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.15)" : "rgba(255,94,91,0.07)",
                                            transform: "translateY(-1px)",
                                          },
                                          "& .MuiChip-label": {
                                            px: 1,
                                            fontWeight: 800,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          },
                                          "& .MuiChip-icon": { opacity: 0.85 },
                                          "& .MuiChip-deleteIcon": { opacity: 0.85 },
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                              {!activeLinkedStd && filteredLinkedWithScore.length > 0 ? (
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
                                          borderColor: (t) => t.palette.mode === "dark" ? "rgba(200,80,80,0.2)" : "rgba(200,80,80,0.12)",
                                          bgcolor: (t) => t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF",
                                          width: "100%",
                                          cursor: "copy",
                                          userSelect: "text",
                                          "&:hover": {
                                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(200,70,70,0.08)" : "rgba(255,94,91,0.03)",
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
      )}
      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 700 }}>
            Tøm:
          </Box>{" "}
          Escape
        </Typography>
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
  </ThemeProvider>
  );
}
