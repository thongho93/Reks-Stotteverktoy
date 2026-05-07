import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  InputBase,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

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
const FAGLIG_TEXT_STORAGE_KEY = "produktOgRadFagligDocs.v1";

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

    const termDigits = toDigits(term);
    if (!termDigits) return false;

    return product.farmaloggDigits.includes(termDigits) || product.skuDigits.includes(termDigits);
  });
};

export default function ProduktOgRadPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fagligSearchInputRef = useRef<HTMLInputElement | null>(null);
  const fagligTitleInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
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
  const [selectedFagligDocId, setSelectedFagligDocId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAGLIG_TEXT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        title: string;
        content: string;
      }>;
      if (!Array.isArray(parsed)) return;

      const restoredDocs: FagligDocument[] = parsed
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({
          id: item.id,
          title: String(item.title ?? "").trim() || "Nytt dokument",
          kind: "text" as const,
          content: String(item.content ?? ""),
          url: null,
          uploaded: false,
        }));

      if (restoredDocs.length > 0) {
        setFagligDocs(restoredDocs);
        setSelectedFagligDocId(restoredDocs[0].id);
      }
    } catch {
      // ignore malformed local storage
    }
  }, []);

  useEffect(() => {
    try {
      const serializable = fagligDocs
        .filter((doc) => doc.kind === "text")
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
        }));
      localStorage.setItem(FAGLIG_TEXT_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [fagligDocs]);

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
      const exact = products.filter(
        (product) => product.farmaloggDigits === digits || product.skuDigits === digits
      );
      if (exact.length > 0) return exact;

      return products.filter(
        (product) =>
          product.farmaloggDigits.startsWith(digits) ||
          product.skuDigits.startsWith(digits) ||
          product.farmaloggDigits.includes(digits) ||
          product.skuDigits.includes(digits)
      );
    }

    const terms = normalizedQuery.split(" ").filter(Boolean);
    return products.filter((product) => matchesQuery(product, terms));
  }, [products, query]);

  const visibleProducts = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit]);
  const showFullCards = filtered.length <= 2;
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

  useEffect(() => {
    setRenderLimit(MAX_RENDERED_RESULTS);
    setExpandedAdviceIds(new Set());
  }, [query]);

  useEffect(() => {
    return () => {
      for (const doc of fagligDocs) {
        if (doc.uploaded && doc.url) URL.revokeObjectURL(doc.url);
      }
    };
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

  const handleCopyNumber = async (rawValue: string, label: "Vnr" | "SKU") => {
    const digits = toDigits(rawValue);
    if (!digits) return;
    const ok = await copyPlainText(digits);
    if (ok) setCopiedMessage(`${label} kopiert: ${digits}`);
  };

  const toggleExpandedAdvice = (productId: string) => {
    setExpandedAdviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const addTextDocument = () => {
    const newDoc: FagligDocument = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: "Nytt dokument",
      kind: "text",
      content: "",
      url: null,
      uploaded: false,
    };
    setFagligDocs((prev) => [newDoc, ...prev]);
    setSelectedFagligDocId(newDoc.id);
    setCopiedMessage("Nytt dokument opprettet");
    requestAnimationFrame(() => {
      const input = fagligTitleInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
  };

  const updateSelectedTextDoc = (patch: Partial<Pick<FagligDocument, "title" | "content">>) => {
    if (!selectedFagligDoc || selectedFagligDoc.kind !== "text") return;
    setFagligDocs((prev) =>
      prev.map((doc) => (doc.id === selectedFagligDoc.id ? { ...doc, ...patch } : doc))
    );
  };

  const handleUploadPdf = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const newDocs = files
      .filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
      .map((file) => {
        const baseTitle = file.name.replace(/\.pdf$/i, "").trim();
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: baseTitle || "Uten navn",
          kind: "pdf",
          content: "",
          url: URL.createObjectURL(file),
          uploaded: true,
        } as FagligDocument;
      });

    if (newDocs.length === 0) {
      setCopiedMessage("Kun PDF-filer støttes.");
      event.target.value = "";
      return;
    }

    setFagligDocs((prev) => [...newDocs, ...prev]);
    setSelectedFagligDocId(newDocs[0].id);
    setCopiedMessage(
      newDocs.length === 1
        ? `PDF lastet opp: ${newDocs[0].title}`
        : `${newDocs.length} PDF-filer lastet opp`
    );
    event.target.value = "";
  };

  return (
    <Box
      sx={{
        mx: -2,
        mt: -2,
        minHeight: "100vh",
        bgcolor: "#FBF5F8",
        backgroundImage:
          "radial-gradient(circle at 8% -12%, rgba(214,89,156,0.18) 0%, rgba(214,89,156,0) 40%), radial-gradient(circle at 94% -4%, rgba(133,45,110,0.14) 0%, rgba(133,45,110,0) 34%)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: { xs: 2.25, md: 3 },
        }}
      >
        <Box
          sx={{
            maxWidth: PAGE_MAX_WIDTH,
            mx: "auto",
            borderRadius: 4,
            px: { xs: 2, md: 3 },
            py: { xs: 1.6, md: 2 },
            background:
              "linear-gradient(135deg, rgba(34,11,41,0.98) 0%, rgba(93,31,84,0.96) 55%, rgba(143,49,113,0.94) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 34px rgba(88,20,70,0.28)",
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
              maxWidth: 1200,
              minHeight: { xs: 56, md: 68 },
              p: 0.45,
              borderRadius: 3.5,
              bgcolor: "rgba(25,8,35,0.54)",
              border: "1px solid rgba(242,186,219,0.42)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
              "& .MuiTabs-indicator": {
                height: 0,
              },
            }}
          >
            <Tab
              disableRipple
              label="Produkt og råd"
              sx={{
                minHeight: { xs: 50, md: 60 },
                textTransform: "none",
                borderRadius: 3,
                fontSize: { xs: 22, md: 30 },
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: "#F1E6EE",
                transition: "all 160ms ease",
                "&.Mui-selected": {
                  color: "#2B102A",
                  bgcolor: "#F4A6D4",
                  boxShadow: "0 6px 18px rgba(245,166,214,0.32)",
                },
              }}
            />
            <Tab
              disableRipple
              label="Faglig innhold"
              sx={{
                minHeight: { xs: 50, md: 60 },
                textTransform: "none",
                borderRadius: 3,
                fontSize: { xs: 22, md: 30 },
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: "#F1E6EE",
                transition: "all 160ms ease",
                "&.Mui-selected": {
                  color: "#2B102A",
                  bgcolor: "#F4A6D4",
                  boxShadow: "0 6px 18px rgba(245,166,214,0.32)",
                },
              }}
            />
          </Tabs>

          {activeTab === 0 ? (
            <Paper
              elevation={0}
              sx={{
                mt: 1.35,
                mx: "auto",
                width: "100%",
                maxWidth: 980,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.4,
                py: 0.8,
                borderRadius: 2.5,
                border: "1px solid rgba(233,155,198,0.5)",
                bgcolor: "#FFF8FC",
              }}
            >
              <SearchRoundedIcon sx={{ fontSize: 21, color: "#9E4F7D" }} />
              <InputBase
                inputRef={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Søk med varenummer, SKU, varenavn eller ATC-kode"
                sx={{
                  flex: 1,
                  fontSize: { xs: 15, md: 16 },
                  color: "#412039",
                  "& input::placeholder": { color: "#9C6F89", opacity: 1 },
                }}
              />
              {query ? (
                <IconButton
                  aria-label="Tøm søk"
                  size="small"
                  onClick={() => setQuery("")}
                  sx={{ color: "#A05C82" }}
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
          <Typography sx={{ fontSize: 14, color: "#7E5B74", fontWeight: 600, textAlign: "center" }}>
            Treff:{" "}
            <Box component="span" sx={{ color: "#C93586", fontWeight: 800 }}>
              {filtered.length}
            </Box>
          </Typography>

          <Divider
            sx={{
              mt: 1.25,
              mb: 2.25,
              borderColor: alpha("#D79BBB", 0.45),
              maxWidth: 980,
              mx: "auto",
            }}
          />

          {isLoading ? (
            <Box sx={{ py: 6, display: "grid", placeItems: "center", gap: 1 }}>
              <CircularProgress size={34} />
              <Typography color="text.secondary">Laster produktdata...</Typography>
            </Box>
          ) : error ? (
            <Paper sx={{ p: 2, borderRadius: 2.5, border: "1px solid #EFCFE1", bgcolor: "#FFF8FC" }}>
              <Typography sx={{ fontWeight: 700, color: "#8E2E67" }}>{error}</Typography>
            </Paper>
          ) : filtered.length === 0 ? (
            <Paper sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #EFCFE1", bgcolor: "#FFF8FC" }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#854265" }}>
                Ingen treff på søket ditt.
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, color: "#8E6A82" }}>
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
                      borderRadius: 2.5,
                      border: "1px solid #ECD3E1",
                      bgcolor: "#FFFFFF",
                      boxShadow: "0 8px 20px rgba(94,21,71,0.08)",
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
                          color: "#31192C",
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
                            sx={{
                              bgcolor: "#FFE7F4",
                              color: "#9D1D66",
                              fontWeight: 800,
                              fontSize: 11,
                              borderRadius: 999,
                              border: "1px solid #F2B9DA",
                              height: 26,
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
                            bgcolor: "#FAF1F7",
                            color: "#6F4D64",
                            fontWeight: 600,
                            fontSize: 11,
                            borderRadius: 999,
                            border: "1px solid #EBD6E3",
                            height: 26,
                            cursor: toDigits(product.farmaloggNumber) ? "pointer" : "default",
                            transition: "transform 120ms ease, background-color 120ms ease",
                            "&:hover": {
                              bgcolor: "#F7E7F1",
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
                            bgcolor: "#FAF1F7",
                            color: "#6F4D64",
                            fontWeight: 600,
                            fontSize: 11,
                            borderRadius: 999,
                            border: "1px solid #EBD6E3",
                            height: 26,
                            cursor: toDigits(product.sku) ? "pointer" : "default",
                            transition: "transform 120ms ease, background-color 120ms ease",
                            "&:hover": {
                              bgcolor: "#F7E7F1",
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
                            color: "#3D2A36",
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
                      <Typography sx={{ mt: 0.25, color: "#8C647D", fontSize: 12.5, fontStyle: "italic" }}>
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
                          color: "#9D1D66",
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
                  <Typography sx={{ fontSize: 13, color: "#8A6380", mb: 0.75 }}>
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
                      border: "1px solid #E1B8CF",
                      color: "#8D2F67",
                      bgcolor: "#FFF7FB",
                      "&:hover": {
                        border: "1px solid #DDA8C5",
                        bgcolor: "#FDEDF7",
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
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, md: 3 }, py: 1.5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(102,39,90,0.5)",
              bgcolor: "#0F1625",
              overflow: "hidden",
              boxShadow: "0 16px 34px rgba(10,12,22,0.32)",
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: "1px solid rgba(171,115,156,0.34)",
                bgcolor: "rgba(17,25,44,0.9)",
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
                  startIcon={<UploadFileRoundedIcon />}
                  variant="contained"
                  onClick={() => pdfInputRef.current?.click()}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: "#F2A2D0",
                    color: "#2A122A",
                    "&:hover": { bgcolor: "#F7B7DC" },
                  }}
                >
                  Last opp PDF
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
                  bgcolor: "rgba(5,9,20,0.9)",
                  border: "1px solid rgba(183,121,166,0.45)",
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
                gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
                minHeight: { xs: 480, md: 720 },
              }}
            >
              <Box
                sx={{
                  borderRight: { xs: "none", md: "1px solid rgba(169,119,154,0.3)" },
                  borderBottom: { xs: "1px solid rgba(169,119,154,0.3)", md: "none" },
                  bgcolor: "rgba(18,25,42,0.88)",
                  p: 1,
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
                <List sx={{ mt: 0.5, pt: 0 }}>
                  {filteredFagligDocs.map((doc) => (
                    <ListItemButton
                      key={doc.id}
                      selected={selectedFagligDoc?.id === doc.id}
                      onClick={() => setSelectedFagligDocId(doc.id)}
                      sx={{
                        mb: 0.5,
                        borderRadius: 2,
                        border: "1px solid rgba(255,255,255,0.06)",
                        bgcolor:
                          selectedFagligDoc?.id === doc.id
                            ? "rgba(242,162,208,0.18)"
                            : "rgba(10,14,29,0.78)",
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
                      {doc.kind === "pdf" ? (
                        <PictureAsPdfRoundedIcon sx={{ mr: 1, fontSize: 20, color: "#F0A1CF" }} />
                      ) : (
                        <DescriptionRoundedIcon sx={{ mr: 1, fontSize: 20, color: "#9ED9FF" }} />
                      )}
                      <ListItemText
                        primary={doc.title}
                        secondary={doc.kind === "pdf" ? "Lokal PDF" : "Tekstdokument"}
                        primaryTypographyProps={{
                          noWrap: true,
                          fontSize: 16,
                          fontWeight: selectedFagligDoc?.id === doc.id ? 800 : 600,
                          color: selectedFagligDoc?.id === doc.id ? "#FFD8ED" : "#E4DCE7",
                        }}
                        secondaryTypographyProps={{
                          color: "#C9A4BA",
                          fontSize: 12,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>

                {filteredFagligDocs.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 1,
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: "rgba(10,14,29,0.88)",
                      border: "1px dashed rgba(242,162,208,0.35)",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: "#CCB5C4" }}>
                      Ingen dokumenter funnet. Last opp PDF for å starte.
                    </Typography>
                  </Paper>
                ) : null}
              </Box>

              <Box sx={{ bgcolor: "#0A1324", p: 1 }}>
                {selectedFagligDoc ? (
                  selectedFagligDoc.kind === "pdf" ? (
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        borderRadius: 2.5,
                        border: "1px solid rgba(180,127,163,0.4)",
                        bgcolor: "#09101C",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "auto 1fr",
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.9,
                          borderBottom: "1px solid rgba(170,121,156,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          bgcolor: "rgba(13,20,34,0.94)",
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
                      <Box sx={{ height: "100%", bgcolor: "#1A1F28" }}>
                        <iframe
                          title={selectedFagligDoc.title}
                          src={selectedFagligDoc.url ?? undefined}
                          style={{ border: 0, width: "100%", height: "100%", minHeight: "620px" }}
                        />
                      </Box>
                    </Paper>
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        borderRadius: 2.5,
                        border: "1px solid rgba(145,164,197,0.4)",
                        bgcolor: "#0B1422",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "auto 1fr auto",
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.9,
                          borderBottom: "1px solid rgba(130,151,185,0.36)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          bgcolor: "rgba(13,22,36,0.95)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0, flex: 1 }}>
                          <DescriptionRoundedIcon sx={{ color: "#9ED9FF", fontSize: 20 }} />
                          <InputBase
                            inputRef={fagligTitleInputRef}
                            value={selectedFagligDoc.title}
                            onChange={(event) => updateSelectedTextDoc({ title: event.target.value })}
                            sx={{
                              flex: 1,
                              fontSize: 20,
                              fontWeight: 800,
                              color: "#EEF6FF",
                              "& input::placeholder": {
                                color: "#AAC2DA",
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
                            bgcolor: "rgba(116,186,255,0.18)",
                            color: "#CBE8FF",
                            fontWeight: 700,
                            border: "1px solid rgba(116,186,255,0.35)",
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
                            border: "1px solid rgba(149,170,204,0.35)",
                            bgcolor: "rgba(8,14,24,0.84)",
                            color: "#EAF1FB",
                            fontSize: 17,
                            lineHeight: 1.6,
                            "& textarea::placeholder": {
                              color: "#96A8BF",
                              opacity: 1,
                            },
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.75,
                          borderTop: "1px solid rgba(130,151,185,0.3)",
                          bgcolor: "rgba(10,17,28,0.95)",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Typography sx={{ fontSize: 12.5, color: "#9FB2CC" }}>
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
                      bgcolor: "rgba(12,18,32,0.88)",
                      display: "grid",
                      placeItems: "center",
                      p: 2,
                    }}
                  >
                    <Stack spacing={0.9} alignItems="center">
                      <DescriptionRoundedIcon sx={{ fontSize: 48, color: "#DFA0C7" }} />
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#F1DAE9", textAlign: "center" }}>
                        Last opp PDF eller opprett nytt tekstdokument
                      </Typography>
                      <Typography sx={{ fontSize: 13.5, color: "#BCA6B8", textAlign: "center", maxWidth: 480 }}>
                        Tekstdokumenter kan redigeres direkte i appen, på samme måte som rutineinnhold.
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Box>
          </Paper>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={handleUploadPdf}
          />
        </Box>
      )}

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
