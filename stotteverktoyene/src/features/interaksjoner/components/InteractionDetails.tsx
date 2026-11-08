import * as React from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { RelevanceIcon, type RelevanceKind } from "../utils/relevance";

export type PairItem = {
  type: "Virkestoff" | "Gruppe";
  name: string;
  atc?: string;
  /** Hva brukeren søkte på som ga treff i denne gruppen. */
  searched: string[];
};

export type StdItem = {
  id: string;
  /** Tittel med evt. uthevede trefford. */
  title: React.ReactNode;
  plainTitle: string;
  text: string;
};

type AiState = {
  loading: boolean;
  text: string;
  error: string | null;
  latencyMs: number | null;
  onGenerate: () => void;
  onChange: (value: string) => void;
};

type Props = {
  kind: RelevanceKind | null;
  relevansLabel: string;
  pair: PairItem[];
  kliniskKonsekvens: string | null;
  handtering: string | null;
  mekanisme: string | null;
  onCopyFaglig: () => void;

  /** Uten interaksjons-ID finnes ingen koblede tekster. */
  hasInteractionId: boolean;
  /** Standardtekster etter filter, best treff først. */
  items: StdItem[];
  totalCount: number;
  bestId: string | null;
  filter: string;
  onFilterChange: (value: string) => void;
  activeId: string | null;
  onPick: (id: string | null) => void;
  firstName: string | null;
  onCopyText: (text: string) => void;

  isAdmin: boolean;
  isOwner: boolean;
  onEdit: (id: string) => void;
  onCreate: () => void;
  ai: AiState;
};

const accentText = (t: Theme) => (t.palette.mode === "dark" ? "#E08A88" : "#A03A38");
const cardBorder = (t: Theme) =>
  `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.22)" : "rgba(200,80,80,0.16)"}`;

// Viser «XX» som fornavnet (uthevet), slik at man ser hva som faktisk kopieres.
function renderMessage(text: string, firstName: string | null): React.ReactNode {
  if (!firstName) return text;
  const parts = text.split(/\bXX\b/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 ? (
        <Box
          component="mark"
          sx={(t) => ({
            px: 0.75,
            borderRadius: "6px",
            fontWeight: 700,
            color: t.palette.mode === "dark" ? "#F1B9B7" : "#8A3230",
            bgcolor: alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.2 : 0.14),
          })}
        >
          {firstName}
        </Box>
      ) : null}
      {part}
    </React.Fragment>
  ));
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, fontWeight: 800, fontSize: 13.5 }}>
      {icon}
      {children}
    </Box>
  );
}

function CopyButton({
  copied,
  onClick,
  disabled,
}: {
  copied: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="contained"
      disableElevation
      onClick={onClick}
      disabled={disabled}
      startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyIcon />}
      sx={{
        minWidth: 168,
        py: 1.1,
        borderRadius: "12px",
        fontWeight: 800,
        fontSize: 14.5,
        textTransform: "none",
        color: "#fff",
        bgcolor: copied ? "#2E7D4F" : "#B04442",
        "&:hover": { bgcolor: copied ? "#2E7D4F" : "#8A3230" },
      }}
    >
      {copied ? "Kopiert" : "Kopier tekst"}
    </Button>
  );
}

