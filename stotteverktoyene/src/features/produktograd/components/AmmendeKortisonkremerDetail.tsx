import { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  activeSubstance: string;
  group: string;
  priority?: "first" | "second" | "need" | "warning";
  priorityLabel?: string;
  comment: string;
  faqKey?: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES: Medicine[] = [
  {
    name: "Hydrokortison Mildison",
    activeSubstance: "Hydrokortison",
    group: "Gruppe I – Mild",
    priority: "first",
    priorityLabel: "Trygt å bruke",
    comment: "Mildeste gruppe. Trygt for ammende. Selges reseptfritt. Generelt anbefalt å starte med mildeste middel som har effekt.",
    faqKey: "mild",
  },
  {
    name: "Locoid",
    activeSubstance: "Hydrokortisonbutyrat",
    group: "Gruppe II – Middels sterk",
    priority: "second",
    priorityLabel: "Trygt i begrenset bruk",
    comment: "Middels sterk kortisonkrem. Trygt for ammende ved bruk på begrenset hudområde. Svært lite kortison tas opp i kroppen.",
    faqKey: "bruk",
  },
  {
    name: "Betnovat / Synalar / Metosyn",
    activeSubstance: "Betametason / Fluocinolonacetonid / Fluocinid",
    group: "Gruppe III – Sterk",
    priority: "second",
    priorityLabel: "Trygt i begrenset bruk",
    comment: "Sterke kortisonkremer. Trygt for ammende ved bruk på begrenset hudområde i kortere perioder. Unngå bruk på brystvortene.",
    faqKey: "bruk",
  },
  {
    name: "Dermovat / Clobex",
    activeSubstance: "Klobetasol",
    group: "Gruppe IV – Ekstra sterk",
    priority: "need",
    priorityLabel: "Kun etter legeavtale",
    comment: "Ekstra sterk kortisonkrem. Brukes kun etter avtale med lege. Begrens til minst mulig hudområde og kortest mulig tid.",
    faqKey: "bruk",
  },
];

const RAD_TIPS = [
  "Bruk fuktighetskrem regelmessig ved gjentatte hudplager – dette reduserer behovet for kortisonkrem.",
  "Bruk kortisonkrem tynt lag og ikke lenger enn nødvendig.",
  "Sørg for at barnet ikke kommer i direkte kontakt med hudområder som nylig er påsmurt kortisonkrem.",
  "Fuktighetskrem brukt sammen med kortisonkrem kan ha bedre effekt enn kortisonkrem alene.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first")   return "#16a34a";
  if (p === "second")  return "#d97706";
  if (p === "need")    return "#64748b";
  if (p === "warning") return "#dc2626";
  return "#64748b";
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TreatmentCard({ med, onLesMer }: { med: Medicine; onLesMer?: () => void }) {
  const color = priorityColor(med.priority);
  return (
    <div style={{
      background: "#fff", borderRadius: 18, overflow: "hidden",
      display: "flex", flexDirection: "column", minWidth: 0,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07)",
      transition: "box-shadow 160ms ease, transform 160ms ease",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.10), 0 16px 32px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07)";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      <div style={{ height: 5, background: color, flexShrink: 0 }} />
      <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {med.priorityLabel}
          </span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 4 }}>
          {med.name}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, lineHeight: 1.4 }}>
          {med.activeSubstance}
        </div>
        <div style={{
          display: "inline-block", fontSize: 10, fontWeight: 600, color: "#64748b",
          background: "#f1f5f9", borderRadius: 6, padding: "2px 8px",
          border: "1px solid #e2e8f0", marginBottom: 10,
          wordBreak: "break-word", lineHeight: 1.5,
        }}>
          {med.group}
        </div>
        <div style={{ height: 1, background: `${color}20`, marginBottom: 10 }} />
        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.65, flex: 1 }}>{med.comment}</div>
        {onLesMer && (
          <button
            onClick={e => { e.stopPropagation(); onLesMer(); }}
            style={{
              marginTop: 12, alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: 4,
              background: `${color}12`, border: `1px solid ${color}30`,
              borderRadius: 999, padding: "3px 10px",
              cursor: "pointer", fontSize: 11, fontWeight: 700, color,
              transition: "background 150ms, border-color 150ms",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `${color}22`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}60`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `${color}12`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}30`;
            }}
          >
            Les mer
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Strength table ────────────────────────────────────────────────────────────
function StrengthTable({ dk, textMain, textSub, border }: { dk: boolean; textMain: string; textSub: string; border: string }) {
  const rows = [
    { name: "Hydrokortison Mildison", substance: "Hydrokortison",         group: "I",   strength: "Mild",          color: "#16a34a" },
    { name: "Locoid",                 substance: "Hydrokortisonbutyrat",   group: "II",  strength: "Middels sterk", color: "#d97706" },
    { name: "Apolar",                 substance: "Desonid",                group: "II",  strength: "Middels sterk", color: "#d97706" },
    { name: "Betnovat",               substance: "Betametason",            group: "III", strength: "Sterk",         color: "#ea580c" },
    { name: "Synalar",                substance: "Fluocinolonacetonid",    group: "III", strength: "Sterk",         color: "#ea580c" },
    { name: "Metosyn",                substance: "Fluocinid",              group: "III", strength: "Sterk",         color: "#ea580c" },
    { name: "Mometason / Ovixan / Elocon", substance: "Mometason",        group: "III", strength: "Sterk",         color: "#ea580c" },
    { name: "Flutivate",              substance: "Flutikason",             group: "III", strength: "Sterk",         color: "#ea580c" },
    { name: "Dermovat / Clobex",      substance: "Klobetasol",             group: "IV",  strength: "Ekstra sterk",  color: "#dc2626" },
  ];

  return (
    <Box sx={{ overflowX: "auto", borderRadius: 2, border: `1px solid ${border}`, mb: 2 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: dk ? "#1e293b" : "#f8fafc" }}>
            {["Handelsnavn", "Aktivt virkestoff", "Gruppe og styrke"].map(h => (
              <th key={h} style={{
                padding: "10px 14px", textAlign: "left",
                fontSize: 11, fontWeight: 700, color: textSub,
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: `1px solid ${border}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? (dk ? "#0f172a" : "#fff") : (dk ? "#161b27" : "#f8fafc") }}>
              <td style={{ padding: "9px 14px", color: textMain, fontWeight: 600, borderBottom: `1px solid ${border}` }}>
                {row.name}
              </td>
              <td style={{ padding: "9px 14px", color: textSub, borderBottom: `1px solid ${border}` }}>
                {row.substance}
              </td>
              <td style={{ padding: "9px 14px", borderBottom: `1px solid ${border}` }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, fontWeight: 600, color: row.color,
                  background: `${row.color}12`, borderRadius: 6,
                  padding: "2px 8px", border: `1px solid ${row.color}30`,
                }}>
                  <span style={{ fontWeight: 800 }}>Gruppe {row.group}</span>
                  {row.strength}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

// ─── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    key: "mild",
    question: "Kan ammende bruke kortisonkremer?",
    dotColor: "#16a34a",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja, ammende kan trygt bruke kortisonkremer. Noen kortisonkremer selges reseptfritt,
          mens andre kun selges på resept. Ammende kan bruke reseptfrie kortisonkremer i en kort periode,
          som angitt på pakningen.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Det regnes som trygt for ammende å bruke kortisonkremer. Ved bruk på et begrenset hudområde
          er det svært lite av kortisonkremen som tas opp i kroppen. Derfor er det ikke forventet at
          medisinene skal påvirke barnet som ammes på noen måte.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Ammende bør passe på at barnet ikke kommer i direkte kontakt med hudområder som nylig er
          påsmurt kortisonkrem.
        </Typography>
      </>
    ),
  },
  {
    key: "bruk",
    question: "Hvilke kortisonkremer kan ammende bruke – og hvordan?",
    dotColor: "#d97706",
    body: (dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          I utgangspunktet er det ingen kortisonkremer ammende ikke kan bruke. Hvilken kortisonkrem som
          er riktig avhenger av hva den brukes mot, hvor alvorlige plagene er og hvilket hudområde som
          skal behandles. Det er legen din som må avgjøre hvilken kortisonkrem som er rett for deg.
        </Typography>
        <Box sx={{
          background: dk ? "#1e2d3d" : "#fffbeb",
          border: `1px solid ${dk ? "#334155" : "#fde68a"}`,
          borderRadius: 2, p: "10px 14px",
          display: "flex", gap: 1, alignItems: "flex-start",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <Typography sx={{ fontSize: 12.5, color: dk ? "#fcd34d" : "#92400e", lineHeight: 1.7 }}>
            <strong>Generelt anbefales</strong> å bruke den mildeste kortisonkremen som har effekt.
            Kremen bør smøres på tynt lag og ikke brukes i lengre tid enn nødvendig. På den måten begrenses
            mengden medisin som tas opp i kroppen.
          </Typography>
        </Box>
      </>
    ),
  },
  {
    key: "pakningsvedlegg",
    question: "Pakningsvedlegget sier at kortisonkrem ikke bør brukes under amming – hva gjør jeg?",
    dotColor: "#64748b",
    body: (_dk: boolean, textSub: string) => (
      <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
        Informasjonen i pakningsvedlegget er skrevet av legemiddelprodusenten og er ofte mer
        restriktiv enn det forskning og samlet erfaring gir grunnlag til. Derfor kan du få råd av
        helsepersonell om at noen medisiner kan brukes, selv om dette ikke nødvendigvis stemmer med
        informasjonen i pakningsvedlegget. Snakk med lege eller apotek om du er usikker.
      </Typography>
    ),
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AmmendeKortisonkremerDetail({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const dk = theme.palette.mode === "dark";
  const [activeTab, setActiveTab] = useState<TabKey>("rad");
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  function toggleFaq(key: string) {
    setOpenFaqs(prev => ({ ...prev, [key]: !prev[key] }));
  }
  function handleLesMer(key: string) {
    setOpenFaqs(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      document.getElementById(`faq-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  }

  const textMain = dk ? "#f0e8f4" : "#0f172a";
  const textSub  = dk ? "#8e7d98" : "#64748b";
  const border   = dk ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const ACCENT   = "#F97316";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "rad",    label: "Råd og tips",       icon: "🌿" },
    { key: "lege",   label: "Når kontakte lege", icon: "ℹ️" },
    { key: "kilder", label: "Kilder",             icon: "📄" },
  ];

  const SYMPTOMS = [
    { label: "Kløe og tørr hud",       icon: "🔴" },
    { label: "Eksem eller utslett",     icon: "⚡" },
    { label: "Irritert hudområde",      icon: "🌡️" },
    { label: "Betennelse i huden",      icon: "💢" },
  ];

  return (
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #1a0e00 0%, #150d00 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #ffedd5 0%, #fff7ed 60%, #fffbf5 100%)",
        pt: 4, pb: 5, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #fed7aa22 0%, transparent 70%)`, pointerEvents: "none" }} />

        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Ammende</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Kortisonkremer</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Kortisonkremer hos ammende
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 36 36" fill="none" style={{ color: ACCENT }}>
                <rect x="8" y="14" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.9" fill="none"/>
                <path d="M13 14v-3a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
                <circle cx="18" cy="21" r="2.5" fill="currentColor" opacity="0.5"/>
                <path d="M18 21v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 1.5, maxWidth: 620 }}>
            Ammende kan trygt bruke kortisonkremer. Ved bruk på et begrenset hudområde er det svært lite
            av kortisonkremen som tas opp i kroppen, og det forventes ikke at medisinene påvirker barnet
            som ammes.
          </Typography>

          {/* Summary note */}
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 1,
            background: dk ? `${ACCENT}18` : `${ACCENT}12`,
            border: `1px solid ${ACCENT}35`, borderRadius: 2,
            px: 1.5, py: 0.75, mb: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: ACCENT, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>
              Bruk alltid den mildeste kortisonkremen som har effekt, i kortest mulig tid
            </Typography>
          </Box>

          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
              borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
              color: "#64748b", border: "1px solid #e2e8f0",
            }}>
              Sist oppdatert: November 2022
            </span>
          </div>
        </Box>
      </Box>

      {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
      <Box sx={{ px: { xs: 2, md: 4 }, pt: 3, pb: 4, maxWidth: 1100, mx: "auto" }}>

        {/* ─── Symptoms ─────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.5 }}>
            Kjenner du deg igjen?
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {SYMPTOMS.map(({ label, icon }) => (
              <span key={label} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 600,
                background: dk ? "#1e293b" : "#fff",
                borderRadius: 12, padding: "8px 16px",
                border: `1.5px solid ${dk ? "#334155" : "#e2e8f0"}`,
                color: dk ? "#94a3b8" : "#334155",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </Box>
        </Box>

        {/* ─── Strength table ───────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.5 }}>
            Kortisonkremer finnes i ulike styrker
          </Typography>
          <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.7, mb: 2 }}>
            Kortisonkremer deles inn i fire grupper ut fra hvor sterke de er. Generelt anbefales å
            bruke den mildeste kortisonkremen som har effekt, smørt på tynt lag og ikke lenger enn nødvendig.
          </Typography>
          <StrengthTable dk={dk} textMain={textMain} textSub={textSub} border={border} />
        </Box>

        {/* ─── Treatment alternatives ───────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Behandlingsalternativer
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, mb: 2 }}>
            {MEDICINES.map(med => (
              <TreatmentCard
                key={med.name}
                med={med}
                onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined}
              />
            ))}
          </Box>

          {/* Footnote */}
          <Box sx={{
            background: dk ? "#161b27" : "#f8fafc",
            border: `1px solid ${border}`,
            borderRadius: 2, p: "10px 14px", mb: 1.5,
          }}>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>Merk:</strong> Disse generelle rådene gjelder også for ikke-ammende.
              Legen din avgjør hvilken kortisonkrem som er riktig for deg basert på plager og hudområde.
            </Typography>
          </Box>

          {/* FAQs */}
          {FAQS.map(({ key, question, dotColor, body }) => {
            const isOpen = !!openFaqs[key];
            return (
              <Box
                key={key}
                id={`faq-${key}`}
                onClick={() => toggleFaq(key)}
                sx={{
                  mb: 1.5, borderRadius: 3, overflow: "hidden", cursor: "pointer",
                  border: `1.5px solid ${isOpen ? `${dotColor}55` : (dk ? "#334155" : "#e2e8f0")}`,
                  background: dk ? "#161b27" : "#fff",
                  boxShadow: isOpen ? `0 0 0 3px ${dotColor}14` : "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "box-shadow 150ms, border-color 150ms",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: `${dotColor}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: dotColor }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: textMain, lineHeight: 1.35 }}>
                      {question}
                    </Typography>
                  </Box>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ color: textSub, flexShrink: 0, transition: "transform 200ms", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Box>
                {isOpen && (
                  <Box sx={{
                    px: 2, pb: 2,
                    borderTop: `1px solid ${dk ? "#1e293b" : "#f1f5f9"}`,
                    display: "flex", flexDirection: "column", gap: 1.5,
                  }}>
                    {body(dk, textSub)}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
            Mer informasjon
          </Typography>

          <Box sx={{
            display: "inline-flex", gap: 0.5, mb: 0,
            background: dk ? "#1e293b" : "#f1f5f9",
            borderRadius: "14px 14px 0 0", p: "6px 6px 0",
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: "none", cursor: "pointer",
                  padding: "8px 18px", borderRadius: "10px 10px 0 0",
                  background: activeTab === tab.key ? (dk ? "#0f172a" : "#fff") : "transparent",
                  fontSize: 12.5, fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? (dk ? "#f0e8f4" : "#0f172a") : (dk ? "#8e7d98" : "#64748b"),
                  transition: "all 150ms ease",
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                  borderBottom: activeTab === tab.key ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </Box>

          <Box sx={{
            background: dk ? "#0f172a" : "#fff",
            border: `1px solid ${border}`,
            borderRadius: "0 14px 14px 14px",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            {/* ── Råd og tips ── */}
            {activeTab === "rad" && (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                  Disse rådene kan redusere behovet for kortisonkrem og forebygge nye utbrudd.
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  {RAD_TIPS.map((tip, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.5, alignItems: "flex-start",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 3, p: 2,
                    }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                        background: dk ? "#0f172a" : "#fff",
                        border: `1px solid ${border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20,
                      }}>
                        {["💧", "🧴", "👶", "✨"][i]}
                      </Box>
                      <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.7 }}>{tip}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* ── Når kontakte lege ── */}
            {activeTab === "lege" && (
              <Box sx={{ p: 3 }}>
                <Box sx={{
                  background: dk ? "#1a0a0a" : "#fff5f5",
                  border: "1.5px solid #fca5a5",
                  borderRadius: 3, p: 2, mb: 2.5,
                  display: "flex", gap: 1.5, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🩺</span>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#dc2626", mb: 0.5 }}>
                      Når bør du kontakte lege?
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: dk ? "#f87171" : "#7f1d1d", lineHeight: 1.65 }}>
                      Kontakt lege dersom plagene ikke bedrer seg etter en uke med reseptfri kortisonkrem,
                      eller dersom du ikke får effekt av kortisonkremen du har fått på resept.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Reseptfri kortisonkrem gir ikke bedring etter én uke",
                    "Kortisonkrem på resept har ikke tilstrekkelig effekt",
                    "Plagene er store eller utbredte på hudoverflaten",
                    "Du er usikker på hvilken kortisonkrem som passer for deg",
                    "Du bruker reseptpliktige legemidler og ønsker å amme",
                  ].map((item, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.25, alignItems: "center",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 2, p: "10px 14px",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0, display: "inline-block" }} />
                      <Typography sx={{ fontSize: 13, color: textMain, lineHeight: 1.5 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* ── Kilder ── */}
            {activeTab === "kilder" && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
                  {[
                    { name: "Trygg Mammamedisin", desc: "Nasjonal tjeneste for legemiddelinformasjon ved graviditet og amming, drevet av RELIS.", url: "https://www.tryggmammamedisin.no" },
                    { name: "RELIS", desc: "Avdeling for legemiddelinformasjon og farmakologi. Ansvarlig for tjenesten Trygg Mammamedisin.", url: "https://www.relis.no" },
                  ].map(src => (
                    <Box key={src.name} sx={{
                      p: 2, background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 3,
                      display: "flex", flexDirection: "column", gap: 0.5,
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: ACCENT }}>{src.name}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.6 }}>{src.desc}</Typography>
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textDecoration: "none", marginTop: 4 }}>
                        {src.url} ↗
                      </a>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7, fontStyle: "italic" }}>
                  Sist oppdatert: November 2022. Informasjonen er skrevet av/godkjent av legespesialister
                  og oppdateres jevnlig basert på ny forskning og erfaring fra ammeomsorgen.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
