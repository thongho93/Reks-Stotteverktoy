import { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type UsageLevel = "yes" | "caution" | "doctor";
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  usage: UsageLevel;
  usageLabel: string;
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
    usage: "yes",
    usageLabel: "Ja",
    comment: "Danner et skumlag over mageinnholdet og hindrer det fra å stige opp. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Gaviscon mikstur / Galieve",
    form: "Mikstur",
    type: "Alginat + syrenøytraliserende",
    usage: "yes",
    usageLabel: "Ja",
    comment: "Inneholder alginat og syrenøytraliserende. Maks 4 ganger daglig pga. kalsiumkarbonat. Trygt for gravide.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── Syrenøytraliserende — Førstevalg ──
  {
    name: "Novaluzid / Titralac",
    form: "Tablett",
    type: "Syrenøytraliserende",
    usage: "yes",
    usageLabel: "Ja",
    comment: "Syrenøytraliserende middel. Titralac inneholder kalsiumkarbonat – maks 4 ganger daglig. Godt dokumentert i graviditet.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  {
    name: "Natron NAF",
    form: "Pulver/tablett",
    type: "Syrenøytraliserende",
    usage: "yes",
    usageLabel: "Ja",
    comment: "Natriumbikarbonat. Brukes som kortidsbehandling. Ikke anbefalt ved høyt blodtrykk eller ved stort inntak over tid.",
    priority: "first",
    priorityLabel: "Førstevalg",
  },
  // ── H2-blokker — Ved behov ──
  {
    name: "Pepcid",
    form: "Tablett",
    type: "H2-blokker (famotidin)",
    usage: "caution",
    usageLabel: "Ja**",
    comment: "Famotidin reduserer syreproduksjonen. Brukes ved behov. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "need",
    priorityLabel: "Ved behov",
  },
  {
    name: "Pepciduo",
    form: "Tablett",
    type: "H2-blokker + syrenøytraliserende",
    usage: "caution",
    usageLabel: "Ja**",
    comment: "Kombinasjon av famotidin og syrenøytraliserende. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "need",
    priorityLabel: "Ved behov",
  },
  // ── PPI — Kontakt lege først ──
  {
    name: "Losec / Omeprazol",
    form: "Kapsel",
    type: "PPI",
    usage: "doctor",
    usageLabel: "Kontakt lege først",
    comment: "Syrehemmende middel. Mest erfaring av PPI-preparatene i graviditet. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Nexium / Esomeprazol",
    form: "Kapsel/tablett",
    type: "PPI",
    usage: "doctor",
    usageLabel: "Kontakt lege først",
    comment: "Syrehemmende middel. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Somac / Somac Control / Pantoprazol",
    form: "Tablett",
    type: "PPI",
    usage: "doctor",
    usageLabel: "Kontakt lege først",
    comment: "Syrehemmende middel. Anbefales ikke som rutinebehandling. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
  {
    name: "Lanzor Melt / Lansoprazol",
    form: "Smeltetablett",
    type: "PPI",
    usage: "doctor",
    usageLabel: "Kontakt lege først",
    comment: "Syrehemmende middel. Les mer i pakningsvedlegget. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
  },
];

const SYMPTOMS = ["Sure oppstøt", "Svie bak brystbenet", "Verre etter måltid", "Verre når du ligger"];

const RAD_TIPS = [
  "Hev hodebunnen av sengen for å begrense plager om natten.",
  "Unngå å spise store måltider – spis sakte og rolig, særlig på kvelden.",
  "Unngå fet eller syrlig mat som forverrer plager.",
  "Unngå å legge deg rett etter et måltid – vent minst 2–3 timer.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function usageColor(u: UsageLevel): string {
  if (u === "yes")     return "#16a34a";
  if (u === "caution") return "#d97706";
  return "#dc2626";
}

function usageBg(u: UsageLevel): string {
  if (u === "yes")     return "#dcfce7";
  if (u === "caution") return "#fef3c7";
  return "#fee2e2";
}

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

function priorityIcon(p: Medicine["priority"]): string {
  if (p === "first" || p === "second") return "✅";
  if (p === "need") return "⚠️";
  return "🩺";
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

      {/* Usage badge */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 10.5, fontWeight: 700,
        color: usageColor(med.usage),
        background: usageBg(med.usage),
        borderRadius: 999, padding: "2px 8px", alignSelf: "flex-start",
      }}>
        Kan brukes: {med.usageLabel}
      </span>
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
              <span style={{ fontSize: 26 }}>🔥</span>
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
            <span title="Rangert etter anbefaling" style={{ fontSize: 15, cursor: "help" }}>ℹ️</span>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {MEDICINES.filter(m => m.priority).map(med => (
              <TreatmentCard key={med.name} med={med} />
            ))}
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
              {SYMPTOMS.map(s => (
                <span key={s} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12.5, fontWeight: 600, color: "#0c4a6e",
                  background: "#e0f2fe", borderRadius: 999, padding: "5px 14px",
                  border: "1.5px solid #bae6fd",
                }}>
                  🔥 {s}
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
                        <span style={{ fontSize: 18, flexShrink: 0 }}>
                          {["🌙", "🍽️", "🥗", "⏰"][i]}
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
