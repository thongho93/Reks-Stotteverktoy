import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import StandardTekstSidebar from "../components/StandardTekstSidebar";
import StandardTekstContent from "../components/StandardTekstContent";
import { standardTeksterApi } from "../services/standardTeksterApi";
import { useAuthUser } from "../../../app/auth/Auth";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  formatPreparatRowText,
  getTallTokenIndices,
  migrateLegacyClockTallTokens,
  replaceNextPreparatToken,
  replaceKlokkeslettDagTokens,
  replaceTallTokenByIndex,
  templateHasDatoMndToken,
  templateHasDatoToken,
  templateHasKlokkeslettDagToken,
  templateHasTallToken,
  usePreparatRows,
} from "../utils/preparat";
import { buildPreviewContent, templateUsesPreparat1 } from "../utils/content";
import { renderContentWithPreparatHighlight } from "../utils/render";
import styles from "../../../styles/standardTekstPage.module.css";
import { useStandardTekster } from "../hooks/useStandardTekster";
import { useStandardTekstHotkeys } from "../hooks/useStandardTekstHotkeys";
import PreparatPanel from "../components/PreparatPanel";
import { deleteStandardTekst } from "../utils/deleteStandardTekst";
import type { StandardTekstFollowUp } from "../types";
import { logUsage } from "../../../shared/services/usage";

type OMEQStandardtekstPrefill = {
  requestId: number;
  templateTitle: string;
  preparats: string[];
  totalOmeq: string;
};
const OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY = "standardtekster:omeqPrefill";

type ClockTallDay = "today" | "tomorrow";
const CLOCK_TALL_OPTIONS = ["11:00", "14:00", "15:00"] as const;
const DEFAULT_CLOCK_TALL_TIME = "11:00";
const CUSTOM_CLOCK_VALUE = "__custom__";

function sanitizeFarmasoytSignature(text: string): string {
  if (!text) return text;

  // Normalize pharmacist signature line so no personal name leaks into shared texts.
  return text.replace(
    /(^|\n)\s*[^\n]{0,80}?\s*,?\s*farmas[øo]yt\s*(?=\n|$)/gi,
    (_m, prefix: string) => `${prefix}XX, farmasøyt`,
  );
}

function normalizeTemplateContent(text: string): string {
  return migrateLegacyClockTallTokens(sanitizeFarmasoytSignature(text));
}

function formatClockTallValue(time: string, day: ClockTallDay): string {
  const trimmedTime = (time ?? "").trim();
  if (!trimmedTime) return "";

  const match = trimmedTime.match(/^(\d{1,2}):(\d{2})$/);
  const displayTime =
    match && match[2] === "00" ? String(Number(match[1])) : trimmedTime;

  return `${displayTime} ${day === "tomorrow" ? "i morgen" : "i dag"}`;
}

function getAutomaticClockTallDay(time: string, now = new Date()): ClockTallDay {
  const trimmedTime = (time ?? "").trim();
  const match = trimmedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "today";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "today";

  const selectedMinutes = hours * 60 + minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return selectedMinutes > currentMinutes ? "today" : "tomorrow";
}

function buildInitialTallValues(template: string): Record<number, string> {
  const indices = getTallTokenIndices(template);
  if (!indices.length) return { 0: "" };

  const next: Record<number, string> = {};
  for (const index of indices) {
    next[index] = "";
  }

  return next;
}

const SINGULAR_TO_PLURAL_FORMULERING: Record<string, string> = {
  tablett: "tabletter",
  tyggetablett: "tyggetabletter",
  kapsel: "kapsler",
  depottablett: "depottabletter",
  smeltetablett: "smeltetabletter",
  enterotablett: "enterotabletter",
  sublingvaltablett: "sublingvaltabletter",
  brusetablett: "brusetabletter",
  depotkapsel: "depotkapsler",
  nesespray: "nesesprayer",
  oyedrape: "oyedraper",
  oredrape: "oredraper",
  drape: "draper",
  stikkpille: "stikkpiller",
  injeksjon: "injeksjoner",
  infusjon: "infusjoner",
  inhalasjonspulver: "inhalasjonspulvere",
  inhalasjonsvaeske: "inhalasjonsvaesker",
  mikstur: "miksturer",
  granulat: "granulater",
  plaster: "plastre",
  depotplaster: "depotplastre",
  salve: "salver",
  krem: "kremer",
  gel: "geler",
  spray: "sprayer",
  sirup: "siruper",
  sproyte: "sproyter",
  sugetablett: "sugetabletter",
  vaginaltablett: "vaginaltabletter",
  vaginalkrem: "vaginalkremer",
  vaginalring: "vaginalringer",
  munnspray: "munnsprayer",
  munnskyllevaeske: "munnskyllevaesker",
};

const normalizeFormKey = (value: string) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae");

const PLURAL_TO_SINGULAR_FORMULERING = Object.entries(SINGULAR_TO_PLURAL_FORMULERING).reduce(
  (acc, [singular, plural]) => {
    acc[plural] = singular;
    return acc;
  },
  {} as Record<string, string>,
);

function toPluralFormulering(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const key = normalizeFormKey(trimmed);
  const mapped = SINGULAR_TO_PLURAL_FORMULERING[key];
  if (mapped) return mapped;
  if (trimmed.endsWith("er")) return trimmed;
  return `${trimmed}er`;
}

function toSingularFormulering(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const key = normalizeFormKey(trimmed);
  const mapped = PLURAL_TO_SINGULAR_FORMULERING[key];
  if (mapped) return mapped;
  if (trimmed.endsWith("er") && trimmed.length > 2) return trimmed.slice(0, -2);
  return trimmed;
}

function parseOmeqStandardtekstPrefill(value: unknown): OMEQStandardtekstPrefill | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<OMEQStandardtekstPrefill>;
  const preparats = Array.isArray(candidate.preparats)
    ? candidate.preparats.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
      )
    : [];

  if (
    typeof candidate.requestId !== "number" ||
    typeof candidate.templateTitle !== "string" ||
    typeof candidate.totalOmeq !== "string" ||
    !candidate.templateTitle.trim() ||
    preparats.length === 0
  ) {
    return null;
  }

  return {
    requestId: candidate.requestId,
    templateTitle: candidate.templateTitle.trim(),
    preparats,
    totalOmeq: candidate.totalOmeq.trim(),
  };
}

