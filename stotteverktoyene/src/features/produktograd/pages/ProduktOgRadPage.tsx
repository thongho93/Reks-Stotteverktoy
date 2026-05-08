import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  Divider,
  Menu,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  IconButton,
  InputBase,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import { useAuthUser } from "../../../app/auth/useAuthUser";
import { db } from "../../../firebase/firebase";

type AdviceProduct = {
  id: string;
  name: string;
  atcCode: string;
  farmaloggNumber: string;
  sku: string;
  advicePoints: string[];
  searchBlob: string;
  farmaloggDigits: string;
  skuDigits: string;
};

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
const MAX_RENDERED_RESULTS = 120;
const PAGE_MAX_WIDTH = 1500;
const FAGLIG_DOC_QUERY_KEY = "fagdoc";
const FAGLIG_EMOJI_OPTIONS = ["😀", "📄", "📌", "🚚", "💊", "🧾", "⚠️", "✅", "⭐", "📝", "🔗", "🧠"];
const ATC_INGREDIENT: Record<string, string> = {
  A02BC01: "Omeprazol",
  A02BC02: "Pantoprazol",
  A02BC03: "Lansoprazol",
  A02BC04: "Rabeprazol",
  A02BC05: "Esomeprazol",
  A07EC02: "Mesalazin",
  A11CC05: "Kolekalsiferol",
  B01AB05: "Enoksaparin",
  B01AC24: "Tikagrelol",
  B01AF01: "Rivaroksaban",
  B01AF02: "Apixaban",
  C09CA06: "Kandesartan",
  C09DA03: "Valsartan+HCTZ",
  G03AA12: "Drospirenon+EE",
  G04BE03: "Sildenafil",
  G04BE08: "Tadalafil",
  H02AB02: "Deksametason",
  H03AA01: "Levotyroksin",
  J01CA04: "Amoksicillin",
  J01CA08: "Pivmecillinam",
  J02AC01: "Flukonazol",
  M01AB05: "Diklofenak",
  M01AE01: "Ibuprofen",
  M01AH05: "Etorikoksib",
  N02AJ06: "Kodein+paracet",
  N02BE01: "Paracetamol",
  N02CC01: "Sumatriptan",
  N05AH04: "Quetiapin",
  N06AB06: "Sertralin",
  N06AB10: "Escitalopram",
  N06AX11: "Mirtazapin",
  R03AK06: "Salmeterol+flut",
  R03AK07: "Budesonid+form",
  R03BA02: "Budesonid",
  R05CB01: "Acetylcystein",
  S01ED51: "Timolol komb.",
};

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
  const response = await fetch("/data/pharmacistAdviceData.json", { cache: "no-store" });
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