export default function InteractionDetails({
  kind,
  relevansLabel,
  pair,
  kliniskKonsekvens,
  handtering,
  mekanisme,
  onCopyFaglig,
  hasInteractionId,
  items,
  totalCount,
  bestId,
  filter,
  onFilterChange,
  activeId,
  onPick,
  firstName,
  onCopyText,
  isAdmin,
  isOwner,
  onEdit,
  onCreate,
  ai,
}: Props) {
  const [view, setView] = React.useState<"std" | "ai">("std");
  const [mechOpen, setMechOpen] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<"std" | "ai" | null>(null);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const aiHasContent = ai.loading || Boolean(ai.text) || Boolean(ai.error);
  const showAi = view === "ai" && aiHasContent;
  const effectiveId = activeId ?? bestId;
  const active = items.find((i) => i.id === effectiveId) ?? null;

  const flashCopied = (key: "std" | "ai") => {
    setCopiedKey(key);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedKey(null), 1800);
  };

  const severity = kind === "caution" ? "caution" : "avoid";
  const severityColors = (t: Theme) =>
    severity === "avoid"
      ? {
          bg: t.palette.mode === "dark" ? "rgba(240,113,120,0.16)" : "#FEECEB",
          fg: t.palette.mode === "dark" ? "#F4A3A6" : "#9B2C2A",
        }
      : {
          bg: t.palette.mode === "dark" ? "rgba(242,170,76,0.16)" : "#FFF3DD",
          fg: t.palette.mode === "dark" ? "#F2C47C" : "#8A5A00",
        };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
      {/* ───────── Faglig sammendrag ───────── */}
      <Box
        component="section"
        aria-label="Faglig sammendrag"
        sx={{
          bgcolor: (t) => (t.palette.mode === "dark" ? "#151A1A" : "#FFFFFF"),
          border: cardBorder,
          borderRadius: "20px",
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          {kind ? (
            <Box
              sx={(t) => ({
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                pl: 1,
                pr: 1.75,
                py: 0.5,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14.5,
                bgcolor: severityColors(t).bg,
                color: severityColors(t).fg,
              })}
            >
              <RelevanceIcon kind={kind} />
              {relevansLabel}
            </Box>
          ) : (
            <span />
          )}
          <Button
            variant="outlined"
            onClick={onCopyFaglig}
            startIcon={<ContentCopyIcon fontSize="small" />}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13.5,
              color: accentText,
              borderColor: (t) => (t.palette.mode === "dark" ? "rgba(220,90,90,0.35)" : "rgba(176,68,66,0.3)"),
            }}
          >
            Kopier faglig tekst
          </Button>
        </Box>

        {/* Paret */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: pair.length > 1 ? "minmax(0,1fr) auto minmax(0,1fr)" : "1fr",
            },
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          {pair.map((p, i) => (
            <React.Fragment key={`${p.type}:${p.name}:${i}`}>
              {i === 1 ? (
                <Box
                  aria-hidden="true"
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    color: accentText,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  ×
                </Box>
              ) : null}
              <Box
                sx={(t) => ({
                  minWidth: 0,
                  borderRadius: "14px",
                  px: 1.75,
                  py: 1.25,
                  border: `1px solid ${t.palette.divider}`,
                  bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#FFFCFC",
                })}
              >
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  {p.type}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                  {p.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                  {p.atc ? (
                    <Typography
                      component="span"
                      sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
                    >
                      {p.atc}
                    </Typography>
                  ) : null}
                  {p.searched.length > 0 ? (
                    <Box
                      component="span"
                      sx={(t) => ({
                        fontSize: 12,
                        px: 1,
                        py: 0.1,
                        borderRadius: 999,
                        color: "text.secondary",
                        bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "#F3F4F6",
                      })}
                    >
                      Søkt: {p.searched.join(", ")}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </React.Fragment>
          ))}
        </Box>

        {/* Konsekvens + håndtering */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: handtering ? { xs: "1fr", md: "minmax(0,1.15fr) minmax(0,1fr)" } : "1fr",
            gap: 1.5,
          }}
        >
          <Box
            sx={(t) => ({
              borderRadius: "14px",
              px: 2,
              py: 1.75,
              bgcolor: t.palette.mode === "dark" ? "rgba(240,113,120,0.08)" : "#FFF4F3",
              border: `1px solid ${t.palette.mode === "dark" ? "rgba(240,113,120,0.22)" : "rgba(212,59,56,0.18)"}`,
            })}
          >
            <SectionLabel icon={<WarningAmberRoundedIcon sx={{ fontSize: 19, color: accentText }} />}>
              <Box component="span" sx={{ color: accentText }}>
                Klinisk konsekvens
              </Box>
            </SectionLabel>
            <Typography sx={{ fontSize: 14.5, lineHeight: 1.55 }}>{kliniskKonsekvens ?? "-"}</Typography>
          </Box>

          {handtering ? (
            <Box
              sx={(t) => ({
                borderRadius: "14px",
                px: 2,
                py: 1.75,
                bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#F6F8FA",
                border: `1px solid ${t.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "#E3E8EE"}`,
              })}
            >
              <SectionLabel icon={<AssignmentTurnedInOutlinedIcon sx={{ fontSize: 19 }} />}>Håndtering</SectionLabel>
              <Typography sx={{ fontSize: 14.5, lineHeight: 1.55 }}>{handtering}</Typography>
            </Box>
          ) : null}
        </Box>

        {/* Mekanisme */}
        {mekanisme ? (
          <Box sx={{ borderTop: (t) => `1px solid ${t.palette.divider}`, pt: 1.25 }}>
            <ButtonBase
              onClick={() => setMechOpen((o) => !o)}
              aria-expanded={mechOpen}
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                py: 0.25,
                borderRadius: "8px",
                fontSize: 13.5,
                fontWeight: 700,
                color: "text.secondary",
              }}
            >
              Interaksjonsmekanisme
              <ExpandMoreRoundedIcon
                sx={{ transition: "transform 160ms ease", transform: mechOpen ? "rotate(180deg)" : "none" }}
              />
            </ButtonBase>
            <Collapse in={mechOpen} unmountOnExit>
              <Typography sx={{ mt: 1, fontSize: 14, lineHeight: 1.55, color: "text.secondary" }}>
                {mekanisme}
              </Typography>
            </Collapse>
          </Box>
        ) : null}
      </Box>

      {/* ───────── Tekst til kunden ───────── */}
      {hasInteractionId ? (
        <Box
          component="section"
          aria-labelledby="kundetekst-tittel"
          sx={(t) => ({
            borderRadius: "20px",
            px: 3,
            py: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.75,
            border: `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.26)" : "rgba(200,80,80,0.2)"}`,
            bgcolor: t.palette.mode === "dark" ? "rgba(200,70,70,0.06)" : "#FFF7F6",
          })}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography id="kundetekst-tittel" component="h2" sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                Tekst til kunden
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
                {totalCount > 0
                  ? "Velg tekst, les gjennom og kopier. Det du ser er det som blir kopiert."
                  : "Ingen standardtekster er knyttet til denne interaksjonen ennå."}
              </Typography>
            </Box>
            {totalCount > 0 ? (
              <Chip
                size="small"
                icon={<DescriptionOutlinedIcon />}
                label={`${totalCount} knyttede standardtekster`}
                variant="outlined"
                sx={{ flexShrink: 0, fontWeight: 600, bgcolor: "background.paper" }}
              />
            ) : null}
          </Box>

          {totalCount > 4 ? (
            <TextField
              size="small"
              label="Filtrer standardtekster"
              placeholder="Søk på tittel"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              sx={{ maxWidth: 360 }}
            />
          ) : null}

          {/* Kilde-velger */}
          {totalCount > 0 || isOwner ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "stretch" }}>
              {items.map((s) => {
                const selected = !showAi && s.id === effectiveId;
                return (
                  <ButtonBase
                    key={s.id}
                    aria-pressed={selected}
                    onClick={() => {
                      setView("std");
                      onPick(s.id);
                    }}
                    sx={(t) => ({
                      flex: "1 1 220px",
                      minWidth: 0,
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 0.25,
                      px: 1.75,
                      py: 1.4,
                      borderRadius: "14px",
                      border: `1.5px solid ${selected ? "#B04442" : alpha(t.palette.primary.main, 0.25)}`,
                      bgcolor: selected ? "background.paper" : alpha(t.palette.background.paper, 0.55),
                      boxShadow: selected ? `0 0 0 3px ${alpha(t.palette.primary.main, 0.16)}` : "none",
                      transition: "border-color 120ms ease, box-shadow 120ms ease",
                      "&:hover": { borderColor: "#B04442" },
                    })}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <DescriptionOutlinedIcon sx={{ fontSize: 18, color: accentText, flexShrink: 0 }} />
                      <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 800, minWidth: 0 }}>
                        {s.title}
                      </Typography>
                      {s.id === bestId ? (
                        <Box
                          component="span"
                          sx={(t) => ({
                            flexShrink: 0,
                            px: 1,
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            color: t.palette.mode === "dark" ? "#F4A3A6" : "#9B2C2A",
                            bgcolor: t.palette.mode === "dark" ? "rgba(240,113,120,0.16)" : "#FEECEB",
                          })}
                        >
                          Best treff
                        </Box>
                      ) : null}
                    </Box>
                    <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary" }}>
                      {s.text.replace(/\s+/g, " ").trim()}
                    </Typography>
                  </ButtonBase>
                );
              })}

              {isOwner ? (
                <ButtonBase
                  aria-pressed={showAi}
                  disabled={ai.loading}
                  onClick={() => {
                    setView("ai");
                    if (!aiHasContent) ai.onGenerate();
                  }}
                  sx={(t) => ({
                    flex: items.length > 0 ? "0 0 auto" : "1 1 220px",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    gap: 0.25,
                    px: 2,
                    py: 1.4,
                    borderRadius: "14px",
                    color: accentText(t),
                    border: showAi ? "1.5px solid #B04442" : `1.5px dashed ${alpha("#B04442", 0.45)}`,
                    bgcolor: showAi ? "background.paper" : "transparent",
                    boxShadow: showAi ? `0 0 0 3px ${alpha(t.palette.primary.main, 0.16)}` : "none",
                  })}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 14, fontWeight: 800 }}>
                    {ai.loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
                    {aiHasContent ? "AI-utkast" : "Lag utkast"}
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Med Claude · kun eier</Typography>
                </ButtonBase>
              ) : null}
            </Box>
          ) : null}

          {/* Forhåndsvisning */}
          {showAi ? (
            <Box
              sx={{
                bgcolor: "background.paper",
                border: cardBorder,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Generert kundetekst (utkast)</Typography>
                <Button
                  size="small"
                  onClick={ai.onGenerate}
                  disabled={ai.loading}
                  startIcon={<ReplayRoundedIcon fontSize="small" />}
                  sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
                >
                  Generer på nytt
                </Button>
              </Box>

              <Box sx={{ px: 2.5, py: 1.75 }}>
                {ai.error ? (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {ai.error}
                  </Alert>
                ) : null}
                {ai.loading && !ai.text ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
                    <CircularProgress size={18} />
                    <Typography color="text.secondary">Genererer utkast grunnet i FEST-data …</Typography>
                  </Box>
                ) : null}
                {ai.text ? (
                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    value={ai.text}
                    onChange={(e) => ai.onChange(e.target.value)}
                    slotProps={{ htmlInput: { "aria-label": "Utkast til kundetekst" } }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", fontSize: 15, lineHeight: 1.6 } }}
                  />
                ) : null}
              </Box>

              {ai.text ? (
                <Box
                  sx={(t) => ({
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.25,
                    mx: 2,
                    mb: 1.75,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "12px",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: t.palette.mode === "dark" ? "#F2D8A0" : "#6B4E00",
                    bgcolor: t.palette.mode === "dark" ? "rgba(242,170,76,0.1)" : "#FFF8E6",
                    border: `1px solid ${t.palette.mode === "dark" ? "rgba(242,170,76,0.3)" : "#F1DFAE"}`,
                  })}
                >
                  <WarningAmberRoundedIcon sx={{ fontSize: 17, mt: "1px", flexShrink: 0 }} />
                  <span>
                    Utkast generert med Claude basert på FEST-feltene over – ingen kliniske fakta er lagt til av
                    modellen. Må kvalitetssikres av farmasøyt før sending. Lim aldri inn kundeopplysninger.
                    {ai.latencyMs != null ? ` (${(ai.latencyMs / 1000).toFixed(1)} s)` : ""}
                  </span>
                </Box>
              ) : null}

              <Box
                sx={(t) => ({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderTop: `1px solid ${t.palette.divider}`,
                  borderRadius: "0 0 16px 16px",
                  bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#FFFCFC",
                })}
              >
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: 12.5, color: "text.secondary" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                  Endringer du gjør her kopieres, men lagres ikke
                </Box>
                <CopyButton
                  copied={copiedKey === "ai"}
                  disabled={!ai.text}
                  onClick={() => {
                    onCopyText(ai.text);
                    flashCopied("ai");
                  }}
                />
              </Box>
            </Box>
          ) : active ? (
            <Box
              sx={{
                bgcolor: "background.paper",
                border: cardBorder,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{active.plainTitle}</Typography>
                {isAdmin ? (
                  <Tooltip title="Rediger standardtekst" arrow>
                    <Button
                      size="small"
                      onClick={() => onEdit(active.id)}
                      startIcon={<EditOutlinedIcon fontSize="small" />}
                      sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
                    >
                      Rediger
                    </Button>
                  </Tooltip>
                ) : null}
              </Box>

              <Typography
                sx={{ px: 2.5, py: 2, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-line", userSelect: "text" }}
              >
                {renderMessage(active.text, firstName)}
              </Typography>

              <Box
                sx={(t) => ({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderTop: `1px solid ${t.palette.divider}`,
                  borderRadius: "0 0 16px 16px",
                  bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#FFFCFC",
                })}
              >
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: 12.5, color: "text.secondary" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                  {firstName && /\bXX\b/.test(active.text)
                    ? "XX er byttet ut med fornavnet ditt"
                    : "Teksten kopieres slik den vises"}
                </Box>
                <CopyButton
                  copied={copiedKey === "std"}
                  onClick={() => {
                    onCopyText(active.text);
                    flashCopied("std");
                  }}
                />
              </Box>
            </Box>
          ) : totalCount > 0 ? (
            <Typography color="text.secondary">Ingen standardtekster matcher søket.</Typography>
          ) : (
            <Box
              sx={(t) => ({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 1.5,
                px: 3,
                py: 3.5,
                borderRadius: "16px",
                border: `1.5px dashed ${alpha("#B04442", 0.35)}`,
                bgcolor: alpha(t.palette.background.paper, 0.6),
              })}
            >
              <Box
                sx={(t) => ({
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentText(t),
                  bgcolor: alpha(t.palette.primary.main, 0.12),
                })}
              >
                <DescriptionOutlinedIcon />
              </Box>
              <Box sx={{ maxWidth: 460 }}>
                <Typography sx={{ fontSize: 15.5, fontWeight: 800 }}>Ingen ferdig tekst til denne kombinasjonen</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.55, color: "text.secondary" }}>
                  Les det faglige sammendraget over og formuler svaret selv
                  {isOwner ? ", eller lag et utkast du kan redigere" : ""}.
                  {isAdmin ? " Opprett en standardtekst hvis kombinasjonen kommer igjen." : ""}
                </Typography>
              </Box>
              {isOwner || isAdmin ? (
                <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", justifyContent: "center" }}>
                  {isOwner ? (
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={() => {
                        setView("ai");
                        ai.onGenerate();
                      }}
                      startIcon={<AutoAwesomeIcon />}
                      sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, color: "#fff", bgcolor: "#B04442", "&:hover": { bgcolor: "#8A3230" } }}
                    >
                      Lag utkast med Claude
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button
                      variant="outlined"
                      onClick={onCreate}
                      startIcon={<AddRoundedIcon />}
                      sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, color: accentText, borderColor: alpha("#B04442", 0.35) }}
                    >
                      Ny standardtekst
                    </Button>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          )}

          {/* Admin: ny tekst også når det finnes tekster */}
          {isAdmin && totalCount > 0 ? (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <IconButton
                aria-label="Ny standardtekst"
                onClick={onCreate}
                size="small"
                sx={{ gap: 0.75, borderRadius: "10px", fontSize: 13, fontWeight: 700, color: accentText }}
              >
                <AddRoundedIcon fontSize="small" />
                Ny standardtekst
              </IconButton>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
