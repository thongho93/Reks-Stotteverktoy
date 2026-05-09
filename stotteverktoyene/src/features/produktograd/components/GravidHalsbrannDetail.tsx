import React, { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  comment: string;
  priority?: "first" | "second" | "need" | "doctor";
  priorityLabel?: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES: Medicine[] = [
  // ── Alginat — Førstevalg ──
  {
    name: "Gaviscon tyggetabletter",
    form: "Tyggetablett",
    type: "Alginat",
    comment: "Danner et skumlag over mageinnholdet og hindrer det fra å stige opp. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Gaviscon mikstur* / Galieve*",
    form: "Mikstur",
    type: "Alginat + syrenøytraliserende",
    comment: "Inneholder alginat og syrenøytraliserende. Maks 4 ganger daglig pga. kalsiumkarbonat. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── Syrenøytraliserende — Førstevalg ──
  {
    name: "Novaluzid / Titralac*",
    form: "Tablett",
    type: "Syrenøytraliserende",
    comment: "Syrenøytraliserende middel. Titralac inneholder kalsiumkarbonat – maks 4 ganger daglig. Godt dokumentert i graviditet.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Natron NAF",
    form: "Pulver/tablett",
    type: "Syrenøytraliserende",
    comment: "Natriumbikarbonat. Brukes som kortidsbehandling. Ikke anbefalt ved høyt blodtrykk eller ved stort inntak over tid.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── H2-blokker — Ved behov ──
  {
    name: "Pepcid**",
    form: "Tablett",
    type: "H2-blokker (famotidin)",
    comment: "Famotidin reduserer syreproduksjonen. Brukes ved behov. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "second",
    priorityLabel: "Andrevalg",
  },
  {
    name: "Pepciduo**",
    form: "Tablett",
    type: "H2-blokker + syrenøytraliserende",
    comment: "Kombinasjon av famotidin og syrenøytraliserende. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "second",
    priorityLabel: "Andrevalg",
  },
  // ── PPI — Kontakt lege først ──
  {
    name: "Losec / Omeprazol",
    form: "Kapsel",
    type: "PPI",
    comment: "Syrehemmende middel. Mest erfaring av PPI-preparatene i graviditet. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Nexium / Esomeprazol",
    form: "Kapsel/tablett",
    type: "PPI",
    comment: "Syrehemmende middel. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Somac / Somac Control / Pantoprazol",
    form: "Tablett",
    type: "PPI",
    comment: "Syrehemmende middel. Anbefales ikke som rutinebehandling. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Lanzor Melt / Lansoprazol",
    form: "Smeltetablett",
    type: "PPI",
    comment: "Syrehemmende middel. Les mer i pakningsvedlegget. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
];

const BedIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.4 0 0 0.4 12 12)">
      <path style={{ fill: "currentColor" }} transform="translate(-25, -25.5)" d="M 3 9 C 1.3545455 9 0 10.354545 0 12 L 0 42 L 6 42 L 6 37 L 44 37 L 44 42 L 50 42 L 50 28 L 50 23 C 50 20.254545 47.745455 18 45 18 L 19 18 C 18.44773812379154 18.00005521790535 18.00005521790535 18.44773812379154 18 19 L 18 28 L 12 28 L 6 28 L 6 12 C 6 10.354545 4.6454545 9 3 9 z M 12 28 C 14.749579 28 17 25.749579 17 23 C 17 20.250421 14.749579 18 12 18 C 9.2504209 18 7 20.250421 7 23 C 7 25.749579 9.2504209 28 12 28 z M 3 11 C 3.5545455 11 4 11.445455 4 12 L 4 30 L 5 30 L 48 30 L 48 40 L 46 40 L 46 35 L 4 35 L 4 40 L 2 40 L 2 12 C 2 11.445455 2.4454545 11 3 11 z M 12 20 C 13.668699 20 15 21.331301 15 23 C 15 24.668699 13.668699 26 12 26 C 10.331301 26 9 24.668699 9 23 C 9 21.331301 10.331301 20 12 20 z M 20 20 L 45 20 C 46.654545 20 48 21.345455 48 23 L 48 28 L 20 28 L 20 20 z" />
    </g>
  </svg>
);

const FlameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M39 8H9C8.44771 8 8 8.44772 8 9V39C8 39.5523 8.44772 40 9 40H39C39.5523 40 40 39.5523 40 39V9C40 8.44771 39.5523 8 39 8ZM9 6C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6H9Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M20.0889 10C20.0889 15.1089 17.7658 18.9036 15.3041 23.3195C12.2373 28.8208 15.0904 33.5826 18.5926 38C18.5926 32.9306 19.3994 30.0689 23.1926 26.2587C25.5254 30.4353 25.7372 33.5009 25 38C34.6627 33.334 34.1463 25.6833 31.33 17C30.787 19 29.7752 20.8182 29.1179 22.0909C27.809 17.0219 24.076 13.3085 20.0889 10Z" fill="currentColor"/>
  </svg>
);

const SYMPTOMS: { label: string; icon: React.ReactNode }[] = [
  { label: "Sure oppstøt",       icon: <FlameIcon /> },
  { label: "Svie bak brystbenet", icon: <FlameIcon /> },
  { label: "Verre etter måltid",  icon: <FlameIcon /> },
  { label: "Verre når du ligger", icon: <BedIcon /> },
];

const RAD_TIPS = [
  "Hev hodebunnen av sengen for å begrense plager om natten.",
  "Unngå å spise store måltider – spis sakte og rolig, særlig på kvelden.",
  "Unngå fet eller syrlig mat som forverrer plager.",
  "Unngå å legge deg rett etter et måltid – vent minst 2–3 timer.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first")  return "#16a34a";
  if (p === "second") return "#2563eb";
  if (p === "need")   return "#d97706";
  return "#dc2626";
}

