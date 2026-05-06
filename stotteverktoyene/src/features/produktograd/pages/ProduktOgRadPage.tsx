import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

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

const matchesQuery = (product: AdviceProduct, terms: string[]): boolean => {
  if (terms.length === 0) return true;

  return terms.every((term) => {
    if (product.searchBlob.includes(term)) return true;

    const termDigits = toDigits(term);
    if (!termDigits) return false;

    return (
      product.farmaloggDigits.includes(termDigits) ||
      product.skuDigits.includes(termDigits)
    );
  });
};

export default function ProduktOgRadPage() {
  const [query, setQuery] = useState("");
  const [renderLimit, setRenderLimit] = useState(MAX_RENDERED_RESULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<AdviceProduct[]>([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const module = await import("../data/pharmacistAdviceData.json");
        const rows = (module.default ?? []) as AdviceProductRow[];
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

  const visibleProducts = useMemo(
    () => filtered.slice(0, renderLimit),
    [filtered, renderLimit]
  );

  useEffect(() => {
    setRenderLimit(MAX_RENDERED_RESULTS);
  }, [query]);

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
            maxWidth: 1120,
            mx: "auto",
            borderRadius: 4,
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.5 },
            background:
              "linear-gradient(135deg, rgba(34,11,41,0.98) 0%, rgba(93,31,84,0.96) 55%, rgba(143,49,113,0.94) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 34px rgba(88,20,70,0.28)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography
              sx={{
                fontSize: { xs: 24, md: 30 },
                fontWeight: 800,
                letterSpacing: "0.01em",
                lineHeight: 1.15,
                color: "#FBE3F1",
                fontFamily: "'Sora', 'Avenir Next', 'Segoe UI', sans-serif",
              }}
            >
              Produkt og råd
            </Typography>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              mt: 1.75,
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
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1120, mx: "auto", px: { xs: 2, md: 4 }, py: 1.5 }}>
        <Typography sx={{ fontSize: 14, color: "#7E5B74", fontWeight: 600 }}>
          Treff:{" "}
          <Box component="span" sx={{ color: "#C93586", fontWeight: 800 }}>
            {filtered.length}
          </Box>
        </Typography>

        <Divider sx={{ mt: 1.25, mb: 2.25, borderColor: alpha("#D79BBB", 0.45) }} />

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
          <Stack spacing={1.5}>
            {visibleProducts.map((product) => (
              <Paper
                key={product.id}
                elevation={0}
                sx={{
                  p: { xs: 1.6, md: 2 },
                  borderRadius: 2.5,
                  border: "1px solid #ECD3E1",
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 8px 20px rgba(94,21,71,0.08)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={1.5}
                >
                  <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: "#31192C" }}>
                    {product.name}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {product.atcCode ? (
                      <Chip
                        label={product.atcCode}
                        size="small"
                        sx={{
                          bgcolor: "#FFE7F4",
                          color: "#9D1D66",
                          fontWeight: 800,
                          fontSize: 12,
                          borderRadius: 999,
                          border: "1px solid #F2B9DA",
                          height: 28,
                        }}
                      />
                    ) : null}
                    <Chip
                      label={`Vnr ${product.farmaloggNumber || "-"}`}
                      size="small"
                      sx={{
                        bgcolor: "#FAF1F7",
                        color: "#6F4D64",
                        fontWeight: 600,
                        fontSize: 12,
                        borderRadius: 999,
                        border: "1px solid #EBD6E3",
                        height: 28,
                      }}
                    />
                    <Chip
                      label={`SKU ${product.sku || "-"}`}
                      size="small"
                      sx={{
                        bgcolor: "#FAF1F7",
                        color: "#6F4D64",
                        fontWeight: 600,
                        fontSize: 12,
                        borderRadius: 999,
                        border: "1px solid #EBD6E3",
                        height: 28,
                      }}
                    />
                  </Stack>
                </Stack>

                {product.advicePoints.length > 0 ? (
                  <Box
                    component="ul"
                    sx={{
                      mt: 1,
                      mb: 0,
                      pl: 2.4,
                      display: "grid",
                      gap: 0.3,
                      "& li": {
                        color: "#3D2A36",
                        fontSize: { xs: 14, md: 15 },
                        lineHeight: 1.45,
                      },
                      "& li::marker": {
                        color: "#D24D94",
                        fontSize: "1em",
                      },
                    }}
                  >
                    {product.advicePoints.map((point, idx) => <li key={`${product.id}-${idx}`}>{point}</li>)}
                  </Box>
                ) : (
                  <Typography sx={{ mt: 1, color: "#8C647D", fontSize: 13, fontStyle: "italic" }}>
                    Ingen farmasøytisk råd registrert for dette produktet.
                  </Typography>
                )}
              </Paper>
            ))}
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
          </Stack>
        )}
      </Box>
    </Box>
  );
}