export default function ProduktOgRadPage() {
  const { user } = useAuthUser();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fagligSearchInputRef = useRef<HTMLInputElement | null>(null);
  const fagligTitleInputRef = useRef<HTMLInputElement | null>(null);
  const textSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState("");
  const [renderLimit, setRenderLimit] = useState(MAX_RENDERED_RESULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdviceProduct[]>([]);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [expandedAdviceIds, setExpandedAdviceIds] = useState<Set<string>>(() => new Set());
  const [fagligSearch, setFagligSearch] = useState("");
  const [fagligDocs, setFagligDocs] = useState<FagligDocument[]>([]);
  const [isFagligLoading, setIsFagligLoading] = useState(true);
  const [selectedFagligDocId, setSelectedFagligDocId] = useState<string | null>(null);
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

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return products;

    const numericOnly = NUMERIC_QUERY_RE.test(normalizedQuery);
    if (numericOnly) {
      const digits = toDigits(normalizedQuery);
      // Strip leading zeros so "060387" matches stored "60387"
      const digitsNorm = digits.replace(/^0+/, "") || digits;
      const exact = products.filter(
        (product) =>
          product.farmaloggDigits === digits ||
          product.farmaloggDigits === digitsNorm ||
          product.skuDigits === digits ||
          product.skuDigits === digitsNorm
      );
      if (exact.length > 0) return exact;

      return products.filter(
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
    return products.filter((product) => matchesQuery(product, terms));
  }, [products, query]);

  const visibleProducts = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit]);
  const showFullCards = filtered.length <= 2;

  const topAtcCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.atcCode) counts.set(p.atcCode, (counts.get(p.atcCode) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));
  }, [products]);
  const filteredFagligDocs = useMemo(() => {
    const normalized = normalizeSearch(fagligSearch);
    if (!normalized) return fagligDocs;
    return fagligDocs.filter((doc) => {
      const titleMatch = normalizeSearch(doc.title).includes(normalized);
      if (titleMatch) return true;
      if (doc.kind === "text") {
        return normalizeSearch(doc.content).includes(normalized);
      }
      return false;
    });
  }, [fagligDocs, fagligSearch]);

  const selectedFagligDoc = useMemo(() => {
    if (selectedFagligDocId) {
      const exact = fagligDocs.find((doc) => doc.id === selectedFagligDocId);
      if (exact) return exact;
    }
    return filteredFagligDocs[0] ?? null;
  }, [fagligDocs, filteredFagligDocs, selectedFagligDocId]);
  const fagligDocById = useMemo(() => new Map(fagligDocs.map((doc) => [doc.id, doc])), [fagligDocs]);
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
    if (fagligDocs.length === 0) {
      setSelectedFagligDocId(null);
      return;
    }
    if (!selectedFagligDocId || !fagligDocs.some((doc) => doc.id === selectedFagligDocId)) {
      setSelectedFagligDocId(fagligDocs[0].id);
    }
  }, [fagligDocs, selectedFagligDocId]);

  useEffect(() => {
    setRenderLimit(MAX_RENDERED_RESULTS);
    setExpandedAdviceIds(new Set());
  }, [query]);

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
        event.preventDefault();
        if (activeTab === 1) {
          const input = fagligSearchInputRef.current;
          if (!input) return;
          input.focus();
          input.select();
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

  const handleCopyNumber = async (rawValue: string, label: "Vnr" | "SKU" | "ATC") => {
    const value = label === "ATC" ? rawValue?.trim() : toDigits(rawValue);
    if (!value) return;
    const ok = await copyPlainText(value);
    if (ok) setCopiedMessage(`${label} kopiert: ${value}`);
  };

  const toggleExpandedAdvice = (productId: string) => {
    setExpandedAdviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
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

  const createChildDocument = async (parent: FagligDocument) => {
    if (!user?.uid) {
      setCopiedMessage("Du må være innlogget for å opprette dokument.");
      return;
    }

    try {
      const now = Date.now();
      const ref = await addDoc(collection(db, "fagligDocuments"), {
        title: `${parent.title} - underfane`,
        kind: "text",
        content: "",
        parentId: parent.id,
        emoji: null,
        updatedAtMs: now,
        createdAtMs: now,
        createdByUid: user.uid,
        updatedByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedFagligDocId(ref.id);
      setCopiedMessage("Underfane opprettet");
      requestAnimationFrame(() => {
        const input = fagligTitleInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      });
    } catch (err) {
      setCopiedMessage(mapFirebaseError(err, "Kunne ikke opprette underfane."));
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

  const handleAddFagligSubtab = async () => {
    if (!fagligDocMenuTarget) return;
    await createChildDocument(fagligDocMenuTarget);
    closeFagligDocMenu();
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
        setSelectedFagligDocId(null);
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
    <Box
      sx={{
        mx: -2,
        mt: -2,
        minHeight: "100vh",
        bgcolor: (theme) => theme.palette.mode === "dark" ? "#0D1117" : "#FBF5F8",
        backgroundImage: (theme) => theme.palette.mode === "dark"
          ? "radial-gradient(circle at 8% -12%, rgba(160,40,120,0.12) 0%, rgba(160,40,120,0) 40%), radial-gradient(circle at 94% -4%, rgba(100,30,90,0.10) 0%, rgba(100,30,90,0) 34%)"
          : "radial-gradient(circle at 8% -12%, rgba(214,89,156,0.18) 0%, rgba(214,89,156,0) 40%), radial-gradient(circle at 94% -4%, rgba(133,45,110,0.14) 0%, rgba(133,45,110,0) 34%)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 1.2, md: 1.6 },
        }}
      >
        <Box
          sx={{
            maxWidth: PAGE_MAX_WIDTH,
            mx: "auto",
            borderRadius: 0,
            px: 0,
            py: 0,
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue: number) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              mt: 0.15,
              mx: "auto",
              width: "100%",
              maxWidth: 700,
              minHeight: { xs: 38, md: 44 },
              p: 0.25,
              borderRadius: 3,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(120,50,102,0.40)" : "rgba(120,50,102,0.22)",
              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,130,0.45)" : "rgba(116,44,100,0.26)"}`,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            <Tab
              disableRipple
              label="Produkt og råd"
              sx={{
                minHeight: { xs: 36, md: 42 },
                textTransform: "none",
                borderRadius: 2.5,
                fontSize: { xs: 14, md: 17 },
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: (theme) => theme.palette.mode === "dark" ? "#D4A8C4" : "#4F2648",
                bgcolor: "transparent",
                border: "none",
                transition: "all 160ms ease",
                "&:hover": {
                  color: (theme) => theme.palette.mode === "dark" ? "#EDD4E8" : "#3B1A35",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
                "&.Mui-selected": {
                  color: (theme) => theme.palette.mode === "dark" ? "#FFE8F4" : "#2B1129",
                  fontWeight: 800,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#7A3660" : "#E9A4D0",
                  boxShadow: "0 8px 18px rgba(62,11,52,0.24)",
                },
              }}
            />
            <Tab
              disableRipple
              label="Faglig innhold"
              sx={{
                minHeight: { xs: 36, md: 42 },
                textTransform: "none",
                borderRadius: 2.5,
                fontSize: { xs: 14, md: 17 },
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: (theme) => theme.palette.mode === "dark" ? "#D4A8C4" : "#4F2648",
                bgcolor: "transparent",
                border: "none",
                transition: "all 160ms ease",
                "&:hover": {
                  color: (theme) => theme.palette.mode === "dark" ? "#EDD4E8" : "#3B1A35",
                  bgcolor: "rgba(255,255,255,0.08)",
                },
                "&.Mui-selected": {
                  color: (theme) => theme.palette.mode === "dark" ? "#FFE8F4" : "#2B1129",
                  fontWeight: 800,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "#7A3660" : "#E9A4D0",
                  boxShadow: "0 8px 18px rgba(62,11,52,0.24)",
                },
              }}
            />
          </Tabs>

          {activeTab === 0 ? (
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                mx: "auto",
                width: "100%",
                maxWidth: 560,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.6,
                py: 1,
                borderRadius: 2.5,
                border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,90,130,0.4)" : "rgba(233,155,198,0.5)"}`,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFF8FC",
              }}
            >
              <SearchRoundedIcon sx={{ fontSize: 19, color: (theme) => theme.palette.mode === "dark" ? "#C490AE" : "#9E4F7D" }} />
              <InputBase
                inputRef={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Søk med varenummer, SKU, varenavn eller ATC-kode"
                sx={{
                  flex: 1,
                  fontSize: { xs: 13, md: 14 },
                  color: (theme) => theme.palette.mode === "dark" ? "#E2D0DC" : "#412039",
                  "& input": { textAlign: "center" },
                  "& input::placeholder": { color: (theme) => theme.palette.mode === "dark" ? "#8A6880" : "#9C6F89", opacity: 1, textAlign: "center" },
                  "& input:focus::placeholder": { opacity: 0 },
                }}
              />
              {query ? (
                <IconButton
                  aria-label="Tøm søk"
                  size="small"
                  onClick={() => setQuery("")}
                  sx={{ color: (theme) => theme.palette.mode === "dark" ? "#C490AE" : "#A05C82" }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              ) : null}
            </Paper>
          ) : null}
        </Box>
      </Box>

      {activeTab === 0 ? (
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, md: 3 }, py: 1.5 }}>
          {query ? (
            <>
              <Typography sx={{ fontSize: 14, color: (theme) => theme.palette.mode === "dark" ? "#A880A0" : "#7E5B74", fontWeight: 600, textAlign: "center" }}>
                Treff:{" "}
                <Box component="span" sx={{ color: (theme) => theme.palette.mode === "dark" ? "#E8609A" : "#C93586", fontWeight: 800 }}>
                  {filtered.length}
                </Box>
              </Typography>
              <Divider sx={{ mt: 1.25, mb: 2.25, borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(140,70,110,0.3)" : alpha("#D79BBB", 0.45), maxWidth: 980, mx: "auto" }} />
            </>
          ) : null}

          {isLoading ? (
            <Box sx={{ py: 6, display: "grid", placeItems: "center", gap: 1 }}>
              <CircularProgress size={34} />
              <Typography color="text.secondary">Laster produktdata...</Typography>
            </Box>
          ) : error ? (
            <Paper sx={{ p: 2, borderRadius: 2.5, border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,120,0.3)" : "#EFCFE1"}`, bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFF8FC" }}>
              <Typography sx={{ fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#E08AB0" : "#8E2E67" }}>{error}</Typography>
            </Paper>
          ) : !query ? (
            <Box
              sx={{
                maxWidth: 860,
                mx: "auto",
                textAlign: "center",
                py: 2,
                mt: 4,
                "@keyframes atcIn": {
                  from: { opacity: 0, transform: "scale(0.5) translateY(24px)" },
                  to:   { opacity: 1, transform: "scale(1)   translateY(0px)" },
                },
                "@keyframes atcFloat": {
                  "0%,100%": { transform: "translateY(0px) rotate(-0.4deg)" },
                  "30%":     { transform: "translateY(-7px) rotate(0.6deg)" },
                  "65%":     { transform: "translateY(-3px) rotate(-0.2deg)" },
                },
                "@keyframes atcGlow": {
                  "0%,100%": { boxShadow: "0 0 0px rgba(200,80,160,0)" },
                  "50%":     { boxShadow: "0 0 18px rgba(200,80,160,0.45), 0 0 38px rgba(200,80,160,0.18)" },
                },
                "@keyframes atcTitleShimmer": {
                  "0%":   { backgroundPosition: "0% 50%" },
                  "50%":  { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
                "@keyframes orbitSpin": {
                  from: { transform: "rotate(0deg)"   },
                  to:   { transform: "rotate(360deg)" },
                },
              }}
            >
              <Typography sx={{
                mb: 2.5,
                fontSize: { xs: 13, md: 14 },
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: (theme) => theme.palette.mode === "dark"
                  ? "linear-gradient(90deg, #D46FAE, #F0A0D0, #B84490, #F0A0D0, #D46FAE)"
                  : "linear-gradient(90deg, #9D2070, #D44898, #7B1A5A, #D44898, #9D2070)",
                backgroundSize: "300% 300%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "atcTitleShimmer 4s ease infinite",
              }}>
                Vanlige ATC-koder
              </Typography>

              {/* Chip cloud */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, justifyContent: "center" }}>
                {topAtcCodes.map(({ code }, index) => {
                  const floatDuration = 3.2 + (index % 5) * 0.45;
                  const glowDuration  = 2.6 + (index % 4) * 0.55;
                  const entranceDelay = index * 0.07;
                  const floatDelay    = index * 0.31;
                  return (
                    <Chip
                      key={code}
                      label={
                        <Box component="span" sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2, py: 0.6 }}>
                          <Box component="span" sx={{ fontWeight: 800, fontSize: 15 }}>{code}</Box>
                          {ATC_INGREDIENT[code] ? (
                            <Box component="span" sx={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: (theme) => theme.palette.mode === "dark" ? "#D4A8C4" : "#8A3A6A",
                              opacity: 0.85,
                            }}>{ATC_INGREDIENT[code]}</Box>
                          ) : null}
                        </Box>
                      }
                      onClick={() => setQuery(code)}
                      sx={{
                        height: "auto",
                        minWidth: 150,
                        borderRadius: 2.5,
                        px: 0.5,
                        cursor: "pointer",
                        opacity: 0,
                        "& .MuiChip-label": { px: 1.8 },
                        bgcolor: (theme) => theme.palette.mode === "dark"
                          ? index === 0 ? "rgba(160,40,110,0.45)" : "rgba(110,30,80,0.32)"
                          : index === 0 ? "#FFE0F4"                : "#FFF0FA",
                        color: (theme) => theme.palette.mode === "dark" ? "#F5B8DC" : "#8D1F60",
                        border: (theme) => `1px solid ${theme.palette.mode === "dark"
                          ? index === 0 ? "rgba(220,90,160,0.7)" : "rgba(180,70,130,0.45)"
                          : index === 0 ? "#E898CC"              : "#F2C0DC"}`,
                        animation: [
                          `atcIn ${0.42}s cubic-bezier(0.34,1.56,0.64,1) ${entranceDelay}s both`,
                          `atcFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
                          `atcGlow  ${glowDuration}s ease-in-out  ${floatDelay}s infinite`,
                        ].join(", "),
                        transition: "background-color 160ms, border-color 160ms, transform 160ms",
                        "&:hover": {
                          animationPlayState: "paused",
                          transform: "translateY(-5px) scale(1.1)",
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(190,60,130,0.55)" : "#FFD4EE",
                          border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(240,110,180,0.8)" : "#DC70B8"}`,
                          boxShadow: (theme) => theme.palette.mode === "dark"
                            ? "0 8px 28px rgba(200,60,140,0.5), 0 0 0 1px rgba(220,100,170,0.4)"
                            : "0 8px 24px rgba(180,50,120,0.28), 0 0 0 1px rgba(200,80,150,0.3)",
                          zIndex: 1,
                        },
                      }}
                    />
                  );
                })}
              </Box>

              <Typography sx={{
                mt: 3,
                fontSize: 12.5,
                color: (theme) => theme.palette.mode === "dark" ? "#6A5060" : "#BBA0B0",
                fontStyle: "italic",
              }}>
                Klikk på en ATC-kode for å filtrere produkter
              </Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ p: 2.5, borderRadius: 2.5, border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,120,0.3)" : "#EFCFE1"}`, bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFF8FC" }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: (theme) => theme.palette.mode === "dark" ? "#D4A0C0" : "#854265" }}>
                Ingen treff på søket ditt.
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, color: (theme) => theme.palette.mode === "dark" ? "#9A7890" : "#8E6A82" }}>
                Prøv å søke på ATC-kode, varenummer, SKU eller deler av varenavn.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "repeat(2, minmax(0, 1fr))",
                },
                alignItems: "start",
              }}
            >
              {visibleProducts.map((product) => {
                const isExpanded = showFullCards || expandedAdviceIds.has(product.id);

                return (
                  <Paper
                    key={product.id}
                    elevation={0}
                    sx={{
                      p: { xs: 1.4, md: 1.7 },
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(140,80,120,0.25)" : "#ECD3E1"}`,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#161B22" : "#FFFFFF",
                      boxShadow: (theme) => theme.palette.mode === "dark" ? "0 4px 14px rgba(0,0,0,0.35)" : "0 8px 20px rgba(94,21,71,0.08)",
                      display: "grid",
                      gap: 0.95,
                      minHeight: showFullCards ? 0 : { xs: 250, lg: 270 },
                      height: showFullCards ? "auto" : isExpanded ? "auto" : { xs: 250, lg: 270 },
                      gridTemplateRows: "auto 1fr auto",
                    }}
                  >
                    <Stack direction="column" alignItems="flex-start" spacing={0.8}>
                      <Typography
                        sx={{
                          fontSize: { xs: 17, md: 18 },
                          fontWeight: 700,
                          color: (theme) => theme.palette.mode === "dark" ? "#F2EDF0" : "#31192C",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {product.name}
                      </Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap">
                        {product.atcCode ? (
                          <Chip
                            label={product.atcCode}
                            size="small"
                            onClick={() => { void handleCopyNumber(product.atcCode, "ATC"); }}
                            sx={{
                              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(180,40,100,0.22)" : "#FFE7F4",
                              color: (theme) => theme.palette.mode === "dark" ? "#F09AC0" : "#9D1D66",
                              fontWeight: 800,
                              fontSize: 11,
                              borderRadius: 999,
                              border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(200,80,140,0.4)" : "#F2B9DA"}`,
                              height: 26,
                              cursor: "pointer",
                              transition: "transform 120ms ease, background-color 120ms ease",
                              "&:hover": {
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(180,40,100,0.35)" : "#FFDAF0",
                                transform: "translateY(-1px)",
                              },
                            }}
                          />
                        ) : null}
                        <Chip
                          label={`Vnr ${product.farmaloggNumber || "-"}`}
                          size="small"
                          onClick={() => {
                            void handleCopyNumber(product.farmaloggNumber, "Vnr");
                          }}
                          sx={{
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,80,120,0.18)" : "#FAF1F7",
                            color: (theme) => theme.palette.mode === "dark" ? "#C4A0B8" : "#6F4D64",
                            fontWeight: 600,
                            fontSize: 11,
                            borderRadius: 999,
                            border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,90,130,0.3)" : "#EBD6E3"}`,
                            height: 26,
                            cursor: toDigits(product.farmaloggNumber) ? "pointer" : "default",
                            transition: "transform 120ms ease, background-color 120ms ease",
                            "&:hover": {
                              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,80,120,0.30)" : "#F7E7F1",
                              transform: "translateY(-1px)",
                            },
                          }}
                        />
                        <Chip
                          label={`SKU ${product.sku || "-"}`}
                          size="small"
                          onClick={() => {
                            void handleCopyNumber(product.sku, "SKU");
                          }}
                          sx={{
                            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,80,120,0.18)" : "#FAF1F7",
                            color: (theme) => theme.palette.mode === "dark" ? "#C4A0B8" : "#6F4D64",
                            fontWeight: 600,
                            fontSize: 11,
                            borderRadius: 999,
                            border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,90,130,0.3)" : "#EBD6E3"}`,
                            height: 26,
                            cursor: toDigits(product.sku) ? "pointer" : "default",
                            transition: "transform 120ms ease, background-color 120ms ease",
                            "&:hover": {
                              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,80,120,0.30)" : "#F7E7F1",
                              transform: "translateY(-1px)",
                            },
                          }}
                        />
                      </Stack>
                    </Stack>

                    {product.advicePoints.length > 0 ? (
                      <Box
                        component="ul"
                        sx={{
                          mt: 0,
                          mb: 0,
                          pl: 2.1,
                          display: "grid",
                          gap: 0.18,
                          overflow: "hidden",
                          alignContent: "start",
                          justifyContent: "start",
                          "& li": {
                            color: (theme) => theme.palette.mode === "dark" ? "#E8DDE4" : "#3D2A36",
                            fontSize: { xs: 13.5, md: 14 },
                            lineHeight: 1.34,
                          },
                          "& li::marker": {
                            color: "#D24D94",
                            fontSize: "1em",
                          },
                        }}
                      >
                        {(isExpanded ? product.advicePoints : product.advicePoints.slice(0, 3)).map((point, idx) => (
                          <li key={`${product.id}-${idx}`}>{point}</li>
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ mt: 0.25, color: (theme) => theme.palette.mode === "dark" ? "#A89098" : "#8C647D", fontSize: 12.5, fontStyle: "italic" }}>
                        Ingen farmasøytisk råd registrert for dette produktet.
                      </Typography>
                    )}
                    {!showFullCards && product.advicePoints.length > 3 ? (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => toggleExpandedAdvice(product.id)}
                        sx={{
                          width: "fit-content",
                          minWidth: 0,
                          mt: 0.1,
                          px: 0,
                          color: (theme) => theme.palette.mode === "dark" ? "#D070A0" : "#9D1D66",
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "none",
                        }}
                      >
                        {isExpanded ? "Vis færre" : `Vis mer (${product.advicePoints.length})`}
                      </Button>
                    ) : null}
                  </Paper>
                );
              })}
              {filtered.length > visibleProducts.length ? (
                <Box sx={{ pt: 0.25 }}>
                  <Typography sx={{ fontSize: 13, color: (theme) => theme.palette.mode === "dark" ? "#907080" : "#8A6380", mb: 0.75 }}>
                    Flere treff tilgjengelig
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setRenderLimit((prev) => prev + MAX_RENDERED_RESULTS)}
                    sx={{
                      borderRadius: 2.5,
                      px: 1.4,
                      py: 0.4,
                      fontSize: 13,
                      border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(160,80,130,0.45)" : "#E1B8CF"}`,
                      color: (theme) => theme.palette.mode === "dark" ? "#D080B0" : "#8D2F67",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,50,100,0.12)" : "#FFF7FB",
                      "&:hover": {
                        border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(180,90,140,0.6)" : "#DDA8C5"}`,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(140,50,100,0.22)" : "#FDEDF7",
                      },
                    }}
                  >
                    Vis flere
                  </Button>
                </Box>
              ) : null}
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 1, md: 1.5 }, py: 0.75 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 1.5,
              border: "1px solid rgba(140,80,120,0.35)",
              bgcolor: "#0D1117",
              overflow: "hidden",
              boxShadow: "0 16px 34px rgba(0,0,0,0.32)",
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 115px)",
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: "1px solid rgba(140,80,120,0.3)",
                bgcolor: "rgba(22,27,34,0.97)",
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<PictureAsPdfRoundedIcon />}
                  variant="contained"
                  onClick={addEmbeddedDocument}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: "#F2A2D0",
                    color: "#2A122A",
                    "&:hover": { bgcolor: "#F7B7DC" },
                  }}
                >
                  Bygg inn dokument
                </Button>
                <Button
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  variant="outlined"
                  onClick={addTextDocument}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#F5DDF0",
                    borderColor: "rgba(240,184,220,0.44)",
                    "&:hover": {
                      borderColor: "#F2A2D0",
                      bgcolor: "rgba(242,162,208,0.1)",
                    },
                  }}
                >
                  Legg til dokument
                </Button>
              </Stack>
              <Paper
                elevation={0}
                sx={{
                  px: 1,
                  py: 0.4,
                  minWidth: { xs: "100%", md: 260 },
                  maxWidth: 360,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  borderRadius: 2,
                  bgcolor: "rgba(13,17,23,0.95)",
                  border: "1px solid rgba(140,80,120,0.35)",
                }}
              >
                <SearchRoundedIcon sx={{ color: "#D28DB7", fontSize: 18 }} />
                <InputBase
                  inputRef={fagligSearchInputRef}
                  value={fagligSearch}
                  onChange={(event) => setFagligSearch(event.target.value)}
                  placeholder="Søk i faglige dokumenter"
                  sx={{
                    flex: 1,
                    fontSize: 14,
                    color: "#F2E7EF",
                    "& input::placeholder": { color: "#AFA0B2", opacity: 1 },
                  }}
                />
              </Paper>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
                flex: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  borderRight: { xs: "none", md: "1px solid rgba(140,80,120,0.25)" },
                  borderBottom: { xs: "1px solid rgba(140,80,120,0.25)", md: "none" },
                  bgcolor: "rgba(13,17,23,0.9)",
                  p: 1,
                  overflowY: "auto",
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.6, py: 0.5 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#EED5E8" }}>
                    Dokumentfaner
                  </Typography>
                  <Chip
                    size="small"
                    label={filteredFagligDocs.length}
                    sx={{
                      bgcolor: "rgba(242,162,208,0.22)",
                      color: "#F6BFDF",
                      fontWeight: 700,
                      border: "1px solid rgba(242,162,208,0.44)",
                    }}
                  />
                </Stack>
                {isFagligLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.8, py: 1.1 }}>
                    <CircularProgress size={18} sx={{ color: "#E8B7D5" }} />
                    <Typography sx={{ fontSize: 13, color: "#D8B4CA" }}>Laster dokumenter...</Typography>
                  </Box>
                ) : null}
                <List sx={{ mt: 0.5, pt: 0 }}>
                  {filteredFagligDocs.map((doc) => (
                    (() => {
                      let depth = 0;
                      let cursor = doc;
                      while (cursor.parentId && depth < 8) {
                        const parent = fagligDocById.get(cursor.parentId);
                        if (!parent) break;
                        depth += 1;
                        cursor = parent;
                      }

                      return (
                        <ListItemButton
                          key={doc.id}
                          selected={selectedFagligDoc?.id === doc.id}
                          onClick={() => setSelectedFagligDocId(doc.id)}
                          sx={{
                            mb: 0.5,
                            borderRadius: 2,
                            pl: 1 + depth * 1.8,
                            pr: 0.7,
                            border: "1px solid rgba(255,255,255,0.06)",
                            bgcolor:
                              selectedFagligDoc?.id === doc.id
                                ? "rgba(242,162,208,0.18)"
                                : "rgba(22,27,34,0.85)",
                            "&:hover": {
                              bgcolor: "rgba(242,162,208,0.12)",
                            },
                            "&.Mui-selected": {
                              bgcolor: "rgba(242,162,208,0.2)",
                              borderColor: "rgba(242,162,208,0.45)",
                            },
                            "&.Mui-selected:hover": {
                              bgcolor: "rgba(242,162,208,0.26)",
                            },
                          }}
                        >
                          {doc.emoji ? (
                            <Typography sx={{ mr: 1, fontSize: 18, lineHeight: 1 }}>{doc.emoji}</Typography>
                          ) : doc.kind === "pdf" ? (
                            <PictureAsPdfRoundedIcon sx={{ mr: 1, fontSize: 20, color: "#F0A1CF" }} />
                          ) : (
                            <DescriptionRoundedIcon sx={{ mr: 1, fontSize: 20, color: "#9ED9FF" }} />
                          )}
                          <Tooltip title={doc.title} placement="right" enterDelay={0} enterTouchDelay={0} arrow>
                            <ListItemText
                              primary={doc.title}
                              primaryTypographyProps={{
                                noWrap: true,
                                fontSize: 14,
                                fontWeight: selectedFagligDoc?.id === doc.id ? 800 : 600,
                                color: selectedFagligDoc?.id === doc.id ? "#FFD8ED" : "#E4DCE7",
                              }}
                            />
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(event) => openFagligDocMenu(event, doc.id)}
                            sx={{
                              ml: 0.5,
                              color: "rgba(235,175,211,0.95)",
                              "&:hover": {
                                bgcolor: "rgba(242,162,208,0.18)",
                              },
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </ListItemButton>
                      );
                    })()
                  ))}
                </List>

                {filteredFagligDocs.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 1,
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: "rgba(13,17,23,0.92)",
                      border: "1px dashed rgba(242,162,208,0.35)",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: "#CCB5C4" }}>
                      Ingen dokumenter funnet. Legg til innebygd dokument eller opprett tekstdokument.
                    </Typography>
                  </Paper>
                ) : null}
              </Box>

              <Box sx={{ bgcolor: "#0D1117", p: 1, overflowY: "auto" }}>
                {selectedFagligDoc ? (
                  selectedFagligDoc.kind === "pdf" ? (
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        borderRadius: 0,
                        border: "none",
                        bgcolor: "#0D1117",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "auto 1fr",
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.9,
                          borderBottom: "1px solid rgba(140,80,120,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          bgcolor: "rgba(22,27,34,0.97)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0 }}>
                          <PictureAsPdfRoundedIcon sx={{ color: "#F0A1CF", fontSize: 20 }} />
                          <Typography sx={{ color: "#F6E9F1", fontSize: 16, fontWeight: 700 }} noWrap>
                            {selectedFagligDoc.title}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label="PDF"
                          sx={{
                            bgcolor: "rgba(242,162,208,0.2)",
                            color: "#F5C3E1",
                            fontWeight: 700,
                            border: "1px solid rgba(242,162,208,0.44)",
                          }}
                        />
                      </Box>
                      <Box sx={{ height: "100%", bgcolor: "#161B22" }}>
                        <iframe
                          title={selectedFagligDoc.title}
                          src={selectedFagligDoc.url ?? undefined}
                          style={{ border: 0, width: "100%", height: "100%" }}
                        />
                      </Box>
                    </Paper>
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        borderRadius: 2.5,
                        border: "1px solid rgba(140,80,120,0.25)",
                        bgcolor: "#161B22",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "auto 1fr auto",
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.9,
                          borderBottom: "1px solid rgba(140,80,120,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          bgcolor: "rgba(22,27,34,0.97)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0, flex: 1 }}>
                          <DescriptionRoundedIcon sx={{ color: "#F0A1CF", fontSize: 20 }} />
                          <InputBase
                            inputRef={fagligTitleInputRef}
                            value={selectedFagligDoc.title}
                            onChange={(event) => updateSelectedTextDoc({ title: event.target.value })}
                            sx={{
                              flex: 1,
                              fontSize: 20,
                              fontWeight: 800,
                              color: "#F2E7EF",
                              "& input::placeholder": {
                                color: "#AFA0B2",
                                opacity: 1,
                              },
                            }}
                            placeholder="Tittel"
                          />
                        </Stack>
                        <Chip
                          size="small"
                          label="Tekst"
                          sx={{
                            bgcolor: "rgba(242,162,208,0.2)",
                            color: "#F5C3E1",
                            fontWeight: 700,
                            border: "1px solid rgba(242,162,208,0.44)",
                          }}
                        />
                      </Box>
                      <Box sx={{ p: 1.1 }}>
                        <InputBase
                          multiline
                          minRows={18}
                          value={selectedFagligDoc.content}
                          onChange={(event) => updateSelectedTextDoc({ content: event.target.value })}
                          placeholder="Skriv faglig innhold her..."
                          sx={{
                            width: "100%",
                            p: 1.1,
                            borderRadius: 1.8,
                            border: "1px solid rgba(140,80,120,0.25)",
                            bgcolor: "rgba(13,17,23,0.84)",
                            color: "#F2E7EF",
                            fontSize: 17,
                            lineHeight: 1.6,
                            "& textarea::placeholder": {
                              color: "#AFA0B2",
                              opacity: 1,
                            },
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.75,
                          borderTop: "1px solid rgba(140,80,120,0.25)",
                          bgcolor: "rgba(22,27,34,0.97)",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Typography sx={{ fontSize: 12.5, color: "#C4A0B8" }}>
                          Endringer lagres lokalt automatisk
                        </Typography>
                      </Box>
                    </Paper>
                  )
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      height: "100%",
                      borderRadius: 2.5,
                      border: "1px dashed rgba(242,162,208,0.36)",
                      bgcolor: "rgba(13,17,23,0.92)",
                      display: "grid",
                      placeItems: "center",
                      p: 2,
                    }}
                  >
                    <Stack spacing={0.9} alignItems="center">
                      <DescriptionRoundedIcon sx={{ fontSize: 48, color: "#DFA0C7" }} />
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#F1DAE9", textAlign: "center" }}>
                        Legg til innebygd dokument eller opprett nytt tekstdokument
                      </Typography>
                      <Typography sx={{ fontSize: 13.5, color: "#BCA6B8", textAlign: "center", maxWidth: 480 }}>
                        Lim inn SharePoint iframe/URL for visning i appen, eller skriv tekstdokumenter direkte.
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Box>
          </Paper>
          <Menu
            anchorEl={fagligDocMenuAnchorEl}
            open={fagligDocMenuOpen}
            onClose={closeFagligDocMenu}
            PaperProps={{
              sx: {
                borderRadius: 2.5,
                border: "1px solid rgba(242,162,208,0.35)",
                bgcolor: "#161B22",
                color: "#F3E7F0",
                minWidth: 230,
                boxShadow: "0 18px 36px rgba(5,10,20,0.45)",
              },
            }}
          >
            <MenuItem onClick={handleAddFagligSubtab} sx={{ minHeight: 34, py: 0.4, px: 1.1 }}>
              <AddRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
              <ListItemText primary="Legg til en underfane" primaryTypographyProps={{ fontSize: "0.84rem" }} />
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
                borderRadius: 2.5,
                border: "1px solid rgba(242,162,208,0.35)",
                bgcolor: "#161B22",
                color: "#F3E7F0",
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
    </Box>
  );
}
