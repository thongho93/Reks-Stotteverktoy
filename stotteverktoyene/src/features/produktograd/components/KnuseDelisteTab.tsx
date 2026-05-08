import React, { useState, useMemo } from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { KNUSE_DELE_DRUGS, type DrugEntry, type SpecialCode } from "../data/knuseDeleData";

// ─── Code colours ─────────────────────────────────────────────────────────────

const CODE_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1:  { bg: "#1E3A8A", text: "#93C5FD", ring: "#3B82F6" },
  2:  { bg: "#4C1D95", text: "#C4B5FD", ring: "#8B5CF6" },
  3:  { bg: "#78350F", text: "#FCD34D", ring: "#D97706" },
  4:  { bg: "#134E4A", text: "#5EEAD4", ring: "#14B8A6" },
  5:  { bg: "#365314", text: "#BEF264", ring: "#84CC16" },
  6:  { bg: "#831843", text: "#F9A8D4", ring: "#EC4899" },
  7:  { bg: "#881337", text: "#FDA4AF", ring: "#F43F5E" },
  8:  { bg: "#3B0764", text: "#E9D5FF", ring: "#9333EA" },
  9:  { bg: "#450A0A", text: "#FCA5A5", ring: "#EF4444" },
  10: { bg: "#052E16", text: "#86EFAC", ring: "#22C55E" },
  11: { bg: "#1E1B4B", text: "#A5B4FC", ring: "#6366F1" },
  12: { bg: "#431407", text: "#FED7AA", ring: "#F97316" },
};

const SPECIAL_STYLES: Record<SpecialCode, { bg: string; text: string; border: string }> = {
  A:   { bg: "rgba(234,179,8,0.14)",  text: "#FDE68A", border: "rgba(234,179,8,0.45)" },
  G:   { bg: "rgba(34,197,94,0.14)",  text: "#86EFAC", border: "rgba(34,197,94,0.45)" },
  K:   { bg: "rgba(239,68,68,0.14)",  text: "#FCA5A5", border: "rgba(239,68,68,0.45)" },
  OBS: { bg: "rgba(249,115,22,0.14)", text: "#FDBA74", border: "rgba(249,115,22,0.45)" },
};

// ─── Legend data ──────────────────────────────────────────────────────────────

const CODE_DESCRIPTIONS: { code: number; description: string }[] = [
  { code: 1,  description: "Svelges hel." },
  { code: 2,  description: "Tygges." },
  { code: 3,  description: "Bør svelges hel (kan gi misfarging i munnen)." },
  { code: 4,  description: "Svelges hel eller delt (bare etter delestrek), skal ikke tygges eller knuses." },
  { code: 5,  description: "Kapselen kan åpnes og innholdet kan blandes ut i vann." },
  { code: 6,  description: "Kapselen kan åpnes og innholdet kan blandes ut i syreholdig væske (f.eks. eplejuice)." },
  { code: 7,  description: "Legges under tungen og beholdes der inntil legemidlet er oppløst." },
  { code: 8,  description: "Tabletten/kapselinnholdet kan blandes ut i vann." },
  { code: 9,  description: "Om nødvendig kan kapselen åpnes/tabletten knuses eller deles." },
  { code: 10, description: "Smeltes på tungen, og svelges." },
  { code: 11, description: "Tabletten kan blandes ut i vann. Kornene skal ikke tygges eller knuses." },
  { code: 12, description: "Tabletten svelges hel eller delt (hvis det er delestrek) for å unngå irritasjon på slimhinner." },
];

const SPECIAL_DESCRIPTIONS: { code: SpecialCode; label: string; description: string }[] = [
  { code: "A",   label: "A",   description: "Antimikrobielt legemiddel" },
  { code: "G",   label: "G",   description: "Gravide – håndterer intakt" },
  { code: "K",   label: "K",   description: "Kreftlegemiddel (celleskadelig)" },
  { code: "OBS", label: "OBS", description: "Arbeidsmiljø – bruk beskyttelse" },
];


// ─── Sub-components ───────────────────────────────────────────────────────────

function CodeBadge({ code }: { code: number }) {
  const c = CODE_COLORS[code];
  if (!c) return null;
  return (
    <Tooltip title={CODE_DESCRIPTIONS.find((d) => d.code === code)?.description ?? ""} arrow placement="top">
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: "50%",
          bgcolor: c.bg,
          border: `1.5px solid ${c.ring}`,
          color: c.text,
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0,
          cursor: "default",
          transition: "transform 120ms ease, box-shadow 120ms ease",
          "&:hover": {
            transform: "scale(1.15)",
            boxShadow: `0 0 0 3px ${c.ring}40`,
          },
        }}
      >
        {code}
      </Box>
    </Tooltip>
  );
}

function SpecialBadge({ code }: { code: SpecialCode }) {
  const s = SPECIAL_STYLES[code];
  return (
    <Tooltip title={SPECIAL_DESCRIPTIONS.find((d) => d.code === code)?.description ?? ""} arrow placement="top">
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          px: 0.7,
          height: 20,
          borderRadius: 0.8,
          bgcolor: s.bg,
          border: `1px solid ${s.border}`,
          color: s.text,
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
          cursor: "default",
          letterSpacing: "0.02em",
        }}
      >
        {code}
      </Box>
    </Tooltip>
  );
}

