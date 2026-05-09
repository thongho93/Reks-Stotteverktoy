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
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CalculateIcon from "@mui/icons-material/Calculate";
import DescriptionIcon from "@mui/icons-material/Description";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ConstructionIcon from "@mui/icons-material/Construction";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
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
  label: string;
  path: string;
  Icon: React.ElementType;
  color: string;
  keywords?: string[];
  admin?: boolean;
  ownerOnly?: boolean;
};

const ALL_ENTRIES: SearchEntry[] = [
  {
    label: "Hjem",
    path: "/",
    Icon: HomeRoundedIcon,
    color: "#D293AC",
    keywords: ["home", "hjem", "start", "forside"],
  },
  {
    label: "OMEQ-beregning",
    path: "/omeq",
    Icon: CalculateIcon,
    color: "#29A1FF",
    keywords: ["omeq", "opioid", "beregning", "kalkulator", "dose"],
  },
  {
    label: "Standardtekster",
    path: "/standardtekster",
    Icon: DescriptionIcon,
    color: "#4BC76A",
    keywords: ["tekst", "standard", "preparat", "mal", "template"],
  },
  {
    label: "Interaksjonssøk",
    path: "/interaksjoner",
    Icon: CompareArrowsIcon,
    color: "#FF5E5B",
    keywords: ["interaksjon", "legemiddel", "søk", "kollisjoner"],
  },
  {
    label: "Produkt og råd",
    path: "/produkt-og-rad",
    Icon: TipsAndUpdatesRoundedIcon,
    color: "#C93586",
    keywords: ["produkt", "ernæring", "råd", "nutrition", "fresubin"],
  },
  {
    label: "Innspill og notater",
    path: "/tilbakemelding",
    Icon: FeedbackRoundedIcon,
    color: "#B648E8",
    keywords: ["notat", "feedback", "rutine", "innspill", "tilbakemelding"],
  },
  {
    label: "Innkjøp og anbrudd",
    path: "/anbrudd",
    Icon: ChecklistRoundedIcon,
    color: "#FFA726",
    keywords: ["innkjøp", "anbrudd", "skjema", "bestilling"],
  },
  {
    label: "Statistikk",
    path: "/statistikk",
    Icon: BarChartRoundedIcon,
    color: "#6B7280",
    keywords: ["statistikk", "data", "bruk", "analyse"],
    ownerOnly: true,
  },
  {
    label: "Profil",
    path: "/profil",
    Icon: PersonRoundedIcon,
    color: "#6B7280",
    keywords: ["profil", "bruker", "innstillinger", "konto"],
  },
  {
    label: "Rekspert",
    path: "/rekspert",
    Icon: ConstructionIcon,
    color: "#00A3D7",
    keywords: ["admin", "rekspert", "verktøy", "administrasjon"],
    admin: true,
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
  const [stdClockDay, setStdClockDay] = useState<"today" | "tomorrow">("today");
  const [stdDatoInput, setStdDatoInput] = useState("");

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

  const stdFilteredTemplates = useMemo(() => {
    if (!stdTemplates.length) return [];
    const q = normalize(commandQuery);
    if (!q) return stdTemplates.slice(0, 10);
    return stdTemplates
      .filter(
        (t) =>
          normalize(t.title).includes(q) ||
          normalize(t.category ?? "").includes(q)
      )
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

  const enterScopeMode = useCallback(
    (entry: SearchEntry) => {
      setScopedPage(entry);
      setCommandQuery("");
      if (entry.path === "/standardtekster") {
        resetStdState();
        void loadStdTemplates();
      }
      setTimeout(() => inputRef.current?.focus(), 60);
    },
    [loadStdTemplates, resetStdState]
  );

  const exitScopeMode = useCallback(() => {
    setScopedPage(null);
    setCommandQuery("");
    resetStdState();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [resetStdState]);

  const navigateTo = useCallback(
    (entry: SearchEntry, withCommand = false) => {
      if (withCommand && command && commandQuery.trim()) {
        navigate(entry.path, { state: command.buildState(commandQuery) });
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
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const navigateWithStdPrefill = useCallback(() => {
    if (!scopedPage || !stdSelectedTemplate) return;

    const palettePrefill: Record<string, unknown> = {
      templateId: stdSelectedTemplate.id,
    };

    const hasPreparat = /\{\{\s*PREPARAT\d*\s*\}\}|\bPREPARAT\d*\b/i.test(
      stdSelectedTemplate.content
    );
    if (hasPreparat && commandQuery.trim()) {
      if (stdVnrMatch) {
        // Resolved VNR → pass the drug name + VNR as key so the page shows the product name
        palettePrefill.preparatText = formatPreparatForTemplate(stdVnrMatch) || commandQuery.trim();
        palettePrefill.preparatKey = String(stdVnrMatch.farmaloggNumber ?? commandQuery.trim());
      } else {
        palettePrefill.preparatText = commandQuery.trim();
      }
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
    commandQuery,
    stdVnrMatch,
    stdTalls,
    stdFormulerings,
    stdClockTime,
    stdClockDay,
    stdDatoInput,
    navigate,
    onClose,
  ]);

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
              navigateWithStdPrefill();
            } else if (e.key === "Escape") {
              e.preventDefault();
              if (commandQuery) setCommandQuery("");
              else goBackToStdStep0();
            } else if (e.key === "Backspace" && commandQuery === "") {
              e.preventDefault();
              goBackToStdStep0();
            }
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
    open, isScoped, isStdScoped, entries, activeIndex, scopedPage, commandQuery,
    stdStep, stdFilteredTemplates, stdDropdownIndex,
    navigateTo, enterScopeMode, exitScopeMode, onClose,
    selectStdTemplate, goBackToStdStep0, navigateWithStdPrefill,
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
                          Skriv preparat / varenummer i søkefeltet over
                        </Typography>
                      </Box>
                      {/* VNR resolved preview */}
                      {stdVnrMatch && (
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
                            {formatPreparatForTemplate(stdVnrMatch) || stdVnrMatch.varenavn || commandQuery}
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
                    key={entry.path}
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
