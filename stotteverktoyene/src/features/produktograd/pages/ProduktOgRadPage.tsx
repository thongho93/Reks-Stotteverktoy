import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { arrayMove } from "@dnd-kit/sortable";
import { useLocation } from "react-router-dom";
import NutritionProductFinder from "../components/NutritionProductFinder";
import KnuseDelisteTab from "../components/KnuseDelisteTab";
import TryggmammaTab from "../components/TryggmammaTab";
import MelkeerstatningTab from "../components/MelkeerstatningTab";
import TilbakemeldingPage from "../../tilbakemelding/pages/TilbakemeldingPage";
import FagligDocView, { type FagligDocViewDoc } from "../components/FagligDocView";
import FagligTabBar, {
  PRODUCT_TAB_KEY,
  ROUTINES_TAB_KEY,
  type FagligTabBarHandle,
  type FagligTabItem,
} from "../components/FagligTabBar";
import { fitToPageBottom } from "../fitToPageBottom";
import AdviceGroupList from "../components/AdviceGroupList";
import AdviceStartView from "../components/AdviceStartView";
import { ATC_INGREDIENT, brandLabel, groupByAtc, type AdviceProduct } from "../data/adviceProducts";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  ListItemText,
  Popover,
  IconButton,
  InputBase,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import { AccentSelection } from "../../../styles/AccentSelection";
