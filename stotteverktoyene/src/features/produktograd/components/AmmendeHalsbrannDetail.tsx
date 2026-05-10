import React, { useState, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = "rad" | "lege" | "kilder";

interface Medicine {
  name: string;
  form: string;
  type: string;
  comment: string;
  priority?: "first" | "second" | "need" | "doctor" | "warning";
  priorityLabel?: string;
  faqKey?: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const MEDICINES: Medicine[] = [
  // ── Alginat — Førstevalg ──
  {
    name: "Gaviscon tyggetabletter",
    form: "Tyggetablett",
    type: "Alginat",
    comment: "Danner et skumlokk over mageinnholdet og hindrer det fra å stige opp. Trygt for ammende – alginsyre tas ikke opp i kroppen og påvirker ikke barnet.",
    priority: "first",
    priorityLabel: "Førstevalg",
    faqKey: "gaviscon",
  },
  {
    name: "Gaviscon mikstur / Galieve / Galieve Forte",
    form: "Mikstur",
    type: "Alginat + syrenøytraliserende",
    comment: "Inneholder alginat og syrenøytraliserende. Trygt ved amming. Maks 4 ganger daglig pga. kalsiumkarbonat.",
    priority: "first",
    priorityLabel: "Førstevalg",
    faqKey: "gaviscon",
  },
  // ── Syrenøytraliserende — Førstevalg ──
  {
    name: "Novaluzid / Titralac",
    form: "Tablett",
    type: "Syrenøytraliserende",
    comment: "Virker lokalt i magen. Ettersom de i liten grad tas opp i kroppen, er det lite som går over i morsmelken. Mødre kan amme som vanlig.",
    priority: "first",
    priorityLabel: "Førstevalg",
    faqKey: "novaluzid",
  },
  {
    name: "Natron NAF",
    form: "Pulver/tablett",
    type: "Syrenøytraliserende",
    comment: "Kan i utgangspunktet brukes av ammende. Andre alternativer vurderes imidlertid på generelt grunnlag som mer egnet ved halsbrann og sure oppstøt.",
    priority: "need",
    priorityLabel: "Kan brukes",
    faqKey: "natron",
  },
  // ── Famotidin — Andrevalg ──
  {
    name: "Pepcid",
    form: "Tablett",
    type: "H2-blokker (famotidin)",
    comment: "Famotidin går over i morsmelken i så liten grad at påvirkning av barnet ikke forventes. Kontakt lege ved bruk i mer enn 2 uker sammenhengende.",
    priority: "second",
    priorityLabel: "Andrevalg",
    faqKey: "pepcid",
  },
  {
    name: "Pepcidduo",
    form: "Tablett",
    type: "H2-blokker + syrenøytraliserende",
    comment: "Kombinasjon av famotidin og syrenøytraliserende. Trygt ved amming i normalt omfang. Kontakt lege ved bruk over 2 uker.",
    priority: "second",
    priorityLabel: "Andrevalg",
    faqKey: "pepcid",
  },
  // ── PPI — Kontakt lege først ──
  {
    name: "Losec / Omeprazol",
    form: "Kapsel",
    type: "PPI",
    comment: "Protonpumpehemmer. Går over i morsmelken i liten grad og brytes ned i barnets magesekk. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
    faqKey: "ppi",
  },
  {
    name: "Nexium / Esomeprazol",
    form: "Kapsel/tablett",
    type: "PPI",
    comment: "Protonpumpehemmer. Liten overgang til morsmelk. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
    faqKey: "ppi",
  },
  {
    name: "Somac / Somac Control / Pantoprazol",
    form: "Tablett",
    type: "PPI",
    comment: "Protonpumpehemmer. Somac Control selges reseptfritt, men skal ikke brukes mer enn 4 uker uten avtale med lege.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
    faqKey: "ppi",
  },
  {
    name: "Lanzo Melt / Lansoprazol",
    form: "Smeltetablett",
    type: "PPI",
    comment: "Data på overgang til morsmelk mangler. Fortrinnsvis benyttes andre protonpumpehemmere. Brukes kun etter legevurdering.",
    priority: "doctor",
    priorityLabel: "Kontakt lege først",
    faqKey: "lanzo",
  },
];

const BedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.4 0 0 0.4 12 12)">
      <path style={{ fill: "currentColor" }} transform="translate(-25, -25.5)" d="M 3 9 C 1.3545455 9 0 10.354545 0 12 L 0 42 L 6 42 L 6 37 L 44 37 L 44 42 L 50 42 L 50 28 L 50 23 C 50 20.254545 47.745455 18 45 18 L 19 18 C 18.44773812379154 18.00005521790535 18.00005521790535 18.44773812379154 18 19 L 18 28 L 12 28 L 6 28 L 6 12 C 6 10.354545 4.6454545 9 3 9 z M 12 28 C 14.749579 28 17 25.749579 17 23 C 17 20.250421 14.749579 18 12 18 C 9.2504209 18 7 20.250421 7 23 C 7 25.749579 9.2504209 28 12 28 z M 3 11 C 3.5545455 11 4 11.445455 4 12 L 4 30 L 5 30 L 48 30 L 48 40 L 46 40 L 46 35 L 4 35 L 4 40 L 2 40 L 2 12 C 2 11.445455 2.4454545 11 3 11 z M 12 20 C 13.668699 20 15 21.331301 15 23 C 15 24.668699 13.668699 26 12 26 C 10.331301 26 9 24.668699 9 23 C 9 21.331301 10.331301 20 12 20 z M 20 20 L 45 20 C 46.654545 20 48 21.345455 48 23 L 48 28 L 20 28 L 20 20 z" />
    </g>
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, color: "currentColor" }}>
    <g transform="matrix(0.4 0 0 0.4 12 12)">
      <path style={{ fill: "currentColor" }} transform="translate(-25, -23.99)" d="M 34.984375 1.9863281 C 34.432858843006734 1.9949491731996494 33.9924473355562 2.448468177176025 34 2.9999999999999996 C 34 3.888391 33.814434 4.344325 33.558594 4.7070312 C 33.302754 5.0697375 32.918099 5.3617834 32.419922 5.7167969 C 31.921745 6.0718104 31.308325 6.488187 30.8125 7.1777344 C 30.316675 7.8672817 30 8.8105045 30 10 C 29.994899710454515 10.36063591657757 30.184375296169332 10.696081364571606 30.49587284971433 10.877887721486518 C 30.80737040325933 11.059694078401428 31.19262959674067 11.059694078401428 31.50412715028567 10.877887721486516 C 31.815624703830668 10.696081364571606 32.00510028954548 10.360635916577568 32 10 C 32 9.1349955 32.183325 8.699187 32.4375 8.3457031 C 32.691675 7.9922192 33.078255 7.7033146 33.580078 7.3457031 C 34.081901 6.9880916 34.697246 6.55995 35.191406 5.859375 C 35.685566 5.1588 36 4.206609 36 3 C 36.00370143373364 2.729699684396449 35.89782328543507 2.469413389385951 35.70649029658461 2.278448343881242 C 35.51515730773415 2.0874832983765335 35.25466768994374 1.9821063716760876 34.984375 1.9863281 z M 38.984375 4.9863281 C 38.432858843006734 4.994949173199649 37.9924473355562 5.448468177176025 38 5.999999999999999 C 38 6.5255038 37.890897 6.7662115 37.722656 6.9980469 C 37.554416 7.2298823 37.276827 7.4535546 36.904297 7.7304688 C 36.531767 8.0073829 36.064042 8.3345838 35.667969 8.8652344 C 35.271895 9.3958849 35 10.134898 35 11 C 34.99489971045452 11.36063591657757 35.184375296169335 11.696081364571606 35.49587284971433 11.877887721486518 C 35.80737040325933 12.059694078401428 36.19262959674067 12.059694078401428 36.50412715028567 11.877887721486516 C 36.81562470383067 11.696081364571606 37.00510028954548 11.360635916577568 37 11 C 37 10.501602 37.103105 10.285474 37.269531 10.0625 C 37.435958 9.8395255 37.718233 9.6145703 38.095703 9.3339844 C 38.473173 9.0533985 38.945584 8.7151646 39.339844 8.171875 C 39.734103 7.6285854 40 6.8809962 40 6 C 40.00370143373364 5.729699684396449 39.89782328543507 5.469413389385951 39.70649029658461 5.278448343881243 C 39.51515730773416 5.087483298376533 39.25466768994374 4.982106371676087 38.984375 4.9863281 z M 25 14 C 24.44773812379154 14.00005521790535 24.00005521790535 14.447738123791542 24 15 L 24 19.632812 C 23.422681 19.276093 22.780836 19.022603 22.056641 19.011719 C 21.243414 17.856947 20.01528 17 18.5 17 C 16.808088 17 15.347156 17.954489 14.580078 19.345703 C 14.092886 19.132703 13.563738 19 13 19 C 12.254309 19 11.593524 19.261337 11 19.617188 C 10.406476 19.261337 9.7456911 19 9 19 C 7.0963885 19 5.565638 20.379514 5.1699219 22.169922 C 3.7122176 22.492104 2.5867726 23.565495 2.203125 25 L 1 25 C 0.44773812379154077 25.00005521790535 0.00005521790534890325 25.44773812379154 1.1102230246251565e-16 26 L 0 28.908203 C 0 32.954759 2.1922529 36.47002 5.0292969 39 L 1 39 C 0.6684042193146984 39.00033433768462 0.35853437659685605 39.16500485481175 0.1727065084765036 39.439638933141126 C -0.013121359643848862 39.7142730114705 -0.05074235036141128 40.06315746181807 0.07226562500000011 40.371094 L 1.2089844 43.216797 C 1.8797968 44.895118 3.512226 46 5.3203125 46 L 44.679688 46 C 46.487774 46 48.119305 44.894139 48.791016 43.216797 L 49.927734 40.371094 C 50.050741950904836 40.063157523406176 50.01312100128273 39.71427314646984 49.82729322182213 39.439639088160305 C 49.64146544236154 39.16500502985076 49.33159571429387 39.00033446190376 49 39 L 42.837891 39 C 43.485102 37.79483 43.885268 36.396675 43.972656 34.894531 C 45.079037 34.662788 46.03188 34.053141 46.759766 33.244141 C 47.693581 32.206262 48.329487 30.86688 48.798828 29.427734 C 49.737511 26.549443 50 23.238947 50 21 C 50 19.35503 48.64497 18 47 18 L 44 18 L 44 15 C 43.99994478209465 14.447738123791542 43.55226187620846 14.000055217905349 43 14 L 25 14 z M 26 16 L 42 16 L 42 33.832031 C 41.982150951947155 33.940022437464606 41.982150951947155 34.050211562535395 42 34.158203 L 42 34.275391 C 42 36.161034 41.342591 37.797719 40.394531 39 L 27.611328 39 C 26.897816 38.098917 26.347401 36.953334 26.117188 35.640625 C 26.040742 35.203232 26 34.746801 26 34.275391 L 26 26 L 26 20.351562 L 26 16 z M 18.5 19 C 19.510885 19 20.364522 19.596468 20.761719 20.453125 C 20.94173864448833 20.84189256492183 21.349386640433686 21.07281462312581 21.775391 21.027344 C 21.942063 21.009325 22.008807 21 22 21 C 22.56837 21 23.067044 21.23328 23.433594 21.613281 C 23.585369855455752 21.770126083312636 23.784287887423275 21.873014853748494 24 21.90625 L 24 25 L 4.4101562 25 C 4.7611146 24.435884 5.2770463 24 6 24 C 6.552261876208459 23.99994478209465 6.9999447820946505 23.55226187620846 7 23 C 7 21.883334 7.8833339 21 9 21 C 9.5129326 21 9.9660877 21.193756 10.330078 21.521484 C 10.710691280299896 21.864862433636905 11.289308719700104 21.864862433636905 11.669922 21.521484 C 12.033912 21.193756 12.487067 21 13 21 C 13.53733 21 14.01396 21.20984 14.376953 21.556641 C 14.641533897068191 21.80889363979056 15.022665534688949 21.896691336458115 15.370942635115405 21.785617006870865 C 15.71921973554186 21.67454267728361 15.979145543729603 21.382295632861332 16.048828 21.023438 C 16.271642 19.870806 17.272028 19 18.5 19 z M 44 20 L 47 20 C 47.56503 20 48 20.43497 48 21 C 48 23.073053 47.726052 26.262932 46.896484 28.806641 C 46.481701 30.078495 45.926528 31.180379 45.273438 31.90625 C 44.87889 32.344765 44.465829 32.63552 44 32.810547 L 44 20 z M 2 27 L 3 27 L 24 27 L 24 34.275391 C 24 34.515445 24.011754 34.75029 24.03125 34.982422 C 24.128899 36.451507 24.527473 37.818245 25.162109 39 L 8.2734375 39 C 4.8992009 36.801012 2 33.027952 2 28.908203 L 2 27 z M 2.4765625 41 L 7.9394531 41 L 27.013672 41 L 27.064453 41 L 40.943359 41 L 47.523438 41 L 46.933594 42.472656 C 46.563304 43.397314 45.675601 44 44.679688 44 L 5.3203125 44 C 4.324399 44 3.4355939 43.398288 3.0664062 42.474609 C 3.0664068356380874 42.47395800015516 3.066406835638088 42.473306999844844 3.0664062000000003 42.472656 L 2.4765625 41 z" strokeLinecap="round" />
    </g>
  </svg>
);

const HeartburnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <g transform="matrix(0.83 0 0 0.83 12 12)">
      <g>
        <g transform="matrix(1 0 0 1 0 -0.06)">
          <path style={{ stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-12, -11.94)" d="M 17.411 23.132 C 20.630086794187932 20.986159603419956 22.54508870888669 17.357477453009245 22.5 13.489000000000004 C 22.50920524720246 11.208408370227334 21.85497315337247 8.974360381206171 20.617000000000004 7.059000000000003 L 17.617 10.585 C 16.737287142023987 7.695645607189019 16.731372631207297 4.610706347683555 17.6 1.7180000000000035 C 17.675439321249844 1.471259613667694 17.61857102274519 1.2030623430647815 17.449488347009314 1.008170172354799 C 17.280405671273435 0.8132780016448163 17.02291675280699 0.7191332397053155 16.768 0.759 C 12.478376719886917 1.4633972069265981 8.79560002533717 4.201814850273243 6.885999999999999 8.107000000000001 L 4.5 5.616 C 2.5515753837508317 7.77340474497978 1.4813465926902256 10.582041835653168 1.5000000000000018 13.489000000000004 C 1.4549112911133097 17.357477453009242 3.3699132058120673 20.986159603419956 6.588999999999999 23.132" strokeLinecap="round" />
        </g>
        <g transform="matrix(1 0 0 1 0 6)">
          <path style={{ stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }} transform="translate(-12, -18)" d="M 12 23.25 L 6.78 17.915 C 5.84137942417271 17.004363956216277 5.606158002100248 15.58816877366966 6.199999999999999 14.423000000000002 L 6.2 14.423 C 6.657910064176343 13.549114618633155 7.501827721717062 12.942991987048899 8.476194540130523 12.788180521661193 C 9.450561358543982 12.633369056273487 10.440784227328638 12.948075788587126 11.147000000000002 13.637 L 11.999 14.472000000000001 L 12.852 13.637 C 13.558027396814323 12.948075003638733 14.548116771578158 12.633354783562673 15.52234611760807 12.788175702685097 C 16.49657546363798 12.94299662180752 17.34032403792936 13.549143576205738 17.798000000000002 14.422999999999998 L 17.798000000000002 14.423 C 18.39209277029813 15.5879565426313 18.157281709832983 17.004122731136142 17.219 17.915 Z" strokeLinecap="round" />
        </g>
      </g>
    </g>
  </svg>
);

const MilkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M8 2h8M7 6l-2 14h14L17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11c1 1.5 5 1.5 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const SYMPTOMS: { label: string; icon: React.ReactNode }[] = [
  { label: "Sure oppstøt",        icon: <HeartburnIcon /> },
  { label: "Svie bak brystbenet", icon: <FlameIcon /> },
  { label: "Verre etter måltid",  icon: <FlameIcon /> },
  { label: "Verre når du ligger", icon: <BedIcon /> },
  { label: "Plager under amming", icon: <MilkIcon /> },
];

const RAD_TIPS = [
  "Hev hodenden av sengen for å begrense plager om natten.",
  "Unngå å spise store måltider, spesielt sent på kvelden.",
  "Unngå fet eller sterkt krydret mat som kan forverre plagene.",
  "Vent minst 2–3 timer etter måltid før du legger deg.",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function priorityColor(p: Medicine["priority"]): string {
  if (p === "first")   return "#16a34a";
  if (p === "second")  return "#2563eb";
  if (p === "need")    return "#d97706";
  if (p === "warning") return "#f59e0b";
  return "#dc2626";
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TreatmentCard({ med, onLesMer }: { med: Medicine; onLesMer?: () => void }) {
  const color = priorityColor(med.priority);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
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
        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.65, flex: 1 }}>
          {med.comment}
        </div>
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AmmendeHalsbrannDetail({ onBack }: { onBack: () => void }) {
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
  const ACCENT   = "#06B6D4";

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
    <Box sx={{ bgcolor: dk ? "#0a0e1a" : "#f0f4f8", minHeight: "100%" }}>

      {/* ══ HERO BANNER ══════════════════════════════════════════════════════ */}
      <Box sx={{
        background: dk
          ? "linear-gradient(135deg, #0f2027 0%, #0c1a2e 60%, #0f172a 100%)"
          : "linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 60%, #f3e5f5 100%)",
        pt: 4, pb: 5, position: "relative", overflow: "hidden",
      }}>
        <Box sx={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -60, left: "30%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, #ec489922 0%, transparent 70%)`, pointerEvents: "none" }} />

        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", position: "relative" }}>
          {/* Breadcrumb */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2.5, fontSize: 12, fontWeight: 600 }}>
            <span style={{ cursor: "pointer", color: ACCENT }} onClick={onBack}>Ammende</span>
            <span style={{ color: textSub, fontSize: 14 }}>›</span>
            <span style={{ color: textSub }}>Halsbrann</span>
          </Box>

          {/* Title row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, color: textMain, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Halsbrann hos ammende
            </Typography>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3, flexShrink: 0,
              background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${ACCENT}30`,
            }}>
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: ACCENT }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M39 8H9C8.44771 8 8 8.44772 8 9V39C8 39.5523 8.44772 40 9 40H39C39.5523 40 40 39.5523 40 39V9C40 8.44771 39.5523 8 39 8ZM9 6C7.34315 6 6 7.34315 6 9V39C6 40.6569 7.34315 42 9 42H39C40.6569 42 42 40.6569 42 39V9C42 7.34315 40.6569 6 39 6H9Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M20.0889 10C20.0889 15.1089 17.7658 18.9036 15.3041 23.3195C12.2373 28.8208 15.0904 33.5826 18.5926 38C18.5926 32.9306 19.3994 30.0689 23.1926 26.2587C25.5254 30.4353 25.7372 33.5009 25 38C34.6627 33.334 34.1463 25.6833 31.33 17C30.787 19 29.7752 20.8182 29.1179 22.0909C27.809 17.0219 24.076 13.3085 20.0889 10Z" fill="currentColor"/>
              </svg>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 14.5, color: textSub, lineHeight: 1.75, mb: 2.5, maxWidth: 600 }}>
            Det finnes flere medisiner mot halsbrann og sure oppstøt som ammende kan bruke. Vi anbefaler
            at ammende forsøker alginsyre (Gaviscon) eller syrenøytraliserende (Novaluzid, Titralac) først.
          </Typography>

          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: "4px 12px",
            borderRadius: 999, background: dk ? "#1e293b" : "#f1f5f9",
            color: "#64748b", border: "1px solid #e2e8f0",
          }}>
            Sist oppdatert: Mai 2024
          </span>
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
                <span style={{ color: ACCENT, display: "inline-flex" }}>{icon}</span>
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
            <svg aria-label="Rangert etter anbefaling" width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "help", flexShrink: 0, color: textSub, opacity: 0.7 }}>
              <g transform="matrix(0.43 0 0 0.43 12 12)">
                <path style={{ fill: "currentColor" }} transform="translate(-25, -25)" d="M 24.5 2 C 21.472656 2 19 4.472656 19 7.5 C 19 10.527344 21.472656 13 24.5 13 C 27.527344 13 30 10.527344 30 7.5 C 30 4.472656 27.527344 2 24.5 2 Z M 24.5 4 C 26.445313 4 28 5.554688 28 7.5 C 28 9.445313 26.445313 11 24.5 11 C 22.554688 11 21 9.445313 21 7.5 C 21 5.554688 22.554688 4 24.5 4 Z M 15 16 C 14.449219 16 14 16.449219 14 17 L 14 23 C 14 23.550781 14.449219 24 15 24 L 20 24 L 20 40 L 15 40 C 14.449219 40 14 40.449219 14 41 L 14 47 C 14 47.550781 14.449219 48 15 48 L 35 48 C 35.550781 48 36 47.550781 36 47 L 36 41 C 36 40.449219 35.550781 40 35 40 L 30 40 L 30 17 C 30 16.449219 29.550781 16 29 16 Z M 16 18 L 28 18 L 28 41 C 28 41.550781 28.449219 42 29 42 L 34 42 L 34 46 L 16 46 L 16 42 L 21 42 C 21.550781 42 22 41.550781 22 41 L 22 23 C 22 22.449219 21.550781 22 21 22 L 16 22 Z" />
              </g>
            </svg>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2 }}>
            {MEDICINES.filter(m => m.priority).map(med => (
              <TreatmentCard key={med.name} med={med} onLesMer={med.faqKey ? () => handleLesMer(med.faqKey!) : undefined} />
            ))}
          </Box>

          {/* Footnotes */}
          <Box sx={{
            background: dk ? "#161b27" : "#f8fafc",
            border: `1px solid ${border}`,
            borderRadius: 2, p: "10px 14px",
            display: "flex", flexDirection: "column", gap: 0.5,
            mb: 1.5,
          }}>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>*</strong> Kontakt lege hvis du har behov for å bruke famotidin (Pepcid, Pepcidduo) i mer enn to uker sammenhengende.
            </Typography>
            <Typography sx={{ fontSize: 11, color: textSub, lineHeight: 1.7 }}>
              <strong style={{ color: textMain }}>**</strong> Somac Control selges reseptfritt, men skal ikke brukes mer enn fire uker uten at det er avtalt med lege, som opplyst i pakningsvedlegget.
            </Typography>
          </Box>

          {/* FAQ 1 – Gaviscon / Galieve */}
          {(["gaviscon", "novaluzid", "natron", "pepcid", "ppi", "lanzo"] as const).map((faqKey) => {
            const faqData = {
              gaviscon: {
                question: "Kan ammende bruke Gaviscon eller Galieve (alginsyre)?",
                dotColor: "#16a34a",
                body: (
                  <>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
                      Ja, det regnes som trygt for ammende å bruke alginsyre (Gaviscon). Alginsyre danner et skumlokk over
                      innholdet i magesekken, og vil ikke bli tatt opp i kroppen. Det vil derfor ikke være av betydning for
                      barn som ammes om mor bruker alginsyre.
                    </Typography>
                  </>
                ),
              },
              novaluzid: {
                question: "Kan ammende bruke Novaluzid eller Titralac (syrenøytraliserende)?",
                dotColor: "#16a34a",
                body: (
                  <>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
                      Ja, det regnes som trygt for ammende å bruke syrenøytraliserende (Novaluzid, Titralac).
                      Syrenøytraliserende medisiner virker lokalt i magen. Ettersom de i liten grad blir tatt opp i
                      kroppen, er det også lite som kan gå over i morsmelken. Mødre som bruker slike medisiner kan
                      derfor amme som vanlig.
                    </Typography>
                  </>
                ),
              },
              natron: {
                question: "Kan ammende bruke Natron NAF (syrenøytraliserende)?",
                dotColor: "#d97706",
                body: (
                  <>
                    <Box sx={{
                      background: dk ? "#1e2d3d" : "#fffbeb",
                      border: `1px solid ${dk ? "#334155" : "#fde68a"}`,
                      borderRadius: 2, p: "10px 14px",
                      display: "flex", gap: 1, alignItems: "flex-start", mt: 1.5,
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <Typography sx={{ fontSize: 12.5, color: dk ? "#fcd34d" : "#92400e", lineHeight: 1.7 }}>
                        Natron NAF kan i utgangspunktet brukes av ammende. Andre alternativer vurderes imidlertid på
                        generelt grunnlag som mer egnet ved halsbrann og sure oppstøt.
                      </Typography>
                    </Box>
                  </>
                ),
              },
              pepcid: {
                question: "Kan ammende bruke Pepcid/Pepcidduo (famotidin)?",
                dotColor: "#2563eb",
                body: (
                  <>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
                      Ja, det regnes som trygt for ammende å bruke famotidin (Pepcid). Famotidin virker ved å hemme
                      produksjonen av magesyre. Famotidin skal ikke brukes sammenhengende i mer enn to uker uten at
                      lege kontaktes. Dette gjelder for alle, ikke bare for ammende.
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
                      Famotidin går over i morsmelken i så liten grad at vi ikke forventer påvirkning av barnet.
                      Det er heller ikke rapportert om uheldige effekter hos barn som ammes av mødre som bruker
                      famotidin. Famotidin kan derfor brukes ved amming.
                    </Typography>
                  </>
                ),
              },
              ppi: {
                question: "Kan ammende bruke Losec/Omeprazol, Nexium/Esomeprazol eller Somac/Pantoprazol?",
                dotColor: "#dc2626",
                body: (
                  <>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
                      Ja, ammende kan bruke omeprazol (Losec), esomeprazol (Nexium) eller pantoprazol (Somac/Somac Control).
                      Disse tilhører medisingruppen protonpumpehemmere som er de mest effektive medisinene mot halsbrann og sure oppstøt.
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75 }}>
                      Den dokumentasjonen som finnes tyder på at protonpumpehemmerne i liten grad går over i morsmelken.
                      Selv om barnet skulle få i seg noe av medisinen via morsmelken, så vil mye av dette brytes ned av
                      syren i barnets magesekk. Det er derfor lite sannsynlig at medisinen skal påvirke barnet. Det er
                      heller ikke rapportert om bivirkninger hos barn som ammes.
                    </Typography>
                    <Box sx={{
                      background: dk ? "#2d1a1a" : "#fff5f5",
                      border: `1px solid ${dk ? "#7f1d1d" : "#fca5a5"}`,
                      borderRadius: 2, p: "10px 14px",
                      display: "flex", gap: 1, alignItems: "flex-start",
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <Typography sx={{ fontSize: 12.5, color: dk ? "#fca5a5" : "#991b1b", lineHeight: 1.7 }}>
                        <strong>Krever legevurdering:</strong> Med unntak av Somac Control er alle protonpumpehemmere
                        reseptpliktige. Generelt anbefaler vi at all bruk av reseptpliktige medisiner under amming
                        avtales med lege. Somac Control skal ikke brukes mer enn fire uker uten avtale med lege.
                      </Typography>
                    </Box>
                  </>
                ),
              },
              lanzo: {
                question: "Kan ammende bruke Lanzo Melt/Lansoprazol?",
                dotColor: "#dc2626",
                body: (
                  <>
                    <Typography sx={{ fontSize: 13, color: textSub, lineHeight: 1.75, pt: 1.5 }}>
                      Ammende kan bruke Lanzo Melt/Lansoprazol (inneholder lansoprazol) dersom lege vurderer at det
                      er en spesiell grunn til å velge akkurat denne medisinen. Lansoprazol tilhører
                      legemiddelgruppen protonpumpehemmere, på samme måte som omeprazol, esomeprazol og pantoprazol.
                    </Typography>
                    <Box sx={{
                      background: dk ? "#1e2d3d" : "#fffbeb",
                      border: `1px solid ${dk ? "#334155" : "#fde68a"}`,
                      borderRadius: 2, p: "10px 14px",
                      display: "flex", gap: 1, alignItems: "flex-start",
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <Typography sx={{ fontSize: 12.5, color: dk ? "#fcd34d" : "#92400e", lineHeight: 1.7 }}>
                        <strong>Merk:</strong> For lansoprazol mangler data på overgang til morsmelk. Vi anbefaler
                        derfor fortrinnsvis bruk av en av de andre protonpumpehemmerne (omeprazol, esomeprazol,
                        pantoprazol). Hvis lansoprazol likevel virker best for den enkelte, kan denne brukes når
                        lege har vurdert at det er nødvendig.
                      </Typography>
                    </Box>
                  </>
                ),
              },
            }[faqKey];

            if (!faqData) return null;
            const isOpen = !!openFaqs[faqKey];
            const borderCol = isOpen ? `${faqData.dotColor}55` : (dk ? "#334155" : "#e2e8f0");
            const shadowCol = isOpen ? `${faqData.dotColor}14` : "rgba(0,0,0,0.05)";

            return (
              <Box
                key={faqKey}
                id={`faq-${faqKey}`}
                onClick={() => toggleFaq(faqKey)}
                sx={{
                  mb: 1.5, borderRadius: 3, overflow: "hidden", cursor: "pointer",
                  border: `1.5px solid ${borderCol}`,
                  background: dk ? "#161b27" : "#fff",
                  boxShadow: isOpen ? `0 0 0 3px ${shadowCol}` : "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "box-shadow 150ms, border-color 150ms",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: `${faqData.dotColor}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: faqData.dotColor }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: textMain, lineHeight: 1.35 }}>
                      {faqData.question}
                    </Typography>
                  </Box>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
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
                    {faqData.body}
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
                  boxShadow: activeTab === tab.key ? "0 -1px 0 0 rgba(0,0,0,0.06)" : "none",
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
            {/* ── Ikke-medikamentelle råd ── */}
            {activeTab === "rad" && (
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: textSub, mb: 2, lineHeight: 1.6 }}>
                  Selv om du bruker medisiner, bør du forsøke å følge disse generelle rådene mot halsbrann og sure oppstøt.
                  Det kan også bidra til å redusere behovet for medisiner.
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  {RAD_TIPS.map((tip, i) => (
                    <Box key={i} sx={{
                      display: "flex", gap: 1.5, alignItems: "flex-start",
                      background: dk ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${border}`,
                      borderRadius: 3, p: 2,
                    }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                        background: dk ? "#0f172a" : "#fff",
                        border: `1px solid ${border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 20 }}>
                          {["🌙", "🍽️", "🥗", "⏰"][i]}
                        </span>
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
                      Hvis reseptfrie medisiner mot halsbrann og sure oppstøt ikke gir tilstrekkelig effekt,
                      kontakt lege for å få en vurdering av hvilken behandling som er best for deg.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    "Reseptfrie midler gir ikke tilstrekkelig effekt",
                    "Behov for å bruke famotidin (Pepcid, Pepcidduo) i mer enn to uker sammenhengende",
                    "Behov for å bruke Somac Control i lengre enn fire uker",
                    "Sterke smerter i magen eller brystet",
                    "Symptomer som forverrer seg over tid",
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
                  Sist oppdatert: Mai 2024. Informasjonen er skrevet av/godkjent av legespesialister og oppdateres
                  jevnlig basert på ny forskning og erfaring fra ammeomsorgen.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
