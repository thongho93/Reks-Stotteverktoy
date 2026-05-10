import React, { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  comment: string;
  priority?: "first" | "second" | "need" | "warning";
  priorityLabel?: string;
  faqKey?: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES: Medicine[] = [
  {
    name: "Alcos-Anal",
    form: "Salve",
    type: "Kløestillende + sammentrekkende",
    comment: "Trygt for ammende. Virker kløestillende og sammentrekkende på blodårene i endetarmen. Inneholder ikke stoffer som er problematiske under amming.",
    priority: "first",
    priorityLabel: "Trygt å bruke",
    faqKey: "alcos",
  },
  {
    name: "Xylocain",
    form: "Salve",
    type: "Lokalbedøvende",
    comment: "Trygt å bruke for ammende i vanlig anbefalt dosering. Inneholder lokalbedøvende medisin som lindrer smerte og ubehag.",
    priority: "first",
    priorityLabel: "Trygt å bruke",
    faqKey: "scheri",
  },
  {
    name: "Scheriproct",
    form: "Salve / stikkpiller",
    type: "Lokalbedøvende + kortison",
    comment: "Trygt i vanlig dosering. Inneholder lokalbedøvende og kortison. Kun små mengder tas opp i kroppen. Bør ikke brukes lengre enn 1 uke sammenhengende.",
    priority: "second",
    priorityLabel: "Maks 1 uke",
    faqKey: "scheri",
  },
  {
    name: "NAF Hemoroidesalve (og andre)",
    form: "Salve",
    type: "Lokal behandling",
    comment: "Svært lite erfaring ved amming. Forventes ikke å være uheldige, men forsøk Alcos-Anal, Xylocain eller Scheriproct først.",
    priority: "need",
    priorityLabel: "Lite erfaring",
    faqKey: "naf",
  },
];

const RAD_TIPS = [
  "Spis fiberrik mat og få i seg nok drikke – dette holder avføringen myk og reduserer pressing.",
  "Daglig fysisk aktivitet er gunstig for å forebygge hemoroider.",
  "Ha regelmessige toalettbesøk og unngå å sitte lenge på toalettet.",
  "Unngå å presse hardt ved avføring – dette er den viktigste enkeltfaktoren.",
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
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 8 }}>
          {med.name}
        </div>
        <div style={{
          display: "inline-block", fontSize: 10, fontWeight: 600, color: "#64748b",
          background: "#f1f5f9", borderRadius: 6, padding: "2px 8px",
          border: "1px solid #e2e8f0", marginBottom: 10,
          wordBreak: "break-word", lineHeight: 1.5,
        }}>
          {med.type}
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