import {
  addDoc,
  collection,
  deleteDoc,
  doc as docRef,
  onSnapshot,
  orderBy,
  query as fsQuery,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import { useAuthUser } from "../../../app/auth/useAuthUser";
import { db } from "../../../firebase/firebase";
import { FAGLIG_DOC_QUERY_KEY, ROUTINE_TAB_QUERY_KEY, ROUTINE_DOC_QUERY_KEY } from "../queryKeys";
import { MIGRENE_TAB_ID, VIRTUAL_TAB_LABELS, isVirtualTabId, orderTabIds } from "../fagligTabs";
import { PAGE_GUTTER_X, PAGE_MAX_WIDTH } from "../../../app/pageLayout";

type AdviceProductRow = {
  id: string;
  name: string;
  atcCode: string;
  farmaloggNumber: string;
  sku: string;
  advicePoints: string[];
};

type FagligDocument = {
  id: string;
  title: string;
  kind: "pdf" | "text";
  content: string;
  url: string | null;
  uploaded: boolean;
  parentId?: string | null;
  emoji?: string | null;
};

const normalizeSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toDigits = (value: string): string => value.replace(/\D+/g, "");
const NUMERIC_QUERY_RE = /^\d+$/;
// Auto-paste recognition: a varenummer is pure digits (max 6), an ATC-code is L NN LL NN.
const VNR_PASTE_RE = /^\d{1,6}$/;
const ATC_CODE_RE = /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/;
const FAGLIG_EMOJI_OPTIONS = ["😀", "📄", "📌", "🚚", "💊", "🧾", "⚠️", "✅", "⭐", "📝", "🔗", "🧠"];

const IFRAME_SRC_RE = /src\s*=\s*["']([^"']+)["']/i;
const IFRAME_TITLE_RE = /title\s*=\s*["']([^"']+)["']/i;

const buildSearchBlob = (row: AdviceProductRow): AdviceProduct => {
  const atc = (row.atcCode ?? "").toUpperCase().trim();
  const farmalogg = String(row.farmaloggNumber ?? "").trim();
  const sku = String(row.sku ?? "").trim();

  return {
    ...row,
    atcCode: atc,
    farmaloggNumber: farmalogg,
    sku,
    advicePoints: Array.isArray(row.advicePoints)
      ? row.advicePoints.map((item) => item.trim()).filter(Boolean)
      : [],
    farmaloggDigits: toDigits(farmalogg),
    skuDigits: toDigits(sku),
    searchBlob: normalizeSearch([row.name, atc, farmalogg, sku].join(" ")),
  };
};

const fetchAdviceRows = async (): Promise<AdviceProductRow[]> => {
  // Cache per Cache-Control (see public/_headers); no-store forced a 6.9 MB re-download every visit.
  const response = await fetch("/data/pharmacistAdviceData.json", { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Kunne ikke laste datafilen (${response.status}).`);
  }

  const parsed: unknown = await response.json();
  return Array.isArray(parsed) ? (parsed as AdviceProductRow[]) : [];
};

const matchesQuery = (product: AdviceProduct, terms: string[]): boolean => {
  if (terms.length === 0) return true;

  return terms.every((term) => {
    if (product.searchBlob.includes(term)) return true;

    // Only do digit-only fallback when the term is purely numeric (not ATC codes like R05CB01)
    const termDigits = toDigits(term);
    if (!termDigits || termDigits !== term) return false;

    return product.farmaloggDigits.includes(termDigits) || product.skuDigits.includes(termDigits);
  });
};

const mapFirebaseError = (error: unknown, fallback: string) => {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  if (code.includes("permission-denied")) return "Mangler tilgang i Firebase (permission-denied).";
  if (code.includes("unauthenticated")) return "Du må være innlogget for å lagre dokumenter.";
  if (typeof (error as { message?: unknown })?.message === "string") return String((error as { message: string }).message);
  return fallback;
};

const parseEmbedInput = (rawInput: string): { url: string; suggestedTitle: string } | null => {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let url = trimmed;
  let suggestedTitle = "Innebygd dokument";

  if (/<iframe/i.test(trimmed)) {
    const srcMatch = trimmed.match(IFRAME_SRC_RE);
    if (!srcMatch?.[1]) return null;
    url = srcMatch[1].trim();
    const titleMatch = trimmed.match(IFRAME_TITLE_RE);
    if (titleMatch?.[1]?.trim()) suggestedTitle = titleMatch[1].trim();
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return { url: parsed.toString(), suggestedTitle };
  } catch {
    return null;
  }
};




// Fast fane: PDF-en følger appen (public/dokumenter) og trenger ikke Firestore.
const MIGRENE_DOC: FagligDocViewDoc = {
  id: MIGRENE_TAB_ID,
  title: "Legemidler ved migrenebehandling",
  kind: "pdf",
  content: "",
  url: "/dokumenter/Legemidler%20ved%20migrenebehandling.pdf",
};

const searchProducts = (list: AdviceProduct[], query: string): AdviceProduct[] => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return list;

  const numericOnly = NUMERIC_QUERY_RE.test(normalizedQuery);
  if (numericOnly) {
    const digits = toDigits(normalizedQuery);
    // Strip leading zeros so "060387" matches stored "60387"
    const digitsNorm = digits.replace(/^0+/, "") || digits;
    const exact = list.filter(
      (product) =>
        product.farmaloggDigits === digits ||
        product.farmaloggDigits === digitsNorm ||
        product.skuDigits === digits ||
        product.skuDigits === digitsNorm
    );
    if (exact.length > 0) return exact;

    return list.filter(
      (product) =>
        product.farmaloggDigits.startsWith(digits) ||
        product.farmaloggDigits.startsWith(digitsNorm) ||
        product.skuDigits.startsWith(digits) ||
        product.skuDigits.startsWith(digitsNorm) ||
        product.farmaloggDigits.includes(digits) ||
        product.farmaloggDigits.includes(digitsNorm) ||
        product.skuDigits.includes(digits) ||
        product.skuDigits.includes(digitsNorm)
    );
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return list.filter((product) => matchesQuery(product, terms));
};

export default function ProduktOgRadPage() {
  const { user } = useAuthUser();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const PINK = "#C93586";
  const pinkTheme = useMemo(() => createTheme(theme, { palette: { primary: theme.palette.augmentColor({ color: { main: PINK } }) } }), [theme]);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastAutoPastedRef = useRef<string | null>(null);
  const tabBarRef = useRef<FagligTabBarHandle | null>(null);
  const fillRef = useMemo(() => fitToPageBottom(8), []);
  const fagligTitleInputRef = useRef<HTMLInputElement | null>(null);
  const textSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return 0;
    const params = new URLSearchParams(window.location.search);
    if (params.get(ROUTINE_TAB_QUERY_KEY) === "rutiner" || params.has(ROUTINE_DOC_QUERY_KEY)) return 2;
    if (params.has(FAGLIG_DOC_QUERY_KEY)) return 1;
    return 0;
  });
  const [query, setQuery] = useState("");
  const [onlyWithAdvice, setOnlyWithAdvice] = useState<boolean>(() => {
    try { return localStorage.getItem("produktograd-kun-med-rad") !== "false"; } catch { return true; }
  });

  // Sync active tab from URL params (priority) or location.state (command palette / explicit navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get(ROUTINE_TAB_QUERY_KEY) === "rutiner" || params.has(ROUTINE_DOC_QUERY_KEY)) {
      setActiveTab(2);
      return;
    }
    if (params.has(FAGLIG_DOC_QUERY_KEY)) {
      setActiveTab(1);
      // Sidemenyen lenker direkte til en fane (fast eller eget dokument). Ukjente id-er
      // rettes opp av effekten som velger første dokument når listen er lastet.
      const docId = params.get(FAGLIG_DOC_QUERY_KEY);
      if (docId) setSelectedFagligDocId(docId);
      return;
    }
    // No URL params: use location.state (command palette) or default to tab 0
    const state = location.state as {
      searchQuery?: string;
      activeTab?: number;
      selectedFagligDocId?: string;
    } | null;
    const searchQuery = state?.searchQuery;
    const stateSelectedFagligDocId =
      typeof state?.selectedFagligDocId === "string" && state.selectedFagligDocId.trim()
        ? state.selectedFagligDocId.trim()
        : null;
    const openFagligTab = state?.activeTab === 1 || Boolean(stateSelectedFagligDocId);

    if (openFagligTab) {
      setActiveTab(1);
      if (stateSelectedFagligDocId) {
        setSelectedFagligDocId(stateSelectedFagligDocId);
      }
    } else {
      setActiveTab(0);
    }

    if (searchQuery) {
      setQuery(searchQuery);
      if (!openFagligTab) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
  }, [location.search, location.state]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdviceProduct[]>([]);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [fagligDocs, setFagligDocs] = useState<FagligDocument[]>([]);
  const [isFagligLoading, setIsFagligLoading] = useState(true);
  const [selectedFagligDocId, setSelectedFagligDocId] = useState<string | null>("__nutrition__");
  const [fagligDocMenuAnchorEl, setFagligDocMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [fagligDocMenuTargetId, setFagligDocMenuTargetId] = useState<string | null>(null);
  const [fagligEmojiAnchorEl, setFagligEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const [fagligEmojiTargetId, setFagligEmojiTargetId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDialogValue, setRenameDialogValue] = useState("");
  const [renameDialogTargetId, setRenameDialogTargetId] = useState<string | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedDialogUrl, setEmbedDialogUrl] = useState("");
  const [embedDialogTitle, setEmbedDialogTitle] = useState("");
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("faglig-sidebar-order") ?? "[]"); } catch { return []; }
  });
  // Faner brukeren selv har flyttet til «Flere».
  const [moreTabIds, setMoreTabIds] = useState<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem("faglig-tabs-more") ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user?.uid) {
      setFagligDocs([]);
      setSelectedFagligDocId(null);
      setIsFagligLoading(false);
      return;
    }

    setIsFagligLoading(true);
    const docsRef = collection(db, "fagligDocuments");
    const unsub = onSnapshot(
      fsQuery(docsRef, orderBy("updatedAtMs", "desc")),
      (snapshot) => {
        const docs: FagligDocument[] = snapshot.docs.map((snap) => {
          const data = snap.data() as Record<string, unknown>;
          const kind = data.kind === "pdf" ? "pdf" : "text";
          return {
            id: snap.id,
            title: String(data.title ?? "Nytt dokument").trim() || "Nytt dokument",
            kind,
            content: kind === "text" ? String(data.content ?? "") : "",
            url: kind === "pdf" ? String(data.pdfUrl ?? "") || null : null,
            uploaded: kind === "pdf",
            parentId: typeof data.parentId === "string" ? data.parentId : null,
            emoji: typeof data.emoji === "string" ? data.emoji : null,
          };
        });
        setFagligDocs(docs);
        setIsFagligLoading(false);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setCopiedMessage(mapFirebaseError(snapshotError, "Klarte ikke å laste dokumenter."));
        setFagligDocs([]);
        setIsFagligLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const rows = await fetchAdviceRows();
        if (!active) return;

        setProducts(rows.map(buildSearchBlob));
      } catch (loadError) {
        if (!active) return;
        setError("Klarte ikke å laste produkt- og rådsdata.");
        console.error(loadError);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const productsWithAdvice = useMemo(() => products.filter((product) => product.advicePoints.length > 0), [products]);
  const searchPool = onlyWithAdvice ? productsWithAdvice : products;
  const filtered = useMemo(() => searchProducts(searchPool, query), [searchPool, query]);
  const groups = useMemo(() => (query.trim() ? groupByAtc(filtered) : []), [filtered, query]);
  const substanceCount = useMemo(() => new Set(groups.map((group) => group.atcCode || group.key)).size, [groups]);
  const searchKind = (() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    if (ATC_CODE_RE.test(trimmed.toUpperCase())) return "ATC-kode";
    if (NUMERIC_QUERY_RE.test(trimmed)) return "varenr./SKU";
    return null;
  })();
  // Treff som skjules av «Kun produkter med råd» – brukes til å tilby «Vis alle».
  const hiddenMatchCount = useMemo(
    () => (onlyWithAdvice && query.trim() && filtered.length === 0 ? searchProducts(products, query).length : 0),
    [onlyWithAdvice, products, query, filtered.length]
  );

  const topAtcCodes = useMemo(() => {
    const byCode = new Map<string, string[]>();
    for (const p of products) {
      if (!p.atcCode) continue;
      const names = byCode.get(p.atcCode);
      if (names) names.push(p.name);
      else byCode.set(p.atcCode, [p.name]);
    }
    return [...byCode.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([code, names]) => ({ code, title: ATC_INGREDIENT[code] ?? (brandLabel(names) || code), count: names.length }));
  }, [products]);
  const selectedFagligDoc = useMemo(() => {
    if (isVirtualTabId(selectedFagligDocId)) return null;
    if (selectedFagligDocId) {
      const exact = fagligDocs.find((doc) => doc.id === selectedFagligDocId);
      if (exact) return exact;
    }
    return fagligDocs[0] ?? null;
  }, [fagligDocs, selectedFagligDocId]);
  const fagligDocById = useMemo(() => new Map(fagligDocs.map((doc) => [doc.id, doc])), [fagligDocs]);

  // Rekkefølgen på alle dokumentfaner (faste og egne). Faste faner som mangler i en gammel lagret
  // rekkefølge settes først, nye dokumenter sist.
  const orderedTabIds = useMemo(
    () => orderTabIds(fagligDocs.map((doc) => doc.id), sidebarOrder),
    [fagligDocs, sidebarOrder]
  );

  const fagligDocMenuOpen = Boolean(fagligDocMenuAnchorEl);
  const fagligEmojiPopoverOpen = Boolean(fagligEmojiAnchorEl);
  const fagligDocMenuTarget = useMemo(
    () => (fagligDocMenuTargetId ? fagligDocs.find((doc) => doc.id === fagligDocMenuTargetId) ?? null : null),
    [fagligDocMenuTargetId, fagligDocs]
  );
  const fagligEmojiTarget = useMemo(
    () => (fagligEmojiTargetId ? fagligDocs.find((doc) => doc.id === fagligEmojiTargetId) ?? null : null),
    [fagligEmojiTargetId, fagligDocs]
  );

  useEffect(() => {
    if (isFagligLoading) return;
    // Built-in virtual tabs — never auto-replace them
    if (isVirtualTabId(selectedFagligDocId)) return;
    if (fagligDocs.length === 0) {
      setSelectedFagligDocId(null);
      return;
    }
    if (!selectedFagligDocId || !fagligDocs.some((doc) => doc.id === selectedFagligDocId)) {
      setSelectedFagligDocId(fagligDocs[0].id);
    }
  }, [fagligDocs, isFagligLoading, selectedFagligDocId]);

  useEffect(() => {
    try { localStorage.setItem("produktograd-kun-med-rad", String(onlyWithAdvice)); } catch { /* ignore */ }
  }, [onlyWithAdvice]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const deepLinkId = url.searchParams.get(FAGLIG_DOC_QUERY_KEY);
    if (!deepLinkId) return;

    const exists = fagligDocs.some((doc) => doc.id === deepLinkId);
    if (exists) setSelectedFagligDocId(deepLinkId);
  }, [fagligDocs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "s") {
        if (activeTab === 2) return;

        event.preventDefault();
        if (activeTab === 1) {
          tabBarRef.current?.openAllTabs();
          return;
        }

        if (activeTab !== 0) setActiveTab(0);
        requestAnimationFrame(() => {
          const input = searchInputRef.current;
          if (!input) return;
          input.focus();
          input.select();
        });
        return;
      }

      // Mellomrom setter markøren i søkefeltet – men bare når ingenting annet har fokus,
      // slik at mellomrom fortsatt aktiverer knapper og fungerer i dialoger og tekstfelt.
      if (event.key === " " && activeTab === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        if (event.target !== document.body) return;
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        if (!query) return;
        event.preventDefault();
        setQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, query]);

  useEffect(() => {
    return () => {
      if (textSaveTimerRef.current) clearTimeout(textSaveTimerRef.current);
    };
  }, []);

  const copyPlainText = async (value: string): Promise<boolean> => {
    if (!value) return false;

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    }
  };

  // When the search field gains focus, auto-paste the clipboard if it looks like a
  // varenummer (max 6 digits) or an ATC-code. A newly detected VNR/ATC-code replaces
  // whatever is currently in the field; the same clipboard value is never re-pasted
  // twice (so the user can clear or edit the field without it snapping back).
  const handleSearchAutoPaste = async () => {
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) return;

      let value: string | null = null;
      if (VNR_PASTE_RE.test(clip)) value = clip;
      else if (ATC_CODE_RE.test(clip.toUpperCase())) value = clip.toUpperCase();
      if (!value || lastAutoPastedRef.current === value) return;

      lastAutoPastedRef.current = value;
      if (value !== query.trim()) setQuery(value);
    } catch {
      // Clipboard unavailable or permission denied — silently ignore.
    }
  };

  // Keep a ref to the latest auto-paste closure so the window-focus listener
  // (registered once) always sees the current query value.
  const autoPasteRef = useRef(handleSearchAutoPaste);
  autoPasteRef.current = handleSearchAutoPaste;

  // While the search field is focused, returning to the window (e.g. after copying a
  // new VNR/ATC-code in another app) does not re-fire the input's focus event. Re-check
  // the clipboard on window focus so a freshly copied code still gets pasted/replaced.
  useEffect(() => {
    const onWindowFocus = () => {
      if (activeTab !== 0) return;
      if (document.activeElement !== searchInputRef.current) return;
      void autoPasteRef.current();
    };
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [activeTab]);

  const handleCopyNumber = async (rawValue: string, label: "Vnr" | "SKU" | "ATC") => {
    const value = label === "ATC" ? rawValue?.trim() : toDigits(rawValue);
    if (!value) return;
    const ok = await copyPlainText(value);
    if (ok) setCopiedMessage(`${label} kopiert: ${value}`);
  };

  const handleCopyText = async (text: string, message: string) => {
    if (!text) return;
    const ok = await copyPlainText(text);
    if (ok) setCopiedMessage(message);
  };

  const addTextDocument = async () => {
    if (!user?.uid) {
      setCopiedMessage("Du må være innlogget for å opprette dokument.");
      return;
    }

    try {
      const now = Date.now();
      const ref = await addDoc(collection(db, "fagligDocuments"), {
        title: "Nytt dokument",
        kind: "text",
        content: "",
        parentId: null,
        emoji: null,
        updatedAtMs: now,
        createdAtMs: now,
        createdByUid: user.uid,
        updatedByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedFagligDocId(ref.id);
      setCopiedMessage("Nytt dokument opprettet");
      requestAnimationFrame(() => {
        const input = fagligTitleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      });
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Kunne ikke opprette dokument."));
    }
  };

  const isDescendantOf = (doc: FagligDocument, parentId: string, byId: Map<string, FagligDocument>) => {
    let current: FagligDocument | undefined = doc;
    while (current?.parentId) {
      if (current.parentId === parentId) return true;
      current = byId.get(current.parentId);
    }
    return false;
  };

  const closeFagligDocMenu = () => {
    setFagligDocMenuAnchorEl(null);
    setFagligDocMenuTargetId(null);
  };

  const openFagligDocMenu = (event: MouseEvent<HTMLElement>, docId: string) => {
    event.stopPropagation();
    setFagligDocMenuAnchorEl(event.currentTarget);
    setFagligDocMenuTargetId(docId);
  };

  const handleDeleteFagligDoc = async () => {
    if (!fagligDocMenuTarget || !user?.uid) return;
    const targetId = fagligDocMenuTarget.id;
    const byId = new Map(fagligDocs.map((doc) => [doc.id, doc]));
    const removeIds = new Set<string>([targetId]);
    for (const doc of fagligDocs) {
      if (isDescendantOf(doc, targetId, byId)) {
        removeIds.add(doc.id);
      }
    }

    try {
      for (const removeId of removeIds) {
        await deleteDoc(docRef(db, "fagligDocuments", removeId));
      }
      if (selectedFagligDocId && removeIds.has(selectedFagligDocId)) {
        setSelectedFagligDocId("__nutrition__");
      }
      setCopiedMessage("Dokument slettet");
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Sletting feilet."));
    }
    closeFagligDocMenu();
  };

  const handleRenameFagligDoc = () => {
    if (!fagligDocMenuTarget) return;
    setRenameDialogTargetId(fagligDocMenuTarget.id);
    setRenameDialogValue(fagligDocMenuTarget.title);
    setRenameDialogOpen(true);
    closeFagligDocMenu();
  };

  const handleRenameConfirm = async () => {
    if (!renameDialogTargetId || !user?.uid) return;
    const trimmed = renameDialogValue.trim();
    if (!trimmed) return;
    setRenameDialogOpen(false);
    try {
      await updateDoc(docRef(db, "fagligDocuments", renameDialogTargetId), {
        title: trimmed,
        updatedAtMs: Date.now(),
        updatedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
      const doc = fagligDocById.get(renameDialogTargetId);
      if (selectedFagligDocId === renameDialogTargetId && doc?.kind === "text") {
        requestAnimationFrame(() => fagligTitleInputRef.current?.focus());
      }
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Kunne ikke endre navn."));
    }
  };

  const handleCopyFagligDocLink = async () => {
    if (!fagligDocMenuTarget) return;
    const url = new URL(window.location.href);
    url.searchParams.set(FAGLIG_DOC_QUERY_KEY, fagligDocMenuTarget.id);
    const ok = await copyPlainText(url.toString());
    if (ok) setCopiedMessage(`Lenke kopiert: ${fagligDocMenuTarget.title}`);
    closeFagligDocMenu();
  };

  const handleOpenFagligEmojiPicker = () => {
    if (!fagligDocMenuTarget || !fagligDocMenuAnchorEl) return;
    setFagligEmojiTargetId(fagligDocMenuTarget.id);
    setFagligEmojiAnchorEl(fagligDocMenuAnchorEl);
    closeFagligDocMenu();
  };

  const closeFagligEmojiPicker = () => {
    setFagligEmojiAnchorEl(null);
    setFagligEmojiTargetId(null);
  };

  const applyFagligEmoji = async (emoji: string | null) => {
    if (!fagligEmojiTarget || !user?.uid) return;
    try {
      await updateDoc(docRef(db, "fagligDocuments", fagligEmojiTarget.id), {
        emoji,
        updatedAtMs: Date.now(),
        updatedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Kunne ikke oppdatere emoji."));
    }
    closeFagligEmojiPicker();
  };

  const updateSelectedTextDoc = (patch: Partial<Pick<FagligDocument, "title" | "content">>) => {
    if (!selectedFagligDoc || selectedFagligDoc.kind !== "text" || !user?.uid) return;
    const uid = user.uid;
    const targetId = selectedFagligDoc.id;
    const nextTitle = patch.title ?? selectedFagligDoc.title;
    const nextContent = patch.content ?? selectedFagligDoc.content;
    setFagligDocs((prev) =>
      prev.map((doc) => (doc.id === targetId ? { ...doc, ...patch } : doc))
    );

    if (textSaveTimerRef.current) clearTimeout(textSaveTimerRef.current);
    textSaveTimerRef.current = setTimeout(() => {
      void updateDoc(docRef(db, "fagligDocuments", targetId), {
        title: nextTitle,
        content: nextContent,
        updatedAtMs: Date.now(),
        updatedByUid: uid,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        setCopiedMessage(mapFirebaseError(err, "Kunne ikke lagre dokument."));
      });
    }, 350);
  };

  const isBuiltInSelected = isVirtualTabId(selectedFagligDocId);
  const activeTabKey =
    activeTab === 0
      ? PRODUCT_TAB_KEY
      : activeTab === 2
        ? ROUTINES_TAB_KEY
        : isBuiltInSelected && selectedFagligDocId
          ? selectedFagligDocId
          : selectedFagligDoc?.id ?? "__nutrition__";

  const fagligTabItems = useMemo<FagligTabItem[]>(
    () =>
      orderedTabIds.flatMap((id): FagligTabItem[] => {
        const label = VIRTUAL_TAB_LABELS[id];
        if (label) return [{ id, label, hasMenu: false }];
        const doc = fagligDocById.get(id);
        return doc ? [{ id, label: doc.title, emoji: doc.emoji, hasMenu: true }] : [];
      }),
    [orderedTabIds, fagligDocById]
  );

  const handleSelectTab = (key: string) => {
    if (key === PRODUCT_TAB_KEY) {
      setActiveTab(0);
      return;
    }
    if (key === ROUTINES_TAB_KEY) {
      setActiveTab(2);
      return;
    }
    setSelectedFagligDocId(key);
    setActiveTab(1);
  };

  const handleTabReorder = (activeId: string, overId: string) => {
    const oldIndex = orderedTabIds.indexOf(activeId);
    const newIndex = orderedTabIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedTabIds, oldIndex, newIndex);
    setSidebarOrder(next);
    try { localStorage.setItem("faglig-sidebar-order", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const updateMoreTabIds = (next: string[]) => {
    setMoreTabIds(next);
    try { localStorage.setItem("faglig-tabs-more", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const handlePinTab = (id: string) => updateMoreTabIds(moreTabIds.filter((existing) => existing !== id));

  const handleMoveTargetToMore = () => {
    if (!fagligDocMenuTarget) return;
    const id = fagligDocMenuTarget.id;
    if (!moreTabIds.includes(id)) updateMoreTabIds([...moreTabIds, id]);
    closeFagligDocMenu();
  };

  const addEmbeddedDocument = () => {
    if (!user?.uid) {
      setCopiedMessage("Du må være innlogget for å legge til dokument.");
      return;
    }
    setEmbedDialogUrl("");
    setEmbedDialogTitle("");
    setEmbedDialogOpen(true);
  };

  const handleEmbedDialogUrlChange = (value: string) => {
    setEmbedDialogUrl(value);
    const parsed = parseEmbedInput(value);
    if (parsed && !embedDialogTitle) {
      setEmbedDialogTitle(parsed.suggestedTitle);
    }
  };

  const handleEmbedConfirm = async () => {
    if (!user?.uid) return;
    const parsed = parseEmbedInput(embedDialogUrl);
    if (!parsed) {
      setCopiedMessage("Ugyldig iframe/URL. Lim inn gyldig HTTP(S)-lenke.");
      return;
    }
    const title = embedDialogTitle.trim() || parsed.suggestedTitle;
    setEmbedDialogOpen(false);
    try {
      const now = Date.now();
      const created = await addDoc(collection(db, "fagligDocuments"), {
        title,
        kind: "pdf",
        content: "",
        parentId: null,
        emoji: null,
        pdfUrl: parsed.url,
        storagePath: `external:${parsed.url}`,
        updatedAtMs: now,
        createdAtMs: now,
        createdByUid: user.uid,
        updatedByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedFagligDocId(created.id);
      setCopiedMessage("Dokument lagt til");
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Kunne ikke lagre innebygd dokument."));
    }
  };

  return (
    <ThemeProvider theme={pinkTheme}>
      <AccentSelection />
      <Box
        sx={{
          position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          bgcolor: isDark ? "#0D1117" : "#FBF5F8",
          backgroundImage: isDark
            ? "radial-gradient(circle at 8% -12%, rgba(160,40,120,0.12) 0%, rgba(160,40,120,0) 40%), radial-gradient(circle at 94% -4%, rgba(100,30,90,0.10) 0%, rgba(100,30,90,0) 34%)"
            : "radial-gradient(circle at 8% -12%, rgba(214,89,156,0.18) 0%, rgba(214,89,156,0) 40%), radial-gradient(circle at 94% -4%, rgba(133,45,110,0.14) 0%, rgba(133,45,110,0) 34%)",
        }}
      />
      <Box
        sx={{
          maxWidth: PAGE_MAX_WIDTH,
          mx: "auto",
          px: PAGE_GUTTER_X,
          // Fanene skal ligge tett under toppen av siden; Layout har allerede egen marg.
          pt: 0,
          pb: { xs: 1.2, md: 1.6 },
        }}
      >
        <Box
          sx={{
            mx: "auto",
            borderRadius: 0,
            px: 0,
            py: 0,
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          <FagligTabBar
            ref={tabBarRef}
            items={fagligTabItems}
            activeKey={activeTabKey}
            moreIds={moreTabIds}
            onSelect={handleSelectTab}
            onReorder={handleTabReorder}
            onAddEmbedded={addEmbeddedDocument}
            onAddText={addTextDocument}
            onOpenMenu={openFagligDocMenu}
            onPin={handlePinTab}
          />

          {activeTab === 0 ? (
            <Box sx={{ mt: 2, mx: "auto", width: "100%", maxWidth: 980, display: "grid", gap: 1.25 }}>
              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2.5,
                  height: { xs: 52, md: 58 },
                  borderRadius: "14px",
                  border: (theme) => `1.5px solid ${theme.palette.mode === "dark" ? "rgba(160,90,130,0.5)" : "#D79BBB"}`,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFFFFF",
                  boxShadow: (theme) => theme.palette.mode === "dark" ? "none" : "0 6px 24px rgba(168,31,102,0.08)",
                  "&:focus-within": { borderColor: (theme) => theme.palette.mode === "dark" ? "#E8609A" : "#A81F66" },
                }}
              >
                <SearchRoundedIcon sx={{ fontSize: 22, color: (theme) => theme.palette.mode === "dark" ? "#E8609A" : "#A81F66" }} />
                <InputBase
                  inputRef={searchInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => void handleSearchAutoPaste()}
                  placeholder="Varenummer, SKU, produktnavn eller ATC-kode"
                  inputProps={{ "aria-label": "Søk i produkter og råd" }}
                  sx={{
                    flex: 1,
                    fontSize: { xs: 15, md: 17 },
                    color: (theme) => theme.palette.mode === "dark" ? "#F2EDF0" : "#2D1727",
                    "& input::placeholder": { color: (theme) => theme.palette.mode === "dark" ? "#8A6880" : "#8A6A7E", opacity: 1 },
                  }}
                />
                {searchKind ? (
                  <Box
                    component="span"
                    sx={{
                      display: { xs: "none", sm: "inline-block" },
                      px: 1.25,
                      py: 0.4,
                      borderRadius: "8px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: (theme) => theme.palette.mode === "dark" ? "#F5B8DC" : "#A81F66",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(180,40,100,0.24)" : "#FCE7F2",
                    }}
                  >
                    Gjenkjent: {searchKind}
                  </Box>
                ) : null}
                {query ? (
                  <IconButton
                    aria-label="Tøm søk"
                    size="small"
                    onClick={() => setQuery("")}
                    sx={{ color: (theme) => theme.palette.mode === "dark" ? "#C490AE" : "#6B5262" }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                ) : (
                  <Box
                    component="kbd"
                    aria-hidden
                    sx={{
                      display: { xs: "none", md: "flex" },
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1,
                      height: 28,
                      borderRadius: 2,
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: (theme) => theme.palette.mode === "dark" ? "#C490AE" : "#6B5262",
                      border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,90,130,0.5)" : "#D9BCCD"}`,
                    }}
                  >
                    Space
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
                {[
                  { value: true, label: "Kun produkter med råd" },
                  { value: false, label: "Alle produkter" },
                ].map((option) => {
                  const selected = onlyWithAdvice === option.value;
                  return (
                    <Chip
                      key={String(option.value)}
                      clickable
                      aria-pressed={selected}
                      onClick={() => setOnlyWithAdvice(option.value)}
                      label={option.label}
                      sx={{
                        height: 36,
                        borderRadius: "10px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: (theme) => selected ? "#FFFFFF" : theme.palette.mode === "dark" ? "#E2D0DC" : "#4A3342",
                        bgcolor: (theme) => selected ? (theme.palette.mode === "dark" ? "#B83A82" : "#A81F66") : theme.palette.mode === "dark" ? "#161B22" : "#FFFFFF",
                        border: (theme) => `1px solid ${selected ? "transparent" : theme.palette.mode === "dark" ? "rgba(160,90,130,0.4)" : "#E3C6D8"}`,
                        "&:hover": {
                          bgcolor: (theme) => selected ? (theme.palette.mode === "dark" ? "#B83A82" : "#A81F66") : theme.palette.mode === "dark" ? "rgba(180,40,100,0.18)" : "#FCE7F2",
                        },
                      }}
                    />
                  );
                })}
                <Box sx={{ flex: 1 }} />
                {query.trim() && !isLoading ? (
                  <Typography sx={{ fontSize: 13.5, color: (theme) => theme.palette.mode === "dark" ? "#B79AAE" : "#6B5262" }}>
                    <Box component="b" sx={{ color: (theme) => theme.palette.mode === "dark" ? "#F09AC0" : "#A81F66" }}>
                      {substanceCount} virkestoff
                    </Box>{" "}
                    · {filtered.length} {filtered.length === 1 ? "produkt" : "produkter"}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>

      {activeTab === 0 ? (
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: PAGE_GUTTER_X, pt: 1, pb: 1 }}>
          {isLoading ? (
            <Box sx={{ py: 6, display: "grid", placeItems: "center", gap: 1 }}>
              <CircularProgress size={34} />
              <Typography color="text.secondary">Laster produktdata...</Typography>
            </Box>
          ) : error ? (
            <Paper sx={{ p: 2, borderRadius: 2.5, border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,120,0.3)" : "#EFCFE1"}`, bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFF8FC" }}>
              <Typography sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#E08AB0" : "#8E2E67" }}>{error}</Typography>
            </Paper>
          ) : !query.trim() ? (
            <AdviceStartView popular={topAtcCodes} products={productsWithAdvice} onPick={setQuery} />
          ) : filtered.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                maxWidth: 980,
                mx: "auto",
                p: 2.5,
                borderRadius: "12px",
                border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,120,0.3)" : "#EFCFE1"}`,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFF8FC",
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#D4A0C0" : "#854265" }}>
                {hiddenMatchCount > 0 ? "Ingen produkter med råd matcher søket." : "Ingen treff på søket ditt."}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, color: (theme) => theme.palette.mode === "dark" ? "#9A7890" : "#8E6A82" }}>
                {hiddenMatchCount > 0
                  ? `${hiddenMatchCount} ${hiddenMatchCount === 1 ? "produkt" : "produkter"} uten registrert råd matcher søket.`
                  : "Prøv å søke på ATC-kode, varenummer, SKU eller deler av varenavn."}
              </Typography>
              {hiddenMatchCount > 0 ? (
                <Button
                  variant="outlined"
                  onClick={() => setOnlyWithAdvice(false)}
                  sx={{ mt: 1.5, textTransform: "none", fontWeight: 700, borderRadius: 2.5, minHeight: 40 }}
                >
                  Vis alle produkter
                </Button>
              ) : null}
            </Paper>
          ) : (
            <AdviceGroupList key={query} groups={groups} onCopyNumber={handleCopyNumber} onCopyText={handleCopyText} />
          )}
        </Box>
      ) : activeTab === 2 ? (
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: PAGE_GUTTER_X, py: 0.75 }}>
          <TilbakemeldingPage />
        </Box>
      ) : (
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: PAGE_GUTTER_X, py: 0.75 }}>
          <Box
            ref={fillRef}
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: 320,
              borderRadius: "14px",
              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(140,80,120,0.35)" : "#EAD2E1"}`,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "#0D1117" : "#FDFBFF",
              overflow: "hidden",
              boxShadow: (theme) => theme.palette.mode === "dark" ? "0 16px 34px rgba(0,0,0,0.32)" : "0 10px 30px rgba(94,21,71,0.07)",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflowY: selectedFagligDocId === "__knuse__" ? "hidden" : "auto",
              }}
            >
              {selectedFagligDocId === "__nutrition__" ? (
                <NutritionProductFinder catalogProducts={products} />
              ) : selectedFagligDocId === "__melkeerstatning__" ? (
                <MelkeerstatningTab />
              ) : selectedFagligDocId === "__knuse__" ? (
                <KnuseDelisteTab />
              ) : selectedFagligDocId === "__tryggmamma__" ? (
                <TryggmammaTab />
              ) : selectedFagligDocId === MIGRENE_TAB_ID ? (
                <FagligDocView
                  doc={MIGRENE_DOC}
                  titleInputRef={fagligTitleInputRef}
                  onChangeText={updateSelectedTextDoc}
                />
              ) : selectedFagligDoc ? (
                <FagligDocView doc={selectedFagligDoc} titleInputRef={fagligTitleInputRef} onChangeText={updateSelectedTextDoc} />
              ) : (
                <Box sx={{ flex: 1, display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#F1DAE9" : "#2D1727" }}>
                      {isFagligLoading ? "Laster dokumenter ..." : "Ingen dokumenter ennå"}
                    </Typography>
                    {!isFagligLoading ? (
                      <Typography sx={{ mt: 0.5, fontSize: 14, color: (theme) => theme.palette.mode === "dark" ? "#BCA6B8" : "#6B5262" }}>
                        Bruk + i fanelinjen for å bygge inn et dokument eller lage et tekstdokument.
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
          <Menu
            anchorEl={fagligDocMenuAnchorEl}
            open={fagligDocMenuOpen}
            onClose={closeFagligDocMenu}
            PaperProps={{
              sx: {
                borderRadius: "12px",
                border: isDark ? "1px solid rgba(242,162,208,0.35)" : "1px solid #E3C6D8",
                bgcolor: isDark ? "#161B22" : "#FFFFFF",
                color: isDark ? "#F3E7F0" : "#2D1727",
                minWidth: 230,
                boxShadow: isDark ? "0 18px 36px rgba(5,10,20,0.45)" : "0 18px 44px rgba(94,21,71,0.2)",
              },
            }}
          >
            <MenuItem onClick={handleMoveTargetToMore} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <KeyboardArrowDownRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Flytt til «Flere»" primaryTypographyProps={{ fontSize: "0.84rem" }} />
            </MenuItem>
            <MenuItem onClick={handleDeleteFagligDoc} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <DeleteOutlineRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Slett" primaryTypographyProps={{ fontSize: "0.84rem" }} />
            </MenuItem>
            <MenuItem onClick={handleRenameFagligDoc} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <EditRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Gi nytt navn" primaryTypographyProps={{ fontSize: "0.84rem" }} />
            </MenuItem>
            <MenuItem onClick={() => void handleCopyFagligDocLink()} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <LinkRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Kopier lenke" primaryTypographyProps={{ fontSize: "0.84rem" }} />
            </MenuItem>
            <MenuItem onClick={handleOpenFagligEmojiPicker} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <SentimentSatisfiedAltRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Velg emoji" primaryTypographyProps={{ fontSize: "0.84rem" }} />
            </MenuItem>
          </Menu>
          <Popover
            open={fagligEmojiPopoverOpen}
            anchorEl={fagligEmojiAnchorEl}
            onClose={closeFagligEmojiPicker}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                p: 1.1,
                width: 260,
                borderRadius: "12px",
                border: isDark ? "1px solid rgba(242,162,208,0.35)" : "1px solid #E3C6D8",
                bgcolor: isDark ? "#161B22" : "#FFFFFF",
                color: isDark ? "#F3E7F0" : "#2D1727",
              },
            }}
          >
            <Typography sx={{ fontSize: 12.5, color: "#DAB8CD", mb: 0.8 }}>
              Aktiv emoji: {fagligEmojiTarget?.emoji ?? "Ingen"}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.55}>
              <IconButton
                size="small"
                onClick={() => applyFagligEmoji(null)}
                sx={{
                  borderRadius: 1.6,
                  px: 0.8,
                  color: "#E6D8E2",
                  border: "1px solid rgba(243,221,234,0.26)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <Typography sx={{ fontSize: 11.5 }}>Ingen</Typography>
              </IconButton>
              {FAGLIG_EMOJI_OPTIONS.map((emoji) => (
                <IconButton
                  key={emoji}
                  size="small"
                  onClick={() => applyFagligEmoji(emoji)}
                  sx={{
                    borderRadius: 1.5,
                    border: "1px solid rgba(243,221,234,0.2)",
                    "&:hover": { bgcolor: "rgba(242,162,208,0.18)" },
                  }}
                >
                  <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{emoji}</Typography>
                </IconButton>
              ))}
            </Stack>
          </Popover>
        </Box>
      )}

      <Dialog
        open={embedDialogOpen}
        onClose={() => setEmbedDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "#131B2E",
            border: "1px solid rgba(169,119,154,0.4)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            minWidth: 420,
          },
        }}
      >
        <DialogTitle sx={{ color: "#EED5E8", fontWeight: 700, fontSize: 17, pb: 1 }}>
          Bygg inn dokument
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important", display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="SharePoint embed-kode eller URL"
            value={embedDialogUrl}
            onChange={(e) => handleEmbedDialogUrlChange(e.target.value)}
            placeholder="Lim inn <iframe ...> eller direkte https://..."
            variant="outlined"
            size="small"
            InputLabelProps={{ sx: { color: "#C9A4BA" } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#F2E7EF",
                fontSize: 13,
                borderRadius: 2,
                bgcolor: "rgba(5,9,20,0.8)",
                "& fieldset": { borderColor: "rgba(183,121,166,0.45)" },
                "&:hover fieldset": { borderColor: "rgba(242,162,208,0.6)" },
                "&.Mui-focused fieldset": { borderColor: "#F2A2D0" },
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#F2A2D0" },
            }}
          />
          <TextField
            fullWidth
            label="Tittel"
            value={embedDialogTitle}
            onChange={(e) => setEmbedDialogTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleEmbedConfirm(); }}
            variant="outlined"
            size="small"
            InputLabelProps={{ sx: { color: "#C9A4BA" } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#F2E7EF",
                fontSize: 14,
                borderRadius: 2,
                bgcolor: "rgba(5,9,20,0.8)",
                "& fieldset": { borderColor: "rgba(183,121,166,0.45)" },
                "&:hover fieldset": { borderColor: "rgba(242,162,208,0.6)" },
                "&.Mui-focused fieldset": { borderColor: "#F2A2D0" },
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#F2A2D0" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setEmbedDialogOpen(false)}
            sx={{ color: "#C9A4BA", textTransform: "none", fontWeight: 600 }}
          >
            Avbryt
          </Button>
          <Button
            onClick={() => void handleEmbedConfirm()}
            disabled={!embedDialogUrl.trim()}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#F2A2D0",
              color: "#2A122A",
              "&:hover": { bgcolor: "#F7B7DC" },
              "&.Mui-disabled": { bgcolor: "rgba(242,162,208,0.3)", color: "rgba(42,18,42,0.5)" },
            }}
          >
            Legg til
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "#131B2E",
            border: "1px solid rgba(169,119,154,0.4)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            minWidth: 360,
          },
        }}
      >
        <DialogTitle sx={{ color: "#EED5E8", fontWeight: 700, fontSize: 17, pb: 1 }}>
          Gi nytt navn
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            autoFocus
            fullWidth
            value={renameDialogValue}
            onChange={(e) => setRenameDialogValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRenameConfirm(); }}
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#F2E7EF",
                fontSize: 15,
                borderRadius: 2,
                bgcolor: "rgba(5,9,20,0.8)",
                "& fieldset": { borderColor: "rgba(183,121,166,0.45)" },
                "&:hover fieldset": { borderColor: "rgba(242,162,208,0.6)" },
                "&.Mui-focused fieldset": { borderColor: "#F2A2D0" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            sx={{ color: "#C9A4BA", textTransform: "none", fontWeight: 600 }}
          >
            Avbryt
          </Button>
          <Button
            onClick={() => void handleRenameConfirm()}
            disabled={!renameDialogValue.trim()}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#F2A2D0",
              color: "#2A122A",
              "&:hover": { bgcolor: "#F7B7DC" },
              "&.Mui-disabled": { bgcolor: "rgba(242,162,208,0.3)", color: "rgba(42,18,42,0.5)" },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(copiedMessage)}
        autoHideDuration={1500}
        onClose={() => setCopiedMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopiedMessage(null)}
          severity="info"
          variant="filled"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 0.75,
            alignItems: "center",
            bgcolor: "#8D2F67",
            color: "#FFEAF5",
            "& .MuiAlert-icon": {
              color: "#FFD4EA",
            },
            "& .MuiAlert-action .MuiIconButton-root": {
              color: "#FFD4EA",
            },
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 14px 34px rgba(2,6,18,0.56)"
                : "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          {copiedMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
