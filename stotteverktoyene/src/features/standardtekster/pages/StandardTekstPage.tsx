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
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StandardTekstSidebar from "../components/StandardTekstSidebar";
import StandardTekstContent from "../components/StandardTekstContent";
import { standardTeksterApi } from "../services/standardTeksterApi";
import { useAuthUser } from "../../../app/auth/Auth";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  getTallTokenIndices,
  replaceNextPreparatToken,
  replaceTallTokenByIndex,
  templateHasDatoMndToken,
  templateHasDatoToken,
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

function getTallTokenRegex(index: number) {
  if (index === 0) {
    return /\{\{\s*TALL\s*\}\}|\bTALL\b/gi;
  }

  return new RegExp(`\\{\\{\\s*TALL${index}\\s*\\}\\}|\\bTALL${index}\\b`, "gi");
}

function templateTallTokenLooksLikeClock(template: string, index: number): boolean {
  const regex = getTallTokenRegex(index);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template ?? ""))) {
    const before = template.slice(Math.max(0, match.index - 24), match.index).toLowerCase();
    const after = template
      .slice(regex.lastIndex, Math.min((template ?? "").length, regex.lastIndex + 20))
      .toLowerCase();

    if (/\b(klokken|kl)\.?\s*$/.test(before)) return true;
    if (/^\s*i\s+(dag|morgen)\b/.test(after)) return true;
  }

  return false;
}

function parseClockTallValue(value: string): { time: string; day: ClockTallDay } | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?:\s+i\s+(dag|morgen))?$/i);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = match[2] ?? "00";
  const normalizedTime = `${String(hours).padStart(2, "0")}:${minutes}`;

  return {
    time: normalizedTime,
    day: match[3]?.toLowerCase() === "morgen" ? "tomorrow" : "today",
  };
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

