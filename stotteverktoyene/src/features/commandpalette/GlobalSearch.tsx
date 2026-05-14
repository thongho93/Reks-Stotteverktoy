import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CalculateIcon from "@mui/icons-material/Calculate";
import DescriptionIcon from "@mui/icons-material/Description";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ConstructionIcon from "@mui/icons-material/Construction";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import KeyboardReturnRoundedIcon from "@mui/icons-material/KeyboardReturnRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "../../app/auth/useAuthUser";
import { readCachedOrFetchStandardTekster } from "../standardtekster/hooks/useStandardTekster";
import type { StandardTekst } from "../standardtekster/types";
import {
  getTallTokenIndices,
  getFormuleringTokenIndices,
  templateHasKlokkeslettDagToken,
  templateHasDatoToken,
  templateHasDatoMndToken,
  formatPreparatForTemplate,
} from "../standardtekster/utils/preparat";
import { loadMedicationItems, type Med } from "../fest/components/MedicationSearch";
import { loadInteractionsIndex } from "../interaksjoner/services/useInteractions";
import type { InteractionEntity } from "../fest/mappers/interactionsToIndex";
import { collection, getDocs, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../../firebase/firebase";

// ─── Page definitions ───────────────────────────────────────────────────────

type PageCommand = {
  placeholder: string;
  example: string;
  parsePreview(query: string): string | null;
  buildState(query: string): Record<string, unknown>;
};

const PAGE_COMMANDS: Record<string, PageCommand> = {
  "/omeq": {
    placeholder: "Preparatnavn [antall/døgn]...",
    example: "morfin 10 mg 4   eller   12345 2",
    parsePreview(query) {
      const q = query.trim();
      if (!q) return null;
      const parts = q.split(/\s+/);
      const last = parts[parts.length - 1];
      const isNumber = /^\d+([.,]\d+)?$/.test(last);
      if (isNumber && parts.length > 1) {
        return `Preparat: ${parts.slice(0, -1).join(" ")} — ${last}/døgn`;
      }
      return `Preparat: ${q}`;
    },
    buildState(query) {
      const parts = query.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      const isNumber = /^\d+([.,]\d+)?$/.test(last);
      return {
        prefill: isNumber && parts.length > 1
          ? { medicationText: parts.slice(0, -1).join(" "), doseText: last }
          : { medicationText: query.trim(), doseText: "" },
      };
    },
  },
  "/interaksjoner": {
    placeholder: "Legemiddelnavn...",
    example: "warfarin",
    parsePreview(query) {
      return query.trim() ? `Søker etter: ${query.trim()}` : null;
    },
    buildState(query) {
      return { searchQuery: query.trim() };
    },
  },
  "/standardtekster": {
    placeholder: "Søk etter standardtekst...",
    example: "hyppig   eller   morfin avhengig",
    parsePreview(_query) {
      return null;
    },
    buildState(_query) {
      return {};
    },
    multiStep: true,
  } as PageCommand & { multiStep: true },
  "/produkt-og-rad": {
    placeholder: "Varenr, produktnavn eller ATC-kode...",
    example: "Fresubin   eller   N02BE01",
    parsePreview(query) {
      return query.trim() ? `Søker etter: ${query.trim()}` : null;
    },
    buildState(query) {
      return { searchQuery: query.trim() };
    },
  },
};

// ─── Search entries ──────────────────────────────────────────────────────────

type SearchEntry = {
  id: string;
  label: string;
  path: string;
  Icon: React.ElementType;
  color: string;
  keywords?: string[];
  state?: Record<string, unknown>;
  scopeMode?: "default" | "fagligTabs";
  admin?: boolean;
  ownerOnly?: boolean;
};

const ALL_ENTRIES: SearchEntry[] = [
  {
    id: "omeq",
    label: "OMEQ-beregning",
    path: "/omeq",
    Icon: CalculateIcon,
    color: "#29A1FF",
    keywords: ["omeq", "opioid", "beregning", "kalkulator", "dose"],
  },
  {
    id: "standardtekster",
    label: "Standardtekster",
    path: "/standardtekster",
    Icon: DescriptionIcon,
    color: "#4BC76A",
    keywords: ["tekst", "standard", "preparat", "mal", "template"],
  },
  {
    id: "interaksjoner",
    label: "Interaksjonssøk",
    path: "/interaksjoner",
    Icon: CompareArrowsIcon,
    color: "#FF5E5B",
    keywords: ["interaksjon", "legemiddel", "søk", "kollisjoner"],
  },
  {
    id: "produkt-og-rad",
    label: "Produkt og råd",
    path: "/produkt-og-rad",
    Icon: TipsAndUpdatesRoundedIcon,
    color: "#C93586",
    keywords: ["produkt", "ernæring", "råd", "nutrition", "fresubin"],
  },
  {
    id: "faglig-innhold",
    label: "Faglig innhold",
    path: "/produkt-og-rad",
    Icon: LightbulbOutlinedIcon,
    color: "#8E44AD",
    keywords: ["faglig", "innhold", "dokument", "notat", "kunnskap"],
    state: { activeTab: 1 },
    scopeMode: "fagligTabs",
  },
  {
    id: "tilbakemelding",
    label: "Innspill og notater",
    path: "/tilbakemelding",
    Icon: FeedbackRoundedIcon,
    color: "#B648E8",
    keywords: ["notat", "feedback", "rutine", "innspill", "tilbakemelding"],
  },
  {
    id: "anbrudd",
    label: "Innkjøp og anbrudd",
    path: "/anbrudd",
    Icon: ChecklistRoundedIcon,
    color: "#FFA726",
    keywords: ["innkjøp", "anbrudd", "skjema", "bestilling"],
  },
  {
    id: "statistikk",
    label: "Statistikk",
    path: "/statistikk",
    Icon: BarChartRoundedIcon,
    color: "#6B7280",
    keywords: ["statistikk", "data", "bruk", "analyse"],
    ownerOnly: true,
  },
  {
    id: "rekspert",
    label: "Rekspert",
    path: "/rekspert",
    Icon: ConstructionIcon,
    color: "#00A3D7",
    keywords: ["admin", "rekspert", "verktøy", "administrasjon"],
    admin: true,
  },
];

type FagligTabOption = {
  id: string;
  label: string;
  emoji?: string;
  keywords?: string[];
};

const BUILTIN_FAGLIG_TABS: FagligTabOption[] = [
  {
    id: "__nutrition__",
    label: "Næringsmidler",
    emoji: "🥗",
    keywords: ["naeringsmidler", "naring", "ernaring", "kost", "nutrition"],
  },
  {
    id: "__melkeerstatning__",
    label: "Melkeerstatning",
    emoji: "🍼",
    keywords: ["melkeerstatning", "morsmelk", "baby", "spedbarn"],
  },
  {
    id: "__tryggmamma__",
    label: "Tryggmamma",
    emoji: "🤰",
    keywords: ["tryggmamma", "gravid", "amming", "mamma"],
  },
  {
    id: "__knuse__",
    label: "Knuse-/delelisten",
    emoji: "💊",
    keywords: ["knuse", "dele", "tablett", "kapsel"],
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, "a")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[\s-_]/g, "");
}