// ─── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    key: "alcos",
    question: "Kan ammende bruke Alcos-Anal?",
    dotColor: "#16a34a",
    body: (dk: boolean, textSub: string) => (
      <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
        Ja, ammende som trenger medisin mot hemoroider kan trygt forsøke Alcos-Anal salve.
        Alcos-Anal skal ifølge produsenten virke kløestillende og sammentrekkende på blodårene
        i endetarmen. Salven inneholder ikke stoffer som er problematiske å bruke under amming.
      </Typography>
    ),
  },
  {
    key: "scheri",
    question: "Kan ammende bruke Scheriproct eller Xylocain?",
    dotColor: "#d97706",
    body: (dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja, ammende kan bruke Scheriproct salve/stikkpiller eller Xylocain salve. Begge medisinene
          regnes som trygge å bruke for ammende i vanlig anbefalt dosering.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Både Scheriproct og Xylocain inneholder lokalbedøvende medisin. Scheriproct inneholder i
          tillegg kortison som demper betennelsen rundt hemoroidene. Ved bruk mot hemoroider vil kun
          små mengder medisin bli tatt opp i kroppen, og vi forventer ikke at slike små mengder skal
          være uheldig for barnet som ammes.
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
            <strong>Merk:</strong> På grunn av kortisonninnholdet kan langvarig bruk av Scheriproct gi
            lokale bivirkninger i huden rundt endetarmsåpningen. Vi anbefaler at Scheriproct brukes
            maksimalt <strong>1 uke sammenhengende</strong>. Dette gjelder for alle, ikke bare ammende.
          </Typography>
        </Box>
      </>
    ),
  },
  {
    key: "naf",
    question: "Er det midler mot hemoroider som ammende ikke bør bruke?",
    dotColor: "#64748b",
    body: (dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Det er svært lite erfaring med bruk av andre midler mot hemoroider enn Alcos-Anal,
          Scheriproct og Xylocain hos ammende (for eksempel NAF Hemoroidesalve). Vi forventer ikke
          at andre hemoroidesalver er uheldige for barn som ammes, men vi anbefaler likevel for
          sikkerhets skyld at ammende først og fremst forsøker midler som det er mer erfaring med.
        </Typography>
      </>
    ),
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AmmendeHemoroiderDetail({ onBack }: { onBack: () => void }) {
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
  const ACCENT   = "#10B981";

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

  const SYMPTOMS = [
    { label: "Kløe rundt endetarmsåpningen", icon: "🔴" },
    { label: "Smerte ved avføring",          icon: "⚡" },
    { label: "Blødning",                     icon: "🩸" },
    { label: "Trykk og ubehag",              icon: "💢" },
  ];

  return (
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #0a1f18 0%, #0c1a14 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 60%, #f0fdf4 100%)",
        pt: 4, pb: 5, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #6ee7b722 0%, transparent 70%)`, pointerEvents: "none" }} />

        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Ammende</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Hemoroider</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Hemoroider hos ammende
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 36 36" fill="none" style={{ color: ACCENT }}>
                <circle cx="18" cy="7" r="5" stroke="currentColor" strokeWidth="1.9" fill="none"/>
                <path d="M10 12 Q8 18 10 24 L14 24 Q16 20 18 20 Q20 20 22 24 L26 24 Q28 18 26 12"
                  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <ellipse cx="18" cy="28.5" rx="6" ry="3.5" stroke="currentColor" strokeWidth="1.7" fill="none"/>
                <ellipse cx="18" cy="28.5" rx="2.5" ry="1.5" fill="currentColor" opacity="0.45"/>
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 1.5, maxWidth: 600 }}>
            Hemoroider er utvidede blodårer i endetarmen som kan gi kløe og smerte. Ammende kan trygt
            bruke Alcos-Anal salve, Xylocain salve eller Scheriproct. Livsstilsråd bør alltid forsøkes først.
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
              Scheriproct bør ikke brukes lengre enn 1 uke sammenhengende
            </Typography>
          </Box>

          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
              borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
              color: "#64748b", border: "1px solid #e2e8f0",
            }}>
              Sist oppdatert: Oktober 2020
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
              <strong style={{ color: textMain }}>Merk:</strong> Medisinene lindrer plagene, men fjerner ikke hemoroidene.
              Generelle livsstilsråd bør alltid forsøkes i tillegg.
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
            {/* ── Livsstilsråd ── */}
            {activeTab === "rad" && (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                  Disse rådene bør alltid forsøkes – de kan forebygge og lindre hemoroider, og redusere
                  behovet for medisiner.
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
                        {["🥦", "🏃", "🚽", "⚠️"][i]}
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
                      Hvis Alcos-Anal, Xylocain eller Scheriproct ikke gir tilstrekkelig effekt, anbefaler vi
                      at du diskuterer videre behandling med lege.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Alcos-Anal, Xylocain eller Scheriproct gir ikke god nok effekt",
                    "Plagene er store eller langvarige",
                    "Hemoroidene er svært smertefulle",
                    "Blødning som ikke avtar",
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
                  Sist oppdatert: Oktober 2020. Informasjonen er skrevet av/godkjent av legespesialister
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
