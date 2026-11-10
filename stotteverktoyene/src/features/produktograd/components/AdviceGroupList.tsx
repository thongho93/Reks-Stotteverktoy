import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Button, ButtonBase, Chip, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type { AdviceGroup } from "../data/adviceProducts";

const COLLAPSED_PRODUCT_COUNT = 5;
const MAX_PRODUCTS_SHOWN = 150;
const INITIAL_GROUP_LIMIT = 40;
const GROUP_LIMIT_STEP = 40;
// Under denne bredden (md) ligger liste og panel under hverandre, og siden får rulle som vanlig.
const SIDE_BY_SIDE_QUERY = "(min-width: 900px)";
// Luft under kortene innenfor siden (inkluderer bunnmargen i sidens beholder).
const PAGE_BOTTOM_RESERVE = 48;
const MIN_PANEL_HEIGHT = 240;

type CopyLabel = "Vnr" | "SKU" | "ATC";

type Props = {
  groups: AdviceGroup[];
  onCopyNumber: (value: string, label: CopyLabel) => void;
  onCopyText: (text: string, message: string) => void;
};

const adviceAsText = (points: string[]) => points.map((point) => `• ${point}`).join("\n");

const productCountLabel = (count: number) => `${count} ${count === 1 ? "produkt" : "produkter"}`;

/** «Imigran tab 50mg 12» + «+ 8 til» – kort oppsummering av hvilke produkter en gruppe gjelder. */
const productPreview = (group: AdviceGroup) => {
  const [first] = group.products;
  const rest = group.products.length - 1;
  return rest > 0 ? `${first.name} + ${rest} til` : first.name;
};

