import { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  active: string;
  priority: "first" | "need";
  priorityLabel: string;
  faqKey?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT = "#F43F5E";

// ─── Data ──────────────────────────────────────────────────────────────────────
const TABLETS_FIRST: Medicine[] = [
  { name: "Loratadin",                      active: "Loratadin",       priority: "first", priorityLabel: "Første valg", faqKey: "zyrtec" },
  { name: "Aerius / Caredin",               active: "Desloratadin",    priority: "first", priorityLabel: "Første valg", faqKey: "aerius" },
  { name: "Zyrtec / Cetirizin / Cetimax",   active: "Cetirizin",       priority: "first", priorityLabel: "Første valg", faqKey: "zyrtec" },
  { name: "Xyzal",                          active: "Levocetirizin",   priority: "first", priorityLabel: "Første valg", faqKey: "aerius" },
  { name: "Telfast / Altifex / Feksofenadin", active: "Feksofenadin", priority: "first", priorityLabel: "Første valg", faqKey: "zyrtec" },
];

const TABLETS_OTHER: Medicine[] = [
  { name: "Kestine / Ebastin", active: "Ebastin",  priority: "need", priorityLabel: "Ikke første valg", faqKey: "kestine" },
  { name: "Zilas",             active: "Bilastin", priority: "need", priorityLabel: "Ikke første valg", faqKey: "kestine" },
];

const EYEDROPS = [
  { name: "Emadine",            active: "Emedastine" },
  { name: "Zaditen / Ketazed",  active: "Ketotifen" },
  { name: "Livostin",           active: "Levokabastin" },
  { name: "Opatanol / Toredin", active: "Olopatadin" },
  { name: "Lecrolyn / Lomudal", active: "Natriumkromoglikat" },
];

const NASESPRAYS = [
  { name: "Livostin",                                           active: "Levokabastin" },
  { name: "Budesonid",                                          active: "Budesonid" },
  { name: "Avamys / Flutide nasal / Flutikason / Otrason",     active: "Flutikason" },
  { name: "Nasacort",                                           active: "Triamcinolone" },
  { name: "Dymista / Altimista / Azelastine/Fluticasone",      active: "Azelastin + flutikason" },
  { name: "Ryaltris",                                           active: "Olopatadin + mometason" },
];

const RAD_TIPS = [
  "Sjekk pollenvarselet og begrens tid utendørs på dager med høy pollenkonsentrasjon.",
  "Bruk solbriller utendørs – dette beskytter øynene mot pollen.",
  "Bytt klær og dusj etter å ha vært ute for å fjerne pollen fra kroppen.",
  "Hold vinduer og dører lukket, særlig om morgenen når pollenkonsentrasjonen er høyest.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first") return "#16a34a";
  return "#d97706";
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TabletCard({ med, onLesMer }: { med: Medicine; onLesMer?: () => void }) {
  const color = priorityColor(med.priority);
  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
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
      <div style={{ height: 4, background: color, flexShrink: 0 }} />
      <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {med.priorityLabel}
          </span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 7 }}>
          {med.name}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, color: "#64748b",
          background: "#f1f5f9", borderRadius: 5, padding: "2px 7px",
          border: "1px solid #e2e8f0", marginBottom: 0,
          display: "inline-block", wordBreak: "break-word", lineHeight: 1.5,
        }}>
          {med.active}
        </div>
        {onLesMer && (
          <button
            onClick={e => { e.stopPropagation(); onLesMer(); }}
            style={{
              marginTop: 10, alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: 4,
              background: `${color}12`, border: `1px solid ${color}30`,
              borderRadius: 999, padding: "3px 9px",
              cursor: "pointer", fontSize: 10.5, fontWeight: 700, color,
              transition: "background 150ms",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}12`; }}
          >
            Les mer
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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
    key: "trygt",
    question: "Er det trygt å bruke allergitabletter ved amming?",
    dotColor: ACCENT,
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja. De såkalte andregenerasjons antihistaminene har vært brukt i flere tiår på verdensbasis.
          Det er ikke kjent at de har bivirkninger for spedbarn gjennom morsmelken.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Hvis du har behov for å bruke en av de vanligste andregenerasjons antihistaminene (se tabell),
          kan du altså amme som vanlig. Det er ikke vanlig å anbefale å vente noen bestemt tid med å amme
          etter å ha tatt allergitabletter i anbefalt dose. Dette gjelder både ved fullamming og delamming.
        </Typography>
      </>
    ),
  },
  {
    key: "zyrtec",
    question: "Kan ammende bruke Zyrtec/Loratadin/Telfast?",
    dotColor: "#16a34a",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja. Medisiner som inneholder cetirizin (Zyrtec, Cetirizin, Cetimax), loratadin og feksofenadin
          (Telfast) er trygt å bruke i vanlig anbefalt dose. Undersøkelser tyder på at kun en liten mengde
          av disse medisinene går over i morsmelken.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Det er ikke forventet at disse mengdene skal ha noe å si for barn som ammes. Kvinner som bruker
          vanlig anbefalte doser kan derfor amme som vanlig.
        </Typography>
      </>
    ),
  },
  {
    key: "aerius",
    question: "Kan ammende bruke Aerius/Caredin eller Xyzal?",
    dotColor: "#16a34a",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja, det regnes som trygt å bruke Aerius og Caredin (begge inneholder desloratadin) eller Xyzal
          (inneholder levocetirizin) i anbefalte doser i ammeperioden. De aktive virkestoffene i
          Aerius/Caredin og Xyzal er tilnærmet de samme som i de mye brukte allergimedisinene loratadin og cetirizin.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Den kunnskapen og erfaringen som finnes om cetirizin og amming vil dermed trolig også gjelde for
          Xyzal. På grunn av denne likheten mener vi at ammende kan bruke Xyzal – selv om det finnes
          mindre informasjon om bruk av denne medisinen hos ammende.
        </Typography>
      </>
    ),
  },
  {
    key: "kestine",
    question: "Kan ammende bruke Kestine/Ebastin eller Zilas?",
    dotColor: "#d97706",
    body: (dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Hvis du vanligvis bruker Kestine eller Ebastin (begge inneholder ebastin) eller Zilas
          (inneholder bilastin), anbefaler vi at du snakker med lege for å få en vurdering om du kan
          fortsette med disse eller om det er bedre å bytte til en annen allergimedisin.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Foreløpig finnes det lite eller ingen dokumentasjon på bruk av disse medisinene hos ammende.
          For Kestine (ebastin) finnes det kun data fra én ammende kvinne – betryggende data som tyder
          på at svært lite mengder går over i morsmelken. For Zilas (bilastin) finnes det ingen
          dokumentasjon på bruk ved amming og det er ikke undersøkt hvor mye som overføres til morsmelk.
        </Typography>
        <Box sx={{
          background: dk ? "#1e2d1e" : "#f0fdf4",
          border: `1px solid ${dk ? "#334155" : "#bbf7d0"}`,
          borderRadius: 2, p: "10px 14px",
          display: "flex", gap: 1, alignItems: "flex-start",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <Typography sx={{ fontSize: 12.5, color: dk ? "#86efac" : "#166534", lineHeight: 1.7 }}>
            For sikkerhets skyld anbefaler vi ammende å i første rekke forsøke en av de andre
            allergitablettene som det finnes mer dokumentasjon og erfaring med.
          </Typography>
        </Box>
      </>
    ),
  },
  {
    key: "oyne",
    question: "Kan ammende bruke øyedråper og nesesprayer mot allergi?",
    dotColor: "#16a34a",
    body: (_dk: boolean, textSub: string) => (
      <>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
          Ja, ammende kan bruke alle typer øyedråper og nesespray mot allergi som finnes på det norske
          markedet. Dette gjelder uansett hvilket aktivt innholdsstoff som er i øyedråpene/nesesprayer.
        </Typography>
        <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
          Bakgrunnen for denne vurderingen er at nesespray og øyedråper virker lokalt i nesen og øynene.
          Vi generelt vet lite av medisinen tas opp i blodbanen og videre til morsmelken. Dermed er det
          lite sannsynlig at anbefalte doser vil gi bivirkninger hos barn som ammes.
        </Typography>
      </>
    ),
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AmmendePollenallergiDetail({ onBack }: { onBack: () => void }) {
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
    { key: "rad",    label: "Praktiske råd",     icon: "🌿" },
    { key: "lege",   label: "Når kontakte lege", icon: "ℹ️" },
    { key: "kilder", label: "Kilder",             icon: "📄" },
  ];

  const SYMPTOMS = [
    { label: "Nysing og rennende nese",    icon: "🤧" },
    { label: "Kløende og vannende øyne",   icon: "👁️" },
    { label: "Tett nese",                  icon: "😤" },
    { label: "Kløende hals og gane",       icon: "🌸" },
  ];

  return (
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #1a0008 0%, #150007 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #ffe4e6 0%, #fff1f2 60%, #fff5f6 100%)",
        pt: 4, pb: 5, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #fb718522 0%, transparent 70%)`, pointerEvents: "none" }} />

        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Ammende</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Pollenallergi</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Pollenallergi hos ammende
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 36 36" fill="none" style={{ color: ACCENT }}>
                <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                <circle cx="18" cy="18" r="2" fill="currentColor" opacity="0.5"/>
                {[0,45,90,135,180,225,270,315].map((deg, i) => {
                  const r = deg * Math.PI / 180;
                  const x1 = 18 + 7 * Math.cos(r), y1 = 18 + 7 * Math.sin(r);
                  const x2 = 18 + 11 * Math.cos(r), y2 = 18 + 11 * Math.sin(r);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>;
                })}
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 1.5, maxWidth: 640 }}>
            Andregenerasjons antihistaminer er trygge ved amming og regnes som førstevalg. Alle
            øyedråper og nesesprayer mot allergi kan brukes. Les om hvilke allergitabletter som
            anbefales og hvilke som bør diskuteres med lege.
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
              Alle øyedråper og nesesprayer mot pollenallergi kan brukes ved amming
            </Typography>
          </Box>

          <div>
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
              borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
              color: "#64748b", border: "1px solid #e2e8f0",
            }}>
              Sist oppdatert: April 2026
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
                <span>{icon}</span>{label}
              </span>
            ))}
          </Box>
        </Box>

        {/* ─── Allergitabletter ─────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.75 }}>
            Allergitabletter (antihistaminer)
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: textSub, lineHeight: 1.65, mb: 2 }}>
            Andregenerasjons antihistaminer er førstevalg ved amming. Disse er godt dokumenterte og trygge.
          </Typography>

          {/* First choice */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.5, mb: 2 }}>
            {TABLETS_FIRST.map(med => (
              <TabletCard key={med.name} med={med} onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined} />
            ))}
          </Box>

          {/* Not first choice */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.25 }}>
              Ikke første valg – snakk med lege
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
              {TABLETS_OTHER.map(med => (
                <TabletCard key={med.name} med={med} onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined} />
              ))}
            </Box>
          </Box>
        </Box>

        {/* ─── Øyedråper og nesesprayer ─────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{
            background: dk ? "#0f172a" : "#fff",
            border: `1.5px solid #16a34a40`,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Box sx={{
              background: dk ? "#0d1f14" : "#f0fdf4",
              px: 2.5, py: 1.5,
              display: "flex", alignItems: "center", gap: 1.25,
              borderBottom: `1px solid #16a34a30`,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "#16a34a", flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
                Alle øyedråper og nesesprayer mot pollenallergi kan brukes
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0, px: 2.5, py: 2 }}>
              {/* Eye drops */}
              <Box sx={{ pr: { sm: 2 }, borderRight: { sm: `1px solid ${border}` } }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.25 }}>
                  Øyedråper
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {EYEDROPS.map(e => (
                    <Box key={e.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", flexShrink: 0, display: "inline-block" }} />
                      <Typography sx={{ fontSize: 12.5, color: textMain, fontWeight: 600 }}>{e.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: textSub }}>({e.active})</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {/* Nasal sprays */}
              <Box sx={{ pl: { sm: 2 }, mt: { xs: 2, sm: 0 } }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.25 }}>
                  Nesesprayer
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {NASESPRAYS.map(n => (
                    <Box key={n.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", flexShrink: 0, display: "inline-block" }} />
                      <Typography sx={{ fontSize: 12.5, color: textMain, fontWeight: 600 }}>{n.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: textSub }}>({n.active})</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ─── FAQs ─────────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: textSub, textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
            Spørsmål og svar
          </Typography>
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
            {/* ── Praktiske råd ── */}
            {activeTab === "rad" && (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                  I tillegg til medisinbruk kan disse rådene bidra til å redusere plager i pollensesongen.
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
                        {["🌬️", "🕶️", "🚿", "🪟"][i]}
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
                      De fleste ammende kan bruke andregenerasjons antihistaminer uten å konsultere lege.
                      I noen situasjoner bør du likevel ta kontakt.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Plagene kontrolleres ikke tilstrekkelig av første valg antihistaminer",
                    "Du vurderer å bruke Kestine/Ebastin eller Zilas som ikke er første valg",
                    "Du er usikker på hvilken medisin som passer best for deg",
                    "Legen din er usikker på hvilke allergimedisiner du kan bruke – vis ham/henne RELIS-artikkelen om pollenallergi hos ammende",
                  ].map((item, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.25, alignItems: "flex-start",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`, borderRadius: 2, p: "10px 14px",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0, display: "inline-block", marginTop: 6 }} />
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
                      name: "RELIS – Pollenallergi hos gravide og ammende",
                      desc: "«Pollenallergi hos gravide og ammende – hva er trygg behandling?» Artikkelen er skrevet av RELIS og er grunnlaget for denne informasjonen.",
                      url: "https://www.tryggmammamedisin.no",
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
                  Sist oppdatert: April 2026. Informasjonen er skrevet av/godkjent av legespesialister
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