function priorityBg(p: Medicine["priority"]): string {
  if (p === "first")  return "#dcfce7";
  if (p === "second") return "#dbeafe";
  if (p === "need")   return "#fef3c7";
  return "#fee2e2";
}

function priorityIcon(p: Medicine["priority"]): React.ReactNode {
  if (p === "first") return (
    <svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <g transform="matrix(0.91 0 0 0.91 12 12)">
        <path style={{ fill: "currentColor" }} transform="translate(-15, -15)" d="M 24 4 L 6 4 C 4.895 4 4 4.895 4 6 L 4 24 C 4 25.105 4.895 26 6 26 L 24 26 C 25.105 26 26 25.105 26 24 L 26 6 C 26 4.895 25.105 4 24 4 z M 16.506 19.932 L 14.442 19.932 L 14.442 12.078 L 14.319 12.078 L 11.899000000000001 13.745999999999999 L 11.899000000000001 11.825 L 14.449000000000002 10.068 L 16.507 10.068 L 16.506 19.932 L 16.506 19.932 z" />
      </g>
    </svg>
  );
  if (p === "second") return (
    <svg width="13" height="13" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <g transform="matrix(1.11 0 0 1.11 12 12)">
        <path style={{ fill: "currentColor" }} transform="translate(-12, -12)" d="M 19 3 L 5 3 C 3.898438 3 3 3.898438 3 5 L 3 19 C 3 20.101563 3.898438 21 5 21 L 19 21 C 20.101563 21 21 20.101563 21 19 L 21 5 C 21 3.898438 20.101563 3 19 3 Z M 15.300781 16.601563 L 8.898438 16.601563 L 8.898438 15.300781 C 11.601563 12.300781 13.101563 11.199219 13.101563 10 C 13.101563 9.601563 12.898438 8.699219 11.898438 8.699219 C 10.601563 8.699219 10.601563 10 10.601563 10.300781 L 8.699219 10.300781 C 8.699219 9.398438 9.398438 7.300781 11.898438 7.300781 C 14.398438 7.300781 14.898438 8.800781 14.898438 9.898438 C 14.898438 11.398438 13.800781 12.601563 11.199219 15.199219 L 15.199219 15.199219 L 15.199219 16.601563 Z" />
      </g>
    </svg>
  );
  if (p === "need") return "⚠️";
  return (
    <svg width="13" height="13" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M12 10C13.1046 10 14 9.10457 14 8C14 6.89543 13.1046 6 12 6C11.2597 6 10.6134 6.4022 10.2676 7H10C8.34315 7 7 8.34315 7 10V19H9V10C9 9.44772 9.44772 9 10 9H10.2676C10.6134 9.5978 11.2597 10 12 10Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.1602 19L9 19H7C6.44772 19 5.99531 19.4487 6.04543 19.9987C6.27792 22.5499 7.39568 24.952 9.22186 26.7782C10.561 28.1173 12.2098 29.0755 14 29.583V32C14 33.3064 14.835 34.4177 16.0004 34.8294C16.043 38.7969 19.2725 42 23.25 42C27.2541 42 30.5 38.7541 30.5 34.75V30.75C30.5 28.6789 32.1789 27 34.25 27C36.3211 27 38 28.6789 38 30.75V33.1707C36.8348 33.5825 36 34.6938 36 36C36 37.6569 37.3431 39 39 39C40.6569 39 42 37.6569 42 36C42 34.6938 41.1652 33.5825 40 33.1707V30.75C40 27.5744 37.4256 25 34.25 25C31.0744 25 28.5 27.5744 28.5 30.75V34.75C28.5 37.6495 26.1495 40 23.25 40C20.3769 40 18.0429 37.6921 18.0006 34.8291C19.1655 34.4171 20 33.306 20 32V29.583C21.7902 29.0755 23.4391 28.1173 24.7782 26.7782C26.6044 24.952 27.7221 22.5499 27.9546 19.9987C28.0048 19.4487 27.5523 19 27 19L27 10C27 8.34315 25.6569 7 24 7H23.7324C23.3866 6.4022 22.7403 6 22 6C20.8954 6 20 6.89543 20 8C20 9.10457 20.8954 10 22 10C22.7403 10 23.3866 9.5978 23.7324 9H24C24.5523 9 25 9.44772 25 10V19H23.8399C23.2876 19 22.8486 19.4509 22.7545 19.9952C22.5505 21.1746 21.9872 22.2717 21.1294 23.1294C20.0343 24.2246 18.5489 24.8399 17 24.8399C15.4512 24.8399 13.9658 24.2246 12.8706 23.1294C12.0129 22.2717 11.4495 21.1746 11.2455 19.9952C11.1514 19.4509 10.7124 19 10.1602 19ZM24.5805 21H25.775C25.4013 22.6396 24.5721 24.1559 23.364 25.364C21.6762 27.0518 19.387 28 17 28C14.6131 28 12.3239 27.0518 10.6361 25.364C9.42797 24.1559 8.59877 22.6396 8.22502 21L9.41953 21C9.77024 22.3291 10.4676 23.5548 11.4564 24.5436C12.9267 26.0139 14.9208 26.8399 17 26.8399C19.0793 26.8399 21.0734 26.0139 22.5437 24.5436C23.5325 23.5548 24.2298 22.3291 24.5805 21ZM39 35C39.5523 35 40 35.4477 40 36C40 36.5523 39.5523 37 39 37C38.4477 37 38 36.5523 38 36C38 35.4477 38.4477 35 39 35ZM18 30V32C18 32.5523 17.5523 33 17 33C16.4477 33 16 32.5523 16 32V30H18Z" fill="currentColor"/>
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TreatmentCard({ med }: { med: Medicine }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      border: `1.5px solid ${priorityColor(med.priority)}30`,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 160,
      flex: "1 1 160px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    }}>
      {/* Priority badge */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 10.5, fontWeight: 700,
        color: priorityColor(med.priority),
        background: priorityBg(med.priority),
        borderRadius: 999, padding: "2px 8px", alignSelf: "flex-start",
      }}>
        {priorityIcon(med.priority)} {med.priorityLabel}
      </span>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>
        {med.name}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, flex: 1 }}>
        {med.comment}
      </div>

    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function GravidHalsbrannDetail({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const dk = theme.palette.mode === "dark";
  const [activeTab, setActiveTab] = useState<TabKey>("rad");

  const bg        = dk ? "#0D1117" : "#F5F3F8";
  const cardBg    = dk ? "#161B22" : "#ffffff";
  const textMain  = dk ? "#f0e8f4" : "#0f172a";
  const textSub   = dk ? "#8e7d98" : "#64748b";
  const border    = dk ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const ACCENT    = "#06B6D4"; // halsbrann cyan

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "rad",    label: "Ikke-medikamentelle råd", icon: "🌿" },
    { key: "lege",   label: "Når kontakte lege",       icon: "ℹ️" },
    { key: "kilder", label: "Kilder",                  icon: "📄" },
  ];

  return (
    <Box sx={{ bgcolor: bg }}>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 3, pb: 2.5, maxWidth: 1100, mx: "auto" }}>

        {/* ─── Breadcrumb ────────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2, fontSize: 12.5, color: ACCENT, fontWeight: 600 }}>
          <span style={{ cursor: "pointer" }} onClick={onBack}>Gravide</span>
          <span style={{ color: textSub }}>›</span>
          <span style={{ color: textSub }}>Halsbrann</span>
        </Box>

        {/* ─── Hero + Warning panel ───────────────────────────────────────── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 300px" }, gap: 2.5, mb: 3 }}>
          {/* Left */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.25 }}>
              <Typography sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 900, color: textMain, lineHeight: 1.2 }}>
                Halsbrann hos gravide
              </Typography>
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: ACCENT, flexShrink: 0 }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M39 8H9C8.44771 8 8 8.44772 8 9V39C8 39.5523 8.44772 40 9 40H39C39.5523 40 40 39.5523 40 39V9C40 8.44771 39.5523 8 39 8ZM9 6C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6H9Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M20.0889 10C20.0889 15.1089 17.7658 18.9036 15.3041 23.3195C12.2373 28.8208 15.0904 33.5826 18.5926 38C18.5926 32.9306 19.3994 30.0689 23.1926 26.2587C25.5254 30.4353 25.7372 33.5009 25 38C34.6627 33.334 34.1463 25.6833 31.33 17C30.787 19 29.7752 20.8182 29.1179 22.0909C27.809 17.0219 24.076 13.3085 20.0889 10Z" fill="currentColor"/>
              </svg>
            </Box>

            <Typography sx={{ fontSize: 14, color: textSub, lineHeight: 1.7, mb: 2, maxWidth: 520 }}>
              Halsbrann er svært vanlig i graviditet. Det skyldes hormonelle endringer og økt trykk fra
              livmoren. Flere reseptfrie alternativer kan brukes trygt.
            </Typography>

            {/* Tags */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {[
                { label: "Gravid",              bg: "#ede9fe", color: "#7c3aed" },
                { label: "Vanlig plage",         bg: "#fef3c7", color: "#b45309" },
                { label: "Sist oppdatert: Mai 2024", bg: "#f1f5f9", color: "#475569" },
              ].map(tag => (
                <span key={tag.label} style={{
                  fontSize: 11.5, fontWeight: 700, padding: "3px 10px",
                  borderRadius: 999, background: tag.bg, color: tag.color,
                }}>
                  {tag.label}
                </span>
              ))}
            </Box>
          </Box>

          {/* Right — Når kontakte lege */}
          <Box sx={{
            background: dk ? "#1a1200" : "#fffbeb",
            border: "1.5px solid #fcd34d",
            borderRadius: 3, p: 2.25,
            display: "flex", flexDirection: "column", gap: 1.25,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#92400e" }}>
                Når kontakte lege?
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: dk ? "#c9a854" : "#78350f", lineHeight: 1.65 }}>
              Kontakt lege dersom du har sterke smerter, vedvarende plager eller symptomer som
              ikke bedres med behandling.
            </Typography>
            <button
              onClick={() => setActiveTab("lege")}
              style={{
                alignSelf: "flex-start", background: "none", border: "1px solid #fcd34d",
                borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                color: "#92400e", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              Se mer ▾
            </button>
          </Box>
        </Box>

        {/* ─── Symptoms ───────────────────────────────────────────────────── */}
        <Box sx={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 3, p: 2.5, mb: 3,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: 2, alignItems: "center",
        }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: textMain, mb: 1.5 }}>
              Kjenner du deg igjen i disse symptomene?
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {SYMPTOMS.map(({ label, icon }) => (
                <span key={label} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12.5, fontWeight: 600,
                  background: "#e0f2fe", borderRadius: 999, padding: "5px 14px",
                  border: "1.5px solid #bae6fd", color: ACCENT,
                }}>
                  {icon}
                  <span style={{ color: "#0c4a6e" }}>{label}</span>
                </span>
              ))}
            </Box>
          </Box>

          {/* Decorative pregnant illustration placeholder */}
          <Box sx={{
            width: 90, height: 90, borderRadius: "50%",
            background: "linear-gradient(135deg, #e0f2fe, #ede9fe)",
            display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 42 }}>🤰</span>
          </Box>
        </Box>

        {/* ─── Treatment alternatives ─────────────────────────────────────── */}
        <Box sx={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 3, p: 2.5, mb: 3,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: textMain }}>
              Behandlingsalternativer
            </Typography>
            <svg aria-label="Rangert etter anbefaling" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "help", flexShrink: 0, color: textMain }}>
              <g transform="matrix(0.43 0 0 0.43 12 12)">
                <path style={{ fill: "currentColor" }} transform="translate(-25, -25)" d="M 24.5 2 C 21.472656 2 19 4.472656 19 7.5 C 19 10.527344 21.472656 13 24.5 13 C 27.527344 13 30 10.527344 30 7.5 C 30 4.472656 27.527344 2 24.5 2 Z M 24.5 4 C 26.445313 4 28 5.554688 28 7.5 C 28 9.445313 26.445313 11 24.5 11 C 22.554688 11 21 9.445313 21 7.5 C 21 5.554688 22.554688 4 24.5 4 Z M 15 16 C 14.449219 16 14 16.449219 14 17 L 14 23 C 14 23.550781 14.449219 24 15 24 L 20 24 L 20 40 L 15 40 C 14.449219 40 14 40.449219 14 41 L 14 47 C 14 47.550781 14.449219 48 15 48 L 35 48 C 35.550781 48 36 47.550781 36 47 L 36 41 C 36 40.449219 35.550781 40 35 40 L 30 40 L 30 17 C 30 16.449219 29.550781 16 29 16 Z M 16 18 L 28 18 L 28 41 C 28 41.550781 28.449219 42 29 42 L 34 42 L 34 46 L 16 46 L 16 42 L 21 42 C 21.550781 42 22 41.550781 22 41 L 22 23 C 22 22.449219 21.550781 22 21 22 L 16 22 Z" />
              </g>
            </svg>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {MEDICINES.filter(m => m.priority).map(med => (
              <TreatmentCard key={med.name} med={med} />
            ))}
          </Box>

          {/* Footnotes */}
          <Box sx={{
            mt: 2, pt: 1.75,
            borderTop: `1px solid ${border}`,
            display: "flex", flexDirection: "column", gap: 0.75,
          }}>
            <Typography sx={{ fontSize: 11.5, color: textSub, lineHeight: 1.65 }}>
              <strong style={{ color: textMain }}>*</strong> Medisiner som inneholder kalsiumkarbonat (Gaviscon mikstur, Galieve, Titralac) bør ikke brukes oftere enn høyst fire ganger om dagen.
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: textSub, lineHeight: 1.65 }}>
              <strong style={{ color: textMain }}>**</strong> Kontakt lege hvis du har behov for å bruke famotidin (Pepcid, Pepcidduo) i mer enn to uker sammenhengende.
            </Typography>
          </Box>
        </Box>

        {/* ─── Main content + Sidebar ─────────────────────────────────────── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 280px" }, gap: 2.5 }}>

          {/* Left — Tabbed content */}
          <Box>
            {/* Tab bar */}
            <Box sx={{
              display: "flex", gap: 0,
              background: cardBg,
              border: `1px solid ${border}`,
              borderBottom: "none",
              borderRadius: "12px 12px 0 0",
              overflow: "hidden",
            }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, border: "none", cursor: "pointer",
                    padding: "11px 8px",
                    background: activeTab === tab.key ? (dk ? "#0D1117" : "#f8fafc") : "transparent",
                    borderBottom: activeTab === tab.key ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                    fontSize: 12, fontWeight: activeTab === tab.key ? 800 : 600,
                    color: activeTab === tab.key ? ACCENT : (dk ? "#8e7d98" : "#64748b"),
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "all 140ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </Box>

            {/* Tab content */}
            <Box sx={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: "0 0 12px 12px",
              overflow: "hidden",
            }}>

              {/* ── Ikke-medikamentelle råd tab ── */}
              {activeTab === "rad" && (
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: textMain, mb: 0.5 }}>
                    Andre gode råd
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                    Selv om du bruker medisiner bør du forsøtte å følge disse generelle rådene mot halsbrann og sure oppstøt.
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                    {RAD_TIPS.map((tip, i) => (
                      <Box key={i} sx={{
                        display: "flex", gap: 1.25, alignItems: "flex-start",
                        background: dk ? "#161B22" : "#f8fafc",
                        border: `1px solid ${border}`,
                        borderRadius: 2.5, p: 1.5,
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
                          {i === 0 ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <g transform="matrix(0.2 0 0 0.2 12 12)">
                                <g transform="matrix(1 0 0 1 13 -12)">
                                  <path style={{ fill: "rgb(254,253,239)" }} transform="translate(-63, -38)" d="M 74 25.5 L 75.391 28.133 L 78.5 28.556 L 76.25 30.606 L 76.781 33.5 L 74 32.133 L 71.219 33.5 L 71.75 30.606 L 69.5 28.556 L 72.609 28.133 z M 52 23.5 L 53.391 26.133 L 56.5 26.556 L 54.25 28.606 L 54.781 31.5 L 52 30.133 L 49.219 31.5 L 49.75 28.606 L 47.5 26.556 L 50.609 26.133 z M 63 44.5 L 64.391 47.133 L 67.5 47.556 L 65.25 49.606 L 65.781 52.5 L 63 51.133 L 60.219 52.5 L 60.75 49.606 L 58.5 47.556 L 61.609 47.133 z" />
                                </g>
                                <g transform="matrix(1 0 0 1 0 0)">
                                  <path style={{ fill: "rgb(249,230,92)" }} transform="translate(-50, -50)" d="M 61.5 64 C 47.417 64 36 52.583 36 38.5 C 36 28.774 40.992 20.3 49 16 C 30.566 16.4 16 31.474 16 50 C 16 68.778 31.222 84 50 84 C 68.526 84 83.6 69.434 84 51 C 79.7 59.008 71.226 64 61.5 64 z" />
                                </g>
                                <g transform="matrix(1 0 0 1 0 0)">
                                  <path style={{ fill: "rgb(31,33,43)" }} transform="translate(-50, -50)" d="M 50 85 C 30.701 85 15 69.299 15 50 C 15 30.787 29.925 15.414 48.979 15 C 49.474 15.004 49.85 15.299 49.967 15.746 C 50.085 16.193 49.881 16.663 49.473 16.881 C 41.663 21.075 37 29.157 37 38.5 C 37 52.009 47.99 63 61.5 63 C 70.843 63 78.925 58.337 83.119 50.527 C 83.337 50.12 83.805 49.917 84.255 50.033 C 84.701 50.15 85.01 50.56 85 51.021 C 84.586 70.075 69.212 85 50 85 z M 45.145 17.308 C 29.082 19.532 17 33.211 17 50 C 17 68.196 31.804 83 50 83 C 66.788 83 80.468 70.918 82.691 54.855 C 77.815 61.194 70.018 65 61.5 65 C 46.888 65 35 53.112 35 38.5 C 35 29.981 38.806 22.185 45.145 17.308 z" />
                                </g>
                              </g>
                            </svg>
                          ) : ["🍽️", "🥗", "⏰"][i - 1]}
                        </span>
                        <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.65 }}>
                          {tip}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ── Når kontakte lege tab ── */}
              {activeTab === "lege" && (
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start", mb: 2 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>🩺</span>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: textMain, mb: 0.5 }}>
                        Når bør du kontakte lege?
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.65 }}>
                        Verken alginat (Gaviscon, Galieve), syrenøytraliserende medisiner (Novaluzid, Titralac)
                        eller famotidin gir tilstrekkelig effekt, bør du kontakte lege for å diskutere om andre
                        alternativer kan være riktige for deg.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {[
                      "Sterke smerter i magen eller brystet",
                      "Vedvarende plager som ikke bedres med reseptfrie midler",
                      "Symptomer som forverrer seg over tid",
                      "Behov for bruk av famotidin i mer enn én sammenheng",
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 14, color: "#dc2626", flexShrink: 0 }}>•</span>
                        <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.6 }}>{item}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ── Kilder tab ── */}
              {activeTab === "kilder" && (
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: textMain, mb: 2 }}>
                    Informasjonskilder
                  </Typography>
                  {[
                    {
                      name: "Trygg Mammamedisin",
                      desc: "Nasjonal tjeneste for legemiddelinformasjon ved graviditet og amming, drevet av RELIS.",
                      url: "https://www.tryggmammamedisin.no",
                    },
                    {
                      name: "RELIS",
                      desc: "Avdeling for legemiddelinformasjon og farmakologi. Ansvarlig for tjenesten Trygg Mammamedisin.",
                      url: "https://www.relis.no",
                    },
                  ].map(src => (
                    <Box key={src.name} sx={{
                      mb: 1.5, p: 1.75,
                      background: dk ? "#161B22" : "#f8fafc",
                      border: `1px solid ${border}`,
                      borderRadius: 2.5,
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: ACCENT, mb: 0.25 }}>
                        {src.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: textSub, mb: 0.75, lineHeight: 1.6 }}>
                        {src.desc}
                      </Typography>
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
                        {src.url} ↗
                      </a>
                    </Box>
                  ))}
                  <Typography sx={{ fontSize: 11.5, color: textSub, mt: 2, lineHeight: 1.7, fontStyle: "italic" }}>
                    Sist oppdatert: Mai 2024. Informasjonen er skrevet av/godkjent av legespesialister og oppdateres
                    jevnlig basert på ny forskning og erfaring fra graviditetsomsorgen.
                  </Typography>
                </Box>
              )}

            </Box>
          </Box>

          {/* ── Right sidebar ─────────────────────────────────────────────── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Husk også */}
            <Box sx={{
              background: cardBg, border: `1px solid ${border}`,
              borderRadius: 3, p: 2.25,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#d97706" }}>Husk også</Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.7, mb: 1.25 }}>
                Ikke-medikamentelle tiltak kan ha stor effekt på halsbrann.
              </Typography>
              <button
                onClick={() => setActiveTab("rad")}
                style={{
                  background: "none", border: "1px solid #fcd34d", borderRadius: 8,
                  padding: "5px 12px", fontSize: 12, fontWeight: 700,
                  color: "#d97706", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                Se råd →
              </button>
            </Box>

            {/* Viktig å vite */}
            <Box sx={{
              background: cardBg, border: `1px solid ${border}`,
              borderRadius: 3, p: 2.25,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <span style={{ fontSize: 18 }}>🛡️</span>
                <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#16a34a" }}>Viktig å vite</Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {[
                  "Bruk laveste effektive dose.",
                  "De fleste plaster og medisiner kan brukes ved behov.",
                  "Informasjonen er basert på oppdaterte kilder.",
                ].map((item, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 12, color: "#16a34a", flexShrink: 0, marginTop: 2 }}>✓</span>
                    <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.55 }}>{item}</Typography>
                  </Box>
                ))}
              </Box>
              <button
                onClick={() => setActiveTab("kilder")}
                style={{
                  marginTop: 12, background: "none", border: "1px solid #bbf7d0",
                  borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                  color: "#16a34a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                Les mer om vurdering →
              </button>
            </Box>

            {/* Har du spørsmål */}
            <Box sx={{
              background: cardBg, border: `1px solid ${border}`,
              borderRadius: 3, p: 2.25,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: ACCENT }}>Har du spørsmål?</Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.7, mb: 1.25 }}>
                Kontakt farmasøyt eller lege hvis du er usikker på hva som er trygt for deg.
              </Typography>
              <button style={{
                background: ACCENT, border: "none", borderRadius: 8,
                padding: "7px 14px", fontSize: 12, fontWeight: 700,
                color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                Send spørsmål →
              </button>
            </Box>

          </Box>
        </Box>

        {/* ─── Footer disclaimer ───────────────────────────────────────────── */}
        <Typography sx={{ textAlign: "center", fontSize: 11.5, color: textSub, mt: 3, pb: 2, lineHeight: 1.7 }}>
          ℹ️ Informasjonen erstatter ikke individuell vurdering fra helsepersonell. Ved bekymring eller vedvarende plager, kontakt lege.
        </Typography>

      </Box>
    </Box>
  );
}