// Liste til venstre: én rad per virkestoff og sett med råd (ulike råd for samme virkestoff vises hver for seg).
// Detaljpanel til høyre: rådet og produktene for valgt rad.
// Tilstand (valgt rad, utvidede lister) nullstilles ved nytt søk ved at forelderen bruker søket som `key`.
export default function AdviceGroupList({ groups, onCopyNumber, onCopyText }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(() => new Set());
  const [groupLimit, setGroupLimit] = useState(INITIAL_GROUP_LIMIT);
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Gi liste og detaljkort en makshøyde som slutter der siden slutter, slik at selve siden aldri
  // får overflow – bare listen og kortet ruller internt. Settes direkte på elementene (ikke i state)
  // fordi høyden avhenger av hvor kortet havner i layouten.
  useLayoutEffect(() => {
    const apply = () => {
      const root = rootRef.current;
      if (!root) return;
      let scroller: HTMLElement | null = root.parentElement;
      while (scroller) {
        const overflowY = getComputedStyle(scroller).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") break;
        scroller = scroller.parentElement;
      }
      const scrollTop = scroller?.scrollTop ?? 0;
      const viewportBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
      const naturalTop = root.getBoundingClientRect().top + scrollTop;
      const available = Math.max(MIN_PANEL_HEIGHT, Math.floor(viewportBottom - naturalTop - PAGE_BOTTOM_RESERVE));
      const sideBySide = window.matchMedia(SIDE_BY_SIDE_QUERY).matches;
      for (const el of [navRef.current, panelRef.current]) {
        if (el) el.style.maxHeight = sideBySide ? `${available}px` : "";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [groups]);

  const c = useMemo(
    () => ({
      ink: isDark ? "#F2EDF0" : "#2D1727",
      muted: isDark ? "#B79AAE" : "#6B5262",
      accent: isDark ? "#F09AC0" : "#A81F66",
      surface: isDark ? "#161B22" : "#FFFFFF",
      border: isDark ? "rgba(140,80,120,0.3)" : "#EAD2E1",
      pill: isDark ? "rgba(180,40,100,0.24)" : "#FCE7F2",
      pillText: isDark ? "#F5B8DC" : "#A81F66",
      rowLine: isDark ? "rgba(140,80,120,0.25)" : "#F0DCE8",
      copyBorder: isDark ? "rgba(160,90,130,0.4)" : "#E3C6D8",
      copyHover: isDark ? "rgba(180,40,100,0.22)" : "#FCE7F2",
      primary: isDark ? "#B83A82" : "#A81F66",
      selectedBorder: isDark ? "#E8609A" : "#A81F66",
    }),
    [isDark]
  );

  const visibleGroups = groups.slice(0, groupLimit);
  const selected = groups.find((group) => group.key === selectedKey) ?? groups[0] ?? null;

  const toggleExpandedProducts = (key: string) =>
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const copyChipSx = {
    height: 36,
    borderRadius: "8px",
    fontSize: 13.5,
    fontWeight: 600,
    color: isDark ? "#E2D0DC" : "#4A3342",
    bgcolor: "transparent",
    border: `1px solid ${c.copyBorder}`,
    "& .MuiChip-label": { px: 1.4 },
    "& .MuiChip-icon": { color: c.accent, ml: 1.2, mr: -0.4 },
    "&:hover": { bgcolor: c.copyHover, borderColor: c.accent },
  } as const;

  const labelSx = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: c.muted,
  } as const;

  if (!selected) return null;

  const hasAdvice = selected.advicePoints.length > 0;
  const expanded = expandedProducts.has(selected.key);
  const shownProducts = selected.products.slice(0, expanded ? MAX_PRODUCTS_SHOWN : COLLAPSED_PRODUCT_COUNT);
  const needsToggle = selected.products.length > COLLAPSED_PRODUCT_COUNT;

  return (
    <Box ref={rootRef} sx={{ maxWidth: 980, mx: "auto", display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
      <Box
        component="nav"
        ref={navRef}
        aria-label="Virkestoff og råd"
        sx={{
          flex: "1 1 320px",
          maxWidth: { md: 390 },
          minWidth: 0,
          display: "grid",
          gap: 1,
          alignContent: "start",
          overflowY: { md: "auto" },
          // Plass til skyggen rundt valgt rad, som ellers kuttes av rulleområdet.
          p: { md: 0.5 },
          m: { md: -0.5 },
        }}
      >
        {visibleGroups.map((group) => {
          const isSelected = group.key === selected.key;
          const hasVariants = group.variantCount > 1;
          return (
            <ButtonBase
              key={group.key}
              onClick={() => setSelectedKey(group.key)}
              aria-current={isSelected ? "true" : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1.5,
                px: 2,
                py: 1.4,
                minHeight: 64,
                textAlign: "left",
                borderRadius: "10px",
                bgcolor: c.surface,
                border: `2px solid ${isSelected ? c.selectedBorder : c.border}`,
                boxShadow: isSelected ? (isDark ? "none" : "0 4px 16px rgba(168,31,102,0.14)") : "none",
                transition: "background-color 120ms, border-color 120ms",
                "&:hover": { bgcolor: c.copyHover },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15.5, fontWeight: isSelected ? 800 : 700, color: c.ink, lineHeight: 1.3 }}>
                  {group.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: c.muted, mt: 0.25 }}>
                  {group.atcCode ? `${group.atcCode} · ` : ""}
                  {productCountLabel(group.products.length)}
                  {hasVariants ? ` · råd ${group.variantIndex} av ${group.variantCount}` : ""}
                </Typography>
                {hasVariants ? (
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? "#D4C0CC" : "#4A3342",
                      mt: 0.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {productPreview(group)}
                  </Typography>
                ) : null}
              </Box>
              {isSelected ? <ChevronRightRoundedIcon sx={{ color: c.accent }} /> : null}
            </ButtonBase>
          );
        })}

        {groups.length > visibleGroups.length ? (
          <Button
            variant="outlined"
            onClick={() => setGroupLimit((prev) => prev + GROUP_LIMIT_STEP)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              minHeight: 44,
              color: c.accent,
              borderColor: c.copyBorder,
              "&:hover": { borderColor: c.accent, bgcolor: c.copyHover },
            }}
          >
            Vis flere ({groups.length - visibleGroups.length} igjen)
          </Button>
        ) : null}
      </Box>

      <Paper
        ref={panelRef}
        elevation={0}
        sx={{
          flex: "1.4 1 440px",
          minWidth: 0,
          alignSelf: "flex-start",
          overflowY: { md: "auto" },
          p: { xs: 2.5, md: 3.5 },
          borderRadius: "14px",
          bgcolor: c.surface,
          border: `1px solid ${c.border}`,
          boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.35)" : "0 10px 30px rgba(94,21,71,0.07)",
          display: "grid",
          gap: 3,
        }}
      >
        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
            {selected.atcCode ? (
              <Chip
                clickable
                icon={<ContentCopyRoundedIcon sx={{ fontSize: "16px !important" }} />}
                label={selected.atcCode}
                onClick={() => onCopyNumber(selected.atcCode, "ATC")}
                aria-label={`Kopier ATC-kode ${selected.atcCode}`}
                sx={{
                  height: 30,
                  borderRadius: "8px",
                  bgcolor: c.pill,
                  color: c.pillText,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  "& .MuiChip-icon": { color: c.pillText, ml: 1.1, mr: -0.5 },
                  "&:hover": { bgcolor: c.copyHover, filter: "brightness(0.97)" },
                }}
              />
            ) : null}
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: c.muted }}>
              {productCountLabel(selected.products.length)}
              {selected.variantCount > 1 ? ` · råd ${selected.variantIndex} av ${selected.variantCount}` : ""}
            </Typography>
          </Box>
          <Typography component="h2" sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, lineHeight: 1.2, color: c.ink }}>
            {selected.title}
          </Typography>
        </Box>

        <Box sx={{ height: "1px", bgcolor: c.rowLine }} />

        {hasAdvice ? (
          <Box sx={{ display: "grid", gap: 1.75 }}>
            <Typography sx={labelSx}>Råd til kunden</Typography>
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.75 }}>
              {selected.advicePoints.map((point, index) => (
                <Box component="li" key={index} sx={{ display: "flex", gap: 1.75, alignItems: "flex-start" }}>
                  <Box
                    aria-hidden
                    sx={{
                      flex: "0 0 28px",
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: c.pill,
                      color: c.pillText,
                      fontSize: 14,
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography sx={{ fontSize: 17, lineHeight: 1.5, color: c.ink, pt: "1px" }}>{point}</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <Button
                variant="contained"
                disableElevation
                startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 18 }} />}
                onClick={() => onCopyText(adviceAsText(selected.advicePoints), "Råd kopiert")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: "10px",
                  minHeight: 48,
                  px: 2.5,
                  bgcolor: c.primary,
                  "&:hover": { bgcolor: c.primary, filter: "brightness(1.08)" },
                }}
              >
                Kopier alle råd
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 14, fontStyle: "italic", color: c.muted }}>
            Ingen råd registrert for disse produktene.
          </Typography>
        )}

        <Box>
          <Typography sx={{ ...labelSx, pb: 0.75 }}>Rådet gjelder</Typography>
          {shownProducts.map((product) => (
            <Box
              key={product.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) auto" },
                alignItems: "center",
                columnGap: 1.5,
                rowGap: 0.75,
                py: 1.1,
                borderTop: `1px solid ${c.rowLine}`,
              }}
            >
              <Typography sx={{ minWidth: 0, fontSize: 15.5, fontWeight: 600, color: c.ink }}>{product.name}</Typography>
              {/* Faste bredder gjør at Vnr og SKU står likt i alle rader, uansett navnelengde. */}
              <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 1.2 }}>
                <Chip
                  clickable
                  icon={<ContentCopyRoundedIcon />}
                  label={`Vnr ${product.farmaloggNumber || "-"}`}
                  onClick={() => onCopyNumber(product.farmaloggNumber, "Vnr")}
                  aria-label={`Kopier varenummer ${product.farmaloggNumber}`}
                  disabled={!product.farmaloggNumber}
                  sx={{ ...copyChipSx, minWidth: 136 }}
                />
                <Chip
                  clickable
                  icon={<ContentCopyRoundedIcon />}
                  label={`SKU ${product.sku || "-"}`}
                  onClick={() => onCopyNumber(product.sku, "SKU")}
                  aria-label={`Kopier SKU ${product.sku}`}
                  disabled={!product.sku}
                  sx={{ ...copyChipSx, minWidth: 156 }}
                />
              </Box>
            </Box>
          ))}
          {needsToggle ? (
            <Box sx={{ borderTop: `1px solid ${c.rowLine}`, pt: 0.5 }}>
              <Button
                onClick={() => toggleExpandedProducts(selected.key)}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: 14.5, minHeight: 40, color: c.accent, px: 0.5 }}
              >
                {expanded ? "Vis færre" : `Vis alle ${selected.products.length} produkter`}
              </Button>
            </Box>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
}
