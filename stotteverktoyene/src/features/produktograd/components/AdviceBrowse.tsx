import { useMemo, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { ATC_INGREDIENT, brandLabel, type AdviceProduct } from "../data/adviceProducts";
import { ATC_LEVEL1_NAMES, ATC_LEVEL2_NAMES } from "../data/atcNames";

type Substance = { code: string; title: string; count: number };
type Level2 = { code: string; name: string; count: number; substances: Substance[] };
type Area = { letter: string; name: string; count: number; groups: Level2[] };

const buildAreas = (products: AdviceProduct[]): Area[] => {
  const byCode = new Map<string, string[]>();
  for (const product of products) {
    if (!product.atcCode) continue;
    const names = byCode.get(product.atcCode);
    if (names) names.push(product.name);
    else byCode.set(product.atcCode, [product.name]);
  }

  const areas = new Map<string, Map<string, Substance[]>>();
  for (const [code, names] of byCode) {
    const letter = code[0];
    const level2 = code.slice(0, 3);
    let groups = areas.get(letter);
    if (!groups) {
      groups = new Map();
      areas.set(letter, groups);
    }
    const list = groups.get(level2) ?? [];
    list.push({ code, title: ATC_INGREDIENT[code] ?? (brandLabel(names) || code), count: names.length });
    groups.set(level2, list);
  }

  return [...areas.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, groups]) => {
      const level2List: Level2[] = [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, substances]) => ({
          code,
          name: ATC_LEVEL2_NAMES[code] ?? "",
          count: substances.reduce((sum, s) => sum + s.count, 0),
          substances: substances.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "nb")),
        }));
      return {
        letter,
        name: ATC_LEVEL1_NAMES[letter] ?? letter,
        count: level2List.reduce((sum, g) => sum + g.count, 0),
        groups: level2List,
      };
    });
};

// Maks antall virkestoff i listen før «Vis alle» – holder startsiden på én skjermside.
const COLLAPSED_SUBSTANCE_COUNT = 8;

type Props = {
  products: AdviceProduct[];
  onPick: (code: string) => void;
};