function matchesQuery(entry: SearchEntry, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalize(query);
  if (normalize(entry.label).includes(q)) return true;
  if (entry.path.replace(/[/-]/g, "").includes(q)) return true;
  return (entry.keywords ?? []).some((k) => normalize(k).includes(q));
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

export function GlobalSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [scopedPage, setScopedPage] = useState<SearchEntry | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClickEntryRef = useRef<SearchEntry | null>(null);
  const navigate = useNavigate();
  const { isOwner, isRekspert, role } = useAuthUser() as any;
  const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
  const hasOwnerAccess = Boolean(isOwner) || role === "owner";

  // ── Standardtekster multi-step state ────────────────────────────────────────
  const [stdTemplates, setStdTemplates] = useState<StandardTekst[]>([]);
  const [stdMedItems, setStdMedItems] = useState<Med[]>([]);
  const [stdLoading, setStdLoading] = useState(false);
  const [stdStep, setStdStep] = useState<0 | 1>(0); // 0 = search template, 1 = fill fields
  const [stdSelectedTemplate, setStdSelectedTemplate] = useState<StandardTekst | null>(null);
  const [stdDropdownIndex, setStdDropdownIndex] = useState(0);
  const [stdTalls, setStdTalls] = useState<Record<number, string>>({});
  const [stdFormulerings, setStdFormulerings] = useState<Record<number, string>>({});
  const [stdClockTime, setStdClockTime] = useState("11:00");
  const [stdClockDay, setStdClockDay] = useState<"today" | "tomorrow" | "sunday">("today");
  const [stdDatoInput, setStdDatoInput] = useState("");
  const [stdSelectedPreparats, setStdSelectedPreparats] = useState<Array<{ text: string; key: string }>>([]);

  // ── Interaksjonssøk scoped state ─────────────────────────────────────────────
  const [intIndex, setIntIndex] = useState<{ entities: InteractionEntity[] } | null>(null);
  const [intLoading, setIntLoading] = useState(false);
  const [intSelected, setIntSelected] = useState<InteractionEntity[]>([]);
  const [intDropdownIndex, setIntDropdownIndex] = useState(0);
  const [fagligTabs, setFagligTabs] = useState<FagligTabOption[]>(BUILTIN_FAGLIG_TABS);
  const [fagligLoading, setFagligLoading] = useState(false);
  const [fagligDropdownIndex, setFagligDropdownIndex] = useState(0);

  const entries = ALL_ENTRIES.filter(
    (e) =>
      (!e.admin || hasRekspertAccess) &&
      (!e.ownerOnly || hasOwnerAccess) &&
      matchesQuery(e, query)
  );

  const isScoped = scopedPage !== null;
  const command = scopedPage ? PAGE_COMMANDS[scopedPage.path] : null;
  const preview = command?.parsePreview(commandQuery) ?? null;
  const isStdScoped = isScoped && scopedPage?.path === "/standardtekster";
  const isIntScoped = isScoped && scopedPage?.path === "/interaksjoner";
  const isFagligScoped = isScoped && scopedPage?.scopeMode === "fagligTabs";

  const fagligFilteredOptions = useMemo<FagligTabOption[]>(() => {
    const q = normalize(commandQuery);
    if (!q) return fagligTabs;
    const words = q.split(/\s+/).filter(Boolean);

    const score = (option: FagligTabOption) => {
      const label = normalize(option.label);
      const keywordText = normalize((option.keywords ?? []).join(" "));
      let value = 0;
      if (label === q) value += 120;
      if (label.startsWith(q)) value += 80;
      if (label.includes(q)) value += 60;
      if (keywordText.includes(q)) value += 40;
      if (words.length > 1 && words.every((w) => label.includes(w) || keywordText.includes(w))) {
        value += 25;
      }
      return value;
    };

    return fagligTabs
      .map((option) => ({ option, score: score(option) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label))
      .map((item) => item.option);
  }, [fagligTabs, commandQuery]);

  const intFilteredOptions = useMemo<InteractionEntity[]>(() => {
    if (!intIndex?.entities?.length || !commandQuery.trim()) return [];
    const q = commandQuery.trim().toLowerCase();
    const starts = intIndex.entities.filter((o) => o.label.toLowerCase().startsWith(q));
    const includes = intIndex.entities.filter(
      (o) =>
        !o.label.toLowerCase().startsWith(q) &&
        (o.label.toLowerCase().includes(q) || (o.atc ? o.atc.toLowerCase().includes(q) : false))
    );
    return [...starts, ...includes].slice(0, 12);
  }, [intIndex, commandQuery]);

  const stdFilteredTemplates = useMemo(() => {
    if (!stdTemplates.length) return [];
    const q = normalize(commandQuery);
    if (!q) return stdTemplates.slice(0, 10);
    const words = q.split(/\s+/).filter(Boolean);
    const scored = stdTemplates.flatMap((t) => {
      const cat = normalize(t.category ?? "");
      const title = normalize(t.title);
      // Category: exact match = 100, word-start = 80, includes = 60
      // Title: all words match word-start = 40, all words match includes = 20
      let score = 0;
      if (cat === q) score = 100;
      else if (cat.split(/\s+/).some((w) => w.startsWith(q))) score = 80;
      else if (cat.includes(q)) score = 60;
      else if (words.every((w) => title.split(/\s+/).some((tw) => tw.startsWith(w)))) score = 40;
      else if (words.every((w) => title.includes(w))) score = 20;
      else return [];
      return [{ t, score }];
    });
    return scored
      .sort((a, b) => b.score - a.score || a.t.title.localeCompare(b.t.title))
      .map(({ t }) => t)
      .slice(0, 8);
  }, [stdTemplates, commandQuery]);

  const stdHasPreparat = useMemo(
    () =>
      stdSelectedTemplate
        ? /\{\{\s*PREPARAT\d*\s*\}\}|\bPREPARAT\d*\b/i.test(stdSelectedTemplate.content)
        : false,
    [stdSelectedTemplate]
  );
  const stdTallIndices = useMemo(
    () => (stdSelectedTemplate ? getTallTokenIndices(stdSelectedTemplate.content) : []),
    [stdSelectedTemplate]
  );
  const stdFormIndices = useMemo(
    () => (stdSelectedTemplate ? getFormuleringTokenIndices(stdSelectedTemplate.content) : []),
    [stdSelectedTemplate]
  );
  const stdHasClock = useMemo(
    () =>
      stdSelectedTemplate
        ? templateHasKlokkeslettDagToken(stdSelectedTemplate.content)
        : false,
    [stdSelectedTemplate]
  );
  const stdHasDato = useMemo(
    () =>
      stdSelectedTemplate ? templateHasDatoToken(stdSelectedTemplate.content) : false,
    [stdSelectedTemplate]
  );
  const stdHasDatoMnd = useMemo(
    () =>
      stdSelectedTemplate ? templateHasDatoMndToken(stdSelectedTemplate.content) : false,
    [stdSelectedTemplate]
  );
  const stdHasAnyField =
    stdHasPreparat ||
    stdTallIndices.length > 0 ||
    stdFormIndices.length > 0 ||
    stdHasClock ||
    stdHasDato ||
    stdHasDatoMnd;

  // VNR lookup: when commandQuery looks like a varenummer (4–6 digits), find the product
  const stdVnrMatch = useMemo<Med | null>(() => {
    if (!stdMedItems.length || !commandQuery.trim()) return null;
    const q = commandQuery.trim();
    if (!/^\d{4,6}$/.test(q)) return null;
    const needle = q.replace(/^0+/, "") || "0";
    return (
      stdMedItems.find((m) => {
        if (!m.farmaloggNumber) return false;
        const id = String(m.farmaloggNumber).trim().replace(/^0+/, "") || "0";
        return id === needle;
      }) ?? null
    );
  }, [stdMedItems, commandQuery]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setCommandQuery("");
      setScopedPage(null);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!isScoped) setActiveIndex(0);
  }, [query, isScoped]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Clean up any pending click timer on unmount or close
  useEffect(() => {
    if (!open && clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingClickEntryRef.current = null;
    }
  }, [open]);

  // Interaksjonssøk: auto-select on exact 7-char ATC input
  useEffect(() => {
    if (!isIntScoped || !intIndex?.entities?.length) return;
    const q = commandQuery.trim().toUpperCase();
    if (!q || !/^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/.test(q)) return;
    const exactMatches = intIndex.entities.filter(
      (e) => e.kind !== "product" && (e.atc ?? "").toUpperCase() === q
    );
    if (exactMatches.length !== 1) return;
    const match = exactMatches[0];
    setIntSelected((prev) => {
      const id = match.id ?? (match.atc ? `atc:${match.atc}` : `name:${match.key}`);
      const seen = new Set(prev.map((p) => p.id ?? (p.atc ? `atc:${p.atc}` : `name:${p.key}`)));
      if (seen.has(id)) return prev;
      return [...prev, match];
    });
    setCommandQuery("");
  }, [commandQuery, isIntScoped, intIndex]);

  const resetStdState = useCallback(() => {
    setStdTemplates([]);
    setStdLoading(false);
    setStdStep(0);
    setStdSelectedTemplate(null);
    setStdDropdownIndex(0);
    setStdTalls({});
    setStdFormulerings({});
    setStdClockTime("11:00");
    setStdClockDay("today");
    setStdDatoInput("");
    setStdSelectedPreparats([]);
  }, []);

  const resetIntState = useCallback(() => {
    setIntLoading(false);
    setIntSelected([]);
    setIntDropdownIndex(0);
  }, []);

  const resetFagligState = useCallback(() => {
    setFagligTabs(BUILTIN_FAGLIG_TABS);
    setFagligLoading(false);
    setFagligDropdownIndex(0);
  }, []);

  const loadStdTemplates = useCallback(async () => {
    setStdLoading(true);
    try {
      const [all, meds] = await Promise.all([
        readCachedOrFetchStandardTekster(),
        loadMedicationItems(),
      ]);
      setStdTemplates(all.filter((t) => t.isActive !== false));
      setStdMedItems(meds);
    } catch {
      setStdTemplates([]);
    } finally {
      setStdLoading(false);
    }
  }, []);

  const loadIntIndex = useCallback(async () => {
    setIntLoading(true);
    try {
      const idx = await loadInteractionsIndex();
      setIntIndex(idx);
    } catch {
      // ignore
    } finally {
      setIntLoading(false);
    }
  }, []);

  const loadFagligTabs = useCallback(async () => {
    setFagligLoading(true);
    try {
      const snapshot = await getDocs(fsQuery(collection(db, "fagligDocuments"), orderBy("updatedAtMs", "desc")));
      const dynamicTabs: FagligTabOption[] = snapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, unknown>;
        return {
          id: snap.id,
          label: String(data.title ?? "Nytt dokument").trim() || "Nytt dokument",
          emoji: typeof data.emoji === "string" ? data.emoji : undefined,
          keywords: ["dokument", "faglig"],
        };
      });
      setFagligTabs([...BUILTIN_FAGLIG_TABS, ...dynamicTabs]);
    } catch {
      setFagligTabs(BUILTIN_FAGLIG_TABS);
    } finally {
      setFagligLoading(false);
    }
  }, []);

  const enterScopeMode = useCallback(
    (entry: SearchEntry) => {
      setScopedPage(entry);
      setCommandQuery("");
      if (entry.path === "/standardtekster") {
        resetStdState();
        void loadStdTemplates();
      } else if (entry.path === "/interaksjoner") {
        resetIntState();
        void loadIntIndex();
      } else if (entry.scopeMode === "fagligTabs") {
        resetFagligState();
        void loadFagligTabs();
      }
      setTimeout(() => inputRef.current?.focus(), 60);
    },
    [loadStdTemplates, resetStdState, resetIntState, loadIntIndex, resetFagligState, loadFagligTabs]
  );

  const exitScopeMode = useCallback(() => {
    setScopedPage(null);
    setCommandQuery("");
    resetStdState();
    resetIntState();
    resetFagligState();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [resetStdState, resetIntState, resetFagligState]);

  const navigateTo = useCallback(
    (entry: SearchEntry, withCommand = false) => {
      const entryState = entry.state ?? {};
      if (withCommand && command && commandQuery.trim()) {
        navigate(entry.path, { state: { ...entryState, ...command.buildState(commandQuery) } });
      } else if (Object.keys(entryState).length > 0) {
        navigate(entry.path, { state: entryState });
      } else {
        navigate(entry.path);
      }
      onClose();
    },
    [navigate, onClose, command, commandQuery]
  );

  const selectStdTemplate = useCallback(
    (template: StandardTekst) => {
      setStdSelectedTemplate(template);
      setStdStep(1);
      setCommandQuery("");
      setStdDropdownIndex(0);

      const tallInds = getTallTokenIndices(template.content);
      const nextTalls: Record<number, string> = {};
      for (const i of tallInds) nextTalls[i] = "";
      setStdTalls(nextTalls);

      const formInds = getFormuleringTokenIndices(template.content);
      const nextForms: Record<number, string> = {};
      for (const i of formInds) nextForms[i] = "";
      setStdFormulerings(nextForms);

      setStdClockTime("11:00");
      setStdClockDay("today");
      setStdDatoInput("");

      setTimeout(() => inputRef.current?.focus(), 60);
    },
    []
  );

  const goBackToStdStep0 = useCallback(() => {
    setStdStep(0);
    setStdSelectedTemplate(null);
    setStdDropdownIndex(0);
    setStdTalls({});
    setStdFormulerings({});
    setCommandQuery("");
    setStdSelectedPreparats([]);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const commitPreparatChip = useCallback(() => {
    const q = commandQuery.trim();
    if (!q) return false;
    const text = stdVnrMatch
      ? formatPreparatForTemplate(stdVnrMatch) || stdVnrMatch.varenavn || q
      : q;
    const key = stdVnrMatch
      ? String(stdVnrMatch.farmaloggNumber ?? q)
      : q;
    setStdSelectedPreparats((prev) => [...prev, { text, key }]);
    setCommandQuery("");
    return true;
  }, [commandQuery, stdVnrMatch]);

  const navigateWithStdPrefill = useCallback(() => {
    if (!scopedPage || !stdSelectedTemplate) return;

    const palettePrefill: Record<string, unknown> = {
      templateId: stdSelectedTemplate.id,
    };

    if (stdSelectedPreparats.length > 0) {
      palettePrefill.preparatList = stdSelectedPreparats;
    }

    const tallInds = getTallTokenIndices(stdSelectedTemplate.content);
    if (tallInds.length) palettePrefill.tallValues = stdTalls;

    const formInds = getFormuleringTokenIndices(stdSelectedTemplate.content);
    if (formInds.length) palettePrefill.formuleringValues = stdFormulerings;

    if (templateHasKlokkeslettDagToken(stdSelectedTemplate.content) && stdClockTime) {
      palettePrefill.clockTime = stdClockTime;
      palettePrefill.clockDay = stdClockDay;
    }

    if (
      (templateHasDatoToken(stdSelectedTemplate.content) ||
        templateHasDatoMndToken(stdSelectedTemplate.content)) &&
      stdDatoInput
    ) {
      palettePrefill.datoInput = stdDatoInput;
    }

    navigate(scopedPage.path, { state: { palettePrefill } });
    onClose();
  }, [
    scopedPage,
    stdSelectedTemplate,
    stdSelectedPreparats,
    stdTalls,
    stdFormulerings,
    stdClockTime,
    stdClockDay,
    stdDatoInput,
    navigate,
    onClose,
  ]);

  const intEntityId = useCallback(
    (e: InteractionEntity) => e.id ?? (e.atc ? `atc:${e.atc}` : `name:${e.key}`),
    []
  );

  const selectIntEntity = useCallback(
    (entity: InteractionEntity) => {
      setIntSelected((prev) => {
        const id = entity.id ?? (entity.atc ? `atc:${entity.atc}` : `name:${entity.key}`);
        const seen = new Set(prev.map((p) => p.id ?? (p.atc ? `atc:${p.atc}` : `name:${p.key}`)));
        if (seen.has(id)) return prev;
        return [...prev, entity];
      });
      setCommandQuery("");
      setIntDropdownIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    },
    []
  );

  const navigateWithIntSelected = useCallback(() => {
    if (!scopedPage) return;
    navigate(scopedPage.path, { state: { selectedEntities: intSelected } });
    onClose();
  }, [scopedPage, intSelected, navigate, onClose]);

  const navigateWithFagligSelection = useCallback(
    (selection?: FagligTabOption) => {
      if (!scopedPage) return;
      const fallback = fagligFilteredOptions[0];
      const target = selection ?? fallback;
      if (!target) {
        navigate(scopedPage.path, { state: { ...(scopedPage.state ?? {}), activeTab: 1 } });
        onClose();
        return;
      }
      navigate(scopedPage.path, {
        state: {
          ...(scopedPage.state ?? {}),
          activeTab: 1,
          selectedFagligDocId: target.id,
        },
      });
      onClose();
    },
    [scopedPage, fagligFilteredOptions, navigate, onClose]
  );

  const handleItemClick = useCallback((entry: SearchEntry) => {
    const hasCommand = Boolean(PAGE_COMMANDS[entry.path]);

    if (!hasCommand) {
      navigateTo(entry);
      return;
    }

    if (clickTimerRef.current) {
      // Second click within 250ms → double-click → navigate
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingClickEntryRef.current = null;
      navigateTo(entry);
      return;
    }

    // First click → wait to see if second follows; if not, enter scoped mode
    pendingClickEntryRef.current = entry;
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      const pending = pendingClickEntryRef.current;
      pendingClickEntryRef.current = null;
      if (pending) enterScopeMode(pending);
    }, 250);
  }, [navigateTo, enterScopeMode]);

  // Keyboard handling
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlCmd = e.ctrlKey || e.metaKey;

      if (isScoped) {
        // ── Standardtekster multi-step keyboard handling ──
        if (isStdScoped) {
          if (stdStep === 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setStdDropdownIndex((i) => Math.min(i + 1, stdFilteredTemplates.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setStdDropdownIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const t = stdFilteredTemplates[stdDropdownIndex];
              if (t) selectStdTemplate(t);
            } else if (e.key === "Escape") {
              e.preventDefault();
              if (commandQuery) setCommandQuery("");
              else exitScopeMode();
            } else if (e.key === "Backspace" && commandQuery === "") {
              e.preventDefault();
              exitScopeMode();
            }
          } else {
            if (e.key === "Enter") {
              e.preventDefault();
              if (stdHasPreparat && commandQuery.trim()) {
                commitPreparatChip();
              } else {
                navigateWithStdPrefill();
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              if (commandQuery) setCommandQuery("");
              else goBackToStdStep0();
            } else if (e.key === "Backspace" && commandQuery === "") {
              e.preventDefault();
              if (stdSelectedPreparats.length > 0) {
                setStdSelectedPreparats((prev) => prev.slice(0, -1));
              } else {
                goBackToStdStep0();
              }
            }
          }
          return;
        }

        // ── Interaksjonssøk scoped keyboard handling ──
        if (isIntScoped) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIntDropdownIndex((i) => Math.min(i + 1, intFilteredOptions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIntDropdownIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (commandQuery.trim() && intFilteredOptions.length > 0) {
              const entity = intFilteredOptions[intDropdownIndex] ?? intFilteredOptions[0];
              if (entity) selectIntEntity(entity);
            } else {
              navigateWithIntSelected();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (commandQuery) setCommandQuery("");
            else exitScopeMode();
          } else if (e.key === "Backspace" && commandQuery === "") {
            e.preventDefault();
            if (intSelected.length > 0) {
              setIntSelected((prev) => prev.slice(0, -1));
            } else {
              exitScopeMode();
            }
          }
          return;
        }

        // ── Faglig innhold scoped keyboard handling ──
        if (isFagligScoped) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFagligDropdownIndex((i) => Math.min(i + 1, Math.max(0, fagligFilteredOptions.length - 1)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFagligDropdownIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const selected = fagligFilteredOptions[fagligDropdownIndex] ?? fagligFilteredOptions[0];
            navigateWithFagligSelection(selected);
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (commandQuery) setCommandQuery("");
            else exitScopeMode();
          } else if (e.key === "Backspace" && commandQuery === "") {
            e.preventDefault();
            exitScopeMode();
          }
          return;
        }

        // ── Other pages scoped keyboard handling ──
        if (e.key === "Escape") {
          e.preventDefault();
          if (commandQuery) {
            setCommandQuery("");
          } else {
            exitScopeMode();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (scopedPage) navigateTo(scopedPage, true);
        } else if (e.key === "Backspace" && commandQuery === "") {
          e.preventDefault();
          exitScopeMode();
        }
        return;
      }

      // Normal mode
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const entry = entries[activeIndex];
        if (!entry) return;
        if (isCtrlCmd && PAGE_COMMANDS[entry.path]) {
          enterScopeMode(entry);
        } else {
          navigateTo(entry);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    open, isScoped, isStdScoped, isIntScoped, isFagligScoped, entries, activeIndex, scopedPage, commandQuery,
    stdStep, stdFilteredTemplates, stdDropdownIndex, stdHasPreparat, stdSelectedPreparats,
    intFilteredOptions, intDropdownIndex, intSelected, fagligFilteredOptions, fagligDropdownIndex,
    navigateTo, enterScopeMode, exitScopeMode, onClose,
    selectStdTemplate, goBackToStdStep0, navigateWithStdPrefill, commitPreparatChip,
    selectIntEntity, navigateWithIntSelected, navigateWithFagligSelection,
  ]);

  const shortcutLabel = "Space";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)"
              : "0 32px 80px rgba(15,23,42,0.22), 0 0 0 1px rgba(0,0,0,0.05)",
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0,0,0,0.28)",
        },
      }}
    >
      {/* ── Search / command input ── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <SearchIcon sx={{ color: "text.secondary", fontSize: 22, flexShrink: 0 }} />

        {/* Scoped page chip */}
        {scopedPage && (
          <Chip
            label={scopedPage.label}
            size="small"
            onDelete={exitScopeMode}
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              fontSize: "0.78rem",
              backgroundColor: (theme) =>
                alpha(scopedPage.color, theme.palette.mode === "dark" ? 0.22 : 0.12),
              color: scopedPage.color,
              "& .MuiChip-deleteIcon": { color: alpha(scopedPage.color, 0.7) },
              "& .MuiChip-deleteIcon:hover": { color: scopedPage.color },
              border: `1px solid ${alpha(scopedPage.color, 0.3)}`,
            }}
          />
        )}

        {/* Standardtekster: selected template chip in step 1 */}
        {isStdScoped && stdStep === 1 && stdSelectedTemplate && (
          <Chip
            label={stdSelectedTemplate.title}
            size="small"
            onDelete={goBackToStdStep0}
            sx={{
              flexShrink: 0,
              maxWidth: 200,
              fontWeight: 500,
              fontSize: "0.75rem",
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
        )}

        {/* The actual input */}
        <TextField
          inputRef={inputRef}
          value={isScoped ? commandQuery : query}
          onChange={(e) => {
            if (isScoped) setCommandQuery(e.target.value);
            else setQuery(e.target.value);
          }}
          placeholder={
            isStdScoped
              ? stdStep === 0
                ? (command?.placeholder ?? "Søk etter standardtekst...")
                : stdHasPreparat
                ? "Preparat / varenummer..."
                : ""
              : isIntScoped
              ? "Søk etter legemiddel, virkestoff eller ATC-kode..."
              : isFagligScoped
              ? "Søk etter dokumentfane..."
              : isScoped
              ? (command?.placeholder ?? "")
              : "Søk etter side..."
          }
          fullWidth
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "1.05rem", fontWeight: 400 },
          }}
        />

        {/* Shortcut badge (only in normal mode) */}
        {!isScoped && (
          <Box
            component="kbd"
            sx={{
              px: 0.9,
              py: 0.3,
              borderRadius: 1,
              fontSize: "0.72rem",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              flexShrink: 0,
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              border: (theme) =>
                `1px solid ${
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.13)"
                }`,
              color: "text.disabled",
            }}
          >
            {shortcutLabel}
          </Box>
        )}
      </Box>

      {/* ── Results / command hint ── */}
      {isScoped ? (
        isStdScoped ? (
          stdStep === 0 ? (
            // ── Standardtekster step 0: template search dropdown ──
            <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
              {stdLoading ? (
                <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : stdFilteredTemplates.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="body2">
                    {commandQuery.trim()
                      ? `Ingen standardtekster for «${commandQuery}»`
                      : "Ingen standardtekster funnet"}
                  </Typography>
                </Box>
              ) : (
                <List disablePadding sx={{ py: 0.5 }}>
                  {stdFilteredTemplates.map((t, i) => {
                    const isActive = i === stdDropdownIndex;
                    return (
                      <ListItemButton
                        key={t.id}
                        selected={isActive}
                        onClick={() => selectStdTemplate(t)}
                        onMouseMove={() => setStdDropdownIndex(i)}
                        sx={{
                          mx: 0.75,
                          my: 0.25,
                          borderRadius: 2,
                          px: 1.5,
                          py: 1,
                          borderLeft: `3px solid ${isActive ? "#4BC76A" : "transparent"}`,
                          transition: "background-color 80ms, border-color 80ms",
                          "&.Mui-selected": {
                            backgroundColor: (theme) =>
                              alpha("#4BC76A", theme.palette.mode === "dark" ? 0.16 : 0.09),
                          },
                          "&.Mui-selected:hover": {
                            backgroundColor: (theme) =>
                              alpha("#4BC76A", theme.palette.mode === "dark" ? 0.2 : 0.12),
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: "#4BC76A" }}>
                          <DescriptionIcon sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={t.title}
                          secondary={t.category ?? undefined}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 600 : 400,
                            fontSize: "0.92rem",
                          }}
                          secondaryTypographyProps={{ fontSize: "0.73rem", sx: { opacity: 0.6 } }}
                        />
                        {isActive && (
                          <KeyboardReturnRoundedIcon
                            sx={{ fontSize: 16, color: "text.disabled", ml: 1 }}
                          />
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>
          ) : (
            // ── Standardtekster step 1: field form ──
            <Box sx={{ px: 2.5, py: 2, maxHeight: 400, overflowY: "auto" }}>
              {!stdHasAnyField ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) =>
                      alpha("#4BC76A", theme.palette.mode === "dark" ? 0.1 : 0.06),
                    border: (theme) =>
                      `1px solid ${alpha("#4BC76A", theme.palette.mode === "dark" ? 0.25 : 0.18)}`,
                  }}
                >
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: "#4BC76A" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Ingen felt å fylle ut — trykk Enter for å åpne malen
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {stdHasPreparat && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LightbulbOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {stdSelectedPreparats.length === 0
                            ? "Skriv preparat / varenummer i søkefeltet over"
                            : "Trykk Enter for å legge til flere, eller Enter igjen for å åpne"}
                        </Typography>
                      </Box>
                      {/* Added preparat chips */}
                      {stdSelectedPreparats.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {stdSelectedPreparats.map((p, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1.25,
                                py: 0.4,
                                borderRadius: 1.5,
                                backgroundColor: (theme) =>
                                  alpha("#4BC76A", theme.palette.mode === "dark" ? 0.15 : 0.09),
                                border: (theme) =>
                                  `1px solid ${alpha("#4BC76A", theme.palette.mode === "dark" ? 0.35 : 0.25)}`,
                              }}
                            >
                              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 13, color: "#4BC76A", flexShrink: 0 }} />
                              <Typography variant="caption" sx={{ color: "#4BC76A", fontWeight: 600 }}>
                                {p.text}
                              </Typography>
                              <Box
                                component="span"
                                onClick={() => setStdSelectedPreparats((prev) => prev.filter((_, idx) => idx !== i))}
                                sx={{
                                  ml: 0.25,
                                  cursor: "pointer",
                                  fontSize: "0.7rem",
                                  color: "#4BC76A",
                                  lineHeight: 1,
                                  opacity: 0.7,
                                  "&:hover": { opacity: 1 },
                                }}
                              >
                                ✕
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                      {/* VNR resolved preview for current input */}
                      {stdVnrMatch && commandQuery.trim() && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1.5,
                            backgroundColor: (theme) =>
                              alpha("#4BC76A", theme.palette.mode === "dark" ? 0.12 : 0.07),
                            border: (theme) =>
                              `1px solid ${alpha("#4BC76A", theme.palette.mode === "dark" ? 0.3 : 0.2)}`,
                          }}
                        >
                          <CheckCircleOutlineRoundedIcon sx={{ fontSize: 15, color: "#4BC76A", flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: "#4BC76A", fontWeight: 600 }}>
                            {formatPreparatForTemplate(stdVnrMatch) || stdVnrMatch.varenavn || commandQuery} — trykk Enter for å legge til
                          </Typography>
                        </Box>
                      )}
                      {/* VNR typed but no match found */}
                      {!stdVnrMatch && /^\d{4,6}$/.test(commandQuery.trim()) && commandQuery.trim() && (
                        <Typography variant="caption" sx={{ color: "text.disabled", pl: 3 }}>
                          Fant ikke produkt for varenr {commandQuery.trim()}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {stdTallIndices.map((idx, pos) => (
                    <TextField
                      key={`tall-${idx}`}
                      label={stdTallIndices.length > 1 ? `Antall ${pos + 1}` : "Antall"}
                      value={stdTalls[idx] ?? ""}
                      onChange={(e) =>
                        setStdTalls((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      size="small"
                      fullWidth
                      inputProps={{ inputMode: "decimal" }}
                    />
                  ))}

                  {stdFormIndices.map((idx, pos) => (
                    <TextField
                      key={`form-${idx}`}
                      label={stdFormIndices.length > 1 ? `Formulering ${pos + 1}` : "Formulering"}
                      placeholder="tablett, kapsel, ml..."
                      value={stdFormulerings[idx] ?? ""}
                      onChange={(e) =>
                        setStdFormulerings((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      size="small"
                      fullWidth
                    />
                  ))}

                  {stdHasClock && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField
                        label="Klokkeslett"
                        value={stdClockTime}
                        onChange={(e) => setStdClockTime(e.target.value)}
                        size="small"
                        sx={{ width: 130 }}
                        placeholder="11:00"
                      />
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {(["today", "tomorrow", "sunday"] as const).map((day) => (
                          <Box
                            key={day}
                            onClick={() => setStdClockDay(day)}
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontWeight: stdClockDay === day ? 600 : 400,
                              border: (theme) =>
                                `1px solid ${
                                  stdClockDay === day
                                    ? "#4BC76A"
                                    : theme.palette.divider
                                }`,
                              backgroundColor: (theme) =>
                                stdClockDay === day
                                  ? alpha("#4BC76A", theme.palette.mode === "dark" ? 0.18 : 0.1)
                                  : "transparent",
                              color: stdClockDay === day ? "#4BC76A" : "text.secondary",
                              userSelect: "none",
                            }}
                          >
                            {day === "today" ? "I dag" : day === "tomorrow" ? "I morgen" : "Søndag"}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {(stdHasDato || stdHasDatoMnd) && (
                    <TextField
                      label="Dato"
                      value={stdDatoInput}
                      onChange={(e) => setStdDatoInput(e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="dd.mm.yyyy"
                    />
                  )}
                </Box>
              )}
            </Box>
          )
        ) : isIntScoped ? (
          // ── Interaksjonssøk: autocomplete search ──
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {intLoading ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {/* Dropdown of filtered options */}
                {commandQuery.trim() && intFilteredOptions.length === 0 && (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography color="text.secondary" variant="body2">
                      Ingen treff for «{commandQuery}»
                    </Typography>
                  </Box>
                )}
                {intFilteredOptions.length > 0 && (
                  <List disablePadding sx={{ py: 0.5 }}>
                    {intFilteredOptions.map((o, i) => {
                      const isActive = i === intDropdownIndex;
                      const label =
                        o.kind === "product"
                          ? o.label
                          : o.atc
                          ? `${o.label} (${o.atc})`
                          : o.label;
                      return (
                        <ListItemButton
                          key={intEntityId(o)}
                          selected={isActive}
                          onClick={() => selectIntEntity(o)}
                          onMouseMove={() => setIntDropdownIndex(i)}
                          sx={{
                            mx: 0.75,
                            my: 0.25,
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.75,
                            borderLeft: `3px solid ${isActive ? "#FF5E5B" : "transparent"}`,
                            transition: "background-color 80ms, border-color 80ms",
                            "&.Mui-selected": {
                              backgroundColor: (theme) =>
                                alpha("#FF5E5B", theme.palette.mode === "dark" ? 0.16 : 0.09),
                            },
                            "&.Mui-selected:hover": {
                              backgroundColor: (theme) =>
                                alpha("#FF5E5B", theme.palette.mode === "dark" ? 0.2 : 0.12),
                            },
                          }}
                        >
                          <ListItemText
                            primary={label}
                            primaryTypographyProps={{
                              fontWeight: isActive ? 600 : 400,
                              fontSize: "0.92rem",
                            }}
                          />
                          {isActive && (
                            <KeyboardReturnRoundedIcon
                              sx={{ fontSize: 16, color: "text.disabled", ml: 1 }}
                            />
                          )}
                        </ListItemButton>
                      );
                    })}
                  </List>
                )}

                {/* Selected chips */}
                {intSelected.length > 0 && (
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.75,
                      borderTop: intFilteredOptions.length > 0 ? "1px solid" : "none",
                      borderColor: "divider",
                    }}
                  >
                    {intSelected.map((o) => {
                      const id = intEntityId(o);
                      const label =
                        o.kind === "product"
                          ? o.label
                          : o.atc
                          ? `${o.label} ${o.atc}`
                          : o.label;
                      return (
                        <Chip
                          key={id}
                          label={label}
                          size="small"
                          onDelete={() =>
                            setIntSelected((prev) => prev.filter((p) => intEntityId(p) !== id))
                          }
                          sx={{
                            fontWeight: 500,
                            fontSize: "0.78rem",
                            backgroundColor: (theme) =>
                              alpha("#FF5E5B", theme.palette.mode === "dark" ? 0.16 : 0.09),
                            color: "#FF5E5B",
                            border: `1px solid ${alpha("#FF5E5B", 0.3)}`,
                            "& .MuiChip-deleteIcon": { color: alpha("#FF5E5B", 0.7) },
                            "& .MuiChip-deleteIcon:hover": { color: "#FF5E5B" },
                          }}
                        />
                      );
                    })}
                  </Box>
                )}

                {/* Empty-state hint */}
                {!commandQuery.trim() && intSelected.length === 0 && (
                  <Box sx={{ px: 3, py: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: (theme) =>
                          alpha("#FF5E5B", theme.palette.mode === "dark" ? 0.1 : 0.06),
                        border: (theme) =>
                          `1px solid ${alpha("#FF5E5B", theme.palette.mode === "dark" ? 0.25 : 0.18)}`,
                      }}
                    >
                      <LightbulbOutlinedIcon
                        sx={{ fontSize: 18, color: "#FF5E5B", mt: 0.25, flexShrink: 0 }}
                      />
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: "text.primary", mb: 0.25 }}
                        >
                          Søk etter legemiddel, virkestoff eller ATC-kode
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontFamily: "monospace" }}
                        >
                          f.eks. warfarin, metoprolol, N02AA01
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        ) : isFagligScoped ? (
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {fagligLoading ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : fagligFilteredOptions.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">
                  {commandQuery.trim()
                    ? `Ingen dokumentfaner for «${commandQuery}»`
                    : "Ingen dokumentfaner funnet"}
                </Typography>
              </Box>
            ) : (
              <List disablePadding sx={{ py: 0.5 }}>
                {fagligFilteredOptions.map((option, i) => {
                  const isActive = i === fagligDropdownIndex;
                  return (
                    <ListItemButton
                      key={option.id}
                      selected={isActive}
                      onClick={() => navigateWithFagligSelection(option)}
                      onMouseMove={() => setFagligDropdownIndex(i)}
                      sx={{
                        mx: 0.75,
                        my: 0.25,
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.9,
                        borderLeft: `3px solid ${isActive ? scopedPage!.color : "transparent"}`,
                        transition: "background-color 80ms, border-color 80ms",
                        "&.Mui-selected": {
                          backgroundColor: (theme) =>
                            alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.16 : 0.09),
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: (theme) =>
                            alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.2 : 0.12),
                        },
                      }}
                    >
                      <ListItemText
                        primary={`${option.emoji ? `${option.emoji} ` : ""}${option.label}`}
                        secondary={option.id.startsWith("__") ? "Innebygd dokumentfane" : "Dokumentfane"}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 600 : 400,
                          fontSize: "0.92rem",
                        }}
                        secondaryTypographyProps={{ fontSize: "0.73rem", sx: { opacity: 0.6 } }}
                      />
                      {isActive && (
                        <KeyboardReturnRoundedIcon
                          sx={{ fontSize: 16, color: "text.disabled", ml: 1 }}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        ) : (
          // ── Other pages: existing hint card + live preview ──
          <Box sx={{ px: 3, py: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                backgroundColor: (theme) =>
                  alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.1 : 0.06),
                border: (theme) =>
                  `1px solid ${alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.25 : 0.18)}`,
              }}
            >
              <LightbulbOutlinedIcon
                sx={{ fontSize: 18, color: scopedPage!.color, mt: 0.25, flexShrink: 0 }}
              />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "text.primary", mb: 0.25 }}
                >
                  {command?.placeholder}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                  f.eks. {command?.example}
                </Typography>
              </Box>
            </Box>

            {preview && (
              <Box
                sx={{
                  mt: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: 1.5,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <scopedPage.Icon sx={{ fontSize: 16, color: scopedPage!.color, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontFamily: "monospace" }}
                >
                  {preview}
                </Typography>
              </Box>
            )}
          </Box>
        )
      ) : (
        // Normal mode: result list
        <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography color="text.secondary" variant="body2">
                Ingen resultater for «{query}»
              </Typography>
            </Box>
          ) : (
            <List disablePadding sx={{ py: 0.5 }}>
              {entries.map((entry, i) => {
                const isActive = i === activeIndex;
                return (
                  <ListItemButton
                    key={entry.id}
                    ref={isActive ? (activeItemRef as React.RefObject<HTMLDivElement>) : undefined}
                    selected={isActive}
                    onClick={() => handleItemClick(entry)}
                    onMouseMove={() => setActiveIndex(i)}
                    sx={{
                      mx: 0.75,
                      my: 0.25,
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      borderLeft: `3px solid ${isActive ? entry.color : "transparent"}`,
                      transition: "background-color 80ms, border-color 80ms",
                      "&.Mui-selected": {
                        backgroundColor: (theme) =>
                          alpha(entry.color, theme.palette.mode === "dark" ? 0.16 : 0.09),
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: (theme) =>
                          alpha(entry.color, theme.palette.mode === "dark" ? 0.2 : 0.12),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: entry.color }}>
                      <entry.Icon sx={{ fontSize: 22 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={entry.label}
                      secondary={entry.path}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "0.95rem",
                      }}
                      secondaryTypographyProps={{ fontSize: "0.75rem", sx: { opacity: 0.6 } }}
                    />
                    {isActive && (
                      <KeyboardReturnRoundedIcon
                        sx={{ fontSize: 16, color: "text.disabled", ml: 1 }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {/* ── Footer hints ── */}
      <Box
        sx={{
          px: 2,
          py: 0.75,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          display: "flex",
          gap: 2,
          alignItems: "center",
          justifyContent: "flex-end",
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
        }}
      >
        {isScoped ? (
          isStdScoped ? (
            stdStep === 0 ? (
              <>
                <KbdHint keys={["↑", "↓"]} label="naviger" />
                <KbdHint keys={["↵"]} label="velg mal" />
                <KbdHint keys={["Esc"]} label="tilbake" />
              </>
            ) : (
              <>
                <KbdHint keys={["Tab"]} label="neste felt" />
                <KbdHint keys={["↵"]} label="åpne" />
                <KbdHint keys={["Esc"]} label="velg annen mal" />
              </>
            )
          ) : isIntScoped ? (
            intFilteredOptions.length > 0 ? (
              <>
                <KbdHint keys={["↑", "↓"]} label="naviger" />
                <KbdHint keys={["↵"]} label="velg" />
                <KbdHint keys={["Esc"]} label="tilbake" />
              </>
            ) : (
              <>
                {intSelected.length > 0 && <KbdHint keys={["⌫"]} label="fjern siste" />}
                <KbdHint keys={["↵"]} label={intSelected.length > 0 ? "søk" : "åpne side"} />
                <KbdHint keys={["Esc"]} label="tilbake" />
              </>
            )
          ) : isFagligScoped ? (
            <>
              <KbdHint keys={["↑", "↓"]} label="naviger" />
              <KbdHint keys={["↵"]} label="åpne dokumentfane" />
              <KbdHint keys={["Esc"]} label="tilbake" />
            </>
          ) : (
            <>
              <KbdHint keys={["↵"]} label={`Gå til ${scopedPage!.label}`} />
              <KbdHint keys={["Esc"]} label="tilbake" />
            </>
          )
        ) : (
          <>
            <KbdHint keys={["↑", "↓"]} label="naviger" />
            <KbdHint keys={["↵"]} label="åpne" />
            <KbdHint keys={["klikk"]} label="kommando" />
            <KbdHint keys={["2×"]} label="navigér" />
            <KbdHint keys={["Esc"]} label="lukk" />
          </>
        )}
      </Box>
    </Dialog>
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {keys.map((k) => (
        <Box
          key={k}
          component="kbd"
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: 0.75,
            fontSize: "0.68rem",
            fontFamily: "monospace",
            lineHeight: 1.6,
            backgroundColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            border: (theme) =>
              `1px solid ${
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)"
              }`,
            color: "text.disabled",
          }}
        >
          {k}
        </Box>
      ))}
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
        {label}
      </Typography>
    </Box>
  );
}
