import { useState } from "react";
import { Box, Typography, Tabs, Tab, Chip, Divider, useTheme } from "@mui/material";

// ─── Badge icons ──────────────────────────────────────────────────────────────
const DropIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 4 10 4 15a8 8 0 0 0 16 0C20 10 12 2 12 2z" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.6"/>
    <path d="M9 16a3 3 0 0 0 2.5 1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const ShieldCheckIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 6v6c0 5.3 3.5 10.3 8 12 4.5-1.7 8-6.7 8-12V6l-8-4z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.6"/>
    <path d="M9 12.5l2 2 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const GutIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M7 4c-3 1.5-4 4-3 6.5 1 2 3 2.5 3 5s-1.5 4-1 5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M12 4c2 1.5 3 4 2 6.5-1 2-3 2.5-3 5s1.5 4 1 5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M7 4c1.5-1 3.5-1 5 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M6 21c1.5.8 3.5.8 4 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const StarShieldIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 6v6c0 5.3 3.5 10.3 8 12 4.5-1.7 8-6.7 8-12V6l-8-4z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.6"/>
    <path d="M12 7l1.2 2.5 2.8.4-2 2 .5 2.8L12 13.5l-2.5 1.2.5-2.8-2-2 2.8-.4L12 7z" stroke={color} strokeWidth="1" strokeLinejoin="round" fill={color} fillOpacity="0.6"/>
  </svg>
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:         "#EDE7F6",
  surface:    "#FFFFFF",
  surfaceAlt: "#FAF8FF",
  border:     "rgba(74,44,130,0.08)",
  borderMed:  "rgba(74,44,130,0.16)",
  text:       "#1A0A30",
  textSub:    "#5A4A70",
  textMuted:  "#9A8AAA",
  blue:       "#4A2C82",
  blueLight:  "rgba(74,44,130,0.08)",
  blueMid:    "rgba(74,44,130,0.18)",
  purple:     "#4A2C82",
  radius:     14,
  radiusSm:   10,
  shadow:     "0 2px 8px rgba(74,44,130,0.08), 0 1px 2px rgba(74,44,130,0.06)",
};

// ─── Product data ─────────────────────────────────────────────────────────────
type NutritionRow = { label: string; unit: string; per100gPulver: string; per100mlUtblandet: string };

type Product = {
  id: string;
  name: string;
  age: string;
  tagline: string;
  description: string;
  image?: string;
  type: "Hydrolysert" | "Aminosyrebasert";
  badges: { label: string; color: string; icon: "drop" | "shield" | "gut" | "star" }[];
  summary: { label: string; value: string }[];
  fordeler: string[];
  bruksomraader: string[];
  fodmap: { laktose: string; gos: boolean; fos: boolean };
  hurtiginfo: { label: string; icon: React.ReactNode }[];
  viktigAVite: string[];
  nutrition: {
    headers: string[];
    rows: NutritionRow[];
    sections: { title: string; rows: NutritionRow[] }[];
  };
  tilberedning: string[];
  dosering: string;
  holdbarhet: string;
  ingredienser: string;
  smaksvarianter: string;
  indikasjon: string;
  kontraindikasjon: string;
  forsiktighetsregler: string;
  bestilling: { produktnavn: string; bestillingsnr: string; varenr: string; salgsenhet: string }[];
};