function DrugRow({ drug }: { drug: DrugEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 160px 140px 40px",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.1,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          transition: "background 120ms ease",
          cursor: "default",
          "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
        }}
      >
        {/* Legemiddel */}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.8} flexWrap="wrap">
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#E2D9F3" }}>
              {drug.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#7D6E94" }}>
              ({drug.manufacturer})
            </Typography>
            {drug.specialCodes.map((sc) => (
              <SpecialBadge key={sc} code={sc} />
            ))}
          </Stack>
        </Box>

        {/* Legemiddelform */}
        <Typography sx={{ fontSize: 12.5, color: "#9B8EB0", whiteSpace: "nowrap" }}>
          {drug.form}
        </Typography>

        {/* Tallkoder */}
        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
          {drug.codes.map((c) => (
            <CodeBadge key={c} code={c} />
          ))}
        </Stack>


        {/* Expand */}
        <IconButton
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            color: expanded ? "#C084FC" : "rgba(255,255,255,0.3)",
            "&:hover": { color: "#C084FC", bgcolor: "rgba(192,132,252,0.1)" },
          }}
        >
          {expanded ? <ExpandLessRoundedIcon sx={{ fontSize: 18 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Expanded detail row */}
      <Collapse in={expanded} unmountOnExit>
        <Box
          sx={{
            px: 2,
            py: 1.2,
            bgcolor: "rgba(139,92,246,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            borderLeft: "3px solid rgba(139,92,246,0.55)",
          }}
        >
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            {drug.codes.map((c) => {
              const desc = CODE_DESCRIPTIONS.find((d) => d.code === c);
              return desc ? (
                <Chip
                  key={c}
                  size="small"
                  label={`${c}: ${desc.description}`}
                  sx={{
                    bgcolor: CODE_COLORS[c]?.bg ?? "transparent",
                    color: CODE_COLORS[c]?.text ?? "#fff",
                    border: `1px solid ${CODE_COLORS[c]?.ring ?? "#fff"}50`,
                    fontSize: 11.5,
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              ) : null;
            })}
          </Stack>
        </Box>
      </Collapse>
    </>
  );
}

// ─── Legend panel ─────────────────────────────────────────────────────────────

function LegendPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <Box
      sx={{
        width: collapsed ? 36 : 240,
        minWidth: collapsed ? 36 : 240,
        transition: "width 200ms ease, min-width 200ms ease",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        bgcolor: "rgba(13,10,20,0.9)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Toggle button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 0 : 1.5,
          py: 1,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <InfoOutlinedIcon sx={{ fontSize: 15, color: "#9B8EB0" }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#C9B8E8", whiteSpace: "nowrap" }}>
              Slik tolkes tallkodene
            </Typography>
          </Stack>
        )}
        <Tooltip title={collapsed ? "Vis forklaring" : "Skjul forklaring"} placement="right">
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{ color: "#9B8EB0", "&:hover": { color: "#C9B8E8", bgcolor: "rgba(255,255,255,0.06)" } }}
          >
            {collapsed
              ? <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
              : <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Legend content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          transition: "opacity 150ms ease",
          px: 1.2,
          py: 1,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.12)", borderRadius: 2 },
        }}
      >
        {/* Numbered codes */}
        <Stack spacing={0.6}>
          {CODE_DESCRIPTIONS.map(({ code, description }) => (
            <Stack key={code} direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ flexShrink: 0, mt: 0.1 }}>
                <CodeBadge code={code} />
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "#A897BE", lineHeight: 1.45, pt: 0.4 }}>
                {description}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1.2, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Special codes */}
        <Stack spacing={0.7}>
          {SPECIAL_DESCRIPTIONS.map(({ code, description }) => (
            <Stack key={code} direction="row" alignItems="center" spacing={1}>
              <SpecialBadge code={code} />
              <Typography sx={{ fontSize: 11.5, color: "#A897BE", lineHeight: 1.4 }}>
                {description}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1.2, borderColor: "rgba(255,255,255,0.08)" }} />

        <Typography sx={{ fontSize: 11, color: "#7D6E94", lineHeight: 1.4, fontStyle: "italic" }}>
          X = Ved forsiktighet/avtale med lege eller KEF
        </Typography>

        {/* Important notice */}
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: 1.5,
            bgcolor: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.25)",
          }}
        >
          <Stack direction="row" spacing={0.8} alignItems="flex-start">
            <WarningAmberRoundedIcon sx={{ fontSize: 14, color: "#FDBA74", mt: 0.2, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11, color: "#FDBA74", lineHeight: 1.45 }}>
              Listen må brukes sammen med prosedyren: Tabletter og kapsler – knusing og deling.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function KnuseDelisteTab() {
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(0);
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return KNUSE_DELE_DRUGS;
    return KNUSE_DELE_DRUGS.filter((drug) =>
      drug.name.toLowerCase().includes(q) ||
      drug.manufacturer.toLowerCase().includes(q) ||
      drug.form.toLowerCase().includes(q)
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const paginated  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden", bgcolor: "#0A0812" }}>
      {/* Legend */}
      <LegendPanel collapsed={legendCollapsed} onToggle={() => setLegendCollapsed((v) => !v)} />

      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.4,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            bgcolor: "rgba(15,10,24,0.97)",
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.2} mb={0.4}>
            <Typography
              sx={{ fontSize: 18, fontWeight: 800, color: "#E2D9F3", letterSpacing: "-0.01em" }}
            >
              Knuse-/delelisten
            </Typography>
            <Tooltip
              title="Retningslinjer for knusing, deling, åpning og oppløsning av tabletter og kapsler"
              placement="right"
              arrow
            >
              <InfoOutlinedIcon sx={{ fontSize: 16, color: "#7D6E94", cursor: "default" }} />
            </Tooltip>
          </Stack>
          <Typography sx={{ fontSize: 12, color: "#7D6E94" }}>
            Retningslinjer for knusing, deling, åpning og oppløsning av tabletter og kapsler
          </Typography>
        </Box>

        {/* Search + filter bar */}
        <Box
          sx={{
            px: 2,
            py: 1.2,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            bgcolor: "rgba(13,10,20,0.95)",
            flexShrink: 0,
          }}
        >
          {/* Search input */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.4,
              py: 0.65,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              maxWidth: 520,
              "&:focus-within": {
                borderColor: "rgba(139,92,246,0.55)",
                bgcolor: "rgba(139,92,246,0.06)",
              },
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 17, color: "#7D6E94", flexShrink: 0 }} />
            <InputBase
              fullWidth
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Søk etter legemiddel..."
              sx={{
                fontSize: 13.5,
                color: "#E2D9F3",
                "& input::placeholder": { color: "#7D6E94", opacity: 1 },
              }}
            />
            {search && (
              <IconButton
                size="small"
                onClick={() => handleSearch("")}
                sx={{ color: "#7D6E94", p: 0.3, "&:hover": { color: "#C084FC" } }}
              >
                <ClearRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </Box>

        </Box>

        {/* Table header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 140px 40px",
            gap: 1,
            px: 2,
            py: 0.8,
            bgcolor: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          {["Legemiddel", "Legemiddelform", "Håndtering (tallkode)", ""].map((h) => (
            <Typography key={h} sx={{ fontSize: 11.5, fontWeight: 700, color: "#6B5F80", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </Typography>
          ))}
        </Box>

        {/* Drug rows */}
        <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 5 }, "&::-webkit-scrollbar-track": { bgcolor: "transparent" }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 3 } }}>
          {paginated.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography sx={{ fontSize: 14, color: "#6B5F80" }}>Ingen legemidler funnet</Typography>
            </Box>
          ) : (
            paginated.map((drug) => <DrugRow key={drug.id} drug={drug} />)
          )}
        </Box>

        {/* Footer — count + page navigator */}
        <Box
          sx={{
            px: 2,
            py: 0.8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            bgcolor: "rgba(13,10,20,0.95)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 11.5, color: "#6B5F80" }}>
            {`${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} av ${filtered.length} legemidler`}
            {search && ` · "${search}"`}
          </Typography>

          {totalPages > 1 && (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <IconButton
                size="small"
                disabled={safePage === 0}
                onClick={() => setPage(0)}
                sx={{ color: safePage === 0 ? "rgba(255,255,255,0.15)" : "#9B8EB0", p: 0.4, "&:hover": { color: "#C084FC" } }}
              >
                <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{ color: safePage === 0 ? "rgba(255,255,255,0.15)" : "#9B8EB0", p: 0.4, "&:hover": { color: "#C084FC" } }}
              >
                <ChevronLeftRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <Typography key={`ellipsis-${idx}`} sx={{ fontSize: 12, color: "#6B5F80", px: 0.3 }}>…</Typography>
                  ) : (
                    <Box
                      key={item}
                      onClick={() => setPage(item as number)}
                      sx={{
                        width: 26, height: 26,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 1.5,
                        cursor: "pointer",
                        fontSize: 12, fontWeight: 700,
                        bgcolor: item === safePage ? "rgba(139,92,246,0.3)" : "transparent",
                        color: item === safePage ? "#C084FC" : "#9B8EB0",
                        border: item === safePage ? "1px solid rgba(139,92,246,0.55)" : "1px solid transparent",
                        "&:hover": { bgcolor: "rgba(139,92,246,0.15)", color: "#C084FC" },
                      }}
                    >
                      {(item as number) + 1}
                    </Box>
                  )
                )}

              <IconButton
                size="small"
                disabled={safePage === totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                sx={{ color: safePage === totalPages - 1 ? "rgba(255,255,255,0.15)" : "#9B8EB0", p: 0.4, "&:hover": { color: "#C084FC" } }}
              >
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                disabled={safePage === totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
                sx={{ color: safePage === totalPages - 1 ? "rgba(255,255,255,0.15)" : "#9B8EB0", p: 0.4, "&:hover": { color: "#C084FC" } }}
              >
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