export default function StandardTekstPage() {
  const location = useLocation();
  const {
    items,
    setItems,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    loading,
    error,
    filtered,
    selected,
  } = useStandardTekster();

  const omeqPrefill = useMemo<OMEQStandardtekstPrefill | null>(() => {
    const fromLocation = parseOmeqStandardtekstPrefill(
      (location.state as { omeqPrefill?: unknown } | null)?.omeqPrefill,
    );
    if (fromLocation) return fromLocation;

    try {
      const raw = sessionStorage.getItem(OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY);
      if (!raw) return null;
      return parseOmeqStandardtekstPrefill(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [location.state]);

  const clearedInitialSelectionRef = useRef(false);
  const appliedOmeqPrefillRequestIdRef = useRef<number | null>(null);
  const [pendingOmeqPrefill, setPendingOmeqPrefill] = useState<OMEQStandardtekstPrefill | null>(null);
  const protectedOmeqSelectedIdRef = useRef<string | null>(null);

  // Start with no selected template after initial load (so the user actively selects one)
  useEffect(() => {
    if (loading) return;
    if (clearedInitialSelectionRef.current) return;

    clearedInitialSelectionRef.current = true;
    setSelectedId(null);
  }, [loading, setSelectedId]);

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const errorToShow = errorLocal ?? error;

  const { user, isAdmin, firstName } = useAuthUser();
  const [adminViewEnabled, setAdminViewEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("standardtekster.adminViewEnabled");
      return raw !== "false";
    } catch {
      return true;
    }
  });
  const canManageStandardTekster = isAdmin && adminViewEnabled;

  useEffect(() => {
    try {
      localStorage.setItem("standardtekster.adminViewEnabled", String(adminViewEnabled));
    } catch {
      // ignore
    }
  }, [adminViewEnabled]);
  const actorName = (firstName ?? "").trim() || user?.displayName?.trim() || user?.email?.trim() || "";
  const actor = user
    ? {
        uid: user.uid,
        name: actorName || null,
      }
    : undefined;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftCategory, setDraftCategory] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const lockBeforeEdit = Boolean(
    canManageStandardTekster && selected && !isEditing && selected.title === "Ny standardtekst",
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);

  const {
    preparatRows,
    resetPreparatRows,
    clearPreparats,
    addPickedPreparat,
    removePreparatById,
    reformatPickedPreparats,
  } = usePreparatRows();
  const preparatSectionRef = useRef<HTMLDivElement | null>(null);
  const preparatSearchInputRef = useRef<HTMLInputElement | null>(null);
  const standardTekstSearchInputRef = useRef<HTMLInputElement | null>(null);
  const datoPickerInputRef = useRef<HTMLInputElement | null>(null);
  const datoMndPickerInputRef = useRef<HTMLInputElement | null>(null);
  const preserveInputsOnNextSelectRef = useRef(false);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const SIDEBAR_WIDTH_STORAGE_KEY = "standardtekster.sidebarWidth";
  const SIDEBAR_MIN = 240;
  const SIDEBAR_MAX = 640;
  const SIDEBAR_DEFAULT = 340;

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      const v = raw ? Number(raw) : NaN;
      if (!Number.isFinite(v)) return SIDEBAR_DEFAULT;
      return clamp(v, SIDEBAR_MIN, SIDEBAR_MAX);
    } catch {
      return SIDEBAR_DEFAULT;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    } catch {
      // ignore
    }
  }, [sidebarWidth]);

  const isResizingSidebarRef = useRef(false);

  const beginResizeSidebar = useCallback((e: React.MouseEvent) => {
    if ((e as any).button !== 0) return; // kun venstreklikk
    e.preventDefault();
    e.stopPropagation();

    isResizingSidebarRef.current = true;
    document.body.classList.add("sidebar-resizing");

    const move = (ev: MouseEvent) => {
      if (!isResizingSidebarRef.current) return;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const next = clamp(ev.clientX - rect.left, SIDEBAR_MIN, SIDEBAR_MAX);
      setSidebarWidth(next);
    };

    const up = () => {
      isResizingSidebarRef.current = false;
      document.body.classList.remove("sidebar-resizing");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT);
  }, []);

  const DEFAULT_NEW_STANDARDTEKST_CONTENT =
    "Hei, og takk for at du har valgt Farmasiet til å levere dine reseptvarer.\n\n" +
    "\n" +
    "Vennlig hilsen\n" +
    "XX, farmasøyt\n" +
    "Farmasiet";

  // Hotkeys for preparat search focus/clearing and standardtekster search focus
  useStandardTekstHotkeys({
    preparatRows,
    clearPreparats,
    preparatSearchInputRef,
    standardTekstSearchInputRef,
    isEditing,
    clearNumbersAndDate: () => {
      // Reset tall fields based on the currently selected template
      setTallByIndex(buildInitialTallValues(activeTemplateContent));
      setClockTime(DEFAULT_CLOCK_TALL_TIME);
      setClockDay(getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
      setClockCustomMode(true);

      // Reset date input
      setDatoInput("");
      // Reset formulering fields based on the currently selected template
      const fIndices = getFormuleringTokenIndices(activeTemplateContent);
      if (fIndices.length) {
        const nextF: Record<number, string> = {};
        for (const i of fIndices) nextF[i] = "";
        setFormuleringByIndex(nextF);
      } else {
        setFormuleringByIndex({ 0: "" });
      }
    },
  });

  const activeTemplateContent = useMemo(
    () => normalizeTemplateContent(selected?.content ?? ""),
    [selected?.content],
  );
  const [tallByIndex, setTallByIndex] = useState<Record<number, string>>({ 0: "" });
  const [clockTime, setClockTime] = useState<string>(DEFAULT_CLOCK_TALL_TIME);
  const [clockDay, setClockDay] = useState<ClockTallDay>(() =>
    getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME),
  );
  const [clockCustomMode, setClockCustomMode] = useState<boolean>(true);
  const [datoInput, setDatoInput] = useState<string>("");
  const [formuleringByIndex, setFormuleringByIndex] = useState<Record<number, string>>({ 0: "" });
  const [formuleringByPreparatKey, setFormuleringByPreparatKey] = useState<Record<string, string>>({});
  const templateHasVirkestoffToken = (template: string) => /\bVIRKESTOFF\b/.test(template ?? "");
  const templateHasFormuleringTokens = (template: string) =>
    /\{\{\s*FORMULERING\d*\s*\}\}|\bFORMULERING\d*\b/i.test(template ?? "");
  const isTallValueValid = (value: string) => {
    const trimmed = (value ?? "").trim();
    return !trimmed || /^\d+(?:[.,]\d+)?$/.test(trimmed);
  };

  const getFormuleringTokenIndices = (template: string): number[] => {
    const indices = new Set<number>();
    const re = /\{\{\s*FORMULERING(\d*)\s*\}\}|\bFORMULERING(\d*)\b/gi;
    let m: RegExpExecArray | null;

    while ((m = re.exec(template ?? ""))) {
      const raw = (m[1] ?? m[2] ?? "").trim();
      if (!raw) indices.add(0);
      else {
        const n = Number(raw);
        if (Number.isFinite(n)) indices.add(n);
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  };

  const replaceFormuleringTokenByIndex = (text: string, index: number, value: string): string => {
    if (!text) return text;
    const safeValue = value ?? "";

    if (index === 0) {
      return text.replace(/\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/gi, safeValue);
    }

    const re = new RegExp(
      `\\{\\{\\s*FORMULERING${index}\\s*\\}\\}|\\bFORMULERING${index}\\b`,
      "gi",
    );
    return text.replace(re, safeValue);
  };

  const getTallNumericValue = useCallback(
    (index: number): number | null => {
      const candidate =
        (tallByIndex[index] ?? "").trim() || (index !== 0 ? (tallByIndex[0] ?? "").trim() : "");
      if (!candidate) return null;

      const normalized = candidate.replace(",", ".");
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed)) return null;
      return parsed;
    },
    [tallByIndex],
  );

  const resolveFormuleringForPreviewAndCopy = useCallback(
    (index: number, value: string, template: string): string => {
      const raw = (value ?? "").trim();
      if (!raw) return raw;
      if (!templateHasTallToken(template)) return raw;

      const numeric = getTallNumericValue(index);
      if (numeric === null) return raw;
      if (numeric === 1) return toSingularFormulering(raw);
      if (numeric > 1) return toPluralFormulering(raw);
      return raw;
    },
    [getTallNumericValue],
  );

  const getTallTokenOccurrences = useCallback((template: string): number[] => {
    const occurrences: number[] = [];
    const re = /\{\{\s*TALL(\d*)\s*\}\}|\bTALL(\d*)\b/gi;
    let m: RegExpExecArray | null;

    while ((m = re.exec(template ?? ""))) {
      const raw = (m[1] ?? m[2] ?? "").trim();
      const idx = raw ? Number(raw) : 0;
      occurrences.push(Number.isFinite(idx) ? idx : 0);
    }

    return occurrences;
  }, []);

  const getUnnumberedFormuleringOccurrenceCount = useCallback((template: string): number => {
    const re = /\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/gi;
    let count = 0;
    while (re.exec(template ?? "")) count += 1;
    return count;
  }, []);

  const getUnnumberedFormuleringPreparatPositions = useCallback(
    (template: string): Array<number | null> => {
      const positions: Array<number | null> = [];
      let currentPreparatPosition: number | null = null;
      const re = /\{\{\s*(PREPARAT\d*|FORMULERING)\s*\}\}|\b(PREPARAT\d*|FORMULERING)\b/gi;
      let m: RegExpExecArray | null;

      while ((m = re.exec(template ?? ""))) {
        const token = String(m[1] ?? m[2] ?? "").trim().toUpperCase();
        if (!token) continue;

        if (token.startsWith("PREPARAT")) {
          const rawIndex = token.slice("PREPARAT".length).trim();
          if (!rawIndex) {
            currentPreparatPosition = 0;
          } else {
            const n = Number(rawIndex);
            currentPreparatPosition = Number.isFinite(n) && n > 0 ? n - 1 : 0;
          }
          continue;
        }

        if (token === "FORMULERING") {
          positions.push(currentPreparatPosition);
        }
      }

      return positions;
    },
    [],
  );

  const buildUnnumberedFormuleringOccurrenceValues = useCallback(
    (template: string): string[] => {
      const manualRaw = (formuleringByIndex[0] ?? "").trim();
      const occurrenceCount = getUnnumberedFormuleringOccurrenceCount(template);
      if (!occurrenceCount) return [];
      const formuleringPreparatPositions = getUnnumberedFormuleringPreparatPositions(template);

      const hasTallTokens = templateHasTallToken(template);
      const tallOccurrences = hasTallTokens ? getTallTokenOccurrences(template) : [];

      const getRawFromPreparatPosition = (position: number | null | undefined): string => {
        if (position === null || position === undefined || position < 0) return "";
        const row = (preparatRows as any[])[position];
        const key = String(row?.pickedKey ?? row?.picked ?? "").trim();
        if (!key) return "";
        return (formuleringByPreparatKey[key] ?? "").trim();
      };

      return Array.from({ length: occurrenceCount }, (_, occurrenceIdx) => {
        const preparatPosition = formuleringPreparatPositions[occurrenceIdx] ?? null;
        const raw =
          manualRaw ||
          getRawFromPreparatPosition(preparatPosition) ||
          getRawFromPreparatPosition(occurrenceIdx);
        if (!raw) return "";

        if (hasTallTokens) {
          const tallIdx = tallOccurrences[occurrenceIdx];
          if (typeof tallIdx === "number") {
            const numeric = getTallNumericValue(tallIdx);
            if (numeric === 1) return toSingularFormulering(raw);
            if (numeric !== null && numeric > 1) return toPluralFormulering(raw);
          }
        }

        return raw;
      });
    },
    [
      formuleringByIndex,
      formuleringByPreparatKey,
      getTallNumericValue,
      getTallTokenOccurrences,
      getUnnumberedFormuleringOccurrenceCount,
      getUnnumberedFormuleringPreparatPositions,
      preparatRows,
    ],
  );

  const getFormuleringForPreparatPosition = useCallback(
    (position: number): string => {
      if (position < 0) return "";
      const row = (preparatRows as any[])[position];
      const key = String(row?.pickedKey ?? row?.picked ?? "").trim();
      if (!key) return "";
      return (formuleringByPreparatKey[key] ?? "").trim();
    },
    [formuleringByPreparatKey, preparatRows],
  );

  const resolveFormuleringTokenValue = useCallback(
    (index: number, template: string): string => {
      const manual = (formuleringByIndex[index] ?? "").trim();
      const pickedCount = (preparatRows as any[]).reduce((count, row) => {
        const key = String(row?.pickedKey ?? row?.picked ?? "").trim();
        return key ? count + 1 : count;
      }, 0);
      const hasUnnumberedToken = /\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/i.test(template ?? "");
      const preparatPosition = index === 0
        ? 0
        : hasUnnumberedToken
          ? index
          : index - 1;
      const byPreparat =
        index > 0 && pickedCount <= index
          ? ""
          : getFormuleringForPreparatPosition(preparatPosition);

      const raw = manual || byPreparat;
      if (!raw) return "";

      return resolveFormuleringForPreviewAndCopy(index, raw, template);
    },
    [
      formuleringByIndex,
      getFormuleringForPreparatPosition,
      preparatRows,
      resolveFormuleringForPreviewAndCopy,
    ],
  );

  const replaceUnnumberedFormuleringTokensByOccurrence = useCallback(
    (text: string, values: string[]): string => {
      if (!text) return text;
      if (!values.length) return text;

      let cursor = 0;
      return text.replace(/\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/gi, () => {
        const value = values[cursor] ?? values[values.length - 1] ?? "";
        cursor += 1;
        return value;
      });
    },
    [],
  );

  const getTallFieldLabel = useCallback((_template: string, index: number) => {
    return index === 0 ? "Tall" : `Tall ${index}`;
  }, []);

  // Lagrer virkestoff knyttet til valgt preparat (mappes på stabil pickedKey)
  const [virkestoffByKey, setVirkestoffByKey] = useState<Record<string, string>>({});

  const resolvedVirkestoff = useMemo(() => {
    for (const r of preparatRows as any[]) {
      const key = String(r?.pickedKey ?? r?.picked ?? "").trim();
      if (!key) continue;
      const v = (virkestoffByKey[key] ?? "").trim();
      if (v) return v;
    }

    for (const v of Object.values(virkestoffByKey)) {
      const s = (v ?? "").trim();
      if (s) return s;
    }

    return "";
  }, [preparatRows, virkestoffByKey]);

  const [copied, setCopied] = useState(false);
  const [clearOnCopy, setClearOnCopy] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("standardtekster.clearOnCopy");
      return raw === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("standardtekster.clearOnCopy", String(clearOnCopy));
    } catch {
      // ignore
    }
  }, [clearOnCopy]);
  const [showGuide, setShowGuide] = useState(false);

  const [includeManufacturerInPreparatText, setIncludeManufacturerInPreparatText] =
    useState<boolean>(() => {
      try {
        const raw = localStorage.getItem("standardtekster.includeManufacturerInPreparatText");
        return raw === "true";
      } catch {
        return false;
      }
    });

  useEffect(() => {
    try {
      localStorage.setItem(
        "standardtekster.includeManufacturerInPreparatText",
        String(includeManufacturerInPreparatText),
      );
    } catch {
      // ignore
    }
  }, [includeManufacturerInPreparatText]);

  const [includePackSizeInPreparatText, setIncludePackSizeInPreparatText] = useState<boolean>(
    () => {
      try {
        const raw = localStorage.getItem("standardtekster.includePackSizeInPreparatText");
        return raw === "true";
      } catch {
        return false;
      }
    },
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        "standardtekster.includePackSizeInPreparatText",
        String(includePackSizeInPreparatText),
      );
    } catch {
      // ignore
    }
  }, [includePackSizeInPreparatText]);

  const [autoPasteNumericClipboard, setAutoPasteNumericClipboard] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("standardtekster.autoPasteNumericClipboard");
      return raw === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "standardtekster.autoPasteNumericClipboard",
        String(autoPasteNumericClipboard),
      );
    } catch {
      // ignore
    }
  }, [autoPasteNumericClipboard]);

  const reformatPickedRows = useCallback(
    (includeManufacturer: boolean, includePackSize: boolean) => {
      reformatPickedPreparats((row) =>
        formatPreparatRowText(
          {
            baseText: row.baseText,
            fullName: row.fullName,
            manufacturer: row.manufacturer,
            packSize: row.packSize,
          },
          { includeManufacturer, includePackSize },
        ),
      );
    },
    [reformatPickedPreparats],
  );

  const handleIncludeManufacturerInPreparatTextChange = useCallback(
    (value: boolean) => {
      setIncludeManufacturerInPreparatText(value);
      reformatPickedRows(value, includePackSizeInPreparatText);
    },
    [includePackSizeInPreparatText, reformatPickedRows],
  );

  const handleIncludePackSizeInPreparatTextChange = useCallback(
    (value: boolean) => {
      setIncludePackSizeInPreparatText(value);
      reformatPickedRows(includeManufacturerInPreparatText, value);
    },
    [includeManufacturerInPreparatText, reformatPickedRows],
  );

  const [draftFollowUps, setDraftFollowUps] = useState<StandardTekstFollowUp[]>([]);
  const [followUpPick, setFollowUpPick] = useState<{ id: string; title: string } | null>(null);
  const [followUpLabel, setFollowUpLabel] = useState<string>("");
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);

  const pickedPreparats = useMemo(
    () => preparatRows.map((r) => r.picked).filter(Boolean) as string[],
    [preparatRows],
  );

  const normalizedDato = useMemo(() => {
    const digits = (datoInput ?? "").replace(/\D/g, "");
    return digits.length === 8 ? digits : "";
  }, [datoInput]);

  const formattedDato = useMemo(() => {
    if (!normalizedDato) return "";
    const dd = normalizedDato.slice(0, 2);
    const mm = normalizedDato.slice(2, 4);
    const yyyy = normalizedDato.slice(4, 8);
    return `${dd}.${mm}.${yyyy}`;
  }, [normalizedDato]);

  const normalizedDatoMnd = useMemo(() => {
    const digits = (datoInput ?? "").replace(/\D/g, "");
    // accept MMYYYY (6 digits)
    if (digits.length !== 6) return "";
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    const m = Number(mm);
    if (!Number.isFinite(m) || m < 1 || m > 12) return "";
    return `${mm}${yyyy}`;
  }, [datoInput]);

  const formattedDatoMnd = useMemo(() => {
    if (!normalizedDatoMnd) return "";
    const mm = normalizedDatoMnd.slice(0, 2);
    const yyyy = normalizedDatoMnd.slice(2, 6);
    return `${mm}.${yyyy}`;
  }, [normalizedDatoMnd]);

  const formattedDatoMndName = useMemo(() => {
    if (!normalizedDatoMnd) return "";
    const mm = Number(normalizedDatoMnd.slice(0, 2));
    const yyyy = normalizedDatoMnd.slice(2, 6);
    const months = [
      "januar",
      "februar",
      "mars",
      "april",
      "mai",
      "juni",
      "juli",
      "august",
      "september",
      "oktober",
      "november",
      "desember",
    ];
    const name = months[mm - 1];
    if (!name) return "";
    return `${name} ${yyyy}`;
  }, [normalizedDatoMnd]);

  // DATO-token: prefer full dato (DD.MM.YYYY), fall back to month name (e.g. "juni 2025")
  const effectiveDato = formattedDato || formattedDatoMndName;

  const handleDatoPicker = (iso: string) => {
    if (!iso) {
      setDatoInput("");
      return;
    }
    const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return;
    const [, yyyy, mm, dd] = m;
    setDatoInput(`${dd}.${mm}.${yyyy}`);

    if (errorLocal?.startsWith("Fyll inn dato") || errorLocal?.startsWith("Fyll inn måned/år")) {
      setErrorLocal(null);
    }
  };

  const openDatoMndPicker = useCallback(() => {
    const input = datoMndPickerInputRef.current;
    if (!input) return;

    try {
      const withPicker = input as HTMLInputElement & { showPicker?: () => void };
      if (typeof withPicker.showPicker === "function") {
        withPicker.showPicker();
      } else {
        // Fallback for browsers without showPicker support
        input.click();
      }
    } catch {
      // showPicker is not supported in all browsers
    }

    input.focus();
  }, []);

  // Preview content with preparats and tall
  const previewContent = useMemo(() => {
    if (!selected) return "";
    const templateContent = activeTemplateContent;

    // IMPORTANT: Do NOT replace TALL tokens here.
    // We keep tokens (TALL/TALL1/…) intact so renderContentWithPreparatHighlight
    // can render them as blue chips using tallValues.
    let next = buildPreviewContent({
      template: templateContent,
      firstName,
      picked: pickedPreparats,
    });

    // Do NOT replace VIRKESTOFF in previewContent; leave the token for renderer.

    return next;
  }, [selected, firstName, pickedPreparats, activeTemplateContent]);

  // Når valgt tekst endres, sync draft og avslutt redigering
  useEffect(() => {
    const shouldAutoEditNew = Boolean(
      canManageStandardTekster && selected && selected.title === "Ny standardtekst",
    );
    const pending = pendingOmeqPrefill;
    const shouldApplyOmeqPrefill =
      Boolean(pending && selected) &&
      selected!.title.trim().toLowerCase() === pending!.templateTitle.trim().toLowerCase();
    const shouldProtectCurrentSelection =
      Boolean(protectedOmeqSelectedIdRef.current) && protectedOmeqSelectedIdRef.current === selectedId;

    setIsEditing(shouldAutoEditNew);
    setDraftTitle(selected?.title ?? "");
    setDraftCategory(selected?.category ?? "");
    if (shouldAutoEditNew) {
      const base = selected?.content ?? "";
      const normalized = normalizeTemplateContent(base);
      setDraftContent(
        normalized.trim().length
          ? normalized
          : sanitizeFarmasoytSignature(DEFAULT_NEW_STANDARDTEKST_CONTENT),
      );
    } else {
      setDraftContent(normalizeTemplateContent(selected?.content ?? ""));
    }
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setEditingFollowUpId(null);

    if (shouldApplyOmeqPrefill && selected && pending) {
      resetPreparatRows();
      setVirkestoffByKey({});
      setFormuleringByPreparatKey({});

      for (const preparat of pending.preparats) {
        addPickedPreparat(preparat, preparat);
      }

      const nextTallValues = buildInitialTallValues(normalizeTemplateContent(selected.content));
      nextTallValues[1] = pending.totalOmeq;
      setTallByIndex(nextTallValues);
      setClockTime(DEFAULT_CLOCK_TALL_TIME);
      setClockDay(getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
      setClockCustomMode(true);
      setDatoInput("");
      setErrorLocal(null);
      protectedOmeqSelectedIdRef.current = selected.id;
      setPendingOmeqPrefill(null);
      appliedOmeqPrefillRequestIdRef.current = pending.requestId;

      try {
        sessionStorage.removeItem(OMEQ_STANDARDTEKST_PREFILL_STORAGE_KEY);
      } catch {
        // ignore
      }
    } else if (!shouldProtectCurrentSelection && !preserveInputsOnNextSelectRef.current) {
      resetPreparatRows();
      setVirkestoffByKey({});
      setFormuleringByPreparatKey({});
      setTallByIndex(buildInitialTallValues(activeTemplateContent));
      setClockTime(DEFAULT_CLOCK_TALL_TIME);
      setClockDay(getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
      setClockCustomMode(true);
      setDatoInput("");
      const fIndices = getFormuleringTokenIndices(activeTemplateContent);
      if (fIndices.length) {
        const nextF: Record<number, string> = {};
        for (const i of fIndices) nextF[i] = "";
        setFormuleringByIndex(nextF);
      } else {
        setFormuleringByIndex({ 0: "" });
      }
      // Når vi åpner en helt ny standardtekst i edit mode, skal fokus gå til overskrift-feltet
      // (StandardTekstContent håndterer dette via titleInputRef).
      if (selected && !shouldAutoEditNew) {
        requestAnimationFrame(() => {
          preparatSearchInputRef.current?.focus();
          preparatSearchInputRef.current?.select();
        });
      }
    }

    // Always clear the flag after handling a selection change
    preserveInputsOnNextSelectRef.current = false;
  }, [
    addPickedPreparat,
    activeTemplateContent,
    canManageStandardTekster,
    pendingOmeqPrefill,
    resetPreparatRows,
    selected,
    selectedId,
  ]);

  useEffect(() => {
    if (canManageStandardTekster) return;
    if (!isEditing) return;
    setIsEditing(false);
    setFollowUpsOpen(false);
  }, [canManageStandardTekster, isEditing]);

  useEffect(() => {
    if (!protectedOmeqSelectedIdRef.current) return;
    if (protectedOmeqSelectedIdRef.current === selectedId) return;
    protectedOmeqSelectedIdRef.current = null;
  }, [selectedId]);

  // Auto-focus standardtekst search on first load when no template is selected
  useEffect(() => {
    if (loading) return;
    if (selected) return;

    requestAnimationFrame(() => {
      standardTekstSearchInputRef.current?.focus();
      standardTekstSearchInputRef.current?.select();
    });
  }, [loading, selected]);

  useEffect(() => {
    if (!omeqPrefill) return;
    if (appliedOmeqPrefillRequestIdRef.current === omeqPrefill.requestId) return;
    if (items.length === 0) return;

    const normalizedTargetTitle = omeqPrefill.templateTitle.trim().toLowerCase();
    const target = items.find((item) => item.title.trim().toLowerCase() === normalizedTargetTitle);
    if (!target) return;

    setPendingOmeqPrefill(omeqPrefill);

    if (selectedId !== target.id) {
      preserveInputsOnNextSelectRef.current = true;
      setSelectedId(target.id);
    }
  }, [items, omeqPrefill, selected, selectedId, setSelectedId]);

  const startEdit = () => {
    if (!canManageStandardTekster) return;
    if (!selected) return;
    setDraftTitle(selected.title ?? "");
    setDraftCategory(selected.category ?? "");
    if (selected.title === "Ny standardtekst") {
      const base = selected.content ?? "";
      const normalized = normalizeTemplateContent(base);
      setDraftContent(
        normalized.trim().length
          ? normalized
          : sanitizeFarmasoytSignature(DEFAULT_NEW_STANDARDTEKST_CONTENT),
      );
    } else {
      setDraftContent(normalizeTemplateContent(selected.content ?? ""));
    }
    setDraftFollowUps((selected.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setEditingFollowUpId(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(selected?.title ?? "");
    setDraftCategory(selected?.category ?? "");
    setDraftContent(normalizeTemplateContent(selected?.content ?? ""));
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setEditingFollowUpId(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!canManageStandardTekster) return;
    if (!selected) return;
    setSaving(true);
    setErrorLocal(null);
    try {
      const sanitizedDraftContent = normalizeTemplateContent(draftContent);
      // If admin selected a follow-up but didn't press +, include it on save.
      const followUpsToSave: StandardTekstFollowUp[] = (() => {
        if (!followUpPick) return draftFollowUps;

        const label = followUpLabel.trim() || `Oppfølging: ${followUpPick.title}`;
        const index = draftFollowUps.findIndex((p) => p.id === followUpPick.id);
        if (index >= 0) {
          if (draftFollowUps[index]?.label === label) return draftFollowUps;
          const next = [...draftFollowUps];
          next[index] = { ...next[index], label };
          return next;
        }

        return [...draftFollowUps, { id: followUpPick.id, label }];
      })();

      await standardTeksterApi.update(
        selected.id,
        {
          title: draftTitle,
          category: draftCategory.trim() || undefined,
          content: sanitizedDraftContent,
          followUps: followUpsToSave,
        },
        actor,
      );

      // Oppdater lokalt state så UI viser ny tekst uten refresh
      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id
            ? {
                ...it,
                title: draftTitle,
                category: draftCategory.trim() || undefined,
                content: sanitizedDraftContent,
                followUps: followUpsToSave,
                updatedByName: actor?.name ?? it.updatedByName,
                updatedAt: new Date(),
              }
            : it,
        ),
      );

      // Sync local draft + clear add-form
      setDraftContent(sanitizedDraftContent);
      setDraftFollowUps(followUpsToSave);
      setFollowUpPick(null);
      setFollowUpLabel("");
      setEditingFollowUpId(null);

      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved lagring";
      setErrorLocal(message);
    } finally {
      setSaving(false);
    }
  };

  const createNewStandardTekst = async () => {
    if (!canManageStandardTekster) return;

    setCreating(true);
    setErrorLocal(null);

    try {
      const localItem = await standardTeksterApi.createEmpty(actor);

      // Add to local list and select it immediately
      setItems((prev) => {
        const next = [localItem, ...prev];
        return next.sort((a, b) => a.title.localeCompare(b.title, "nb"));
      });

      setSelectedId(localItem.id);

      // Start editing right away
      setDraftTitle(localItem.title);
      setDraftCategory(localItem.category ?? "");
      const base = localItem.content ?? "";
      const normalized = normalizeTemplateContent(base);
      setDraftContent(
        normalized.trim().length
          ? normalized
          : sanitizeFarmasoytSignature(DEFAULT_NEW_STANDARDTEKST_CONTENT),
      );
      setIsEditing(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved opprettelse";
      setErrorLocal(message);
    } finally {
      setCreating(false);
    }
  };

  const followUpLabelPresets = useMemo(
    () => [
      "Kunden svarer ja",
      "Kunden svarer nei",
      "Kunden ønsker å bytte",
      "Kunden ønsker å slette",
      "Kunden har spørsmål",
      "Annet",
    ],
    [],
  );

  const formuleringSuggestions = useMemo(
    () => [
      "brusetablett",
      "depottablett",
      "depotplaster",
      "dråper",
      "gel",
      "granulat",
      "granulat til mikstur",
      "infusjonsvæske",
      "inhalasjonspulver",
      "inhalasjonsspray",
      "inhalasjonsaerosol",
      "inhalasjonsvæske",
      "inhalator",
      "injeksjon",
      "injeksjons-/infusjonsvæske",
      "kapsel",
      "kapsler",
      "konsentrat til infusjonsvæske",
      "konsentrat til oppløsning",
      "krem",
      "liniment",
      "liniment, oppløsning",
      "mikstur",
      "mikstur, dråper",
      "munnskyllevæske",
      "munnspray",
      "nesedråper",
      "nesespray",
      "oral oppløsning",
      "oral suspensjon",
      "plaster",
      "pulver",
      "pulver til infusjonsvæske",
      "pulver til injeksjonsvæske",
      "pulver til oral oppløsning",
      "pulver til mikstur",
      "rektalsalve",
      "rektalsuspensjon",
      "rektalvæske",
      "salve",
      "sirup",
      "smeltetablett",
      "spray",
      "sprøyte",
      "sprøyter",
      "stikkpille",
      "sublingvaltablett",
      "sugetablett",
      "tablett",
      "tabletter",
      "tyggetablett",
      "tyggetabletter",
      "vaginalgel",
      "vaginalkapsel",
      "vaginalkrem",
      "vaginalring",
      "vaginalstikkpille",
      "vaginaltablett",
      "øredråper",
      "øredråper, oppløsning",
      "ørerdråper",
      "øyedråper, oppløsning",
      "øyedråper, suspensjon",
      "øyegel",
      "øyedråper",
      "øyesalve",
    ],
    [],
  );

  const followUpOptions = useMemo(() => {
    return (items ?? [])
      .filter((t) => t.id !== selected?.id)
      .map((t) => ({ id: t.id, title: t.title }));
  }, [items, selected?.id]);

  const followUpOptionsById = useMemo(() => {
    return new Map(followUpOptions.map((option) => [option.id, option] as const));
  }, [followUpOptions]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();

    for (const t of items ?? []) {
      const c = (t.category ?? "").trim();
      if (c) categories.add(c);
    }

    // Ensure selected category is included even if it isn't in the filtered list
    if (selected?.category?.trim()) {
      categories.add(selected.category.trim());
    }

    return Array.from(categories).sort((a, b) => a.localeCompare(b, "nb"));
  }, [items, selected?.category]);

  const addFollowUp = () => {
    if (!followUpPick) return;
    const label = followUpLabel.trim() || `Oppfølging: ${followUpPick.title}`;

    setDraftFollowUps((prev) => {
      const index = prev.findIndex((p) => p.id === followUpPick.id);
      if (index >= 0) {
        if (prev[index]?.label === label) return prev;
        const next = [...prev];
        next[index] = { ...next[index], label };
        return next;
      }
      return [...prev, { id: followUpPick.id, label }];
    });

    setFollowUpPick(null);
    setFollowUpLabel("");
    setEditingFollowUpId(null);
  };

  const removeFollowUp = (id: string) => {
    setDraftFollowUps((prev) => prev.filter((p) => p.id !== id));
    if (editingFollowUpId === id) {
      setFollowUpPick(null);
      setFollowUpLabel("");
      setEditingFollowUpId(null);
    }
  };

  const startRenameFollowUp = (followUp: StandardTekstFollowUp) => {
    const option = followUpOptionsById.get(followUp.id);
    setFollowUpPick(option ?? { id: followUp.id, title: followUp.label });
    setFollowUpLabel(followUp.label ?? "");
    setEditingFollowUpId(followUp.id);
  };

  const openFollowUp = (id: string) => {
    preserveInputsOnNextSelectRef.current = true;
    setSelectedId(id);
  };

  // Editor for follow-up texts
  const followUpsEditor = (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Legg til oppfølgingstekster som knapper for denne standardteksten.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Klikk på en chip for å endre navn.
      </Typography>

      {draftFollowUps.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
          {draftFollowUps.map((fu) => (
            <Chip
              key={fu.id}
              label={fu.label}
              onClick={() => {
                if (canManageStandardTekster && isEditing) {
                  startRenameFollowUp(fu);
                  return;
                }
                openFollowUp(fu.id);
              }}
              onDelete={canManageStandardTekster && isEditing ? () => removeFollowUp(fu.id) : undefined}
              deleteIcon={canManageStandardTekster && isEditing ? <DeleteOutlineIcon /> : undefined}
              icon={<OpenInNewIcon />}
              variant={editingFollowUpId === fu.id ? "filled" : "outlined"}
              color={editingFollowUpId === fu.id ? "primary" : "default"}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Ingen oppfølgingstekster lagt til enda.
        </Typography>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Autocomplete
          size="small"
          disabled={!isEditing}
          value={followUpPick}
          onChange={(_, v) => {
            setFollowUpPick(v);
            if (!v) {
              setEditingFollowUpId(null);
              return;
            }
            const existing = draftFollowUps.find((p) => p.id === v.id);
            if (existing) {
              setFollowUpLabel(existing.label ?? "");
              setEditingFollowUpId(existing.id);
            } else {
              setFollowUpLabel("");
              setEditingFollowUpId(null);
            }
          }}
          options={followUpOptions}
          getOptionLabel={(o) => o.title}
          renderInput={(params) => <TextField {...params} label="Velg oppfølgingstekst" />}
          fullWidth
        />

        <Autocomplete
          freeSolo
          size="small"
          disabled={!isEditing}
          value={followUpLabel}
          onInputChange={(_, v) => setFollowUpLabel(v)}
          options={followUpLabelPresets}
          renderInput={(params) => (
            <TextField {...params} label="Etikett" placeholder="F.eks. Kunden svarer ja" />
          )}
          fullWidth
        />

        <IconButton
          aria-label={editingFollowUpId ? "Oppdater oppfølging" : "Legg til oppfølging"}
          disabled={!isEditing || !followUpPick}
          onClick={addFollowUp}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Tips: Trykk Rediger på standardteksten først, så kan du legge til/fjerne oppfølginger og
        lagre.
      </Typography>
    </Box>
  );

  // Preview for follow-up texts
  const followUpsPreview = selected?.followUps?.length ? (
    <Box className={styles.followUpsPreviewRow}>
      {(selected.followUps as StandardTekstFollowUp[]).map((fu: StandardTekstFollowUp) => (
        <Button
          key={fu.id}
          onClick={(e) => {
            e.stopPropagation();
            openFollowUp(fu.id);
          }}
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
          className={styles.followUpChip}
        >
          {fu.label}
        </Button>
      ))}
    </Box>
  ) : null;

  const copyBodyToClipboard = async (): Promise<boolean> => {
    if (!selected) return false;
    if (isEditing) return false;
    const selectedContent = activeTemplateContent;

    // If the user has marked (selected) text, do NOT auto-copy the full template.
    // This keeps normal text selection + Ctrl/Cmd+C working.
    const selectionText = window.getSelection?.()?.toString() ?? "";
    if (selectionText.trim().length > 0) {
      return false;
    }

    // Prevent copying if the template requires a number and it hasn't been filled in.
    if (templateHasTallToken(selectedContent)) {
      const indices = getTallTokenIndices(selectedContent);
      const missing = indices.filter((i) => !(tallByIndex[i] ?? "").trim());
      if (missing.length) {
        const label = missing.map((i) => getTallFieldLabel(selectedContent, i)).join(", ");
        setErrorLocal(`Fyll inn feltet før du kopierer teksten: ${label}.`);
        return false;
      }

      const invalid = indices.filter((i) => !isTallValueValid(tallByIndex[i] ?? ""));
      if (invalid.length) {
        const label = invalid.map((i) => getTallFieldLabel(selectedContent, i)).join(", ");
        setErrorLocal(`Tallfelt må inneholde kun tall: ${label}.`);
        return false;
      }
    }

    if (templateHasKlokkeslettDagToken(selectedContent)) {
      const clockLabel = formatClockTallValue(clockTime, clockDay).trim();
      if (!clockLabel) {
        setErrorLocal("Velg klokkeslett før du kopierer teksten.");
        return false;
      }
    }

    if (templateHasVirkestoffToken(selectedContent) && !resolvedVirkestoff) {
      setErrorLocal("Velg et preparat med virkestoff før du kopierer teksten.");
      return false;
    }
    if (templateHasFormuleringTokens(selectedContent)) {
      const indices = getFormuleringTokenIndices(selectedContent);
      const missingLabels = new Set<string>();

      for (const idx of indices.filter((i) => i > 0)) {
        if (!resolveFormuleringTokenValue(idx, selectedContent)) {
          missingLabels.add(`FORMULERING${idx}`);
        }
      }

      const hasUnnumberedToken = /\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/i.test(selectedContent);
      if (hasUnnumberedToken) {
        const occurrenceValues = buildUnnumberedFormuleringOccurrenceValues(selectedContent);
        if (!occurrenceValues.length || occurrenceValues.some((value) => !value.trim())) {
          missingLabels.add("FORMULERING");
        }
      } else if (indices.includes(0) && !resolveFormuleringTokenValue(0, selectedContent)) {
        missingLabels.add("FORMULERING");
      }

      if (missingLabels.size) {
        const label = Array.from(missingLabels).join(", ");
        setErrorLocal(`Fyll inn formulering før du kopierer teksten: ${label}.`);
        return false;
      }
    }

    // Build base text
    let text = buildPreviewContent({
      template: selectedContent,
      firstName,
      picked: pickedPreparats,
    });

    // Ensure PREPARAT tokens are actually resolved in the copied text.
    // Preview replaces them in the renderer, but clipboard needs real text.
    if (pickedPreparats.length) {
      const list =
        pickedPreparats.length === 1
          ? pickedPreparats[0]
          : pickedPreparats.length === 2
            ? `${pickedPreparats[0]} og ${pickedPreparats[1]}`
            : `${pickedPreparats.slice(0, -1).join(", ")} og ${pickedPreparats.slice(-1)}`;

      // Replace PREPARAT (list) always
      text = text.replace(/\bPREPARAT\b/g, list);

      // Replace PREPARAT1.
      // If the template only uses PREPARAT1 but multiple preparater are chosen,
      // we insert the full list (same behaviour as preview).
      if (pickedPreparats.length > 1 && !/\bPREPARAT2\b/.test(selectedContent)) {
        text = text.replace(/\bPREPARAT1\b/g, list);
      } else if (pickedPreparats[0]) {
        text = text.replace(/\bPREPARAT1\b/g, pickedPreparats[0]);
      }

      // Replace PREPARAT2 only if we actually have a second preparat
      if (pickedPreparats[1]) {
        text = text.replace(/\bPREPARAT2\b/g, pickedPreparats[1]);
      }
    }

    // Apply date replacements afterwards
    if (effectiveDato) {
      text = text.replace(/\bDATO\b/g, effectiveDato);
    }
    if (formattedDatoMnd) {
      text = text.replace(/\bDATOMND\b/g, formattedDatoMnd);
    }

    if (templateHasKlokkeslettDagToken(selectedContent)) {
      text = replaceKlokkeslettDagTokens(text, formatClockTallValue(clockTime, clockDay));
    }

    // Replace each TALL token individually (TALL, TALL1, TALL2…)
    if (templateHasTallToken(selectedContent)) {
      for (const idx of getTallTokenIndices(selectedContent)) {
        const v = (tallByIndex[idx] ?? "").trim();
        if (!v) continue;
        text = replaceTallTokenByIndex(text, idx, v);
      }
    }

    // Replace VIRKESTOFF token (based on picked preparat)
    if (templateHasVirkestoffToken(selectedContent) && resolvedVirkestoff) {
      text = text.replace(/\bVIRKESTOFF\b/g, resolvedVirkestoff);
    }

    // Replace FORMULERING tokens (free text) by index (FORMULERING, FORMULERING1, ...)
    if (templateHasFormuleringTokens(selectedContent)) {
      const indices = getFormuleringTokenIndices(selectedContent);
      const hasNumbered = indices.some((idx) => idx > 0);

      if (hasNumbered) {
        for (const idx of indices.filter((i) => i > 0)) {
          const v = resolveFormuleringTokenValue(idx, selectedContent);
          if (!v) continue;
          text = replaceFormuleringTokenByIndex(text, idx, v);
        }
      }

      const hasUnnumberedToken = /\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/i.test(selectedContent);
      if (hasUnnumberedToken) {
        const occurrenceValues = buildUnnumberedFormuleringOccurrenceValues(selectedContent);
        if (occurrenceValues.length > 0) {
          text = replaceUnnumberedFormuleringTokensByOccurrence(text, occurrenceValues);
        } else {
          const v0 = resolveFormuleringTokenValue(0, selectedContent);
          if (v0) {
            text = replaceFormuleringTokenByIndex(text, 0, v0);
          }
        }
      }
    }

    text = (text ?? "").trim();
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      logUsage("standardtekst_copy", { standardtekstId: selected.id });

      if (clearOnCopy) {
        clearPreparats();
        setVirkestoffByKey({});
        setFormuleringByPreparatKey({});

        if (templateHasTallToken(selectedContent)) {
          setTallByIndex(buildInitialTallValues(selectedContent));
        } else {
          setTallByIndex({ 0: "" });
        }
        setClockTime(DEFAULT_CLOCK_TALL_TIME);
        setClockDay(getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
        setClockCustomMode(true);

        setSearch("");
        setDatoInput("");
        if (templateHasFormuleringTokens(selectedContent)) {
          const fIndices = getFormuleringTokenIndices(selectedContent);
          if (fIndices.length) {
            const nextF: Record<number, string> = {};
            for (const i of fIndices) nextF[i] = "";
            setFormuleringByIndex(nextF);
          } else {
            setFormuleringByIndex({ 0: "" });
          }
        } else {
          setFormuleringByIndex({ 0: "" });
        }
      }

      return true;
    } catch {
      // Fallback for eldre nettlesere / usikre kontekster
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        logUsage("standardtekst_copy", { standardtekstId: selected.id });

        if (clearOnCopy) {
          clearPreparats();
          setVirkestoffByKey({});
          setFormuleringByPreparatKey({});

          if (templateHasTallToken(selectedContent)) {
            setTallByIndex(buildInitialTallValues(selectedContent));
          } else {
            setTallByIndex({ 0: "" });
          }
          setClockTime(DEFAULT_CLOCK_TALL_TIME);
          setClockDay(getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
          setClockCustomMode(true);

          setSearch("");
          setDatoInput("");
          if (templateHasFormuleringTokens(selectedContent)) {
            const fIndices = getFormuleringTokenIndices(selectedContent);
            if (fIndices.length) {
              const nextF: Record<number, string> = {};
              for (const i of fIndices) nextF[i] = "";
              setFormuleringByIndex(nextF);
            } else {
              setFormuleringByIndex({ 0: "" });
            }
          } else {
            setFormuleringByIndex({ 0: "" });
          }
        }

        return true;
      } catch {
        // ignore
        return false;
      }
    }
  };

  const requestDelete = () => {
    if (!canManageStandardTekster) return;
    if (!selected) return;
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
  };

  const confirmDelete = async () => {
    if (!canManageStandardTekster) return;
    if (!selected) return;
    setDeleting(true);
    setErrorLocal(null);

    try {
      await deleteStandardTekst({
        id: selected.id,
        setItems,
        setSelectedId,
        onError: (msg) => setErrorLocal(msg),
      });

      setDeleteOpen(false);
      setIsEditing(false);
      setDraftTitle("");
      setDraftCategory("");
      setDraftContent("");
      resetPreparatRows();
    } catch {
      // errorLocal is set via onError
    } finally {
      setDeleting(false);
    }
  };

  const toggleStandardTekstActive = async (id: string, isActive: boolean) => {
    if (!canManageStandardTekster) return;

    await standardTeksterApi.update(id, { isActive }, actor);

    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, isActive } : it));
      if (!isActive && selectedId === id) {
        const nextActive = next.find((it) => it.id !== id && it.isActive !== false);
        setSelectedId(nextActive?.id ?? null);
        setIsEditing(false);
      }
      return next;
    });
  };

  return (
    <Box className={styles.page}>
      {errorToShow && (
        <Alert severity="error" className={styles.error}>
          {errorToShow}
        </Alert>
      )}
      <Collapse in={showGuide} unmountOnExit>
        <Paper className={styles.guidePaper}>
          <Typography variant="h6" className={styles.guideTitle}>
            Slik bruker du Standardtekster
          </Typography>

          <Box component="ul" className={styles.guideList}>
            <li>Søk i listen til venstre og velg en standardtekst. Trykk Enter i søkefeltet for å åpne øverste treff.</li>
            <li>Bruk stjernen for å lagre standardtekster som favoritter.</li>
            <li>Bruk "Søk etter preparat" for å sette inn PREPARAT automatisk. Du kan søke på navn eller varenummer.</li>
            <li>Hvis teksten har egne felt, fyll inn tall, dato, formulering eller klokkeslett før du kopierer.</li>
            <li>Klokkeslettfelt bruker faste valg og foreslår automatisk i dag eller i morgen ut fra lokal tid.</li>
            <li>Velg om produsent og pakningsstørrelse skal tas med i preparatteksten via bryterne øverst.</li>
            <li>Klikk i teksten for å kopiere. Hvis "Tøm etter kopiering" er på, nullstilles feltene automatisk etterpå.</li>
            {isAdmin && (
              <li>
                Som admin kan du opprette, redigere og slette standardtekster, og se hvem som
                opprettet og sist oppdaterte teksten.
              </li>
            )}
          </Box>
        </Paper>
      </Collapse>

      <Box
        ref={gridRef}
        className={styles.grid}
        style={{ ["--sidebar-width" as any]: `${sidebarWidth}px` }}
      >
        <Box className={styles.sidebar}>
          <StandardTekstSidebar
            disabled={lockBeforeEdit}
            isAdmin={canManageStandardTekster}
            creating={creating}
            onCreate={createNewStandardTekst}
            search={search}
            setSearch={setSearch}
            loading={loading}
            filtered={filtered}
            onToggleActive={toggleStandardTekstActive}
            selectedId={selectedId}
            setSelectedId={(id) => setSelectedId(id)}
            searchInputRef={standardTekstSearchInputRef}
          />
        </Box>
        <Box
          className={styles.sidebarResizeHandle}
          role="separator"
          aria-orientation="vertical"
          aria-label="Juster bredde på sidepanel"
          tabIndex={0}
          onMouseDown={beginResizeSidebar}
          onDoubleClick={resetSidebarWidth}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setSidebarWidth((w) => clamp(w - 16, SIDEBAR_MIN, SIDEBAR_MAX));
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setSidebarWidth((w) => clamp(w + 16, SIDEBAR_MIN, SIDEBAR_MAX));
            }
            if (e.key === "Home") {
              e.preventDefault();
              setSidebarWidth(SIDEBAR_MIN);
            }
            if (e.key === "End") {
              e.preventDefault();
              setSidebarWidth(SIDEBAR_MAX);
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              resetSidebarWidth();
            }
          }}
        />

        <Box className={styles.main}>
          <Box sx={{ position: "relative" }}>
            {lockBeforeEdit && (
              <Box
                sx={{ position: "absolute", inset: 0, zIndex: 20 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}

            <Box ref={preparatSectionRef}>
              <PreparatPanel
                key={selectedId ?? "none"}
                preparatRows={preparatRows}
                clearOnCopy={clearOnCopy}
                includeManufacturerInText={includeManufacturerInPreparatText}
                includePackSizeInText={includePackSizeInPreparatText}
                autoPasteNumericClipboard={autoPasteNumericClipboard}
                searchResetSignal={selectedId}
                onClearOnCopyChange={setClearOnCopy}
                onIncludeManufacturerInTextChange={handleIncludeManufacturerInPreparatTextChange}
                onIncludePackSizeInTextChange={handleIncludePackSizeInPreparatTextChange}
                onAutoPasteNumericClipboardChange={setAutoPasteNumericClipboard}
                inputRef={preparatSearchInputRef}
                onPickText={(pick) => {
                  const text = typeof pick === "string" ? pick : pick.text;
                  const key = typeof pick === "string" ? pick : pick.key;
                  const rowData = typeof pick === "string" ? undefined : pick.rowData;

                  addPickedPreparat(text, key, rowData);

                  // Hvis pick har virkestoff (FEST har vanligvis dette), lagre det for VIRKESTOFF-tokenet
                  if (typeof pick !== "string") {
                    const vRaw =
                      (pick as any)?.virkestoff ??
                      (pick as any)?.original?.virkestoff ??
                      (pick as any)?.med?.virkestoff ??
                      (pick as any)?.data?.virkestoff;
                    const v = typeof vRaw === "string" ? vRaw.trim() : "";
                    if (text && v) {
                      setVirkestoffByKey((prev) => ({ ...prev, [String(key)]: v }));

                      if (errorLocal?.startsWith("Velg et preparat med virkestoff")) {
                        setErrorLocal(null);
                      }
                    }

                    const formulering = String((pick as any)?.formulering ?? "").trim();
                    if (formulering && key) {
                      setFormuleringByPreparatKey((prev) => ({
                        ...prev,
                        [String(key)]: formulering,
                      }));
                    }
                    if (formulering && selected && templateHasFormuleringTokens(activeTemplateContent)) {
                      const tokenIndices = getFormuleringTokenIndices(activeTemplateContent);
                      if (tokenIndices.length > 0) {
                        const normalizedKey = String(key ?? "").trim();
                        const pickedCountBefore = (preparatRows as any[]).reduce((count, row) => {
                          const rowKey = String(row?.pickedKey ?? row?.picked ?? "").trim();
                          return rowKey ? count + 1 : count;
                        }, 0);
                        const alreadyPicked = (preparatRows as any[]).some((row) => {
                          const rowKey = String(row?.pickedKey ?? row?.picked ?? "").trim();
                          return rowKey && rowKey === normalizedKey;
                        });
                        const nextPickedCount = alreadyPicked ? pickedCountBefore : pickedCountBefore + 1;
                        const autoEligibleIndices = tokenIndices.filter((idx) => idx === 0 || idx < nextPickedCount);

                        setFormuleringByIndex((prev) => {
                          const next = { ...prev };
                          const firstEmpty = autoEligibleIndices.find((idx) => !(next[idx] ?? "").trim());
                          if (firstEmpty !== undefined) {
                            next[firstEmpty] = formulering;
                          }
                          return next;
                        });

                        if (errorLocal?.startsWith("Fyll inn formulering")) {
                          setErrorLocal(null);
                        }
                      }
                    }
                  }

                  if (isEditing) {
                    setDraftContent((prev) => replaceNextPreparatToken(prev, text));
                  }
                }}
                onClear={() => {
                  clearPreparats();
                  setVirkestoffByKey({});
                  setFormuleringByPreparatKey({});
                }}
                onRemove={(id) => {
                  const numericId = typeof id === "number" ? id : Number(id);

                  // Fjern evt lagret virkestoff knyttet til denne raden før vi fjerner raden
                  const row = (preparatRows as any[]).find((r) => Number(r?.id) === numericId);
                  const pickedKey = String(row?.pickedKey ?? row?.picked ?? "").trim();
                  if (pickedKey) {
                    setVirkestoffByKey((prev) => {
                      const next = { ...prev };
                      delete next[pickedKey];
                      return next;
                    });
                    setFormuleringByPreparatKey((prev) => {
                      const next = { ...prev };
                      delete next[pickedKey];
                      return next;
                    });
                  }

                  removePreparatById(numericId);
                }}
              />
            </Box>

            {selected &&
              (templateHasTallToken(activeTemplateContent) ||
                templateHasKlokkeslettDagToken(activeTemplateContent) ||
                templateHasDatoToken(activeTemplateContent) ||
                templateHasDatoMndToken(activeTemplateContent) ||
                templateHasFormuleringTokens(activeTemplateContent)) && (
                <Box
                  sx={{
                    mt: 0.75,
                    mb: 1,
                    display: "grid",
                    gap: 0.75,
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg: "repeat(2, minmax(280px, 1fr))",
                      xl: "repeat(3, minmax(280px, 1fr))",
                    },
                    alignItems: "start",
                  }}
                >
                  {templateHasTallToken(activeTemplateContent) && (
                    <Paper
                      className={styles.inputControlCard}
                      elevation={0}
                      sx={{
                        p: 1,
                      }}
                    >
                      {(() => {
                        const tallIndices = getTallTokenIndices(activeTemplateContent);
                        const tallColumnsOnSm =
                          tallIndices.length > 1
                            ? "repeat(2, minmax(120px, 170px))"
                            : "minmax(120px, 170px)";

                        return (
                          <>
                            <Box
                              sx={{
                                display: "grid",
                                gap: 0.75,
                                gridTemplateColumns: {
                                  xs: "1fr",
                                  sm: tallColumnsOnSm,
                                },
                                alignItems: "start",
                                alignContent: "start",
                                gridAutoRows: "min-content",
                              }}
                            >
                              {tallIndices.map((idx) => {
                                const v = tallByIndex[idx] ?? "";
                                const tokenLabel = getTallFieldLabel(activeTemplateContent, idx);
                                const invalid = !isTallValueValid(v);

                                return (
                                  <TextField
                                    key={idx}
                                    label={tokenLabel}
                                    value={v}
                                    onChange={(e) => {
                                      const nextValue = e.target.value.replace(/[^\d.,]/g, "");
                                      setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                      if (
                                        errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten") ||
                                        errorLocal?.startsWith("Tallfelt må inneholde kun tall")
                                      ) {
                                        setErrorLocal(null);
                                      }
                                    }}
                                    size="small"
                                    type="text"
                                    error={invalid}
                                    helperText={invalid ? "Kun tall (f.eks. 1, 2, 2,5)" : undefined}
                                    slotProps={{
                                      htmlInput: {
                                        inputMode: "decimal",
                                      },
                                    }}
                                    onWheel={(e) => {
                                      (e.target as HTMLInputElement).blur();
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </>
                        );
                      })()}
                    </Paper>
                  )}

                  {templateHasKlokkeslettDagToken(activeTemplateContent) && (
                    <Paper
                      className={`${styles.inputControlCard} ${styles.timeDateCard}`}
                      elevation={0}
                      sx={{
                        order: 2,
                        p: 1,
                      }}
                    >
                      {(() => {
                        const selectedClockTime = CLOCK_TALL_OPTIONS.includes(
                          clockTime as (typeof CLOCK_TALL_OPTIONS)[number],
                        )
                          ? clockTime
                          : clockCustomMode
                            ? CUSTOM_CLOCK_VALUE
                            : "";

                        return (
                          <Box
                            sx={{
                              display: "grid",
                              gap: 1,
                              gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                md: clockCustomMode
                                  ? "repeat(3, minmax(0, 1fr))"
                                  : "repeat(2, minmax(0, 1fr))",
                              },
                              alignItems: "start",
                              justifyContent: "stretch",
                            }}
                          >
                            <TextField
                              select
                              label="Klokkeslett"
                              size="small"
                              sx={{ width: "100%", minWidth: 0 }}
                              value={selectedClockTime}
                              onChange={(e) => {
                                if (e.target.value === CUSTOM_CLOCK_VALUE) {
                                  setClockCustomMode(true);
                                  if (!clockTime) setClockTime(DEFAULT_CLOCK_TALL_TIME);
                                  setClockDay((prev) => prev ?? getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME));
                                } else {
                                  setClockCustomMode(true);
                                  setClockTime(e.target.value);
                                  setClockDay(getAutomaticClockTallDay(e.target.value));
                                }

                                if (
                                  errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten") ||
                                  errorLocal?.startsWith("Velg klokkeslett")
                                ) {
                                  setErrorLocal(null);
                                }
                              }}
                            >
                              <MenuItem value="">Velg klokkeslett</MenuItem>
                              {CLOCK_TALL_OPTIONS.map((time) => (
                                <MenuItem key={time} value={time}>
                                  kl. {time.slice(0, 2)}
                                </MenuItem>
                              ))}
                              <MenuItem value={CUSTOM_CLOCK_VALUE}>Skriv eget klokkeslett</MenuItem>
                            </TextField>

                            <TextField
                              select
                              label="Dag"
                              size="small"
                              sx={{ width: "100%", minWidth: 0 }}
                              value={clockDay}
                              onChange={(e) => {
                                setClockDay(e.target.value as ClockTallDay);
                                if (errorLocal?.startsWith("Velg klokkeslett")) {
                                  setErrorLocal(null);
                                }
                              }}
                            >
                              <MenuItem value="today">I dag</MenuItem>
                              <MenuItem value="tomorrow">I morgen</MenuItem>
                            </TextField>

                            {clockCustomMode && (
                              <TextField
                                label="Eget klokkeslett"
                                type="time"
                                size="small"
                                sx={{ width: "100%", minWidth: 0 }}
                                value={clockTime}
                                onChange={(e) => {
                                  const nextTime = e.target.value;
                                  setClockCustomMode(true);
                                  setClockTime(nextTime);
                                  if (nextTime) setClockDay(getAutomaticClockTallDay(nextTime));

                                  if (errorLocal?.startsWith("Velg klokkeslett")) {
                                    setErrorLocal(null);
                                  }
                                }}
                                slotProps={{
                                  inputLabel: { shrink: true },
                                  htmlInput: { step: 300 },
                                }}
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </Paper>
                  )}

                  {(templateHasDatoToken(activeTemplateContent) ||
                    templateHasDatoMndToken(activeTemplateContent)) && (
                    <Paper
                      className={`${styles.inputControlCard} ${styles.timeDateCard}`}
                      elevation={0}
                      sx={{
                        order: 1,
                        p: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: { xs: "1fr", sm: "170px 170px" },
                          alignItems: "start",
                        }}
                      >
                        <TextField
                          label="Velg dato"
                          type="date"
                          size="small"
                          inputRef={datoPickerInputRef}
                          value={
                            normalizedDato
                              ? `${normalizedDato.slice(4, 8)}-${normalizedDato.slice(
                                  2,
                                  4,
                                )}-${normalizedDato.slice(0, 2)}`
                              : ""
                          }
                          onChange={(e) => handleDatoPicker(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label="Velg måned"
                          type="month"
                          size="small"
                          inputRef={datoMndPickerInputRef}
                          onMouseDown={openDatoMndPicker}
                          onClick={openDatoMndPicker}
                          onKeyDown={(e) => {
                            // Month picker should be mouse-driven; keep Tab navigation intact.
                            if (e.key !== "Tab") e.preventDefault();
                          }}
                          value={
                            formattedDatoMnd
                              ? `${formattedDatoMnd.slice(3, 7)}-${formattedDatoMnd.slice(0, 2)}`
                              : ""
                          }
                          onChange={(e) => {
                            const iso = e.target.value; // YYYY-MM
                            if (!iso) {
                              setDatoInput("");
                              return;
                            }
                            const m = (iso ?? "").match(/^(\d{4})-(\d{2})$/);
                            if (!m) return;
                            const [, yyyy, mm] = m;
                            setDatoInput(`${mm}.${yyyy}`);

                            if (
                              errorLocal?.startsWith("Fyll inn dato") ||
                              errorLocal?.startsWith("Fyll inn måned/år")
                            ) {
                              setErrorLocal(null);
                            }
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    </Paper>
                  )}

                  {templateHasFormuleringTokens(activeTemplateContent) && (
                    <Paper
                      className={styles.inputControlCard}
                      elevation={0}
                      sx={{
                        p: 1,
                      }}
                    >
                      <Box sx={{ display: "grid", gap: 1 }}>
                        {getFormuleringTokenIndices(activeTemplateContent).map((idx) => {
                          const fieldLabel = idx === 0 ? "Formulering" : `Formulering ${idx}`;
                          const tokenLabel = idx === 0 ? "FORMULERING" : `FORMULERING${idx}`;
                          const value = formuleringByIndex[idx] ?? "";

                          return (
                            <Autocomplete
                              key={tokenLabel}
                              freeSolo
                              options={formuleringSuggestions}
                              value={null}
                              inputValue={value}
                              onChange={(_, v) => {
                                const nextValue = typeof v === "string" ? v : "";
                                setFormuleringByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                if (errorLocal?.startsWith("Fyll inn formulering")) {
                                  setErrorLocal(null);
                                }
                              }}
                              onInputChange={(_, v) => {
                                setFormuleringByIndex((prev) => ({ ...prev, [idx]: v }));

                                if (errorLocal?.startsWith("Fyll inn formulering")) {
                                  setErrorLocal(null);
                                }
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label={fieldLabel}
                                  size="small"
                                  placeholder={
                                    idx === 0 ? "F.eks. tablett, kapsel, nesespray" : "F.eks. tablett"
                                  }
                                  fullWidth
                                />
                              )}
                            />
                          );
                        })}
                      </Box>
                    </Paper>
                  )}
                </Box>
              )}
          </Box>

          {lockBeforeEdit && (
            <Alert severity="warning" sx={{ mb: 1.25, mt: 2 }}>
              Ny standardtekst kan ikke stå tom. Rediger eller slett før du kan fortsette.
            </Alert>
          )}

          <StandardTekstContent
            selected={selected}
            loading={loading}
            isAdmin={canManageStandardTekster}
            isEditing={isEditing}
            draftTitle={draftTitle}
            draftCategory={draftCategory}
            draftContent={draftContent}
            saving={saving || deleting}
            onDraftTitleChange={setDraftTitle}
            onDraftCategoryChange={setDraftCategory}
            onDraftContentChange={setDraftContent}
            onCancel={cancelEdit}
            onSave={saveEdit}
            onStartEdit={startEdit}
            onDelete={requestDelete}
            deleting={deleting}
            onCopy={copyBodyToClipboard}
            previewNode={renderContentWithPreparatHighlight(
              previewContent || "(Tom tekst)",
              preparatRows.map((r) => r.picked),
              {
                enableSecondaryHighlight: templateUsesPreparat1(activeTemplateContent),
                tallValues: (() => {
                  const indices = getTallTokenIndices(activeTemplateContent);
                  const arr: string[] = [];
                  for (const i of indices) {
                    arr[i] = (tallByIndex[i] ?? "").trim();
                  }
                  return arr;
                })(),
                klokkeslettDagValue: templateHasKlokkeslettDagToken(activeTemplateContent)
                  ? formatClockTallValue(clockTime, clockDay)
                  : "",
                datoValue: effectiveDato,
                datoMndValue: formattedDatoMnd,
                virkestoffValue: resolvedVirkestoff,
                formuleringValues: (() => {
                  const indices = getFormuleringTokenIndices(activeTemplateContent);
                  const arr: string[] = [];
                  for (const i of indices) {
                    arr[i] = resolveFormuleringTokenValue(i, activeTemplateContent);
                  }
                  return arr;
                })(),
                formuleringOccurrenceValues: buildUnnumberedFormuleringOccurrenceValues(
                  activeTemplateContent,
                ),
              },
            )}
            editorTools={
              canManageStandardTekster ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFollowUpsOpen(true);
                  }}
                >
                  Oppfølgingstekster
                </Button>
              ) : null
            }
            headerRight={!isEditing ? followUpsPreview : null}
            headerRightCount={selected?.followUps?.length ?? 0}
            categoryOptions={categoryOptions}
          />
        </Box>
      </Box>

      <Box className={styles.pageFooter}>
        {isAdmin && (
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={adminViewEnabled}
                onChange={(e) => setAdminViewEnabled(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                {adminViewEnabled ? "Admin view" : "User view"}
              </Typography>
            }
          />
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <span className={styles.preparatHintKeys}>
            <span className={styles.preparatHintKeyLabel}>Søk preparat:</span> Ctrl + S ·{" "}
            <span className={styles.preparatHintKeyLabel}>Tøm:</span> Escape
          </span>
        </Typography>

        <Button
          variant="text"
          size="small"
          onClick={() => setShowGuide((v) => !v)}
          className={styles.headerLinkButton}
        >
          {showGuide ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
        </Button>
      </Box>
      <Dialog open={followUpsOpen} onClose={() => setFollowUpsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Oppfølgingstekster</DialogTitle>
        <DialogContent>{followUpsEditor}</DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpsOpen(false)}>Lukk</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteOpen} onClose={closeDelete}>
        <DialogTitle>Slett standardtekst?</DialogTitle>
        <DialogContent>Dette kan ikke angres.</DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleting}>
            Avbryt
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Sletter..." : "Slett"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={copied}
        autoHideDuration={1500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopied(false)}
          severity="success"
          variant="filled"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 0.75,
            alignItems: "center",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 14px 34px rgba(2,6,18,0.56)"
                : "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          Standardtekst kopiert
        </Alert>
      </Snackbar>
    </Box>
  );
}
