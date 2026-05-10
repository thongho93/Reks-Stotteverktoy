import React, { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  comment: string;
  priority?: "first" | "need" | "warning";
  priorityLabel?: string;
  faqKey?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT = "#F97316";

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES_OK: Medicine[] = [
  {
    name: "Noskapin",
    form: "Hostesaft / tabletter",
    type: "Hostedempende",
    comment: "Den eneste reseptfrie hostedempende medisinen ammende kan bruke. En studie med melkeprøver viste at svært lite av medisinen gikk over i morsmelken. Egnet ved tørrhoste.",
    priority: "first",
    priorityLabel: "Lav risiko",
    faqKey: "noskapin",
  },
  {
    name: "Bronkyl / Acetylcystein",
    form: "Hostesaft / brusetabletter",
    type: "Slimløsende (acetylcystein)",
    comment: "Trolig lav risiko ved amming. Ingen informasjon om acetylcystein og amming, men medisinen brukes også til små barn – noe som er betryggende.",
    priority: "need",
    priorityLabel: "Trolig lav risiko",
    faqKey: "slimlosende",
  },
  {
    name: "Bisolvon / Bromheksin",
    form: "Hostesaft / tabletter",
    type: "Slimløsende (bromheksin)",
    comment: "Trolig lav risiko. Medisinen tas dårlig opp i kroppen, og det er lite sannsynlig at barnet påvirkes. Flere europeiske oppslagsverk vurderer risikoen ved amming som lav.",
    priority: "need",
    priorityLabel: "Trolig lav risiko",
    faqKey: "slimlosende",
  },
  {
    name: "Solvipect / Tussin",
    form: "Hostesaft",
    type: "Slimløsende (guaifenesin)",
    comment: "Trolig lav risiko, men noen kilder er mer forsiktige pga. manglende dokumentasjon. Vi vet ikke hvor mye guaifenesin som går over i morsmelken.",
    priority: "need",
    priorityLabel: "Trolig lav risiko",
    faqKey: "slimlosende",
  },
];

const MEDICINES_AVOID: Medicine[] = [
  {
    name: "NAF hostesafter",
    form: "Bergensk brystbalsam, Rigabalsam og honning, Eukalyptushonning",
    type: "Kombinasjoner av mange virkestoff",
    comment: "Vanskelig å vurdere. Inneholder plantebaserte virkestoffer og eteriske oljer som bidrar til usikkerhet. Har gjerne høyere alkoholinnhold enn andre hostesafter. Ammende bør være forsiktige.",
    priority: "warning",
    priorityLabel: "Unngå",
    faqKey: "unngaa",
  },
  {
    name: "Bronwell Comp",
    form: "Hostesaft",
    type: "Plantebasert virkestoff",
    comment: "Trolig lav risiko, men bør unngås. Det finnes ingen forskning på plantebaserte hostemedisiner ved amming. EMA anbefaler ammende å unngå timian og altearet (elfoy).",
    priority: "warning",
    priorityLabel: "Bør unngås",
    faqKey: "unngaa",
  },
];

const RAD_TIPS = [
  "Hvil og unngå fysisk anstrengelse hvis du ikke er klar for det.",
  "Innta varm eller kald drikke – begge deler kan lindre hostetrangen.",
  "Hev hodeleiet om natten, slik som med en ekstra pute.",
  "Vanlige halspastiller/halstabletter uten medisin er trygge å bruke for ammende.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first")   return "#16a34a";
  if (p === "need")    return "#d97706";
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
    key: "slimhoste",
    question: "Slimhøste eller tørrhoste – hva er forskjellen?",
    dotColor: ACCENT,
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          <strong>Slimhøste</strong> er en produktiv hoste der kroppen produserer mye slim. Her kan slimløsende medisiner (som acetylcystein, bromheksin eller guaifenesin) være aktuelle. Hostedempende medisin bør derimot ikke brukes ved slimhøste, da hosten faktisk hjelper kroppen å kvitte seg med slimet.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          <strong>Tørrhoste</strong>, ofte kalt irritasjonshoste, oppstår gjerne ved virusinfeksjoner og gir lite slimproduksjon. Den kan være svært plagsom, spesielt om natten. Her kan noskapin (hostedempende) være aktuelt i en kort periode.
        </Typography>
      </>
    ),
  },
  {
    key: "slimlosende",
    question: "Kan ammende bruke slimløsende hostemedisiner?",
    dotColor: "#d97706",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja, ammende kan i utgangspunktet bruke slimløsende medisiner som inneholder acetylcystein, bromheksin eller guaifenesin – selv om dette ikke er noe vi pleier å anbefale generelt. Det er ikke sannsynlig at disse slimløsende medisinene er uheldige for barn som ammes, men det finnes ingen forskning.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Vi anbefaler deg å bare fortsette bruk av hostesaften dersom du merker god effekt. Hvis du ikke opplever bedring etter kort tid, bør du avslutte bruken.
        </Typography>
      </>
    ),
  },
  {
    key: "noskapin",
    question: "Kan ammende bruke noskapin mot tørrhoste?",
    dotColor: "#16a34a",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Noskapin er den eneste reseptfrie hostemedisinen som kun skal virke hostedempende. Vår vurdering er at ammende kan bruke noskapin mot tørrhoste i en kort periode, dersom medisinen har effekt.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Det er ikke kjent at noskapin er uheldig for barn som ammes, men det finnes svært lite erfaring med slik bruk. Målinger har vist at noskapin i liten grad går over i morsmelken, noe som er betryggende.
        </Typography>
      </>
    ),
  },
  {
    key: "unngaa",
    question: "Er det hostesafter ammende bør unngå?",
    dotColor: "#dc2626",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja. Vi mener at ammende bør unngå såkalte NAF-preparater (f.eks. Bergensk brystbalsam, Rigabalsam og honning, Eukalyptushonning) og plantebaserte hostemedisiner som Bronwell Comp, enten kjøpt på apotek, i helsekostforretninger eller lignende.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          NAF-hostesaftene inneholder mange ulike ingredienser, deriblant plantebaserte virkestoffer og eteriske oljer som bidrar til usikkerhet. De har gjerne også et høyere alkoholinnhold enn andre hostesafter.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Den europeiske legemiddelmyndigheten (EMA) anbefaler at ammende unngår plantene timian og altearet (elfoy), som finnes i Bronwell Comp, fordi sikkerheten ikke er fastslått.
        </Typography>
      </>
    ),
  },
  {
    key: "alkohol",
    question: "Hva med alkohol i hostesaft?",
    dotColor: "#64748b",
    body: (_dk: boolean, textSub: string) => (
      <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
        Det kan også være greit å kjenne til at flere hostesafter inneholder alkohol (etanol). Ut fra en faglig vurdering mener vi likevel at det ikke er sannsynlig at det lille alkoholinnholdet skal innebære noen risiko for barnet som ammes, så lenge vanlig anbefalt dosering av hostesaften blir fulgt.
      </Typography>
    ),
  },
  {
    key: "resept",
    question: "Hva med hostemedisiner på resept?",
    dotColor: "#64748b",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Det finnes hostesaft på resept som inneholder det aktive virkestoffet etylmorfin. Direktoratet for medisinske produkter (DMP) har vurdert at ammende ikke skal bruke slike legemidler. Etylmorfin omdannes til morfin i kroppen, og spedbarn/små barn er spesielt følsomme for denne typen legemidler (opioider).
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Dersom legen vurderer det som helt nødvendig, kan ammende likevel bruke hostesaft med etylmorfin en svært kort periode. Legen må i hvert tilfelle vurdere hva som er den beste behandlingen.
        </Typography>
      </>
    ),
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AmmendeHostemedisinerDetail({ onBack }: { onBack: () => void }) {
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
    { label: "Tørrhoste / irritasjonshoste", icon: "😮‍💨" },
    { label: "Slimhøste",                    icon: "💧" },
    { label: "Forkjølelse",                  icon: "🤧" },
    { label: "Plagsom hoste om natten",       icon: "🌙" },
  ];

  return (
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #1a1000 0%, #150e00 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #ffedd5 0%, #fff7ed 60%, #fffbf5 100%)",
        pt: 4, pb: 5, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #fb923c22 0%, transparent 70%)`, pointerEvents: "none" }} />

        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Ammende</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Hostemedisiner</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Hostemedisiner hos ammende
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 36 36" fill="none" style={{ color: ACCENT }}>
                <path d="M18 5 L18 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
                <path d="M18 17 C18 17 10 17 8 21.5 C6 26 8.5 31 13 31 C15 31 16 30 16 28 L16 22"
                  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 17 C18 17 26 17 28 21.5 C30 26 27.5 31 23 31 C21 31 20 30 20 28 L20 22"
                  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="5" r="2.5" fill="currentColor" opacity="0.45"/>
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 1.5, maxWidth: 620 }}>
            Reseptfrie hostemedisiner anbefales generelt ikke for ammende, men noen kan brukes
            dersom plagene er store og medisinen har effekt. Les om trygge alternativer og hvilke
            som bør unngås.
          </Typography>

          {/* Info banner */}
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
              Prøv ikke-medikamentelle råd først – hoste går som regel over av seg selv
            </Typography>
          </Box>

          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
              borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
              color: "#64748b", border: "1px solid #e2e8f0",
            }}>
              Sist oppdatert: 2023
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

        {/* ─── "Kan brukes" medicines ───────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
            Kan brukes ved behov
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, mb: 3 }}>
            {MEDICINES_OK.map(med => (
              <TreatmentCard
                key={med.name}
                med={med}
                onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined}
              />
            ))}
          </Box>

          {/* ─── "Bør unngås" medicines ──────────────────────────────────────── */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Bør unngås
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              {MEDICINES_AVOID.map(med => (
                <TreatmentCard
                  key={med.name}
                  med={med}
                  onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined}
                />
              ))}
            </Box>
          </Box>

          {/* Footnote */}
          <Box sx={{
            background: dk ? "#161b27" : "#f8fafc",
            border: `1px solid ${border}`,
            borderRadius: 2, p: "10px 14px", mb: 1.5,
          }}>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>Merk:</strong> Reseptfrie hostemedisiner anbefales generelt ikke for ammende. Bruk dem kun dersom plagene er store og du merker god effekt. Hoste ved forkjølelse går vanligvis over av seg selv i løpet av noen uker.
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
                  Hoste er plagsomt, men sjelden farlig. Disse rådene kan gi god lindring uten medisiner.
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
                        {["😴", "☕", "🛏️", "🍬"][i]}
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
                      Forkjøleselshoste går vanligvis over av seg selv i løpet av noen uker. Kontakt lege
                      dersom du er sterkt plaget eller ikke blir bedre etter rimelig tid.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Du ikke blir bedre innen rimelig tid",
                    "Du er sterkt plaget av hosten",
                    "Det er mistanke om nedre luftveisinfeksjon (f.eks. lungebetennelse)",
                    "Du er usikker på årsaken til hosten",
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
                    {
                      name: "Farmatid – NFT 2023",
                      desc: "Bør gravide og ammende unngå reseptfri hostesaft? Norsk Farmaceutisk Tidsskrift 2023.",
                      url: "https://www.farmatid.no",
                    },
                    {
                      name: "Trygg Mammamedisin",
                      desc: "Nasjonal tjeneste for legemiddelinformasjon ved graviditet og amming, drevet av RELIS.",
                      url: "https://www.tryggmammamedisin.no",
                    },
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
                  Sist oppdatert: 2023. Informasjonen er skrevet av/godkjent av legespesialister
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
