import * as React from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

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

function Caption({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: color ?? "text.secondary",
        mb: 0.5,
      }}
    >
      {children}
    </Typography>
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
        minWidth: 160,
        py: 1,
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
  const [infoAnchor, setInfoAnchor] = React.useState<HTMLElement | null>(null);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>();
  React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const aiHasContent = ai.loading || Boolean(ai.text) || Boolean(ai.error);
  const showAi = view === "ai" && aiHasContent;
  const effectiveId = activeId ?? bestId;
  const active = items.find((i) => i.id === effectiveId) ?? null;
  // Velger vises bare når det faktisk er noe å velge mellom.
  const optionCount = items.length + (isOwner ? 1 : 0);
  const showPicker = optionCount > 1 || (totalCount > 0 && items.length === 0);

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

  const title = pair.map((p) => p.name).join(" × ");

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
                gap: 0.75,
                pl: 0.75,
                pr: 1.5,
                py: 0.25,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 13.5,
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Tooltip title="Stoffer og ATC-koder" arrow>
              <IconButton
                aria-label="Vis stoffer og ATC-koder"
                size="small"
                onClick={(e) => setInfoAnchor(e.currentTarget)}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Kopier faglig tekst" arrow>
              <IconButton aria-label="Kopier faglig tekst" size="small" onClick={onCopyFaglig}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography component="h2" sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.3, overflowWrap: "anywhere" }}>
          {title}
        </Typography>

        <Box>
          <Caption color="inherit">
            <Box component="span" sx={{ color: accentText }}>
              Klinisk konsekvens
            </Box>
          </Caption>
          <Typography sx={{ fontSize: 14.5, lineHeight: 1.6 }}>{kliniskKonsekvens ?? "-"}</Typography>
        </Box>

        {handtering ? (
          <Box>
            <Caption>Håndtering</Caption>
            <Typography sx={{ fontSize: 14.5, lineHeight: 1.6 }}>{handtering}</Typography>
          </Box>
        ) : null}

        {mekanisme ? (
          <Box>
            <ButtonBase
              onClick={() => setMechOpen((o) => !o)}
              aria-expanded={mechOpen}
              sx={{
                gap: 0.5,
                py: 0.25,
                borderRadius: "8px",
                fontSize: 13,
                fontWeight: 700,
                color: "text.secondary",
              }}
            >
              {mechOpen ? "Skjul mekanisme" : "Vis mekanisme"}
              <ExpandMoreRoundedIcon
                sx={{ fontSize: 18, transition: "transform 160ms ease", transform: mechOpen ? "rotate(180deg)" : "none" }}
              />
            </ButtonBase>
            <Collapse in={mechOpen} unmountOnExit>
              <Typography sx={{ mt: 0.75, fontSize: 14, lineHeight: 1.6, color: "text.secondary" }}>
                {mekanisme}
              </Typography>
            </Collapse>
          </Box>
        ) : null}

        <Popover
          open={Boolean(infoAnchor)}
          anchorEl={infoAnchor}
          onClose={() => setInfoAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 0.5, p: 2, borderRadius: "14px", minWidth: 280, maxWidth: 380 } } }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {pair.map((p, i) => (
              <Box key={`${p.type}:${p.name}:${i}`}>
                <Caption>{p.type}</Caption>
                <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>{p.name}</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  {[p.atc ? `ATC ${p.atc}` : null, p.searched.length > 0 ? `Søkt: ${p.searched.join(", ")}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Box>
            ))}
          </Box>
        </Popover>
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
            gap: 1.5,
            border: `1px solid ${t.palette.mode === "dark" ? "rgba(200,80,80,0.26)" : "rgba(200,80,80,0.2)"}`,
            bgcolor: t.palette.mode === "dark" ? "rgba(200,70,70,0.06)" : "#FFF7F6",
          })}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography id="kundetekst-tittel" component="h2" sx={{ fontSize: 17, fontWeight: 800 }}>
              Tekst til kunden
            </Typography>
            {isAdmin && totalCount > 0 ? (
              <Button
                size="small"
                onClick={onCreate}
                startIcon={<AddRoundedIcon fontSize="small" />}
                sx={{ textTransform: "none", fontWeight: 700, color: accentText }}
              >
                Ny standardtekst
              </Button>
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

          {/* Velger: kompakte piller, kun tittel */}
          {showPicker ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }} role="group" aria-label="Velg tekst">
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
                      maxWidth: "100%",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.75,
                      py: 0.9,
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 700,
                      border: `1.5px solid ${selected ? "#B04442" : alpha(t.palette.primary.main, 0.28)}`,
                      bgcolor: selected ? "background.paper" : "transparent",
                      boxShadow: selected ? `0 0 0 3px ${alpha(t.palette.primary.main, 0.16)}` : "none",
                      "&:hover": { borderColor: "#B04442" },
                    })}
                  >
                    <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title}
                    </Box>
                    {s.id === bestId && items.length > 1 ? (
                      <Tooltip title="Best treff mot det du har søkt på" arrow>
                        <Box
                          component="span"
                          aria-label="Best treff"
                          sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#D43B38", flexShrink: 0 }}
                        />
                      </Tooltip>
                    ) : null}
                  </ButtonBase>
                );
              })}

              {isOwner ? (
                <Tooltip title="Lag utkast med Claude (kun eier)" arrow>
                  <span>
                    <ButtonBase
                      aria-pressed={showAi}
                      disabled={ai.loading}
                      onClick={() => {
                        setView("ai");
                        if (!aiHasContent) ai.onGenerate();
                      }}
                      sx={(t) => ({
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.75,
                        py: 0.9,
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 700,
                        color: accentText(t),
                        border: showAi ? "1.5px solid #B04442" : `1.5px dashed ${alpha("#B04442", 0.45)}`,
                        bgcolor: showAi ? "background.paper" : "transparent",
                        boxShadow: showAi ? `0 0 0 3px ${alpha(t.palette.primary.main, 0.16)}` : "none",
                      })}
                    >
                      {ai.loading ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 17 }} />}
                      {aiHasContent ? "AI-utkast" : "Lag utkast"}
                    </ButtonBase>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
          ) : null}

          {/* Forhåndsvisning */}
          {showAi ? (
            <Box
              sx={{
                position: "relative",
                bgcolor: "background.paper",
                border: cardBorder,
                borderRadius: "16px",
                px: 2.5,
                pt: 2,
                pb: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                <Tooltip title="Generer på nytt" arrow>
                  <span>
                    <IconButton aria-label="Generer på nytt" size="small" onClick={ai.onGenerate} disabled={ai.loading}>
                      <ReplayRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {ai.error ? <Alert severity="error">{ai.error}</Alert> : null}
              {ai.loading && !ai.text ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Genererer utkast …</Typography>
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
                  sx={{
                    pr: 4,
                    "& .MuiOutlinedInput-root": { borderRadius: "12px", fontSize: 14.5, lineHeight: 1.6 },
                  }}
                />
              ) : null}

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                <Tooltip
                  arrow
                  title={`Utkast generert med Claude basert på FEST-feltene – ingen kliniske fakta er lagt til av modellen. Må kvalitetssikres av farmasøyt før sending. Lim aldri inn kundeopplysninger. Endringer du gjør her kopieres, men lagres ikke.${
                    ai.latencyMs != null ? ` (${(ai.latencyMs / 1000).toFixed(1)} s)` : ""
                  }`}
                >
                  <Box
                    sx={(t) => ({
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "help",
                      color: t.palette.mode === "dark" ? "#F2D8A0" : "#8A5A00",
                    })}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                    Utkast – kvalitetssikres før sending
                  </Box>
                </Tooltip>
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
                position: "relative",
                bgcolor: "background.paper",
                border: cardBorder,
                borderRadius: "16px",
                px: 2.5,
                pt: 2,
                pb: 1.75,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              {/* Tittel vises bare når det ikke finnes en velger som allerede navngir teksten. */}
              {!showPicker ? (
                <Typography sx={{ fontSize: 14, fontWeight: 800, pr: 5 }}>{active.plainTitle}</Typography>
              ) : null}
              {isAdmin ? (
                <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                  <Tooltip title="Rediger standardtekst" arrow>
                    <IconButton aria-label="Rediger standardtekst" size="small" onClick={() => onEdit(active.id)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : null}

              <Typography
                sx={{
                  fontSize: 14.5,
                  lineHeight: 1.65,
                  whiteSpace: "pre-line",
                  userSelect: "text",
                  maxHeight: 320,
                  overflowY: "auto",
                  pr: isAdmin && showPicker ? 4 : 0,
                }}
              >
                {renderMessage(active.text, firstName)}
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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
                gap: 1.25,
                px: 3,
                py: 3,
                borderRadius: "16px",
                border: `1.5px dashed ${alpha("#B04442", 0.35)}`,
                bgcolor: alpha(t.palette.background.paper, 0.6),
              })}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 26, color: accentText }} />
              <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>Ingen ferdig tekst til denne kombinasjonen</Typography>
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
                      Lag utkast
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
        </Box>
      ) : null}
    </Box>
  );
}
