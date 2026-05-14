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
import StarRoundedIcon from "@mui/icons-material/StarRounded";
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
import {
  matchInteractionsBySelectedTerms,
  type InteractionEntity,
  type InteractionIndex,
  type MatchResult,
} from "../fest/mappers/interactionsToIndex";
import { isAvoidRelevance, relevanceKind, RelevanceIcon } from "../interaksjoner/utils/relevance";
import { collection, getDocs, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { buildProductIndex, parseMedicationInput } from "../omeq/lib/parseMedicationInput";
import { ATC_PRODUCTS } from "../omeq/data/atcProducts";

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

type OmeqSelectedMedication = {
  label: string;
  medicationText: string;
  identity: string;
};

type OmeqSuggestion = {
  label: string;
  medicationText: string;
  identity: string;
  productNumber?: string;
};

type OmeqPreparedRow = {
  id: string;
  label: string;
  medicationText: string;
  identity: string;
  doseText: string;
};

const PREPARAT_SUFFIX_RE = /\s*\(preparatnavn\)\s*$/i;

function cleanMatchTerm(value: string): string {
  return String(value ?? "")
    .replace(PREPARAT_SUFFIX_RE, "")
    .trim();
}

function readStandardteksterFavorites(uid?: string | null): string[] {
  try {
    if (uid) {
      const perUserRaw = localStorage.getItem(`standardtekster:${uid}:favoritesBackup`);
      if (perUserRaw) {
        const parsed = JSON.parse(perUserRaw);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === "string");
        }
      }
    }

    const legacyRaw = localStorage.getItem("standardtekster:favorites");
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    }
  } catch {
    // ignore
  }

  return [];
}

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
  const { user, isOwner, isRekspert, role } = useAuthUser() as any;
  const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
  const hasOwnerAccess = Boolean(isOwner) || role === "owner";

  // ── Standardtekster multi-step state ────────────────────────────────────────
  const [stdTemplates, setStdTemplates] = useState<StandardTekst[]>([]);
  const [stdFavoriteTemplateIds, setStdFavoriteTemplateIds] = useState<string[]>([]);
  const [stdMedItems, setStdMedItems] = useState<Med[]>([]);
  const [stdLoading, setStdLoading] = useState(false);
  const [stdStep, setStdStep] = useState<0 | 1>(0); // 0 = search template, 1 = fill fields
  const [stdSelectedTemplate, setStdSelectedTemplate] = useState<StandardTekst | null>(null);
  const [stdDropdownIndex, setStdDropdownIndex] = useState(0);
  const [stdTalls, setStdTalls] = useState<Record<number, string>>({});
  const [stdFormulerings, setStdFormulerings] = useState<Record<number, string>>({});
  const [stdClockTime, setStdClockTime] = useState("11:00");
  const [stdClockDay, setStdClockDay] = useState<"today" | "tomorrow">("today");
  const [stdDatoInput, setStdDatoInput] = useState("");
  const [stdSelectedPreparats, setStdSelectedPreparats] = useState<Array<{ text: string; key: string }>>([]);

  // ── Interaksjonssøk scoped state ─────────────────────────────────────────────
  const [intIndex, setIntIndex] = useState<InteractionIndex | null>(null);
  const [intLoading, setIntLoading] = useState(false);
  const [intSelected, setIntSelected] = useState<InteractionEntity[]>([]);
  const [intDropdownIndex, setIntDropdownIndex] = useState(0);
  const [intActiveResult, setIntActiveResult] = useState(0);
  const [omeqSelectedMedication, setOmeqSelectedMedication] = useState<OmeqSelectedMedication | null>(null);
  const [omeqDropdownIndex, setOmeqDropdownIndex] = useState(0);
  const [omeqDoseText, setOmeqDoseText] = useState("");
  const [omeqPreparedRows, setOmeqPreparedRows] = useState<OmeqPreparedRow[]>([]);
  const [fagligTabs, setFagligTabs] = useState<FagligTabOption[]>(BUILTIN_FAGLIG_TABS);
  const [fagligLoading, setFagligLoading] = useState(false);
  const [fagligDropdownIndex, setFagligDropdownIndex] = useState(0);
  const omeqProductIndex = useMemo(() => buildProductIndex(), []);

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
  const isOmeqScoped = isScoped && scopedPage?.path === "/omeq";
  const isFagligScoped = isScoped && scopedPage?.scopeMode === "fagligTabs";
  const omeqSelectedParsed = useMemo(() => {
    if (!omeqSelectedMedication) return null;
    return parseMedicationInput(
      omeqSelectedMedication.medicationText || omeqSelectedMedication.label,
      omeqProductIndex
    );
  }, [omeqSelectedMedication, omeqProductIndex]);
  const omeqSelectedIsDepotPatch =
    String(omeqSelectedParsed?.product?.form ?? "").toLowerCase() === "depotplaster";
  const omeqDoseIsValid = /^\d+([.,]\d+)?$/.test(omeqDoseText.trim());
  const omeqDraftReady = Boolean(
    omeqSelectedMedication && (omeqSelectedIsDepotPatch || omeqDoseIsValid)
  );
  const omeqDraftIsDuplicate = Boolean(
    omeqSelectedMedication && omeqPreparedRows.some((row) => row.identity === omeqSelectedMedication.identity)
  );

  const omeqCatalogOptions = useMemo<OmeqSuggestion[]>(() => {
    const out: OmeqSuggestion[] = [];
    const seen = new Set<string>();

    Object.values(ATC_PRODUCTS)
      .flatMap((arr) => arr ?? [])
      .forEach((product) => {
        const base = `${product.name ?? ""}${product.form ? ` ${product.form}` : ""}`.trim();
        const variants = Array.isArray(product.variants) ? product.variants : [];

        if (variants.length > 0) {
          variants.forEach((variant) => {
            const strength = String(variant?.strength ?? "").trim();
            const prefix = `${base}${strength ? ` ${strength}` : ""}`.trim();
            const nums = Array.isArray(variant?.productNumbers)
              ? variant.productNumbers.map((n) => String(Number(n))).filter(Boolean)
              : [];
            if (nums.length > 0) {
              nums.forEach((num) => {
                const label = `${prefix} (${num})`.trim();
                if (!label || seen.has(label)) return;
                seen.add(label);
                out.push({
                  label,
                  medicationText: label,
                  identity: num,
                  productNumber: num,
                });
              });
            } else {
              if (!prefix || seen.has(prefix)) return;
              seen.add(prefix);
              out.push({
                label: prefix,
                medicationText: prefix,
                identity: normalize(prefix),
              });
            }
          });
          return;
        }

        const strengths = Array.isArray(product.strengths) ? product.strengths : [];
        if (strengths.length > 0) {
          strengths.forEach((strength) => {
            const label = `${base} ${String(strength ?? "").trim()}`.replace(/\s+/g, " ").trim();
            if (!label || seen.has(label)) return;
            seen.add(label);
            out.push({
              label,
              medicationText: label,
              identity: normalize(label),
            });
          });
          return;
        }

        if (!base || seen.has(base)) return;
        seen.add(base);
        out.push({
          label: base,
          medicationText: base,
          identity: normalize(base),
        });
      });

    return out.sort((a, b) => a.label.localeCompare(b.label, "nb"));
  }, []);

  const omeqExactSuggestion = useMemo<OmeqSuggestion | null>(() => {
    if (omeqSelectedMedication) return null;
    if (!isOmeqScoped || !commandQuery.trim() || omeqCatalogOptions.length === 0) return null;
    const raw = commandQuery.trim();
    const numeric = raw.match(/^0*(\d{4,7})$/)?.[1] ?? null;
    if (numeric) {
      const exact = omeqCatalogOptions.filter((o) => o.productNumber === numeric);
      return exact.length === 1 ? exact[0] : null;
    }

    const q = normalize(raw);
    const exactByLabel = omeqCatalogOptions.filter((o) => normalize(o.label) === q);
    return exactByLabel.length === 1 ? exactByLabel[0] : null;
  }, [isOmeqScoped, commandQuery, omeqCatalogOptions, omeqSelectedMedication]);

  const omeqSuggestions = useMemo<OmeqSuggestion[]>(() => {
    if (!isOmeqScoped || omeqSelectedMedication || !omeqCatalogOptions.length) return [];
    const raw = commandQuery.trim();
    if (!raw) return [];

    const numeric = raw.match(/^0*(\d+)$/)?.[1] ?? null;
    if (numeric) {
      const startsWith = omeqCatalogOptions
        .filter((o) => (o.productNumber ?? "").startsWith(numeric))
        .sort((a, b) => {
          const aNum = a.productNumber ?? "";
          const bNum = b.productNumber ?? "";
          const aExact = aNum === numeric ? 0 : 1;
          const bExact = bNum === numeric ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          if (aNum.length !== bNum.length) return aNum.length - bNum.length;
          return a.label.localeCompare(b.label, "nb");
        });
      return startsWith.slice(0, 25);
    }

    const q = normalize(raw);
    const starts = omeqCatalogOptions.filter((o) => normalize(o.label).startsWith(q));
    const contains = omeqCatalogOptions.filter(
      (o) => !normalize(o.label).startsWith(q) && normalize(o.label).includes(q)
    );
    return [...starts, ...contains].slice(0, 25);
  }, [isOmeqScoped, omeqSelectedMedication, omeqCatalogOptions, commandQuery]);

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

  const intLabelByTerm = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of intSelected) {
      const cleanedLabel = cleanMatchTerm(s.label);
      map.set(s.key, cleanedLabel);
      if (s.atc) map.set(s.atc, cleanedLabel);
    }
    return map;
  }, [intSelected]);

  const intResults = useMemo<MatchResult[]>(() => {
    if (!intIndex || intSelected.length < 2) return [];
    const terms = intSelected.flatMap((s) => (s.atc ? [s.key, s.atc] : [s.key]));
    const allMatches = matchInteractionsBySelectedTerms(intIndex, terms);
    return allMatches.filter((m) => {
      const interaction = intIndex.interactions[m.interactionIndex];
      if (!interaction) return false;
      return isAvoidRelevance(interaction.relevansV, interaction.relevansDn);
    });
  }, [intIndex, intSelected]);

  const stdFilteredTemplates = useMemo(() => {
    if (!stdTemplates.length) return [];
    const favoritesIndex = new Map<string, number>();
    stdFavoriteTemplateIds.forEach((id, i) => favoritesIndex.set(id, i));

    const favoriteOnly = stdTemplates
      .filter((t) => stdFavoriteTemplateIds.includes(t.id))
      .sort((a, b) => {
        const aPos = favoritesIndex.get(a.id);
        const bPos = favoritesIndex.get(b.id);
        if (typeof aPos === "number" && typeof bPos === "number" && aPos !== bPos) {
          return aPos - bPos;
        }
        return a.title.localeCompare(b.title, "nb");
      });
    const q = normalize(commandQuery);
    const favoritesOnlyMode = !q;
    if (favoritesOnlyMode) {
      if (!favoriteOnly.length) return [];
      return favoriteOnly.slice(0, 10);
    }
    const words = q.split(/\s+/).filter(Boolean);
    const searchPool = stdTemplates;
    const scored = searchPool.flatMap((t) => {
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
  }, [stdTemplates, stdFavoriteTemplateIds, commandQuery]);

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
    setStdFavoriteTemplateIds([]);
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
    setIntActiveResult(0);
  }, []);

  const resetOmeqState = useCallback(() => {
    setOmeqSelectedMedication(null);
    setOmeqDropdownIndex(0);
    setOmeqDoseText("");
    setOmeqPreparedRows([]);
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
      const favoriteIds = readStandardteksterFavorites(user?.uid ?? null);
      setStdTemplates(all.filter((t) => t.isActive !== false));
      setStdFavoriteTemplateIds(favoriteIds);
      setStdMedItems(meds);
    } catch {
      setStdTemplates([]);
      setStdFavoriteTemplateIds([]);
    } finally {
      setStdLoading(false);
    }
  }, [user?.uid]);

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
      } else if (entry.path === "/omeq") {
        resetOmeqState();
      } else if (entry.path === "/interaksjoner") {
        resetIntState();
        void loadIntIndex();
      } else if (entry.scopeMode === "fagligTabs") {
        resetFagligState();
        void loadFagligTabs();
      }
      setTimeout(() => inputRef.current?.focus(), 60);
    },
    [
      loadStdTemplates,
      resetStdState,
      resetOmeqState,
      resetIntState,
      loadIntIndex,
      resetFagligState,
      loadFagligTabs,
    ]
  );

  const exitScopeMode = useCallback(() => {
    setScopedPage(null);
    setCommandQuery("");
    resetStdState();
    resetOmeqState();
    resetIntState();
    resetFagligState();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [resetStdState, resetOmeqState, resetIntState, resetFagligState]);

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

  useEffect(() => {
    if (!isIntScoped) return;
    if (intSelected.length < 2 || intResults.length === 0) {
      setIntActiveResult(0);
      return;
    }
    setIntActiveResult((prev) => Math.min(prev, intResults.length - 1));
  }, [isIntScoped, intSelected.length, intResults.length]);

  const navigateWithIntSelected = useCallback(() => {
    if (!scopedPage) return;
    navigate(scopedPage.path, { state: { selectedEntities: intSelected } });
    onClose();
  }, [scopedPage, intSelected, navigate, onClose]);

  const navigateWithIntResult = useCallback(
    (interactionIndex: number) => {
      if (!scopedPage) return;
      navigate(scopedPage.path, {
        state: {
          selectedEntities: intSelected,
          activeInteractionIndex: interactionIndex,
        },
      });
      onClose();
    },
    [scopedPage, intSelected, navigate, onClose]
  );

  const navigateWithOmeqSelection = useCallback(() => {
    if (!scopedPage) return;

    const rowsFromPrepared = omeqPreparedRows.map((row) => ({
      medicationText: row.medicationText,
      doseText: row.doseText,
    }));
    const hasCurrent = Boolean(omeqSelectedMedication?.medicationText.trim());
    const currentIsReady = omeqDraftReady;
    const currentIsDuplicate = Boolean(
      omeqSelectedMedication &&
      omeqPreparedRows.some((row) => row.identity === omeqSelectedMedication.identity)
    );
    const rows = hasCurrent && currentIsReady && !currentIsDuplicate
      ? [
          ...rowsFromPrepared,
          {
            medicationText: omeqSelectedMedication!.medicationText.trim(),
            doseText: omeqSelectedIsDepotPatch ? "" : omeqDoseText.trim(),
          },
        ]
      : rowsFromPrepared;

    if (rows.length === 0) {
      navigate(scopedPage.path);
      onClose();
      return;
    }

    navigate(scopedPage.path, {
      state: {
        prefillRows: rows,
        prefill: rows[0],
      },
    });
    onClose();
  }, [scopedPage, omeqPreparedRows, omeqSelectedMedication, omeqSelectedIsDepotPatch, omeqDoseText, omeqDraftReady, navigate, onClose]);

  const selectOmeqSuggestion = useCallback((suggestion: OmeqSuggestion) => {
    setOmeqSelectedMedication({
      label: suggestion.label,
      medicationText: suggestion.medicationText,
      identity: suggestion.identity,
    });
    setOmeqDoseText("");
    setCommandQuery("");
    setOmeqDropdownIndex(0);
  }, []);

  const commitOmeqRow = useCallback(() => {
    if (!omeqSelectedMedication) return false;
    const dose = omeqDoseText.trim();
    if (!omeqSelectedIsDepotPatch && !omeqDoseIsValid) return false;
    const identity = omeqSelectedMedication.identity;
    if (omeqPreparedRows.some((row) => row.identity === identity)) return false;

    setOmeqPreparedRows((prev) => {
      return [
        ...prev,
        {
          id: `${identity}-${Date.now()}`,
          label: omeqSelectedMedication.label,
          medicationText: omeqSelectedMedication.medicationText.trim(),
          identity,
          doseText: omeqSelectedIsDepotPatch ? "" : dose,
        },
      ];
    });
    setOmeqSelectedMedication(null);
    setOmeqDoseText("");
    setCommandQuery("");
    setOmeqDropdownIndex(0);
    return true;
  }, [omeqSelectedMedication, omeqSelectedIsDepotPatch, omeqDoseIsValid, omeqDoseText, omeqPreparedRows]);

  useEffect(() => {
    if (!isOmeqScoped || !omeqExactSuggestion) return;
    if (omeqSelectedMedication?.identity === omeqExactSuggestion.identity) return;
    setOmeqSelectedMedication({
      label: omeqExactSuggestion.label,
      medicationText: omeqExactSuggestion.medicationText,
      identity: omeqExactSuggestion.identity,
    });
    setOmeqDoseText("");
    setCommandQuery("");
  }, [isOmeqScoped, omeqExactSuggestion, omeqSelectedMedication]);

  useEffect(() => {
    if (!isOmeqScoped || !omeqSelectedMedication || omeqSelectedIsDepotPatch) return;
    const raw = commandQuery.trim();
    if (!raw) return;
    if (!/^\d+([.,]\d+)?$/.test(raw)) return;
    setOmeqDoseText(raw);
    setCommandQuery("");
  }, [isOmeqScoped, omeqSelectedMedication, omeqSelectedIsDepotPatch, commandQuery]);

  useEffect(() => {
    if (!isOmeqScoped) return;
    setOmeqDropdownIndex(0);
  }, [isOmeqScoped, commandQuery]);

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
            } else if (intSelected.length >= 2 && intResults.length > 0) {
              const selectedResult = intResults[Math.min(intActiveResult, intResults.length - 1)];
              if (selectedResult) navigateWithIntResult(selectedResult.interactionIndex);
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

        // ── OMEQ scoped keyboard handling ──
        if (isOmeqScoped) {
          if (e.key === "ArrowDown") {
            if (omeqSuggestions.length > 0) {
              e.preventDefault();
              setOmeqDropdownIndex((i) => Math.min(i + 1, omeqSuggestions.length - 1));
            }
          } else if (e.key === "ArrowUp") {
            if (omeqSuggestions.length > 0) {
              e.preventDefault();
              setOmeqDropdownIndex((i) => Math.max(i - 1, 0));
            }
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (!omeqSelectedMedication && omeqSuggestions.length > 0 && commandQuery.trim()) {
              const option = omeqSuggestions[omeqDropdownIndex] ?? omeqSuggestions[0];
              if (option) selectOmeqSuggestion(option);
            } else if (omeqSelectedMedication) {
              if (omeqDraftReady && !omeqDraftIsDuplicate) {
                commitOmeqRow();
              } else {
                navigateWithOmeqSelection();
              }
            } else {
              navigateWithOmeqSelection();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (commandQuery) setCommandQuery("");
            else if (omeqDoseText) setOmeqDoseText("");
            else if (omeqSelectedMedication) setOmeqSelectedMedication(null);
            else if (omeqPreparedRows.length > 0) setOmeqPreparedRows((prev) => prev.slice(0, -1));
            else exitScopeMode();
          } else if (e.key === "Backspace" && commandQuery === "") {
            e.preventDefault();
            if (omeqDoseText) setOmeqDoseText("");
            else if (omeqSelectedMedication) setOmeqSelectedMedication(null);
            else if (omeqPreparedRows.length > 0) setOmeqPreparedRows((prev) => prev.slice(0, -1));
            else exitScopeMode();
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
    open, isScoped, isStdScoped, isIntScoped, isOmeqScoped, isFagligScoped, entries, activeIndex, scopedPage, commandQuery,
    stdStep, stdFilteredTemplates, stdDropdownIndex, stdHasPreparat, stdSelectedPreparats,
    intFilteredOptions, intDropdownIndex, intSelected, intResults, intActiveResult, omeqSelectedMedication, omeqSelectedIsDepotPatch, omeqSuggestions, omeqDropdownIndex, omeqDoseText, omeqPreparedRows, omeqDraftReady, omeqDraftIsDuplicate, fagligFilteredOptions, fagligDropdownIndex,
    navigateTo, enterScopeMode, exitScopeMode, onClose,
    selectStdTemplate, goBackToStdStep0, navigateWithStdPrefill, commitPreparatChip,
    selectIntEntity, navigateWithIntSelected, navigateWithIntResult, selectOmeqSuggestion, commitOmeqRow, navigateWithOmeqSelection, navigateWithFagligSelection,
  ]);

  const shortcutLabel = "Space";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: { xs: "calc(100vw - 24px)", sm: "min(784px, calc(100vw - 120px))" },
          maxWidth: 784,
          borderRadius: { xs: 3.2, sm: 4.2 },
          overflow: "hidden",
          border: (theme) =>
            `1px solid ${
              theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.88)"
            }`,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(27,31,39,0.96) 0%, rgba(18,21,28,0.97) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(249,251,252,0.98) 100%)",
          position: "relative",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 38px 120px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 34px 90px rgba(9,16,28,0.26), 0 10px 35px rgba(9,16,28,0.12)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 22%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 26%)",
          },
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(14px) saturate(1.08)",
          backgroundColor: "rgba(15,23,42,0.34)",
        },
      }}
    >
      {/* ── Search / command input ── */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.6 },
          py: { xs: 1.35, sm: 1.55 },
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.64) 100%)",
        }}
      >
        <SearchIcon sx={{ color: "text.secondary", fontSize: 24, flexShrink: 0 }} />

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
              : isOmeqScoped
              ? omeqSelectedMedication && !omeqSelectedIsDepotPatch
                ? "Skriv antall stk per døgn..."
                : "Søk etter preparatnavn eller varenummer..."
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
            sx: { fontSize: "1.24rem", fontWeight: 500, letterSpacing: "-0.01em" },
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
                  {!commandQuery.trim() && (
                    <Box
                      sx={{
                        mx: "auto",
                        mb: 1.25,
                        px: 1.2,
                        py: 0.45,
                        width: "fit-content",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        backgroundColor: (theme) =>
                          alpha("#F9A825", theme.palette.mode === "dark" ? 0.2 : 0.12),
                        border: `1px solid ${alpha("#F9A825", 0.34)}`,
                      }}
                    >
                      <StarRoundedIcon sx={{ fontSize: 14, color: "#F9A825" }} />
                      <Typography variant="caption" sx={{ color: "#B7791F", fontWeight: 700 }}>
                        Favoritter
                      </Typography>
                    </Box>
                  )}
                  <Typography color="text.secondary" variant="body2">
                    {commandQuery.trim()
                      ? `Ingen standardtekster for «${commandQuery}»`
                      : "Ingen favoritter funnet"}
                  </Typography>
                </Box>
              ) : (
                <>
                  {!commandQuery.trim() && (
                    <Box
                      sx={{
                        mx: 1,
                        mt: 0.75,
                        mb: 0.5,
                        px: 1.1,
                        py: 0.45,
                        width: "fit-content",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        backgroundColor: (theme) =>
                          alpha("#F9A825", theme.palette.mode === "dark" ? 0.2 : 0.12),
                        border: `1px solid ${alpha("#F9A825", 0.34)}`,
                      }}
                    >
                      <StarRoundedIcon sx={{ fontSize: 14, color: "#F9A825" }} />
                      <Typography variant="caption" sx={{ color: "#B7791F", fontWeight: 700 }}>
                        Favoritter
                      </Typography>
                    </Box>
                  )}

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
                            "&:hover": {
                              backgroundColor: (theme) =>
                                alpha("#4BC76A", theme.palette.mode === "dark" ? 0.14 : 0.07),
                            },
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
                </>
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
                        {(["today", "tomorrow"] as const).map((day) => (
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
                            {day === "today" ? "I dag" : "I morgen"}
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

                {/* Auto-result when >= 2 selected */}
                {intSelected.length >= 2 && (
                  <Box
                    sx={{
                      px: 2,
                      pb: 1.75,
                      pt: intSelected.length > 0 ? 0.5 : 1.25,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.1 }}>
                      <Typography sx={{ fontWeight: 800, color: "#B04442" }}>
                        Treff
                      </Typography>
                      <Chip
                        size="small"
                        label={`${intResults.length} treff`}
                        sx={{
                          fontWeight: 700,
                          color: "#B04442",
                          backgroundColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(200,70,70,0.2)" : "rgba(255,94,91,0.1)",
                          border: (theme) =>
                            `1px solid ${theme.palette.mode === "dark" ? "rgba(220,90,90,0.32)" : "rgba(176,68,66,0.22)"}`,
                        }}
                      />
                    </Box>

                    {intResults.length > 0 && intIndex ? (
                      <Box
                        sx={{
                          border: (theme) =>
                            `1px solid ${theme.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.14)"}`,
                          borderRadius: 2,
                          overflow: "hidden",
                          backgroundColor: (theme) =>
                            theme.palette.mode === "dark" ? "#0F1213" : "#FFF8F8",
                        }}
                      >
                        <List disablePadding>
                          {intResults.map((r, i) => {
                            const it = intIndex.interactions[r.interactionIndex];
                            if (!it) return null;
                            const isActive = i === intActiveResult;
                            const kind = relevanceKind(it.relevansV, it.relevansDn);

                            const groupLines = r.matchedGroups.slice(0, 2).map((gi) => {
                              const group = it.substansgrupper?.[gi];
                              const name = group?.navn || group?.substanser?.[0]?.substans || "(Ukjent)";
                              const atc = group?.substanser?.[0]?.atc;
                              const terms = (r.groupToSelectedTerms[gi] ?? [])
                                .map((t) => intLabelByTerm.get(t) ?? t)
                                .filter(Boolean);
                              const suffix = terms.length > 0 ? ` (søkeinput ${Array.from(new Set(terms)).join(", ")})` : "";
                              return `${name}${atc ? ` ${atc}` : ""}${suffix}`;
                            });

                            return (
                              <ListItemButton
                                key={`int-result-${r.interactionIndex}-${i}`}
                                selected={isActive}
                                onMouseMove={() => setIntActiveResult(i)}
                                onClick={() => navigateWithIntResult(r.interactionIndex)}
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: kind ? "1fr auto" : "1fr",
                                  alignItems: "flex-start",
                                  gap: 1,
                                  px: 1.5,
                                  py: 1.25,
                                  borderLeft: `3px solid ${isActive ? "#FF5E5B" : "transparent"}`,
                                  borderBottom:
                                    i !== intResults.length - 1
                                      ? (theme) => `1px solid ${theme.palette.divider}`
                                      : "none",
                                  "&:hover": {
                                    backgroundColor: (theme) =>
                                      theme.palette.mode === "dark" ? "rgba(200,70,70,0.1)" : "rgba(255,94,91,0.05)",
                                  },
                                  "&.Mui-selected": {
                                    backgroundColor: (theme) =>
                                      theme.palette.mode === "dark" ? "rgba(200,70,70,0.2)" : "rgba(255,94,91,0.08)",
                                  },
                                  "&.Mui-selected:hover": {
                                    backgroundColor: (theme) =>
                                      theme.palette.mode === "dark" ? "rgba(200,70,70,0.28)" : "rgba(255,94,91,0.14)",
                                  },
                                }}
                              >
                                <Box sx={{ gridColumn: "1 / 2", minWidth: 0 }}>
                                  {groupLines.map((line, idx) => (
                                    <Typography
                                      key={`${r.interactionIndex}-${idx}`}
                                      sx={{
                                        fontWeight: 800,
                                        lineHeight: 1.2,
                                        mb: idx === groupLines.length - 1 ? 0 : 0.35,
                                      }}
                                    >
                                      {line}
                                    </Typography>
                                  ))}
                                  {it.kliniskKonsekvens ? (
                                    <Typography
                                      color="text.secondary"
                                      sx={{
                                        mt: 0.8,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {it.kliniskKonsekvens}
                                    </Typography>
                                  ) : null}
                                </Box>

                                {kind ? (
                                  <Chip
                                    size="small"
                                    icon={<RelevanceIcon kind={kind} />}
                                    label={it.relevansDn ?? ""}
                                    variant="outlined"
                                    sx={{
                                      mt: 0.15,
                                      fontWeight: 700,
                                      maxWidth: 190,
                                      gridColumn: "2 / 3",
                                      justifySelf: "end",
                                      "& .MuiChip-label": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      },
                                    }}
                                  />
                                ) : null}
                              </ListItemButton>
                            );
                          })}
                        </List>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Ingen treff.
                      </Typography>
                    )}
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
        ) : isOmeqScoped ? (
          <Box sx={{ px: 2.5, py: 2, maxHeight: 400, overflowY: "auto" }}>
            {!omeqSelectedMedication && commandQuery.trim() && omeqSuggestions.length > 0 && (
              <List disablePadding sx={{ mb: 1.2 }}>
                {omeqSuggestions.map((option, i) => {
                  const isActive = i === omeqDropdownIndex;
                  return (
                    <ListItemButton
                      key={option.identity}
                      selected={isActive}
                      onClick={() => selectOmeqSuggestion(option)}
                      onMouseMove={() => setOmeqDropdownIndex(i)}
                      sx={{
                        mb: 0.35,
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.85,
                        borderLeft: `3px solid ${isActive ? scopedPage!.color : "transparent"}`,
                        transition: "background-color 80ms, border-color 80ms",
                        "&:hover": {
                          backgroundColor: (theme) =>
                            alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.12 : 0.06),
                        },
                        "&.Mui-selected": {
                          backgroundColor: (theme) =>
                            alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.17 : 0.1),
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: (theme) =>
                            alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.21 : 0.13),
                        },
                      }}
                    >
                      <ListItemText
                        primary={option.label}
                        primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: "0.92rem" }}
                      />
                      {isActive && (
                        <KeyboardReturnRoundedIcon sx={{ fontSize: 16, color: "text.disabled", ml: 1 }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            )}

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
                  Skriv varenummer eller preparatnavn. Ved eksakt treff velges preparat automatisk.
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                  f.eks. 112664 eller morfin
                </Typography>
              </Box>
            </Box>

            {omeqPreparedRows.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Linjer til OMEQ
                  </Typography>
                  <Chip
                    size="small"
                    label={`${omeqPreparedRows.length} valgt`}
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: scopedPage!.color,
                      backgroundColor: (theme) =>
                        alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.24 : 0.1),
                      border: `1px solid ${alpha(scopedPage!.color, 0.28)}`,
                    }}
                  />
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7 }}>
                  {omeqPreparedRows.map((row) => (
                    <Chip
                      key={row.id}
                      size="small"
                      label={row.doseText ? `${row.label} • ${row.doseText}/døgn` : row.label}
                      onDelete={() =>
                        setOmeqPreparedRows((prev) => prev.filter((prepared) => prepared.id !== row.id))
                      }
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.74rem",
                        color: scopedPage!.color,
                        backgroundColor: (theme) =>
                          alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.2 : 0.09),
                        border: (theme) =>
                          `1px solid ${alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.42 : 0.26)}`,
                        "& .MuiChip-deleteIcon": { color: alpha(scopedPage!.color, 0.72) },
                        "& .MuiChip-deleteIcon:hover": { color: scopedPage!.color },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {omeqSelectedMedication && (
              <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: 1.2,
                    py: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: (theme) =>
                      alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.18 : 0.1),
                    border: (theme) =>
                      `1px solid ${alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.35 : 0.24)}`,
                  }}
                >
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14, color: scopedPage!.color }} />
                  <Typography variant="caption" sx={{ color: scopedPage!.color, fontWeight: 600 }}>
                    {omeqSelectedMedication.label}
                  </Typography>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => {
                      setOmeqSelectedMedication(null);
                      setOmeqDoseText("");
                    }}
                    sx={{
                      ml: 0.2,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: scopedPage!.color,
                      fontSize: "0.8rem",
                      lineHeight: 1,
                      p: 0,
                      opacity: 0.75,
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    ✕
                  </Box>
                </Box>

                {!omeqSelectedIsDepotPatch && omeqDoseText && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.55,
                      px: 1,
                      py: 0.42,
                      borderRadius: 1.35,
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      Antall/døgn:
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 700 }}>
                      {omeqDoseText}
                    </Typography>
                  </Box>
                )}

                {omeqDraftReady && (
                  <Chip
                    size="small"
                    label={omeqDraftIsDuplicate ? "Allerede lagt til" : "Legg til linje"}
                    clickable={!omeqDraftIsDuplicate}
                    onClick={() => {
                      if (!omeqDraftIsDuplicate && commitOmeqRow()) {
                        setTimeout(() => inputRef.current?.focus(), 30);
                      }
                    }}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: omeqDraftIsDuplicate ? "text.secondary" : scopedPage!.color,
                      backgroundColor: (theme) =>
                        omeqDraftIsDuplicate
                          ? theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)"
                          : alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.24 : 0.12),
                      border: (theme) =>
                        `1px solid ${
                          omeqDraftIsDuplicate
                            ? theme.palette.divider
                            : alpha(scopedPage!.color, theme.palette.mode === "dark" ? 0.42 : 0.3)
                        }`,
                    }}
                  />
                )}
              </Box>
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
        <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
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
          px: { xs: 2, sm: 2.2 },
          py: 0.86,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          display: "flex",
          gap: 2,
          alignItems: "center",
          justifyContent: "flex-end",
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(246,250,249,0.86)",
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
          ) : isOmeqScoped ? (
            <>
              {omeqSelectedMedication && (
                <KbdHint
                  keys={["⌫"]}
                  label={!omeqSelectedIsDepotPatch && omeqDoseText ? "fjern antall" : "fjern preparat"}
                />
              )}
              {!omeqSelectedMedication && omeqPreparedRows.length > 0 && (
                <KbdHint keys={["⌫"]} label="fjern siste linje" />
              )}
              <KbdHint keys={["↵"]} label={omeqDraftReady && !omeqDraftIsDuplicate ? "legg til linje" : "gå til OMEQ"} />
              <KbdHint keys={["Esc"]} label="tilbake" />
            </>
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