// Bla etter terapiområde (ATC nivå 1) → terapigruppe (nivå 2) → virkestoff. Valg av virkestoff starter søk på ATC-koden.
export default function AdviceBrowse({ products, onPick }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [letter, setLetter] = useState<string | null>(null);
  const [level2Code, setLevel2Code] = useState<string | null>(null);
  const [showAllFor, setShowAllFor] = useState<string | null>(null);

  const areas = useMemo(() => buildAreas(products), [products]);
  const area = areas.find((a) => a.letter === letter) ?? null;
  const group = area ? area.groups.find((g) => g.code === level2Code) ?? area.groups[0] : null;

  const c = {
    ink: isDark ? "#F2EDF0" : "#2D1727",
    sub: isDark ? "#D4C0CC" : "#4A3342",
    muted: isDark ? "#B79AAE" : "#6B5262",
    accent: isDark ? "#F09AC0" : "#A81F66",
    surface: isDark ? "#161B22" : "#FFFFFF",
    border: isDark ? "rgba(140,80,120,0.3)" : "#EAD2E1",
    hover: isDark ? "rgba(180,40,100,0.18)" : "#FCE7F2",
    hoverBorder: isDark ? "rgba(220,100,170,0.5)" : "#E6B5D0",
    pill: isDark ? "rgba(140,80,120,0.25)" : "#F6E6EF",
    primary: isDark ? "#B83A82" : "#A81F66",
    selectedBorder: isDark ? "#E8609A" : "#A81F66",
    softBg: isDark ? "rgba(180,40,100,0.22)" : "#FCE7F2",
  };

  if (areas.length === 0) return null;

  const needsMore = group ? group.substances.length > COLLAPSED_SUBSTANCE_COUNT : false;
  const expanded = Boolean(group) && showAllFor === group?.code;
  const shownSubstances = group
    ? needsMore && !expanded
      ? group.substances.slice(0, COLLAPSED_SUBSTANCE_COUNT - 1)
      : group.substances
    : [];

  return (
    <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
      <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, color: c.ink }}>
        Velg terapiområde
      </Typography>

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
        {areas.map((a) => {
          const isSelected = a.letter === letter;
          return (
            <ButtonBase
              key={a.letter}
              onClick={() => {
                setLetter(isSelected ? null : a.letter);
                setLevel2Code(null);
              }}
              aria-pressed={isSelected}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "flex-start",
                gap: 0.25,
                px: 1.5,
                py: 1,
                minHeight: 62,
                textAlign: "left",
                borderRadius: "10px",
                color: isSelected ? "#FFFFFF" : c.ink,
                bgcolor: isSelected ? c.primary : c.surface,
                border: `1px solid ${isSelected ? "transparent" : c.border}`,
                boxShadow: isSelected && !isDark ? "0 8px 20px rgba(168,31,102,0.25)" : "none",
                transition: "background-color 120ms, border-color 120ms",
                "&:hover": isSelected ? {} : { bgcolor: c.hover, borderColor: c.hoverBorder },
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: isSelected ? "#FFFFFF" : c.accent }}>
                {a.letter}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: isSelected ? "#FFFFFF" : c.sub }}>
                {a.name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {area && group ? (
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            p: { xs: 1.5, md: 2 },
            borderRadius: "14px",
            bgcolor: c.surface,
            border: `1px solid ${c.border}`,
            boxShadow: isDark ? "none" : "0 10px 30px rgba(94,21,71,0.06)",
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 600, color: c.muted }}>
            <ButtonBase
              onClick={() => setLetter(null)}
              sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit", borderRadius: 1, "&:hover": { color: c.accent } }}
            >
              Alle områder
            </ButtonBase>
            <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
            <span>
              {area.letter} · {area.name}
            </span>
            <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
            <Box component="span" sx={{ color: c.accent, fontWeight: 700 }}>
              {group.code}
              {group.name ? ` · ${group.name}` : ""}
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 1, overflowX: "auto", pb: 0.5, scrollbarWidth: "thin" }}>
            {area.groups.map((g) => {
              const isSelected = g.code === group.code;
              return (
                <ButtonBase
                  key={g.code}
                  onClick={() => setLevel2Code(g.code)}
                  aria-pressed={isSelected}
                  sx={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    px: 1.75,
                    py: 0.6,
                    borderRadius: "10px",
                    fontSize: 13.5,
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? c.accent : c.sub,
                    bgcolor: isSelected ? c.softBg : c.surface,
                    border: `${isSelected ? 1.5 : 1}px solid ${isSelected ? c.selectedBorder : c.border}`,
                    "&:hover": { bgcolor: c.hover },
                  }}
                >
                  {g.code}
                  {g.name ? ` ${g.name}` : ""}
                </ButtonBase>
              );
            })}
          </Box>

          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {shownSubstances.map((s) => (
              <ButtonBase
                key={s.code}
                onClick={() => onPick(s.code)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  minHeight: 46,
                  textAlign: "left",
                  borderRadius: "10px",
                  bgcolor: c.surface,
                  border: `1px solid ${c.border}`,
                  transition: "background-color 120ms, border-color 120ms",
                  "&:hover": { bgcolor: c.hover, borderColor: c.hoverBorder },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap title={s.title} sx={{ fontSize: 14.5, fontWeight: 700, color: c.ink, lineHeight: 1.25 }}>{s.title}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: c.accent, letterSpacing: "0.03em", lineHeight: 1.25 }}>
                    {s.code}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
            {needsMore && group ? (
              <ButtonBase
                onClick={() => setShowAllFor(expanded ? null : group.code)}
                sx={{
                  justifyContent: "center",
                  px: 1.5,
                  py: 0.75,
                  minHeight: 46,
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: c.accent,
                  border: `1px dashed ${c.hoverBorder}`,
                  "&:hover": { bgcolor: c.hover },
                }}
              >
                {expanded ? "Vis færre" : `Vis alle ${group.substances.length}`}
              </ButtonBase>
            ) : null}
          </Box>
        </Box>
      ) : (
        <Typography sx={{ fontSize: 13, color: c.muted }}>Velg et område for å se virkestoff.</Typography>
      )}
    </Box>
  );
}
