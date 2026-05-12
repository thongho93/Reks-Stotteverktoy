import { useState } from "react";
import { Box, Typography, Tabs, Tab, Chip, Divider, useTheme } from "@mui/material";

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:         "#EDE7F6",
  surface:    "#FFFFFF",
  surfaceAlt: "#F5F0FC",
  border:     "rgba(74,44,130,0.13)",
  borderMed:  "rgba(74,44,130,0.25)",
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
  badges: { label: string; color: string }[];
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
    { label: "Hydrolysert",               color: "#3B82F6" },
    { label: "Ernæringsmessig komplett 0–1 år", color: "#059669" },
    { label: "Med GOS/FOS",               color: "#7C3AED" },
    { label: "Med DHA & ARA",             color: "#0891B2" },
    { label: "Med nukleotider",           color: "#D97706" },
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
        border: `1.5px solid ${selected ? D.purple : D.border}`,
        bgcolor: D.surface,
        boxShadow: selected ? `0 0 0 3px rgba(74,44,130,0.1), ${D.shadow}` : D.shadow,
        transition: "all 0.15s",
        "&:hover": { borderColor: D.purple, boxShadow: `0 0 0 3px rgba(74,44,130,0.08), ${D.shadow}` },
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

function OversiktTab({ product }: { product: Product }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
      {/* Fordeler */}
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: D.text, mb: 1.5 }}>Fordeler med {product.name}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {product.fordeler.map((f, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: D.blueLight, border: `1px solid ${D.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.1 }}>
                <Typography sx={{ fontSize: 12, color: D.purple, fontWeight: 700 }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.55, flex: 1 }}>{f}</Typography>
            </Box>
          ))}
        </Box>
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

function NæringsinnholdTab({ product }: { product: Product }) {
  return (
    <Box>
      <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px 110px 140px", bgcolor: "rgba(88,166,255,0.08)", px: 1.5, py: 1, borderBottom: `1px solid ${D.border}` }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.blue }}>Næringsinnhold pr. 100 g pulver og pr. 100 ml ferdig utblandet</Typography>
          <Box />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: D.textSub, textAlign: "right" }}>pr. 100 g pulver</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: D.textSub, textAlign: "right", pr: 1.5 }}>pr. 100 ml utblandet (13,6 g pulver)</Typography>
        </Box>
        {product.nutrition.sections.map((section, si) => (
          <Box key={si}>
            {section.title && (
              <Box sx={{ px: 1.5, py: 0.75, bgcolor: "rgba(255,255,255,0.03)", borderTop: si > 0 ? `1px solid ${D.border}` : "none", borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.textSub }}>{section.title}</Typography>
              </Box>
            )}
            <NutritionTable rows={section.rows} />
          </Box>
        ))}
        {/* Per 100ml note */}
        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${D.border}`, bgcolor: "rgba(255,255,255,0.01)" }}>
          <Typography sx={{ fontSize: 11.5, color: D.textSub, fontWeight: 600, mb: 0.5 }}>Inneholder per 100 ml:</Typography>
          {["66 kcal", "3,4 g fett fra palmeolje, kokosolje, rapsolje, solsikkeolje, fiskeolje og olje fra Mortierella alpina (47 %)", "7,1 g karbohydrater fra maltodekstrin og laktose (42 %)", "1,6 g protein fra hydrolysert myseproteinkonsentrat (9 %)", "0,5 g fiber fra prebiotiske kostfibre (2 %)"].map((line, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 0.3 }}>
              <Typography sx={{ fontSize: 11, color: D.textMuted }}>•</Typography>
              <Typography sx={{ fontSize: 11, color: D.textSub }}>{line}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function TilberedningTab({ product }: { product: Product }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1.5 }}>Bruk</Typography>
          {product.tilberedning.map((step, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5, mb: 1, alignItems: "flex-start" }}>
              <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: D.blueLight, border: `1px solid ${D.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.1 }}>
                <Typography sx={{ fontSize: 10, color: D.purple, fontWeight: 700 }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.6 }}>{step}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Dosering</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.65 }}>{product.dosering}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Holdbarhet og oppbevaring</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.65 }}>{product.holdbarhet}</Typography>
        </Box>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Indikasjon</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.65 }}>{product.indikasjon}</Typography>
        </Box>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Kontraindikasjoner</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.65 }}>{product.kontraindikasjon}</Typography>
        </Box>
        <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Forsiktighetsregler</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.65 }}>{product.forsiktighetsregler}</Typography>
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
    <Box sx={{ display: "flex", height: "100%", bgcolor: D.bg, overflow: "hidden" }}>
      {/* ── Left: product list ── */}
      <Box sx={{
        width: 280, flexShrink: 0, borderRight: `1px solid ${D.border}`,
        display: "flex", flexDirection: "column", overflowY: "auto",
        bgcolor: D.surfaceAlt,
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
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0, bgcolor: D.bg }}>
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
                {product.tagline} <span style={{ color: D.textMuted }}>{product.description}</span>
              </Typography>
              {/* Badges */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
                {product.badges.map((b, i) => (
                  <Chip key={i} label={b.label} size="small" sx={{
                    height: 22, fontSize: 11, fontWeight: 600, borderRadius: "5px",
                    bgcolor: b.color + "15", color: b.color,
                    border: `1px solid ${b.color}30`,
                    "& .MuiChip-label": { px: 1 },
                  }} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Summary row */}
          <Box sx={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
            bgcolor: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, overflow: "hidden",
          }}>
            {product.summary.map((s, i) => (
              <Box key={i} sx={{
                px: 1.5, py: 1.25,
                borderRight: i < product.summary.length - 1 ? `1px solid ${D.border}` : "none",
              }}>
                <Typography sx={{ fontSize: 10.5, color: D.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.4 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 12, color: D.text, fontWeight: 700, lineHeight: 1.3 }}>{s.value}</Typography>
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