function NutritionTable({ rows }: { rows: { label: string; unit: string; per100gPulver: string; per100mlUtblandet: string }[] }) {
  return (
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <Box component="tbody">
        {rows.map((row, i) => (
          <Box component="tr" key={i} sx={{
            "&:nth-of-type(odd)": { bgcolor: "rgba(255,255,255,0.02)" },
          }}>
            <Box component="td" sx={{ py: 0.6, px: 1.5, color: D.text, fontWeight: row.label.startsWith("–") || row.label.startsWith("·") ? 400 : 500, pl: row.label.startsWith("–") ? 3 : 1.5, fontSize: row.label.startsWith("–") ? 12 : 13 }}>{row.label}</Box>
            <Box component="td" sx={{ py: 0.6, px: 1, color: D.textSub, fontSize: 12, width: 40, textAlign: "right" }}>{row.unit}</Box>
            <Box component="td" sx={{ py: 0.6, px: 1.5, color: D.text, textAlign: "right", width: 110 }}>{row.per100gPulver}</Box>
            <Box component="td" sx={{ py: 0.6, px: 1.5, color: D.text, textAlign: "right", width: 130 }}>{row.per100mlUtblandet}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const PEPTICATE_1: Product = {
  id: "pepticate-1",
  name: "Pepticate 1",
  age: "0–6 måneder",
  tagline: "Mysebasert, høygradig hydrolysert morsmelkerstatning for spedbarn med kumelkallergi.",
  description: "Ernæringsmessig komplett og kan brukes som eneste næringskilde.",
  image: "/nutrition/pepticate-1.png",
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",                    color: "#3B82F6", icon: "drop"   },
    { label: "Ernæringsmessig komplett 0–1 år", color: "#3B82F6", icon: "shield" },
    { label: "Med GOS/FOS",                    color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                  color: "#3B82F6", icon: "drop"   },
    { label: "Med nukleotider",                color: "#3B82F6", icon: "star"   },
  ],
  summary: [
    { label: "Alder",        value: "0–6 mnd" },
    { label: "Energitetthet", value: "0,66 kcal/ml" },
    { label: "Protein",      value: "100% myse (hydrolysert)" },
    { label: "Kostfiber",    value: "GOS/FOS (0,8g/100ml)" },
    { label: "Halal",        value: "Nei" },
    { label: "Laktose",      value: "21,1g/100ml" },
  ],
  fordeler: [
    "Bygger på 30 års forskning på morsmelk og er dokumentert velfungerende for barn med kumelkallergi.",
    "Inneholder en unik, veldokumentert blanding av prebiotiske kostfibre GOS/FOS som støtter tarmfloraen og immunforsvaret.",
    "Inneholder laktose – en viktig energikilde i morsmelk – som gir mild smak og bidrar til opptak av mineraler som kalsium.",
    "Beriket med de langkjedede fettsyrene DHA og ARA som er viktige for utvikling av hjerne og syn.",
    "Tilsatt nukleotider i mengder som tilsvarer morsmelk og som har påvist positive effekter på immunfunksjon.",
  ],
  bruksomraader: [
    "Til kostbehandling av spedbarn 0–1 år med kumelkallergi og andre indikasjoner hvor elementalkost er anbefalt.",
    "Kan brukes som eneste næringskilde eller i kombinasjon med amming.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  fodmap: { laktose: "21,1 g", gos: true, fos: true },
  viktigAVite: [
    "Morsmelk er det beste for spedbarn.",
    "Pepticate er et næringsmiddel til spesielle medisinske formål.",
    "Skal brukes under medisinsk tilsyn etter nøye vurdering.",
    "Tilbered alltid bare ett måltid om gangen.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",               icon: null },
    { label: "Med DHA & ARA",           icon: null },
    { label: "Med nukleotider",         icon: null },
    { label: "Hypoallergen",            icon: null },
    { label: "0–6 mnd",                 icon: null },
    { label: "Ernæringsmessig komplett", icon: null },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (13,6 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                       unit: "kJ",  per100gPulver: "2024",     per100mlUtblandet: "276" },
          { label: "Energi (kcal)",                     unit: "kcal", per100gPulver: "484",      per100mlUtblandet: "66" },
          { label: "Fett (46 E%)",                      unit: "g",   per100gPulver: "24,7",     per100mlUtblandet: "3,4" },
          { label: "– hvorav mettede fettsyrer",        unit: "g",   per100gPulver: "11,4",     per100mlUtblandet: "1,6" },
          { label: "– enumettede fettsyrer",            unit: "g",   per100gPulver: "9,1",      per100mlUtblandet: "1,2" },
          { label: "– flerumet. fettsyrer",             unit: "g",   per100gPulver: "4,2",      per100mlUtblandet: "0,6" },
          { label: "– hvorav linolsyre (LA)",           unit: "g",   per100gPulver: "3,3",      per100mlUtblandet: "0,448" },
          { label: "– α-linolensyre (ALA)",             unit: "g",   per100gPulver: "0,40",     per100mlUtblandet: "0,0543" },
          { label: "– arakidonsyre (ARA)",              unit: "mg",  per100gPulver: "120",      per100mlUtblandet: "16,5" },
          { label: "– Dokosaheksaensyre (DHA)",         unit: "mg",  per100gPulver: "120",      per100mlUtblandet: "16,5" },
          { label: "Ratio n6:n3",                       unit: "",    per100gPulver: "6,18:1",   per100mlUtblandet: "6,18:1" },
          { label: "Karbohydrat (43 E%)",               unit: "g",   per100gPulver: "51,8",     per100mlUtblandet: "7,1" },
          { label: "– hvorav sukkerarter",              unit: "g",   per100gPulver: "25,5",     per100mlUtblandet: "3,5" },
          { label: "– laktose",                         unit: "g",   per100gPulver: "21,1",     per100mlUtblandet: "2,88" },
          { label: "Kostfiber (1 E%)",                  unit: "g",   per100gPulver: "4,0",      per100mlUtblandet: "0,5" },
          { label: "– løselige",                        unit: "g",   per100gPulver: "4,0",      per100mlUtblandet: "0,5" },
          { label: "Proteinekv. (10 E%)",               unit: "g",   per100gPulver: "11,6",     per100mlUtblandet: "1,6" },
          { label: "– hydrolysert myse",                unit: "g",   per100gPulver: "11,6",     per100mlUtblandet: "1,6" },
          { label: "Salt",                              unit: "g",   per100gPulver: "0,38",     per100mlUtblandet: "0,05" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg", per100gPulver: "153",   per100mlUtblandet: "20,8" },
          { label: "Kalium",    unit: "mg", per100gPulver: "635",   per100mlUtblandet: "87" },
          { label: "Klorid",    unit: "mg", per100gPulver: "372",   per100mlUtblandet: "51" },
          { label: "Kalsium",   unit: "mg", per100gPulver: "444",   per100mlUtblandet: "61" },
          { label: "Fosfor",    unit: "mg", per100gPulver: "254",   per100mlUtblandet: "35" },
          { label: "Magnesium", unit: "mg", per100gPulver: "37",    per100mlUtblandet: "5,0" },
          { label: "Jern",      unit: "mg", per100gPulver: "4,0",   per100mlUtblandet: "0,54" },
          { label: "Sink",      unit: "mg", per100gPulver: "4,9",   per100mlUtblandet: "0,66" },
          { label: "Kobber",    unit: "mg", per100gPulver: "0,381", per100mlUtblandet: "0,052" },
          { label: "Mangan",    unit: "mg", per100gPulver: "0,057", per100mlUtblandet: "0,008" },
          { label: "Fluorid",   unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Molybden",  unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Krom",      unit: "mg", per100gPulver: "<44",   per100mlUtblandet: "<5,9" },
          { label: "Selen",     unit: "µg", per100gPulver: "22",    per100mlUtblandet: "3,0" },
          { label: "Jod",       unit: "µg", per100gPulver: "92",    per100mlUtblandet: "13" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",       unit: "µg",        per100gPulver: "426",       per100mlUtblandet: "58" },
          { label: "Vitamin D",       unit: "µg",        per100gPulver: "12",        per100mlUtblandet: "1,7" },
          { label: "Vitamin E",       unit: "mg (mg TE)", per100gPulver: "10 (8,9)", per100mlUtblandet: "1,4 (1,2)" },
          { label: "Vitamin K",       unit: "µg",        per100gPulver: "33",        per100mlUtblandet: "4,4" },
          { label: "Tiamin",          unit: "mg",        per100gPulver: "0,49",      per100mlUtblandet: "0,07" },
          { label: "Riboflavin",      unit: "mg",        per100gPulver: "1,0",       per100mlUtblandet: "0,14" },
          { label: "Niacin",          unit: "mg (mg NE)", per100gPulver: "3,12 (6,4)", per100mlUtblandet: "0,426 (0,87)" },
          { label: "Pantotensyre",    unit: "mg",        per100gPulver: "4,2",       per100mlUtblandet: "0,573" },
          { label: "Vitamin B₆",     unit: "mg",        per100gPulver: "0,333",     per100mlUtblandet: "0,045" },
          { label: "Folinsyre",       unit: "µg",        per100gPulver: "64",        per100mlUtblandet: "8,7" },
          { label: "Folat",           unit: "µg",        per100gPulver: "107",       per100mlUtblandet: "15" },
          { label: "Vitamin B₁₂",    unit: "µg",        per100gPulver: "1,2",       per100mlUtblandet: "0,16" },
          { label: "Biotin",          unit: "µg",        per100gPulver: "14",        per100mlUtblandet: "9,1" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "L-karnitin",   unit: "mg",     per100gPulver: "15",  per100mlUtblandet: "2,1" },
          { label: "Kolin",        unit: "mg",     per100gPulver: "160", per100mlUtblandet: "22" },
          { label: "Taurin",       unit: "mg",     per100gPulver: "39",  per100mlUtblandet: "5,3" },
          { label: "Inositol",     unit: "mg",     per100gPulver: "52",  per100mlUtblandet: "7,1" },
          { label: "Nukleotider",  unit: "mg",     per100gPulver: "17",  per100mlUtblandet: "2,3" },
          { label: "Osmolaritet",  unit: "mOsm/l", per100gPulver: "—",   per100mlUtblandet: "250" },
          { label: "Osmolalitet",  unit: "mOsm/kg H₂O", per100gPulver: "—", per100mlUtblandet: "280" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Tilsett måleskje med Pepticate iht. utblandingstabell på pakning.",
    "Rist eller visp til pulveret har løst seg opp.",
    "Kan drikkes eller gis som sondeernæring.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  dosering: "Anbefalt konsentrasjon er 13,6 % vekt/volum: for hver måleskje (4,5 g) tilsettes 30 ml vann. Se informasjon om utblanding og tilberedning på pakningen. Doseringen er individuell og skal alltid gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Tilbered alltid bare ett måltid om gangen. Tilberedt Pepticate som ikke drikkes innen en time skal kastes. Ved sondeernæring er maks hengetid 4 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen 1 måned. Skal ikke oppbevares i kjøleskap.",
  ingredienser: "Myseproteinhydrolysat (fra kumelk), maltodekstrin, vegetabilske oljer (palmeolje, kokosolje, rapsolje, oljesyrerik solsikkeolje, solsikkeolje), galaktooligosakkarider (fra kumelk), kalsiumfosfat, emulgator (sitronsyreestere av mono- og diglycerider av fettsyrer), fruktooligosakkarider, fiskeolje, kaliumklorid, olje fra Mortierella alpina, kolinklklorid, kaliumsitat, natriumklorid, magnesiumklorid, L-tyrosin, L-askorbinsyre, inositol, magnesiumhydrogenfosfat, taurin, natrium-L-askorbat, sinksulfat, L-karnitin, jernsulfat, DL-α-tokoferylacelat, uridin-5'-monofosfatnatrium salt, cytidin-5'-monofosfat, kalsium-D-pantotenate, adenosin-5'-monofosfat, inosin-5'-monofosfatnatriumsalt, nikotinamid, guanosin-5'-monofosfatnatriumsalt, kobbersulfat, DL-α-tokoferol, retinylpalmitat, riboflavin, tiaminhydroklorid, pyridoksinhydroklorid, manganisulfat, kaliumjodid, pteroylmonoglutaminsyre, retinylasetat, natriumselenitt, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av barn med kumelkallergi. Ernæringsmessig komplett for spedbarn 0–1 år. Kan brukes som tilskudd til barn over 1 år.",
  kontraindikasjon: "Galaktosemi. Intoleranse mot et eller flere av produktets ingredienser.",
  forsiktighetsregler: "Morsmelk er det beste for spedbarn. Pepticate skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
  bestilling: [
    { produktnavn: "Pepticate", bestillingsnr: "146902", varenr: "910034", salgsenhet: "1 x 450 g boks" },
  ],
};

const PRODUCTS: Product[] = [PEPTICATE_1];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProductCard({ product, selected, onClick }: { product: Product; selected: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex", gap: 1.5, p: 1.5, cursor: "pointer", borderRadius: "10px",
        border: `1.5px solid ${selected ? "rgba(74,44,130,0.28)" : "rgba(74,44,130,0.06)"}`,
        bgcolor: D.surfaceAlt,
        boxShadow: selected ? `0 0 0 3px rgba(74,44,130,0.07), ${D.shadow}` : D.shadow,
        transition: "all 0.15s",
        "&:hover": { borderColor: "rgba(74,44,130,0.2)", boxShadow: `0 0 0 3px rgba(74,44,130,0.05), ${D.shadow}` },
      }}
    >
      <Box sx={{ width: 88, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", pt: 0.5 }}>
        {product.image
          ? <Box component="img" src={product.image} alt={product.name} sx={{ width: 88, height: 88, objectFit: "contain" }} />
          : <BottleIcon size={60} color={D.purple} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: D.text, lineHeight: 1.2 }}>{product.name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: D.textSub, mt: 0.4, fontWeight: 500 }}>{product.age}</Typography>
        <Typography sx={{ fontSize: 12, color: D.textSub, mt: 0.75, lineHeight: 1.55 }}>{product.tagline}</Typography>
        <Chip label={product.type} size="small" sx={{ mt: 1.25, height: 22, fontSize: 11, fontWeight: 600, bgcolor: "rgba(74,44,130,0.1)", color: D.purple, borderRadius: "6px", "& .MuiChip-label": { px: 1.25 } }} />
      </Box>
    </Box>
  );
}

const FORDEL_ICONS = [
  // Microscope
  (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.4 0 0 0.4 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-25, -25.02)" d="M 19.3125 0.03125 C 19.121094 0.03125 18.933594 0.078125 18.75 0.15625 L 11.59375 3.125 C 10.855469 3.433594 10.484375 4.292969 10.78125 5.03125 C 10.78125 5.042969 10.78125 5.050781 10.78125 5.0625 L 11.5625 6.9375 C 11.867188 7.679688 12.753906 8.03125 13.5 7.71875 L 14.25 7.40625 L 15.125 9.65625 L 14.96875 9.71875 C 14.683594 9.832031 14.457031 9.902344 14.21875 10.03125 C 13.980469 10.160156 13.632813 10.40625 13.46875 10.8125 C 13.304688 11.21875 13.394531 11.585938 13.46875 11.84375 C 13.542969 12.101563 13.636719 12.3125 13.75 12.59375 C 13.75 12.605469 13.75 12.613281 13.75 12.625 L 13.9375 13.125 L 13.5 13.28125 C 8.296875 15.398438 5.769531 21.367188 7.875 26.5625 C 7.875 26.574219 7.875 26.582031 7.875 26.59375 L 10.15625 32 C 9.375 33.140625 8.90625 34.523438 8.90625 36 C 8.90625 39.410156 11.339844 42.273438 14.5625 42.9375 C 14.5625 42.957031 14.5625 42.980469 14.5625 43 C 14.757813 43.34375 14.96875 43.671875 15.1875 44 L 9.875 44 C 8.261719 44 7 45.386719 7 47 L 7 49 C 7 49.550781 7.449219 50 8 50 L 42 50 C 42.550781 50 43 49.550781 43 49 L 43 47 C 43 45.386719 41.738281 44 40.125 44 L 37.3125 44 C 39.160156 43.210938 40.101563 41.105469 39.375 39.21875 C 38.816406 37.769531 37.4375 36.832031 35.96875 36.78125 C 35.480469 36.765625 34.984375 36.84375 34.5 37.03125 L 24.65625 40.84375 C 24.644531 40.84375 24.636719 40.84375 24.625 40.84375 C 24.242188 40.996094 23.753906 40.984375 23.1875 40.75 C 22.753906 40.570313 22.332031 40.242188 21.9375 39.875 C 22.667969 38.761719 23.09375 37.421875 23.09375 36 C 23.09375 35.542969 23.019531 35.089844 22.9375 34.65625 L 35.875 29.375 C 36.410156 29.238281 36.730469 28.691406 36.59375 28.15625 C 36.457031 27.621094 35.910156 27.300781 35.375 27.4375 C 35.289063 27.449219 35.207031 27.46875 35.125 27.5 L 22.28125 32.78125 C 21.234375 30.75 19.257813 29.273438 16.90625 28.96875 L 14.84375 23.75 C 14.292969 22.386719 14.945313 20.839844 16.3125 20.28125 C 16.324219 20.28125 16.332031 20.28125 16.34375 20.28125 L 16.84375 20.0625 L 18.34375 23.71875 C 18.359375 23.78125 18.378906 23.847656 18.40625 23.90625 L 19.40625 26.34375 C 19.507813 26.582031 19.699219 26.773438 19.9375 26.875 L 22.8125 28.09375 C 23.054688 28.191406 23.320313 28.191406 23.5625 28.09375 L 27.65625 26.46875 C 27.894531 26.367188 28.085938 26.175781 28.1875 25.9375 L 29.4375 23.0625 C 29.535156 22.820313 29.535156 22.554688 29.4375 22.3125 L 28.46875 20 C 28.46875 19.980469 28.46875 19.957031 28.46875 19.9375 L 28.46875 19.90625 C 28.457031 19.894531 28.449219 19.886719 28.4375 19.875 C 28.4375 19.855469 28.4375 19.832031 28.4375 19.8125 C 28.417969 19.769531 28.398438 19.726563 28.375 19.6875 L 23.75 8.5 C 23.636719 8.21875 23.5625 8.015625 23.4375 7.78125 C 23.3125 7.546875 23.101563 7.207031 22.6875 7.03125 C 22.273438 6.855469 21.910156 6.925781 21.65625 7 C 21.402344 7.074219 21.1875 7.167969 20.90625 7.28125 L 20.71875 7.34375 L 19.8125 5.09375 L 20.65625 4.75 C 21.382813 4.445313 21.761719 3.582031 21.46875 2.84375 L 21.46875 2.8125 L 20.6875 0.9375 C 20.449219 0.390625 19.886719 0.0351563 19.3125 0.03125 Z M 19.03125 2.1875 L 19.4375 3.09375 L 13.21875 5.6875 L 12.8125 4.78125 Z M 17.96875 5.84375 L 18.875 8.125 L 17 8.90625 L 16.09375 6.625 Z M 21.84375 9.09375 C 21.871094 9.15625 21.875 9.171875 21.90625 9.25 C 21.90625 9.261719 21.90625 9.269531 21.90625 9.28125 L 26.21875 19.6875 L 19.875 22.21875 L 15.59375 11.875 C 15.589844 11.863281 15.597656 11.855469 15.59375 11.84375 C 15.554688 11.75 15.527344 11.730469 15.5 11.65625 C 15.574219 11.625 15.585938 11.601563 15.6875 11.5625 C 15.699219 11.5625 15.707031 11.5625 15.71875 11.5625 L 21.65625 9.15625 C 21.75 9.117188 21.769531 9.121094 21.84375 9.09375 Z M 14.71875 14.9375 L 16.0625 18.21875 L 15.5625 18.40625 C 13.191406 19.375 12.039063 22.125 13 24.5 L 14.78125 29.03125 C 13.617188 29.234375 12.554688 29.707031 11.65625 30.40625 L 9.71875 25.8125 C 8.027344 21.636719 10.046875 16.882813 14.21875 15.15625 C 14.234375 15.152344 14.234375 15.128906 14.25 15.125 Z M 26.96875 21.5625 L 27.4375 22.65625 L 26.5 24.78125 L 23.21875 26.09375 L 21.09375 25.1875 L 20.65625 24.09375 Z M 16 31.09375 C 18.726563 31.09375 20.90625 33.273438 20.90625 36 C 20.90625 38.726563 18.726563 40.90625 16 40.90625 C 13.273438 40.90625 11.09375 38.726563 11.09375 36 C 11.09375 33.273438 13.273438 31.09375 16 31.09375 Z M 35.90625 38.78125 C 36.59375 38.804688 37.234375 39.246094 37.5 39.9375 C 37.855469 40.859375 37.390625 41.863281 36.46875 42.21875 L 31.8125 44 L 17.6875 44 C 17.464844 43.75 17.222656 43.410156 16.96875 43.03125 C 18.335938 42.84375 19.585938 42.265625 20.59375 41.40625 C 21.140625 41.902344 21.757813 42.3125 22.4375 42.59375 C 23.34375 42.96875 24.386719 43.085938 25.375 42.6875 L 35.21875 38.90625 C 35.449219 38.816406 35.675781 38.773438 35.90625 38.78125 Z M 9.875 46 L 40.125 46 C 40.582031 46 41 46.402344 41 47 L 41 48 L 9 48 L 9 47 C 9 46.402344 9.417969 46 9.875 46 Z" /></g></svg>,
  // Gut
  (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.83 0 0 0.83 12 12)"><g transform="matrix(1 0 0 1 2 0)"><path style={{stroke: c, strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round", fill: "none"}} transform="translate(-14, -12)" d="M 4.5 23.5 L 4.5 22 C 4.501223516076714 21.29730607002737 4.8729531463804285 20.64734935446566 5.478 20.29 C 7.400695806479241 22.03435594817901 9.903938241979272 23.000432137328126 12.500000000000004 23 C 18.3 23 23.5 18.3 23.5 12.5 C 23.5 9.914 23.5 2.5 13.5 2.5 C 12.395430500338414 2.5 11.5 1.604569499661587 11.5 0.5"/></g><g transform="matrix(1 0 0 1 -5.49 0)"><path style={{stroke: c, strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round", fill: "none"}} transform="translate(-6.51, -12)" d="M 7.5 0.5 L 7.5 1.5 C 7.5 3.709138999323174 9.290861000676827 5.5 11.5 5.5 L 12.455 5.5 C 13.513 16.67 0.5 15.065 0.5 21 L 0.5 23.5"/></g><g transform="matrix(1 0 0 1 0.98 -6.5)"><path style={{stroke: c, strokeWidth: 1, strokeLinecap: "round", strokeLinejoin: "round", fill: "none"}} transform="translate(-12.98, -5.5)" d="M 12.456 5.5 L 13.5 5.5"/></g></g></svg>,
  // Milk bottle
  (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.45 0 0 0.45 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-25, -25)" d="M 16 3 C 15.447738123791542 3.0000552179053495 15.000055217905349 3.4477381237915417 15 4.000000000000001 L 15 7.6289062 L 9.2402344 14.349609 C 9.235611999065108 14.355417743582233 9.231054416584485 14.36127777345569 9.2265625 14.367188 C 9.223277559201216 14.371069118240886 9.220022264540527 14.374975231826733 9.2167969 14.378906 C 9.203897749252851 14.395440083526905 9.19152183070969 14.412375789721528 9.1796875 14.429688 C 9.163695121462382 14.453128137625658 9.148707593404046 14.477238286909984 9.1347656 14.501953 C 9.129414068987154 14.510985090719597 9.124205089977023 14.52010088733099 9.1191406 14.529297 C 9.11305149500169 14.540899382434677 9.107190996801013 14.552620312156492 9.1015625 14.564453 C 9.090952698314844 14.586868215822031 9.081180309627506 14.609670311548122 9.0722656 14.632812 C 9.069605137122602 14.638646485105678 9.067000850013388 14.64450642278157 9.0644531 14.650391 C 9.054973357564174 14.6754312195503 9.046502999858765 14.70084202578484 9.0390625 14.726562 C 9.037015069571225 14.734350790019183 9.03506179375724 14.742164026618191 9.0332031 14.75 C 9.028096648813117 14.768743539543639 9.02353741430429 14.787631887309082 9.0195312 14.806641 C 9.014696685075632 14.83122481020603 9.0107876936991 14.855981611044308 9.0078125 14.880859 C 9.00709758693017 14.88736312068583 9.006446522245097 14.89387410088596 9.0058594 14.900391 C 9.002728318352238 14.928291013573535 9.000773453441377 14.95631049930139 9 14.984375 C 8.999977112932108 14.988281299809705 8.999977112932108 14.992187700190295 9 14.996094 C 8.999997457445831 14.997395998758721 8.999997457445831 14.998698001241278 9 15 L 9 46 C 9.000055217905349 46.55226187620846 9.447738123791542 46.99994478209465 10 47 L 30 47 L 40 47 C 40.55226187620846 46.99994478209465 40.99994478209465 46.55226187620846 41 46 L 41 15 C 41.00036864652495 14.791386143852312 40.93549213358472 14.587878990930875 40.814453 14.417969 L 36 7.6777344 L 36 4 C 35.99994478209465 3.4477381237915408 35.55226187620846 3.0000552179053495 35 3 L 16 3 z M 17 5 L 34 5 L 34 7 L 17 7 L 17 5 z M 16.458984 9 L 33.056641 9 L 29.486328 14 L 12.173828 14 L 16.458984 9 z M 35 9.7226562 L 39 15.320312 L 39 45 L 31 45 L 31 15.322266 L 35 9.7226562 z M 11 16 L 29 16 L 29 45 L 11 45 L 11 16 z M 15 25 C 13.895 25 13 25.895 13 27 C 13 28.105 13.895 29 15 29 C 16.105 29 17 28.105 17 27 C 17 25.895 16.105 25 15 25 z M 25 25 C 23.895 25 23 25.895 23 27 C 23 28.105 23.895 29 25 29 C 26.105 29 27 28.105 27 27 C 27 25.895 26.105 25 25 25 z M 24.023438 31.988281 C 23.693476915987283 31.98302059883501 23.38216098338928 32.14087078856904 23.191406 32.410156 C 23.191406 32.410156 22.015066 34 20 34 C 17.984934 34 16.808594 32.410156 16.808594 32.410156 C 16.482832154020805 31.96358186499532 15.856730135004682 31.865644154020806 15.410156 32.191406 C 14.96358186499532 32.517167845979195 14.865644154020806 33.14326986499532 15.191406 33.589844 C 15.191406 33.589844 16.935066 36 20 36 C 23.064934 36 24.808594 33.589844 24.808594 33.589844 C 25.035156075348077 33.288937593320505 25.07343739593875 32.88625736661905 24.907633487686418 32.5480501763125 C 24.74182957943409 32.20984298600596 24.400065181014337 31.993477738206582 24.023438 31.988281 z" /></g></svg>,
  // Drop
  (c: string) => <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.465 31.3984C15.2943 30.8716 14.7301 30.5833 14.2049 30.7545C13.6796 30.9257 13.3922 31.4915 13.5629 32.0183C14.3133 34.3348 15.7757 36.3536 17.7405 37.7853C19.7052 39.217 22.0714 39.9881 24.5 39.9881C25.0523 39.9881 25.5 39.5391 25.5 38.9852C25.5 38.4313 25.0523 37.9822 24.5 37.9822C22.4938 37.9822 20.5391 37.3452 18.916 36.1625C17.293 34.9798 16.0849 33.3121 15.465 31.3984Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M24 4L23.3098 4.66019L23.3061 4.66378L23.2973 4.67225L23.2648 4.70364C23.2367 4.73093 23.1956 4.77088 23.1426 4.82301C23.0366 4.92726 22.8826 5.08027 22.6874 5.27825C22.297 5.67415 21.7417 6.25027 21.0763 6.9763C19.7465 8.42721 17.9719 10.4826 16.1951 12.8995C12.6815 17.6788 9 24.0808 9 30.0801C9 37.845 15.796 44 24 44C32.204 44 39 37.845 39 30.0801C39 24.0808 35.3185 17.6788 31.8049 12.8995C30.0281 10.4826 28.2535 8.42721 26.9237 6.9763C26.2583 6.25027 25.703 5.67415 25.3126 5.27825C25.1174 5.08027 24.9634 4.92726 24.8574 4.82301C24.8044 4.77088 24.7634 4.73093 24.7352 4.70364L24.7027 4.67225L24.6939 4.66378L24 4ZM22.5487 8.3338C23.1353 7.69375 23.6326 7.17503 24 6.8001C24.3674 7.17503 24.8647 7.69375 25.4513 8.3338C26.7465 9.74705 28.4719 11.746 30.1951 14.0899C33.6815 18.8321 37 24.7771 37 30.0801C37 36.5828 31.2599 41.9941 24 41.9941C16.7401 41.9941 11 36.5828 11 30.0801C11 24.7771 14.3185 18.8321 17.8049 14.0899C19.5281 11.746 21.2535 9.74705 22.5487 8.3338Z" fill={c}/></svg>,
  // Shield
  (c: string) => <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.32 0 0 0.32 12 12)"><path style={{fill: c, strokeLinecap: "round"}} transform="translate(-40, -39.47)" d="M 40 7.882813 L 39.550781 8.105469 C 39.550781 8.105469 27.75 14 12 14 L 11 14 L 11 15 C 11 38.203125 18.089844 52.230469 25.25 60.40625 C 32.40625 68.585938 39.691406 70.953125 39.691406 70.953125 L 40 71.050781 L 40.308594 70.953125 C 40.308594 70.953125 47.59375 68.585938 54.75 60.40625 C 61.910156 52.230469 69 38.203125 69 15 L 69 14 L 68 14 C 52.25 14 40.449219 8.105469 40.449219 8.105469 Z M 40 10.09375 C 41.148438 10.648438 52.082031 15.710938 66.964844 15.953125 C 66.765625 38.148438 59.992188 51.386719 53.25 59.09375 C 46.652344 66.628906 40.460938 68.746094 40 68.902344 C 39.539063 68.746094 33.347656 66.628906 26.75 59.09375 C 20.007813 51.386719 13.234375 38.148438 13.035156 15.953125 C 27.917969 15.710938 38.851563 10.648438 40 10.09375 Z M 38.125 15.253906 L 37.777344 15.316406 L 37.683594 15.355469 L 37.074219 16.011719 L 37.238281 16.890625 L 38.042969 17.292969 L 38.390625 17.226563 L 38.484375 17.191406 L 39.089844 16.53125 L 38.925781 15.652344 Z M 42.203125 15.328125 L 41.3125 15.433594 L 40.863281 16.210938 L 41.21875 17.03125 L 41.523438 17.207031 L 41.617188 17.242188 L 42.507813 17.136719 L 42.953125 16.359375 L 42.601563 15.535156 L 42.296875 15.359375 Z M 34.3125 16.578125 L 33.964844 16.621094 L 33.871094 16.648438 L 33.21875 17.265625 L 33.324219 18.15625 L 34.097656 18.605469 L 34.449219 18.5625 L 34.546875 18.535156 L 35.195313 17.917969 L 35.089844 17.027344 Z M 46.023438 16.621094 L 45.140625 16.78125 L 44.742188 17.582031 L 45.144531 18.382813 L 45.457031 18.539063 L 45.554688 18.566406 L 46.4375 18.40625 L 46.839844 17.609375 L 46.4375 16.808594 L 46.121094 16.648438 Z M 30.4375 17.691406 L 30.082031 17.707031 L 29.984375 17.734375 L 29.296875 18.308594 L 29.34375 19.203125 L 30.09375 19.699219 L 30.441406 19.679688 L 30.542969 19.65625 L 31.230469 19.082031 L 31.179688 18.1875 Z M 49.9375 17.707031 L 49.0625 17.894531 L 48.6875 18.710938 L 49.117188 19.496094 L 49.4375 19.640625 L 49.535156 19.667969 L 50.410156 19.480469 L 50.78125 18.664063 L 50.355469 17.878906 L 50.03125 17.734375 Z M 26.46875 18.578125 L 26.121094 18.585938 L 26.019531 18.605469 L 25.3125 19.15625 L 25.328125 20.050781 L 26.058594 20.574219 L 26.410156 20.566406 L 26.511719 20.546875 L 27.21875 20 L 27.199219 19.101563 Z M 53.859375 18.589844 L 53 18.84375 L 52.6875 19.683594 L 53.171875 20.4375 L 53.503906 20.558594 L 53.605469 20.578125 L 54.464844 20.324219 L 54.773438 19.484375 L 54.285156 18.730469 L 53.957031 18.609375 Z M 57.855469 19.253906 L 57.007813 19.546875 L 56.734375 20.398438 L 57.25 21.128906 L 57.585938 21.234375 L 57.6875 21.25 L 58.53125 20.960938 L 58.808594 20.109375 L 58.289063 19.375 L 57.953125 19.269531 Z M 22.121094 19.273438 L 22.019531 19.289063 L 21.296875 19.8125 L 21.277344 20.707031 L 21.984375 21.257813 L 22.339844 21.265625 L 22.4375 21.25 L 23.164063 20.722656 L 23.179688 19.828125 L 22.472656 19.28125 Z M 18.21875 19.730469 C 18.195313 19.726563 18.171875 19.730469 18.152344 19.730469 C 18.09375 19.734375 18.078125 19.734375 18.101563 19.734375 L 17.160156 19.792969 L 17.160156 20.777344 C 17.152344 21.191406 17.402344 21.566406 17.789063 21.71875 C 18.171875 21.871094 18.613281 21.773438 18.894531 21.46875 C 19.199219 21.191406 19.304688 20.753906 19.15625 20.367188 C 19.003906 19.980469 18.632813 19.726563 18.21875 19.730469 Z M 61.75 19.730469 C 61.335938 19.738281 60.96875 20.007813 60.832031 20.398438 C 60.695313 20.792969 60.816406 21.226563 61.136719 21.496094 C 61.136719 21.496094 61.136719 21.496094 61.140625 21.5 C 61.425781 21.785156 61.859375 21.867188 62.234375 21.707031 C 62.605469 21.546875 62.847656 21.179688 62.84375 20.773438 L 62.84375 19.792969 L 61.902344 19.734375 C 61.925781 19.734375 61.90625 19.734375 61.847656 19.730469 C 61.816406 19.726563 61.785156 19.726563 61.75 19.730469 Z M 61.503906 23.871094 L 60.800781 24.425781 L 60.710938 24.769531 L 60.703125 24.871094 L 61.035156 25.703125 L 61.902344 25.933594 L 62.605469 25.375 L 62.695313 25.035156 L 62.703125 24.933594 L 62.371094 24.101563 Z M 17.953125 23.953125 L 17.328125 24.59375 L 17.28125 24.9375 L 17.28125 25.011719 L 17.285156 25.074219 L 17.746094 25.84375 L 18.636719 25.9375 L 19.246094 25.277344 L 19.28125 24.925781 L 19.28125 24.894531 L 19.277344 24.863281 L 19.277344 24.855469 L 18.84375 24.074219 Z M 61.144531 28.019531 L 60.40625 28.527344 L 60.292969 28.859375 L 60.277344 28.960938 L 60.558594 29.8125 L 61.40625 30.101563 L 62.140625 29.59375 L 62.253906 29.261719 L 62.269531 29.15625 L 61.996094 28.308594 Z M 18.242188 28.171875 L 17.675781 28.867188 L 17.660156 29.21875 L 17.671875 29.320313 L 18.175781 30.0625 L 19.074219 30.097656 L 19.640625 29.40625 L 19.65625 29.054688 L 19.640625 28.953125 L 19.136719 28.210938 Z M 60.484375 32.125 L 59.714844 32.585938 L 59.578125 32.910156 L 59.558594 33.011719 L 59.777344 33.878906 L 60.605469 34.222656 L 61.375 33.765625 L 61.511719 33.4375 L 61.53125 33.339844 L 61.3125 32.46875 Z M 19.734375 32.335938 L 18.839844 32.355469 L 18.316406 33.078125 L 18.324219 33.433594 L 18.34375 33.53125 L 18.890625 34.242188 L 19.789063 34.222656 L 20.3125 33.496094 L 20.304688 33.144531 L 20.285156 33.042969 Z M 59.515625 36.171875 L 58.714844 36.578125 L 58.558594 36.894531 L 58.53125 36.996094 L 58.691406 37.875 L 59.496094 38.273438 L 60.296875 37.867188 L 60.453125 37.550781 L 60.480469 37.453125 L 60.316406 36.574219 Z M 20.625 36.40625 L 19.734375 36.480469 L 19.257813 37.238281 L 19.285156 37.589844 L 19.3125 37.6875 L 19.90625 38.359375 L 20.800781 38.285156 L 21.277344 37.527344 L 21.246094 37.175781 L 21.21875 37.078125 Z M 58.253906 40.132813 L 57.421875 40.457031 L 57.234375 40.757813 L 57.199219 40.851563 L 57.269531 41.746094 L 58.03125 42.21875 L 58.867188 41.890625 L 59.054688 41.59375 L 59.09375 41.5 L 59.015625 40.605469 Z M 21.808594 40.378906 L 20.925781 40.539063 L 20.527344 41.34375 L 20.589844 41.6875 L 20.625 41.785156 L 21.28125 42.394531 L 22.164063 42.234375 L 22.5625 41.433594 L 22.5 41.089844 L 22.464844 40.988281 Z M 56.625 43.96875 L 55.777344 44.25 L 55.574219 44.542969 L 55.53125 44.636719 L 55.566406 45.53125 L 56.300781 46.039063 L 57.152344 45.753906 L 57.351563 45.464844 L 57.394531 45.371094 L 57.359375 44.472656 Z M 23.359375 44.234375 L 22.496094 44.464844 L 22.160156 45.296875 L 22.25 45.636719 L 22.296875 45.730469 L 23 46.285156 L 23.863281 46.054688 L 24.199219 45.222656 L 24.109375 44.882813 L 24.0625 44.792969 Z M 54.738281 47.65625 L 53.859375 47.839844 L 53.625 48.101563 L 53.574219 48.1875 L 53.5 49.082031 L 54.167969 49.675781 L 55.046875 49.496094 L 55.28125 49.230469 L 55.332031 49.144531 L 55.40625 48.25 Z M 25.1875 47.941406 L 24.355469 48.28125 L 24.125 49.144531 L 24.261719 49.472656 L 24.3125 49.558594 L 25.082031 50.019531 L 25.910156 49.6875 L 26.140625 48.816406 L 26.003906 48.492188 L 25.953125 48.40625 Z M 52.5 51.167969 L 51.613281 51.296875 L 51.367188 51.546875 L 51.308594 51.632813 L 51.183594 52.519531 L 51.816406 53.152344 L 52.703125 53.019531 L 52.953125 52.769531 L 53.011719 52.6875 L 53.136719 51.800781 Z M 27.453125 51.4375 L 26.644531 51.824219 L 26.46875 52.703125 L 26.621094 53.019531 L 26.683594 53.105469 L 27.472656 53.519531 L 28.28125 53.136719 L 28.457031 52.253906 L 28.304688 51.9375 L 28.246094 51.855469 Z M 50 54.480469 L 49.105469 54.515625 L 48.832031 54.734375 L 48.765625 54.8125 L 48.546875 55.679688 L 49.109375 56.375 L 50.003906 56.34375 L 50.277344 56.121094 L 50.34375 56.042969 L 50.5625 55.171875 Z M 29.996094 54.695313 L 29.238281 55.171875 L 29.167969 56.066406 L 29.355469 56.363281 L 29.421875 56.441406 L 30.261719 56.761719 L 31.015625 56.285156 L 31.089844 55.390625 L 30.902344 55.09375 L 30.832031 55.015625 Z M 46.316406 57.5 L 46.019531 57.691406 L 45.949219 57.761719 L 45.640625 58.605469 L 46.132813 59.351563 L 47.027344 59.40625 L 47.324219 59.214844 L 47.394531 59.144531 L 47.703125 58.300781 L 47.210938 57.550781 Z M 32.875 57.671875 L 32.171875 58.222656 L 32.199219 59.121094 L 32.414063 59.394531 L 32.492188 59.464844 L 33.359375 59.695313 L 34.0625 59.140625 L 34.039063 58.246094 L 33.820313 57.96875 L 33.746094 57.902344 Z M 43.242188 60.191406 L 42.929688 60.355469 L 42.847656 60.417969 L 42.464844 61.226563 L 42.878906 62.019531 L 43.765625 62.160156 L 44.078125 62 L 44.15625 61.9375 L 44.542969 61.125 L 44.125 60.332031 Z M 36.074219 60.308594 L 35.425781 60.925781 L 35.535156 61.816406 L 35.777344 62.074219 L 35.859375 62.132813 L 36.746094 62.28125 L 37.390625 61.660156 L 37.285156 60.773438 L 37.042969 60.515625 L 36.957031 60.457031 Z M 39.921875 62.445313 C 39.457031 62.453125 39.0625 62.78125 38.964844 63.230469 C 38.867188 63.683594 39.089844 64.144531 39.503906 64.34375 C 39.503906 64.34375 39.515625 64.351563 39.546875 64.367188 L 39.996094 64.589844 L 40.484375 64.34375 C 40.90625 64.140625 41.128906 63.667969 41.015625 63.210938 C 40.90625 62.753906 40.488281 62.433594 40.019531 62.449219 C 40.015625 62.445313 40.015625 62.445313 40.011719 62.449219 C 39.980469 62.445313 39.949219 62.445313 39.921875 62.445313 Z" /></g></svg>,
];

function OversiktTab({ product }: { product: Product }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
      {/* Fordeler */}
      <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", overflow: "hidden" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.text, px: 2.5, pt: 2.5, pb: 2 }}>Fordeler med {product.name}</Typography>
        {product.fordeler.map((f, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, alignItems: "center", px: 2.5, py: 2, borderTop: `1px solid ${D.border}` }}>
            <Box sx={{ width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {FORDEL_ICONS[i] ? FORDEL_ICONS[i](D.purple) : null}
            </Box>
            <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.6 }}>{f}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Bruksområder */}
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Bruksområder</Typography>
          {product.bruksomraader.map((b, i) => (
            <Typography key={i} sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.6, mb: 0.5 }}>{b}</Typography>
          ))}
        </Box>

        {/* FODMAP */}
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1.5 }}>FODMAP pr. 100 ml</Typography>
          {[
            { label: "Laktose", value: product.fodmap.laktose },
            { label: "GOS*",    value: product.fodmap.gos ? "Ja" : "Nei" },
            { label: "FOS**",   value: product.fodmap.fos ? "Ja" : "Nei" },
          ].map((row, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: i < 2 ? `1px solid ${D.border}` : "none" }}>
              <Typography sx={{ fontSize: 12.5, color: D.textSub }}>{row.label}</Typography>
              <Typography sx={{ fontSize: 12.5, color: D.text, fontWeight: 600 }}>{row.value}</Typography>
            </Box>
          ))}
          <Typography sx={{ fontSize: 10.5, color: D.textMuted, mt: 1 }}>*Galaktooligosakkarider &nbsp;&nbsp; **Fruktooligosakkarider</Typography>
        </Box>

        {/* Viktig å vite */}
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Viktig å vite</Typography>
          {product.viktigAVite.map((v, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 0.75 }}>
              <CheckIcon color={D.purple} size={14} />
              <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.5 }}>{v}</Typography>
            </Box>
          ))}
        </Box>

        {/* Hurtiginfo */}
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1.5 }}>Hurtiginfo</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {product.hurtiginfo.map((h, i) => (
              <Chip key={i} label={h.label} size="small" sx={{ height: 24, fontSize: 11, fontWeight: 600, bgcolor: D.blueLight, color: D.purple, border: `1px solid ${D.blueMid}`, borderRadius: "6px", "& .MuiChip-label": { px: 1 } }} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function DonutChart({ segments, size = 160, strokeWidth = 26 }: { segments: { value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const arc = (seg.value / total) * C;
        const offset = -cumulative;
        cumulative += arc;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={strokeWidth} strokeDasharray={`${arc} ${C}`} strokeDashoffset={offset} strokeLinecap="butt" />;
      })}
    </svg>
  );
}

function NæringsinnholdTab({ product }: { product: Product }) {
  const [showFull, setShowFull] = useState(false);
  const macros = [
    { label: "Fett (46 E%)",        value: 46, color: "#7C3AED", amount: "3,4 g" },
    { label: "Karbohydrat (43 E%)", value: 43, color: "#F97316", amount: "7,1 g" },
    { label: "Protein (10 E%)",     value: 10, color: "#3B82F6", amount: "1,6 g" },
    { label: "Kostfiber (1 E%)",    value: 1,  color: "#22C55E", amount: "0,5 g" },
  ];
  const nokkel = [
    { label: "Laktose",    value: "2,88 g"  },
    { label: "DHA",        value: "16,5 mg" },
    { label: "ARA",        value: "16,5 mg" },
    { label: "Kalsium",    value: "61 mg"   },
    { label: "Jern",       value: "0,54 mg" },
    { label: "Vitamin D",  value: "1,7 µg"  },
    { label: "Natrium",    value: "20,8 mg" },
  ];
  return (
    <Box sx={{ p: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 20, color: D.text, mb: 0.5 }}>Næringsinnhold</Typography>
      <Typography sx={{ fontSize: 13, color: D.textSub, mb: 3 }}>Gjelder pr. 100 ml ferdig utblandet (13,6 g pulver)</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5, mb: 2.5 }}>
        {/* Makronæringsstoffer */}
        <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: D.purple, mb: 2 }}>Makronæringsstoffer</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <DonutChart segments={macros} />
              <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: D.text, lineHeight: 1 }}>66</Typography>
                <Typography sx={{ fontSize: 11, color: D.textSub, fontWeight: 600 }}>kcal</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              {macros.map((m, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: m.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12.5, color: D.textSub }}>{m.label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: D.text }}>{m.amount}</Typography>
                </Box>
              ))}
              <Box
                component="button"
                onClick={() => setShowFull(v => !v)}
                sx={{ mt: 1.5, px: 2, py: 0.75, border: `1px solid ${D.border}`, borderRadius: "8px", bgcolor: D.surfaceAlt, cursor: "pointer", fontSize: 12, fontWeight: 600, color: D.purple, "&:hover": { bgcolor: "rgba(74,44,130,0.08)" } }}
              >
                {showFull ? "Skjul næringstabell" : "Se fullstendig næringstabell"}
              </Box>
            </Box>
          </Box>
        </Box>
        {/* Nøkkelnæringsstoffer */}
        <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: D.purple, mb: 2 }}>Nøkkelnæringsstoffer</Typography>
          {nokkel.map((n, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.9, borderBottom: i < nokkel.length - 1 ? `1px solid ${D.border}` : "none" }}>
              <Typography sx={{ fontSize: 13, color: D.textSub }}>{n.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: D.text }}>{n.value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Full table */}
      {showFull && (
        <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "12px", overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px 110px 140px", bgcolor: D.surfaceAlt, px: 2, py: 1.25, borderBottom: `1px solid ${D.border}` }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.text }}>Næringsstoff</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: D.textSub, textAlign: "right" }}>Enhet</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: D.textSub, textAlign: "right" }}>pr. 100 g pulver</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: D.textSub, textAlign: "right", pr: 1 }}>pr. 100 ml utblandet</Typography>
          </Box>
          {product.nutrition.sections.map((section, si) => (
            <Box key={si}>
              {section.title && (
                <Box sx={{ px: 2, py: 0.75, bgcolor: D.surfaceAlt, borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.textSub }}>{section.title}</Typography>
                </Box>
              )}
              <NutritionTable rows={section.rows} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

const MIXING_TABLE = [
  { skjeer: 1, pulver: "4,5",  vann: 30,  ferdig: 33,  energi: 22  },
  { skjeer: 2, pulver: "9,0",  vann: 60,  ferdig: 66,  energi: 44  },
  { skjeer: 3, pulver: "13,5", vann: 90,  ferdig: 100, energi: 66  },
  { skjeer: 4, pulver: "18,0", vann: 120, ferdig: 132, energi: 87  },
  { skjeer: 5, pulver: "22,5", vann: 150, ferdig: 165, energi: 109 },
];

function TilberedningTab({ product }: { product: Product }) {
  return (
    <Box sx={{ p: 3, display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 3, alignItems: "start" }}>
      {/* Left: steps */}
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 17, color: D.text, mb: 2.5 }}>Slik tilbereder du</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          {product.tilberedning.map((step, i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${D.purple}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.2 }}>
                <Typography sx={{ fontSize: 12, color: D.purple, fontWeight: 700 }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.65, pt: 0.4 }}>{step}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 2, bgcolor: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: "10px", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${D.purple}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Typography sx={{ fontSize: 16, lineHeight: 1 }}>ℹ</Typography>
          </Box>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, fontWeight: 500 }}>Tilbered alltid bare ett måltid om gangen.</Typography>
        </Box>
      </Box>

      {/* Right: mixing table + dosering */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Utblandingstabell */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 17, color: D.text, mb: 0.5 }}>Utblandingstabell</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, mb: 0.3 }}>Anbefalt konsentrasjon: 13,6 % vekt/volum</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, mb: 1.5 }}>1 måleskje = 4,5 g pulver</Typography>
          <Box sx={{ border: `1px solid ${D.border}`, borderRadius: "10px", overflow: "hidden" }}>
            {/* Header */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", bgcolor: D.surfaceAlt, borderBottom: `1px solid ${D.border}` }}>
              {["Måleskjeer", "Pulver (g)", "Vann (ml)", "Ferdig mengde (ml)", "Energi (kcal)"].map((h) => (
                <Typography key={h} sx={{ fontSize: 11.5, fontWeight: 700, color: D.text, px: 1.5, py: 1 }}>{h}</Typography>
              ))}
            </Box>
            {MIXING_TABLE.map((row, i) => (
              <Box key={i} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", borderTop: i > 0 ? `1px solid ${D.border}` : "none", bgcolor: i % 2 === 0 ? D.surface : D.surfaceAlt }}>
                {[row.skjeer, row.pulver, row.vann, row.ferdig, row.energi].map((val, j) => (
                  <Typography key={j} sx={{ fontSize: 13, color: D.text, px: 1.5, py: 1.1 }}>{val}</Typography>
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Dosering */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 17, color: D.text, mb: 0.5 }}>Dosering</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, mb: 1.5, lineHeight: 1.6 }}>Doseringen er individuell og skal alltid gjøres i samråd med lege eller klinisk ernæringsfysiolog.</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {[
              { icon: "🍼", text: "Kan drikkes fra flaske eller kopp" },
              { icon: "🥄", text: "Kan brukes som erstatning for melk ved matlaging og baking" },
            ].map((item, i) => (
              <Box key={i} sx={{ p: 2, bgcolor: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: "10px", display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <Typography sx={{ fontSize: 20 }}>{item.icon}</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.5 }}>{item.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function IngrediensTab({ product }: { product: Product }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Smaksvarianter</Typography>
        <Typography sx={{ fontSize: 13, color: D.textSub }}>{product.smaksvarianter}</Typography>
      </Box>
      <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1.5 }}>Ingredienser</Typography>
        <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.75 }}>{product.ingredienser}</Typography>
      </Box>
    </Box>
  );
}

function BestillingTab({ product }: { product: Product }) {
  return (
    <Box>
      <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", bgcolor: "rgba(88,166,255,0.08)", px: 1.5, py: 1, borderBottom: `1px solid ${D.border}` }}>
          {["Produktnavn", "Bestillingsnr.", "Varenr.", "Salgsenhet"].map((h) => (
            <Typography key={h} sx={{ fontSize: 12, fontWeight: 700, color: D.blue }}>{h}</Typography>
          ))}
        </Box>
        {product.bestilling.map((row, i) => (
          <Box key={i} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", px: 1.5, py: 1.5, borderTop: i > 0 ? `1px solid ${D.border}` : "none" }}>
            {[row.produktnavn, row.bestillingsnr, row.varenr, row.salgsenhet].map((val, j) => (
              <Typography key={j} sx={{ fontSize: 13, color: D.text }}>{val}</Typography>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 2.5, p: 2, bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm }}>
        <Typography sx={{ fontSize: 12, color: D.textSub, fontStyle: "italic" }}>
          Nutricias produkter er registrerte næringsmidler til spesielle medisinske formål og skal brukes i samråd med helsepersonell. Ved eneste kilde til ernæring må mikronæringsstoffstatus overvåkes.
        </Typography>
        <Typography sx={{ fontSize: 12, color: D.textSub, mt: 1 }}>
          Nutricia, % Danone AS &nbsp;|&nbsp; Tlf. +47 23 00 21 00 &nbsp;|&nbsp; E-post nutricia.amnno@danone.com
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function BottleIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 2h6v2.5l1.5 2V20a2 2 0 01-2 2H9.5a2 2 0 01-2-2V6.5L9 4.5V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      <path d="M8 9h8" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9 2h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon({ size = 14, color = "#22C55E" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="7" fill={color + "20"} stroke={color} strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MelkeerstatningTab() {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string>(PRODUCTS[0].id);
  const [activeTab, setActiveTab] = useState(0);

  const product = PRODUCTS.find(p => p.id === selectedId) ?? PRODUCTS[0];

  const TABS = ["Oversikt", "Næringsinnhold", "Tilberedning & dosering", "Ingredienser", "Bestillingsinfo"];

  return (
    <Box sx={{ display: "flex", height: "100%", bgcolor: D.surface, overflow: "hidden" }}>
      {/* ── Left: product list ── */}
      <Box sx={{
        width: 280, flexShrink: 0, borderRight: `1px solid ${D.border}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
        bgcolor: D.surface,
      }}>
        <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {PRODUCTS.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              selected={p.id === selectedId}
              onClick={() => { setSelectedId(p.id); setActiveTab(0); }}
            />
          ))}
        </Box>
      </Box>

      {/* ── Right: product detail ── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0, bgcolor: D.surface }}>
        {/* Product header */}
        <Box sx={{ p: 3, borderBottom: `1px solid ${D.border}`, bgcolor: D.surface }}>
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", mb: 2.5 }}>
            {/* Product image */}
            <Box sx={{
              width: 170, height: 160, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {product.image
                ? <Box component="img" src={product.image} alt={product.name} sx={{ width: 170, height: 160, objectFit: "contain" }} />
                : <BottleIcon size={64} color={D.purple} />}
            </Box>

            {/* Title & description */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 26, color: D.text, lineHeight: 1.2 }}>{product.name}</Typography>
              <Typography sx={{ fontSize: 14, color: D.purple, fontWeight: 600, mt: 0.5 }}>{product.age}</Typography>
              <Typography sx={{ fontSize: 13.5, color: D.textSub, mt: 1, lineHeight: 1.6, maxWidth: 480 }}>
                {product.tagline} {product.description}
              </Typography>
              {/* Badges */}
              <Box sx={{ display: "inline-flex", alignItems: "stretch", mt: 1.5, border: `1px solid ${D.border}`, borderRadius: "10px", overflow: "hidden", bgcolor: D.surface }}>
                {product.badges.map((b, i) => {
                  const Icon = b.icon === "drop" ? DropIcon : b.icon === "shield" ? ShieldCheckIcon : b.icon === "gut" ? GutIcon : StarShieldIcon;
                  return (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.9, borderLeft: i > 0 ? `1px solid ${D.border}` : "none" }}>
                      <Icon color={b.color} />
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: D.textSub, whiteSpace: "nowrap", lineHeight: 1.3 }}>{b.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Summary row */}
          <Box sx={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
            bgcolor: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: "8px", overflow: "hidden",
          }}>
            {product.summary.map((s, i) => (
              <Box key={i} sx={{
                px: 2, py: 1.5,
                borderRight: i < product.summary.length - 1 ? `1px solid ${D.border}` : "none",
              }}>
                <Typography sx={{ fontSize: 11, color: D.purple, fontWeight: 600, mb: 0.5 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 13, color: D.text, fontWeight: 700, lineHeight: 1.3 }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: `1px solid ${D.border}`, bgcolor: D.surface }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 42, px: 2,
              "& .MuiTabs-indicator": { bgcolor: D.purple, height: 2.5, borderRadius: "2px" },
              "& .MuiTab-root": { minHeight: 42, fontSize: 13, fontWeight: 600, color: D.textSub, textTransform: "none", px: 2, py: 0.5, "&.Mui-selected": { color: D.purple } },
            }}
          >
            {TABS.map((label, i) => <Tab key={i} label={label} />)}
          </Tabs>
        </Box>

        {/* Tab content */}
        <Box sx={{ p: 3, flex: 1 }}>
          {activeTab === 0 && <OversiktTab product={product} />}
          {activeTab === 1 && <NæringsinnholdTab product={product} />}
          {activeTab === 2 && <TilberedningTab product={product} />}
          {activeTab === 3 && <IngrediensTab product={product} />}
          {activeTab === 4 && <BestillingTab product={product} />}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${D.border}`, bgcolor: D.surface }}>
          <Typography sx={{ fontSize: 11, color: D.textMuted, textAlign: "center" }}>
            Nutricias produkter er registrerte næringsmidler til spesielle medisinske formål og skal brukes i samråd med helsepersonell.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