function buildInitialTallValues(template: string, now = new Date()): Record<number, string> {
  const indices = getTallTokenIndices(template);
  if (!indices.length) return { 0: "" };

  const next: Record<number, string> = {};
  for (const index of indices) {
    next[index] = templateTallTokenLooksLikeClock(template, index)
      ? formatClockTallValue(DEFAULT_CLOCK_TALL_TIME, getAutomaticClockTallDay(DEFAULT_CLOCK_TALL_TIME, now))
      : "";
  }

  return next;
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
  const lockBeforeEdit = Boolean(selected && !isEditing && selected.title === "Ny standardtekst");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);

  const { preparatRows, resetPreparatRows, clearPreparats, addPickedPreparat, removePreparatById } =
    usePreparatRows();
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

  // For auto-focus glow effect on preparat / standardtekst search inputs
  const [autoFocusGlowTarget, setAutoFocusGlowTarget] = useState<"standard" | "preparat" | null>(
    null,
  );

  const triggerGlow = (target: "standard" | "preparat") => {
    setAutoFocusGlowTarget(target);
    window.setTimeout(() => setAutoFocusGlowTarget(null), 1000);
  };

  // Hotkeys for preparat search focus/clearing and standardtekster search focus
  useStandardTekstHotkeys({
    preparatRows,
    clearPreparats,
    preparatSearchInputRef,
    standardTekstSearchInputRef,
    clearNumbersAndDate: () => {
      // Reset tall fields based on the currently selected template
      setTallByIndex(buildInitialTallValues(selected?.content ?? ""));
      setCustomClockModeByIndex({});

      // Reset date input
      setDatoInput("");
      // Reset formulering fields based on the currently selected template
      const fIndices = getFormuleringTokenIndices(selected?.content ?? "");
      if (fIndices.length) {
        const nextF: Record<number, string> = {};
        for (const i of fIndices) nextF[i] = "";
        setFormuleringByIndex(nextF);
      } else {
        setFormuleringByIndex({ 0: "" });
      }
    },
  });

  const [tallByIndex, setTallByIndex] = useState<Record<number, string>>({ 0: "" });
  const [customClockModeByIndex, setCustomClockModeByIndex] = useState<Record<number, boolean>>({});
  const [datoInput, setDatoInput] = useState<string>("");
  const [formuleringByIndex, setFormuleringByIndex] = useState<Record<number, string>>({ 0: "" });
  const templateHasVirkestoffToken = (template: string) => /\bVIRKESTOFF\b/.test(template ?? "");
  const templateHasFormuleringTokens = (template: string) =>
    /\{\{\s*FORMULERING\d*\s*\}\}|\bFORMULERING\d*\b/i.test(template ?? "");

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

  const getTallFieldLabel = useCallback((template: string, index: number) => {
    const isClock = templateTallTokenLooksLikeClock(template, index);
    if (isClock) {
      return index === 0 ? "Klokkeslett" : `Klokkeslett ${index}`;
    }

    return index === 0 ? "Tall" : `Tall ${index}`;
  }, []);

  const getTallSectionTitle = useCallback((template: string) => {
    const indices = getTallTokenIndices(template);
    const clockCount = indices.filter((index) => templateTallTokenLooksLikeClock(template, index)).length;

    if (clockCount === 0) return "Tall i teksten";
    if (clockCount === indices.length) return "Tid i teksten";
    return "Tall og tid i teksten";
  }, []);

  // Lagrer virkestoff knyttet til valgt preparat (mappes på selve picked-teksten)
  const [virkestoffByPicked, setVirkestoffByPicked] = useState<Record<string, string>>({});

  const resolvedVirkestoff = useMemo(() => {
    for (const r of preparatRows as any[]) {
      const picked = String(r?.picked ?? "").trim();
      if (!picked) continue;
      const v = (virkestoffByPicked[picked] ?? "").trim();
      if (v) return v;
    }

    for (const v of Object.values(virkestoffByPicked)) {
      const s = (v ?? "").trim();
      if (s) return s;
    }

    return "";
  }, [preparatRows, virkestoffByPicked]);

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

  const [draftFollowUps, setDraftFollowUps] = useState<StandardTekstFollowUp[]>([]);
  const [followUpPick, setFollowUpPick] = useState<{ id: string; title: string } | null>(null);
  const [followUpLabel, setFollowUpLabel] = useState<string>("");

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
    const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return;
    const [, yyyy, mm, dd] = m;
    setDatoInput(`${dd}.${mm}.${yyyy}`);

    if (errorLocal?.startsWith("Fyll inn dato") || errorLocal?.startsWith("Fyll inn måned/år")) {
      setErrorLocal(null);
    }
  };

  // Preview content with preparats and tall
  const previewContent = useMemo(() => {
    if (!selected) return "";

    // IMPORTANT: Do NOT replace TALL tokens here.
    // We keep tokens (TALL/TALL1/…) intact so renderContentWithPreparatHighlight
    // can render them as blue chips using tallValues.
    let next = buildPreviewContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });

    // Do NOT replace VIRKESTOFF in previewContent; leave the token for renderer.

    return next;
  }, [selected, firstName, pickedPreparats, resolvedVirkestoff]);

  // Når valgt tekst endres, sync draft og avslutt redigering
  useEffect(() => {
    const shouldAutoEditNew = Boolean(isAdmin && selected && selected.title === "Ny standardtekst");
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
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
    } else {
      setDraftContent(selected?.content ?? "");
    }
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");

    if (shouldApplyOmeqPrefill && selected && pending) {
      resetPreparatRows();
      setVirkestoffByPicked({});

      for (const preparat of pending.preparats) {
        addPickedPreparat(preparat, preparat);
      }

      const nextTallValues = buildInitialTallValues(selected.content);
      nextTallValues[1] = pending.totalOmeq;
      setTallByIndex(nextTallValues);
      setCustomClockModeByIndex({});
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
      setVirkestoffByPicked({});
      setTallByIndex(buildInitialTallValues(selected?.content ?? ""));
      setCustomClockModeByIndex({});
      setDatoInput("");
      const fIndices = getFormuleringTokenIndices(selected?.content ?? "");
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
          triggerGlow("preparat");
        });
      }
    }

    // Always clear the flag after handling a selection change
    preserveInputsOnNextSelectRef.current = false;
  }, [
    addPickedPreparat,
    isAdmin,
    pendingOmeqPrefill,
    resetPreparatRows,
    selected,
    selectedId,
  ]);

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
      triggerGlow("standard");
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
    if (!selected) return;
    setDraftTitle(selected.title ?? "");
    setDraftCategory(selected.category ?? "");
    if (selected.title === "Ny standardtekst") {
      const base = selected.content ?? "";
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
    } else {
      setDraftContent(selected.content ?? "");
    }
    setDraftFollowUps((selected.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(selected?.title ?? "");
    setDraftCategory(selected?.category ?? "");
    setDraftContent(selected?.content ?? "");
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setErrorLocal(null);
    try {
      // If admin selected a follow-up but didn't press +, include it on save.
      const followUpsToSave: StandardTekstFollowUp[] = (() => {
        if (!followUpPick) return draftFollowUps;

        const label = followUpLabel.trim() || `Oppfølging: ${followUpPick.title}`;
        const exists = draftFollowUps.some((p) => p.id === followUpPick.id);
        if (exists) return draftFollowUps;

        return [...draftFollowUps, { id: followUpPick.id, label }];
      })();

      await standardTeksterApi.update(
        selected.id,
        {
          title: draftTitle,
          category: draftCategory.trim() || undefined,
          content: draftContent,
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
                content: draftContent,
                followUps: followUpsToSave,
                updatedByName: actor?.name ?? it.updatedByName,
                updatedAt: new Date(),
              }
            : it,
        ),
      );

      // Sync local draft + clear add-form
      setDraftFollowUps(followUpsToSave);
      setFollowUpPick(null);
      setFollowUpLabel("");

      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved lagring";
      setErrorLocal(message);
    } finally {
      setSaving(false);
    }
  };

  const createNewStandardTekst = async () => {
    if (!isAdmin) return;

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
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
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
      "tablett",
      "tabletter",
      "kapsel",
      "kapsler",
      "nesespray",
      "øyedråper",
      "ørerdråper",
      "mikstur",
      "sirup",
      "dråper",
      "sprøyte",
      "injeksjon",
      "inhalasjonspulver",
      "inhalasjonsvæske",
      "inhalator",
      "pulver til mikstur",
      "brusetablett",
      "smeltetablett",
      "depottablett",
      "sublingvaltablett",
      "stikkpille",
      "krem",
      "salve",
      "gel",
      "liniment",
      "plaster",
      "depotplaster",
      "spray",
      "munnskyllevæske",
      "munnspray",
      "sugetablett",
      "vaginaltablett",
      "vaginalkrem",
      "vaginalring",
    ],
    [],
  );

  const followUpOptions = useMemo(() => {
    return (items ?? [])
      .filter((t) => t.id !== selected?.id)
      .map((t) => ({ id: t.id, title: t.title }));
  }, [items, selected?.id]);

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
      if (prev.some((p) => p.id === followUpPick.id)) return prev;
      return [...prev, { id: followUpPick.id, label }];
    });

    setFollowUpPick(null);
    setFollowUpLabel("");
  };

  const removeFollowUp = (id: string) => {
    setDraftFollowUps((prev) => prev.filter((p) => p.id !== id));
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

      {draftFollowUps.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
          {draftFollowUps.map((fu) => (
            <Chip
              key={fu.id}
              label={fu.label}
              onClick={() => openFollowUp(fu.id)}
              onDelete={isAdmin && isEditing ? () => removeFollowUp(fu.id) : undefined}
              deleteIcon={isAdmin && isEditing ? <DeleteOutlineIcon /> : undefined}
              icon={<OpenInNewIcon />}
              variant="outlined"
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
          onChange={(_, v) => setFollowUpPick(v)}
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
          aria-label="Legg til oppfølging"
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
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {(selected.followUps as StandardTekstFollowUp[]).map((fu: StandardTekstFollowUp) => (
        <Chip
          key={fu.id}
          label={fu.label}
          onClick={(e) => {
            e.stopPropagation();
            openFollowUp(fu.id);
          }}
          icon={<OpenInNewIcon />}
          variant="outlined"
          size="small"
        />
      ))}
    </Stack>
  ) : null;

  const copyBodyToClipboard = async () => {
    if (!selected) return;
    if (isEditing) return;

    // If the user has marked (selected) text, do NOT auto-copy the full template.
    // This keeps normal text selection + Ctrl/Cmd+C working.
    const selectionText = window.getSelection?.()?.toString() ?? "";
    if (selectionText.trim().length > 0) {
      return;
    }

    // Prevent copying if the template requires a number and it hasn't been filled in.
    if (templateHasTallToken(selected.content)) {
      const indices = getTallTokenIndices(selected.content);
      const missing = indices.filter((i) => !(tallByIndex[i] ?? "").trim());
      if (missing.length) {
        const label = missing.map((i) => getTallFieldLabel(selected.content, i)).join(", ");
        setErrorLocal(`Fyll inn feltet før du kopierer teksten: ${label}.`);
        return;
      }
    }

    if (templateHasVirkestoffToken(selected.content) && !resolvedVirkestoff) {
      setErrorLocal("Velg et preparat med virkestoff før du kopierer teksten.");
      return;
    }
    if (templateHasFormuleringTokens(selected.content)) {
      const indices = getFormuleringTokenIndices(selected.content);
      const missing = indices.filter((i) => !(formuleringByIndex[i] ?? "").trim());
      if (missing.length) {
        const label = missing.map((i) => (i === 0 ? "FORMULERING" : `FORMULERING${i}`)).join(", ");
        setErrorLocal(`Fyll inn formulering før du kopierer teksten: ${label}.`);
        return;
      }
    }

    // Build base text
    let text = buildPreviewContent({
      template: selected.content,
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
      if (pickedPreparats.length > 1 && !/\bPREPARAT2\b/.test(selected.content)) {
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

    // Replace each TALL token individually (TALL, TALL1, TALL2…)
    if (templateHasTallToken(selected.content)) {
      for (const idx of getTallTokenIndices(selected.content)) {
        const v = (tallByIndex[idx] ?? "").trim();
        if (!v) continue;
        text = replaceTallTokenByIndex(text, idx, v);
      }
    }

    // Replace VIRKESTOFF token (based on picked preparat)
    if (templateHasVirkestoffToken(selected.content) && resolvedVirkestoff) {
      text = text.replace(/\bVIRKESTOFF\b/g, resolvedVirkestoff);
    }

    // Replace FORMULERING tokens (free text) by index (FORMULERING, FORMULERING1, ...)
    if (templateHasFormuleringTokens(selected.content)) {
      for (const idx of getFormuleringTokenIndices(selected.content)) {
        const v = (formuleringByIndex[idx] ?? "").trim();
        if (!v) continue;
        text = replaceFormuleringTokenByIndex(text, idx, v);
      }
    }

    text = (text ?? "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (clearOnCopy) {
        clearPreparats();
        setVirkestoffByPicked({});

        if (templateHasTallToken(selected.content)) {
          setTallByIndex(buildInitialTallValues(selected.content));
        } else {
          setTallByIndex({ 0: "" });
        }
        setCustomClockModeByIndex({});

        setSearch("");
        setDatoInput("");
        if (templateHasFormuleringTokens(selected.content)) {
          const fIndices = getFormuleringTokenIndices(selected.content);
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

      // Focus back to preparat search for fast next use
      requestAnimationFrame(() => {
        preparatSearchInputRef.current?.focus();
        preparatSearchInputRef.current?.select?.();
      });

      return;
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

        if (clearOnCopy) {
          clearPreparats();
          setVirkestoffByPicked({});

          if (templateHasTallToken(selected.content)) {
            setTallByIndex(buildInitialTallValues(selected.content));
          } else {
            setTallByIndex({ 0: "" });
          }
          setCustomClockModeByIndex({});

          setSearch("");
          setDatoInput("");
          if (templateHasFormuleringTokens(selected.content)) {
            const fIndices = getFormuleringTokenIndices(selected.content);
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

        requestAnimationFrame(() => {
          preparatSearchInputRef.current?.focus();
          preparatSearchInputRef.current?.select?.();
        });
      } catch {
        // ignore
      }
    }
  };

  const requestDelete = () => {
    if (!selected) return;
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
  };

  const confirmDelete = async () => {
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

  return (
    <Box className={styles.page}>
      <Box className={styles.header}>
        <Box>
          <Typography variant="h1">Standardtekster</Typography>
        </Box>

        <Box className={styles.headerActions}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <span className={styles.preparatHintKeys}>
              <span className={styles.preparatHintKeyLabel}>Søk tekst:</span> Ctrl+S ·{" "}
              <span className={styles.preparatHintKeyLabel}>Søk preparat:</span> Ctrl+Shift+F ·{" "}
              <span className={styles.preparatHintKeyLabel}>Tøm:</span> Escape
            </span>
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowGuide((v) => !v)}
            className={styles.headerLinkButton}
            endIcon={
              <ExpandMoreIcon className={showGuide ? styles.expandIconOpen : styles.expandIcon} />
            }
          >
            {showGuide ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
          </Button>
        </Box>
      </Box>

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
            {isAdmin && <li>Som admin kan du opprette, redigere og slette standardtekster, og se hvem som opprettet og sist oppdaterte teksten.</li>}
          </Box>
        </Paper>
      </Collapse>

      <Box
        ref={gridRef}
        className={styles.grid}
        style={{ ["--sidebar-width" as any]: `${sidebarWidth}px` }}
      >
        <Box
          className={[
            styles.sidebar,
            autoFocusGlowTarget === "standard" ? styles.autoFocusGlow : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <StandardTekstSidebar
            disabled={lockBeforeEdit}
            isAdmin={isAdmin}
            creating={creating}
            onCreate={createNewStandardTekst}
            search={search}
            setSearch={setSearch}
            loading={loading}
            filtered={filtered}
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

            <Box
              ref={preparatSectionRef}
              className={autoFocusGlowTarget === "preparat" ? styles.autoFocusGlow : undefined}
            >
              <PreparatPanel
                preparatRows={preparatRows}
                clearOnCopy={clearOnCopy}
                includeManufacturerInText={includeManufacturerInPreparatText}
                includePackSizeInText={includePackSizeInPreparatText}
                onClearOnCopyChange={setClearOnCopy}
                onIncludeManufacturerInTextChange={setIncludeManufacturerInPreparatText}
                onIncludePackSizeInTextChange={setIncludePackSizeInPreparatText}
                inputRef={preparatSearchInputRef}
                onPickText={(pick) => {
                  const text = typeof pick === "string" ? pick : pick.text;
                  const key = typeof pick === "string" ? pick : pick.key;

                  addPickedPreparat(text, key);

                  // Hvis pick har virkestoff (FEST har vanligvis dette), lagre det for VIRKESTOFF-tokenet
                  if (typeof pick !== "string") {
                    const vRaw =
                      (pick as any)?.virkestoff ??
                      (pick as any)?.original?.virkestoff ??
                      (pick as any)?.med?.virkestoff ??
                      (pick as any)?.data?.virkestoff;
                    const v = typeof vRaw === "string" ? vRaw.trim() : "";
                    if (text && v) {
                      setVirkestoffByPicked((prev) => ({ ...prev, [String(text)]: v }));

                      if (errorLocal?.startsWith("Velg et preparat med virkestoff")) {
                        setErrorLocal(null);
                      }
                    }
                  }

                  if (isEditing) {
                    setDraftContent((prev) => replaceNextPreparatToken(prev, text));
                  }
                }}
                onClear={() => {
                  clearPreparats();
                  setVirkestoffByPicked({});
                }}
                onRemove={(id) => {
                  const numericId = typeof id === "number" ? id : Number(id);

                  // Fjern evt lagret virkestoff knyttet til denne raden før vi fjerner raden
                  const row = (preparatRows as any[]).find((r) => Number(r?.id) === numericId);
                  const picked = String(row?.picked ?? "").trim();
                  if (picked) {
                    setVirkestoffByPicked((prev) => {
                      const next = { ...prev };
                      delete next[picked];
                      return next;
                    });
                  }

                  removePreparatById(numericId);
                }}
              />
            </Box>

            {selected && templateHasTallToken(selected.content) && (
              <Paper
                elevation={0}
                sx={{
                  mt: 1,
                  mb: 1.5,
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  {getTallSectionTitle(selected.content)}
                </Typography>

                {(() => {
                  const tallIndices = getTallTokenIndices(selected.content);

                  return (
                    <>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(auto-fit, minmax(180px, 220px))",
                          },
                          alignItems: "start",
                        }}
                      >
                        {tallIndices.map((idx) => {
                          const v = tallByIndex[idx] ?? "";
                          const isClockField = templateTallTokenLooksLikeClock(selected.content, idx);
                          const tokenLabel = getTallFieldLabel(selected.content, idx);

                          if (isClockField) {
                            const parsedClock = parseClockTallValue(v) ?? {
                              time: "",
                              day: "today" as ClockTallDay,
                            };
                            const isCustomClockTime =
                              Boolean(parsedClock.time) &&
                              !CLOCK_TALL_OPTIONS.includes(
                                parsedClock.time as (typeof CLOCK_TALL_OPTIONS)[number],
                              );
                            const isCustomClockMode =
                              Boolean(customClockModeByIndex[idx]) || isCustomClockTime;
                            const selectedClockTime = CLOCK_TALL_OPTIONS.includes(
                              parsedClock.time as (typeof CLOCK_TALL_OPTIONS)[number],
                            )
                              ? parsedClock.time
                              : isCustomClockMode
                                ? CUSTOM_CLOCK_VALUE
                                : "";

                            return (
                              <Box
                                key={idx}
                                sx={{
                                  display: "grid",
                                  gap: 1,
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: isCustomClockMode ? "180px 140px 180px" : "180px 140px",
                                  },
                                  alignItems: "start",
                                }}
                              >
                                <TextField
                                  select
                                  label={tokenLabel}
                                  size="small"
                                  value={selectedClockTime}
                                  onChange={(e) => {
                                    if (e.target.value === CUSTOM_CLOCK_VALUE) {
                                      setCustomClockModeByIndex((prev) => ({ ...prev, [idx]: true }));
                                      const nextTime = parsedClock.time || DEFAULT_CLOCK_TALL_TIME;
                                      const nextValue = formatClockTallValue(nextTime, parsedClock.day);
                                      setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));
                                    } else {
                                      setCustomClockModeByIndex((prev) => ({ ...prev, [idx]: false }));
                                      const nextDay = getAutomaticClockTallDay(e.target.value);
                                      const nextValue = formatClockTallValue(e.target.value, nextDay);
                                      setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));
                                    }

                                    if (errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten")) {
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
                                  value={parsedClock.day}
                                  onChange={(e) => {
                                    const nextDay = e.target.value as ClockTallDay;
                                    const nextValue = formatClockTallValue(parsedClock.time, nextDay);
                                    setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                    if (errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten")) {
                                      setErrorLocal(null);
                                    }
                                  }}
                                >
                                  <MenuItem value="today">I dag</MenuItem>
                                  <MenuItem value="tomorrow">I morgen</MenuItem>
                                </TextField>

                                {isCustomClockMode && (
                                  <TextField
                                    label="Eget klokkeslett"
                                    type="time"
                                    size="small"
                                    value={parsedClock.time}
                                    onChange={(e) => {
                                      const nextTime = e.target.value;
                                      setCustomClockModeByIndex((prev) => ({ ...prev, [idx]: true }));

                                      const nextValue = nextTime
                                        ? formatClockTallValue(
                                            nextTime,
                                            getAutomaticClockTallDay(nextTime),
                                          )
                                        : "";
                                      setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                      if (errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten")) {
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
                          }

                          return (
                            <TextField
                              key={idx}
                              label={tokenLabel}
                              value={v}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                if (errorLocal?.startsWith("Fyll inn feltet før du kopierer teksten")) {
                                  setErrorLocal(null);
                                }
                              }}
                              size="small"
                              type="text"
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
            {selected &&
              (templateHasDatoToken(selected.content) ||
                templateHasDatoMndToken(selected.content)) && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 1,
                    mb: 1.5,
                    p: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Dato i teksten
                  </Typography>

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
                      value={
                        formattedDatoMnd
                          ? `${formattedDatoMnd.slice(3, 7)}-${formattedDatoMnd.slice(0, 2)}`
                          : ""
                      }
                      onChange={(e) => {
                        const iso = e.target.value; // YYYY-MM
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
            {selected && templateHasFormuleringTokens(selected.content) && (
              <Paper
                elevation={0}
                sx={{
                  mt: 1,
                  mb: 1.5,
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Formulering i teksten
                </Typography>

                <Box sx={{ display: "grid", gap: 1 }}>
                  {getFormuleringTokenIndices(selected.content).map((idx) => {
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

          {lockBeforeEdit && (
            <Alert severity="warning" sx={{ mb: 1.25, mt: 2 }}>
              Ny standardtekst kan ikke stå tom. Rediger eller slett før du kan fortsette.
            </Alert>
          )}

          <StandardTekstContent
            selected={selected}
            loading={loading}
            isAdmin={isAdmin}
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
                enableSecondaryHighlight: templateUsesPreparat1(selected?.content ?? ""),
                tallValues: getTallTokenIndices(selected?.content ?? "").map((i) => {
                  const v = (tallByIndex[i] ?? "").trim();
                  return v;
                }),
                datoValue: effectiveDato,
                datoMndValue: formattedDatoMnd,
                virkestoffValue: resolvedVirkestoff,
                formuleringValues: (() => {
                  const indices = getFormuleringTokenIndices(selected?.content ?? "");
                  const arr: string[] = [];
                  for (const i of indices) {
                    arr[i] = (formuleringByIndex[i] ?? "").trim();
                  }
                  return arr;
                })(),
              },
            )}
            editorTools={
              isAdmin ? (
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
            categoryOptions={categoryOptions}
          />
        </Box>
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
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          Standardtekst kopiert
        </Alert>
      </Snackbar>
    </Box>
  );
}
