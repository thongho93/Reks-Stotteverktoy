import { useState } from "react";
import { Box, Typography, Tabs, Tab, Chip } from "@mui/material";

// ─── Badge icons ──────────────────────────────────────────────────────────────
const DropIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 4 10 4 15a8 8 0 0 0 16 0C20 10 12 2 12 2z" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.6"/>
    <path d="M9 16a3 3 0 0 0 2.5 1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const ShieldCheckIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42ZM24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M34.6709 16.2585C35.0805 16.629 35.1121 17.2614 34.7415 17.6709L21.3858 32.4325L13.3095 24.7234C12.91 24.342 12.8953 23.709 13.2766 23.3095C13.658 22.91 14.291 22.8953 14.6905 23.2767L21.2809 29.5675L33.2585 16.3291C33.629 15.9196 34.2614 15.8879 34.6709 16.2585Z" fill={color}/>
  </svg>
);
const GutIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M24 4C24.5523 4 25 4.44772 25 5V8.45455C25 8.79457 24.942 9.13383 24.8268 9.45399C24.7117 9.77416 24.54 10.0734 24.3158 10.3316C24.0913 10.59 23.8172 10.8038 23.5047 10.9529C23.1915 11.1023 22.8497 11.1818 22.5002 11.1818H20.2589L20.2389 11.1816C19.0077 11.157 17.7858 11.656 16.8135 12.6284C15.8397 13.6023 15.1911 14.9802 15.0243 16.5086C14.9542 17.3448 15.0364 18.1876 15.2642 18.9816C15.493 19.7789 15.8618 20.5037 16.3404 21.1118C16.8187 21.7196 17.394 22.195 18.0235 22.5164C18.2493 22.6316 18.7551 22.7627 19.4071 22.8613C20.0262 22.9549 20.6417 23 21.0004 23C21.5527 23.0001 22.0004 23.4478 22.0003 24.0001C22.0003 24.5524 21.5525 25.0001 21.0002 25C20.5214 25 19.804 24.944 19.1082 24.8388C18.4452 24.7386 17.654 24.5733 17.1141 24.2976C16.2123 23.8372 15.4153 23.1703 14.7687 22.3487C14.1223 21.5274 13.6385 20.5674 13.3417 19.5331C13.045 18.4988 12.9402 17.4074 13.0325 16.3274L13.0346 16.3056C13.2443 14.3561 14.0749 12.5388 15.3992 11.2143C16.7248 9.88855 18.457 9.14858 20.2684 9.18182H22.5002C22.5445 9.18182 22.5928 9.17199 22.6436 9.14777C22.695 9.12325 22.7515 9.0826 22.8056 9.02026C22.86 8.95768 22.9093 8.87605 22.9448 8.7771C22.9804 8.67813 23 8.56818 23 8.45455V5C23 4.44772 23.4477 4 24 4Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14.1141 23.7024C15.0167 23.2416 16.0003 23.0001 17.0002 23C17.5525 22.9999 18.0003 23.4476 18.0003 23.9999C18.0004 24.5522 17.5527 24.9999 17.0004 25C16.3252 25.0001 15.6523 25.1626 15.0235 25.4836C14.394 25.805 13.8187 26.2804 13.3404 26.8882C12.8618 27.4963 12.493 28.2211 12.2642 29.0184C12.0364 29.8124 11.9542 30.6552 12.0243 31.4914C12.1911 33.0198 12.8397 34.3977 13.8135 35.3716C14.2229 35.7811 14.9525 36.1621 15.8381 36.4358C16.708 36.7047 17.6014 36.8311 18.2389 36.8184L18.2589 36.8182H22.5002C22.8497 36.8182 23.1915 36.8977 23.5047 37.0471C23.8172 37.1962 24.0913 37.41 24.3158 37.6684C24.54 37.9266 24.7117 38.2258 24.8268 38.546C24.942 38.8662 25 39.2054 25 39.5455V43C25 43.5523 24.5523 44 24 44C23.4477 44 23 43.5523 23 43V39.5455C23 39.4318 22.9804 39.3219 22.9448 39.2229C22.9093 39.124 22.86 39.0423 22.8056 38.9797C22.7515 38.9174 22.695 38.8767 22.6436 38.8522C22.5928 38.828 22.5445 38.8182 22.5002 38.8182H18.2684C17.3844 38.8344 16.2814 38.6662 15.2474 38.3466C14.2251 38.0306 13.14 37.5266 12.3992 36.7857C11.0749 35.4612 10.2443 33.6439 10.0346 31.6944L10.0325 31.6726C9.9402 30.5926 10.045 29.5012 10.3417 28.4669C10.6385 27.4326 11.1223 26.4726 11.7687 25.6513C12.4153 24.8297 13.2123 24.1628 14.1141 23.7024Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M31.003 4C31.5553 4 32.003 4.44772 32.003 5V10.1816C32.0032 11.2022 31.8288 12.2156 31.4874 13.1646C31.146 14.1136 30.6426 14.9842 30.0001 15.7236C29.8265 15.9234 29.6267 16.1314 29.4094 16.3366C31.0698 16.4329 32.8619 16.7241 34.3796 17.5088C35.4115 18.0423 36.3328 18.8116 36.9897 19.9065C37.6456 20.9998 38.0001 22.3544 38.0001 24C38.0001 25.6409 37.6565 26.992 37.018 28.0838C36.3779 29.1785 35.4774 29.9506 34.4633 30.4869C32.9265 31.2998 31.1003 31.5847 29.419 31.6719C29.6227 31.8662 29.8159 32.0693 29.9975 32.2784C31.2915 33.7689 31.999 35.7633 31.9986 37.8182V43C31.9986 43.5523 31.5509 44 30.9986 44C30.4463 44 29.9986 43.5523 29.9986 43V37.8182C29.9989 36.2098 29.443 34.6904 28.4873 33.5896C27.4766 32.4255 26.2032 31.7066 24.9995 31.7059C24.4474 31.7056 24 31.2578 24.0001 30.7056C24.0003 30.1534 24.4479 29.7059 25.0001 29.7059H27.9972C29.9752 29.7059 32.0095 29.5222 33.5282 28.719C34.2659 28.3288 34.8675 27.7994 35.2916 27.0742C35.7173 26.3462 36.0001 25.3591 36.0001 24C36.0001 22.6456 35.7106 21.662 35.2747 20.9354C34.8397 20.2105 34.2212 19.6783 33.4611 19.2854C31.8984 18.4774 29.8138 18.2941 27.8153 18.2941H24.8182C24.266 18.294 23.8182 17.8462 23.8182 17.294C23.8183 16.7417 24.266 16.2941 24.8182 16.2941H24.8209C25.4559 16.2939 26.089 16.1502 26.6855 15.8659C27.2539 15.595 27.9926 14.9848 28.4904 14.4119C28.9628 13.8681 29.3437 13.2152 29.6055 12.4876C29.8673 11.7599 30.0032 10.9761 30.003 10.182V5C30.003 4.44772 30.4507 4 31.003 4Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M16 24C16 23.4477 16.4479 23 17.0002 23H30C30.5523 23 31 23.4477 31 24C31 24.5523 30.5523 25 30 25H17.0004C16.4481 25 16 24.5523 16 24Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M22 17.2942C22 16.7419 22.4477 16.2942 23 16.2942H25C25.5523 16.2942 26 16.7419 26 17.2942C26 17.8464 25.5523 18.2942 25 18.2942H23C22.4477 18.2942 22 17.8464 22 17.2942Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M17 30.7058C17 30.1536 17.4477 29.7058 18 29.7058L25.0001 29.7059C25.5524 29.7059 26 30.1536 26 30.7058C26 31.2581 25.5518 31.7059 24.9995 31.7059L18 31.7058C17.4477 31.7058 17 31.2581 17 30.7058Z" fill={color}/>
  </svg>
);
const StarShieldIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.9994 21.9998L21.9998 14.9999L25.9998 15.0001L25.9994 21.9998H32.9998V25.9998H25.9992L25.9988 32.9996L21.9988 32.9994L21.9992 25.9998H14.9998V21.9998H21.9994Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M13.8227 36.991C16.271 39.2023 18.953 41.028 21.9814 42.4676C23.6035 43.2387 25.5274 43.1684 27.0825 42.2813C29.7054 40.7851 31.988 38.9844 34.1951 36.991C38.8735 32.7654 41.6008 26.9498 41.78 20.817L41.9889 13.6659C42.0132 12.8335 41.9901 11 41.9901 11C40.9432 10.8272 39.8847 10.7005 38.8277 10.5739C35.5581 10.1824 32.3025 9.79264 29.4455 8.04646L27.4076 6.80092C25.6603 5.73303 23.4182 5.73302 21.671 6.80092L19.7195 7.99367C16.4534 9.98986 12.4722 10.3682 8.61872 10.7344C7.74583 10.8173 6.8795 10.8996 6.02952 11C6.02952 11 6.00485 12.8445 6.02952 13.6887L6.23778 20.817C6.41696 26.9498 9.14422 32.7654 13.8227 36.991ZM8.01877 12.8019C8.01953 13.1203 8.02239 13.4157 8.02866 13.6303L8.23693 20.7586C8.3997 26.3295 10.877 31.6354 15.1632 35.5067C17.4748 37.5945 19.9958 39.3092 22.8401 40.6613C23.8736 41.1526 25.1068 41.1059 26.0915 40.5441C28.5467 39.1436 30.7109 37.4428 32.8545 35.5067C37.1408 31.6354 39.618 26.3295 39.7808 20.7585L39.9897 13.6075C39.9963 13.3836 39.9992 13.0694 39.9999 12.7328C39.5318 12.6725 39.0564 12.6156 38.5704 12.5574L38.5159 12.5509C37.4407 12.4221 36.3135 12.2863 35.1938 12.0963C32.9498 11.7155 30.6021 11.0973 28.4025 9.75296L26.3646 8.50743C25.2576 7.83086 23.821 7.83086 22.714 8.50743L20.7625 9.70018C18.4439 11.1173 15.8826 11.7888 13.4159 12.1858C11.8861 12.432 10.2384 12.5894 8.69468 12.737C8.46688 12.7587 8.24134 12.7803 8.01877 12.8019Z" fill={color}/>
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
  radiusSm:   3,
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
    { label: "Ernæringsmessig komplett 0–1 år", color: "#4ADE80", icon: "shield" },
    { label: "Med GOS/FOS",                    color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",                  color: "#D97706", icon: "drop"   },
    { label: "Med nukleotider",                color: "#A78BFA", icon: "star"   },
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

const PEPTICATE_PLUS_2: Product = {
  id: "pepticate-plus-2",
  name: "Pepticate Plus 2",
  age: "6+ måneder",
  tagline: "Mysebasert, høygradig hydrolysert ernæringsprodukt for barn fra 6 måneder med kumelkallergi. Inneholder en unik, veldokumentert blanding av prebiotiske kostfibre (GOS/FOS).",
  description: "Hypoallergen tilskuddsblanding i pulverform, egnet som en del av en balansert kost fra 6 måneders alder.",
  image: "/nutrition/pepticate-plus-2.png",
  type: "Hydrolysert",
  badges: [
    { label: "Hydrolysert",          color: "#3B82F6", icon: "drop"   },
    { label: "Tilskudd fra 6 mnd",   color: "#4ADE80", icon: "shield" },
    { label: "Med GOS/FOS",          color: "#EA580C", icon: "gut"    },
    { label: "Med DHA & ARA",        color: "#D97706", icon: "drop"   },
    { label: "Med nukleotider",      color: "#A78BFA", icon: "star"   },
  ],
  summary: [
    { label: "Alder",        value: "6+ mnd" },
    { label: "Energitetthet", value: "0,68 kcal/ml" },
    { label: "Protein",      value: "100% myse (hydrolysert)" },
    { label: "Kostfiber",    value: "GOS/FOS (0,6g/100ml)" },
    { label: "Halal",        value: "Nei" },
    { label: "Laktose",      value: "20,6g/100ml" },
  ],
  fordeler: [
    "Bygger på 30 års forskning på morsmelk og er dokumentert velfungerende for barn med kumelkallergi.",
    "Lukter og smaker mer som en vanlig morsmelkerstatning – barnet venner seg raskt til smaken og liker produktet.",
    "Tilsatt en unik, veldokumentert blanding av prebiotiske kostfibre GOS/FOS (0,6 g/100 ml). Avføringen blir myk og tarmfloraen ligner den hos spedbarn som ammes.",
    "Inneholder laktose – en viktig energikilde i morsmelk – som gir mild smak og bidrar til opptak av mineraler som kalsium.",
    "Langkjedede fettsyrer DHA og ARA spiller en viktig rolle for hjernen og synets utvikling.",
  ],
  bruksomraader: [
    "Til kostbehandling av spedbarn og barn fra 6 måneders alder med kumelkallergi.",
    "Benyttes som supplement til en balansert kost.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  fodmap: { laktose: "20,6 g", gos: true, fos: true },
  viktigAVite: [
    "Morsmelk er det beste for spedbarn.",
    "Pepticate Plus er et næringsmiddel til spesielle medisinske formål.",
    "Ikke egnet til bruk som eneste næringskilde.",
    "Tilbered alltid bare ett måltid om gangen.",
  ],
  hurtiginfo: [
    { label: "Glutenfri",         icon: null },
    { label: "Med DHA & ARA",     icon: null },
    { label: "Med nukleotider",   icon: null },
    { label: "Hypoallergen",      icon: null },
    { label: "6+ mnd",            icon: null },
    { label: "Tilskuddsblanding", icon: null },
  ],
  nutrition: {
    headers: ["", "", "pr. 100 g pulver", "pr. 100 ml utblandet (14,3 g pulver)"],
    rows: [],
    sections: [
      {
        title: "",
        rows: [
          { label: "Energi (kJ)",                  unit: "kJ",   per100gPulver: "1974",     per100mlUtblandet: "285" },
          { label: "Energi (kcal)",                unit: "kcal", per100gPulver: "471",      per100mlUtblandet: "68" },
          { label: "Fett (43 E%)",                 unit: "g",    per100gPulver: "22,3",     per100mlUtblandet: "3,2" },
          { label: "– hvorav mettede fettsyrer",   unit: "g",    per100gPulver: "10,3",     per100mlUtblandet: "1,5" },
          { label: "– enumettede fettsyrer",       unit: "g",    per100gPulver: "8,2",      per100mlUtblandet: "1,2" },
          { label: "– flerumet. fettsyrer",        unit: "g",    per100gPulver: "3,8",      per100mlUtblandet: "0,5" },
          { label: "– hvorav linolsyre (LA)",      unit: "g",    per100gPulver: "3,0",      per100mlUtblandet: "0,428" },
          { label: "– α-linolensyre (ALA)",        unit: "g",    per100gPulver: "0,36",     per100mlUtblandet: "0,0519" },
          { label: "– arakidonsyre (ARA)",         unit: "mg",   per100gPulver: "120",      per100mlUtblandet: "17,0" },
          { label: "– Dokosaheksaensyre (DHA)",    unit: "mg",   per100gPulver: "120",      per100mlUtblandet: "17,0" },
          { label: "Ratio n6:n3",                  unit: "",     per100gPulver: "6,50:1",   per100mlUtblandet: "6,50:1" },
          { label: "Karbohydrat (46 E%)",          unit: "g",    per100gPulver: "54,3",     per100mlUtblandet: "7,8" },
          { label: "– hvorav sukkerarter",         unit: "g",    per100gPulver: "25,2",     per100mlUtblandet: "3,6" },
          { label: "– laktose",                    unit: "g",    per100gPulver: "20,6",     per100mlUtblandet: "2,98" },
          { label: "Kostfiber (2 E%)",             unit: "g",    per100gPulver: "3,9",      per100mlUtblandet: "0,6" },
          { label: "– løselige",                   unit: "g",    per100gPulver: "3,9",      per100mlUtblandet: "0,6" },
          { label: "– uløselige",                  unit: "g",    per100gPulver: "0",        per100mlUtblandet: "0" },
          { label: "Protein (9 E%)",               unit: "g",    per100gPulver: "11,4",     per100mlUtblandet: "1,6" },
          { label: "Salt",                         unit: "g",    per100gPulver: "0,38",     per100mlUtblandet: "0,06" },
        ],
      },
      {
        title: "Mineraler og sporstoffer",
        rows: [
          { label: "Natrium",   unit: "mg",  per100gPulver: "153",   per100mlUtblandet: "22,0" },
          { label: "Kalium",    unit: "mg",  per100gPulver: "621",   per100mlUtblandet: "90" },
          { label: "Klorid",    unit: "mg",  per100gPulver: "364",   per100mlUtblandet: "53" },
          { label: "Kalsium",   unit: "mg",  per100gPulver: "546",   per100mlUtblandet: "79" },
          { label: "Fosfor",    unit: "mg",  per100gPulver: "342",   per100mlUtblandet: "49" },
          { label: "Magnesium", unit: "mg",  per100gPulver: "52",    per100mlUtblandet: "7,6" },
          { label: "Jern",      unit: "mg",  per100gPulver: "7,1",   per100mlUtblandet: "1,0" },
          { label: "Sink",      unit: "mg",  per100gPulver: "4,7",   per100mlUtblandet: "0,68" },
          { label: "Kobber",    unit: "mg",  per100gPulver: "0,369", per100mlUtblandet: "0,053" },
          { label: "Mangan",    unit: "mg",  per100gPulver: "0,046", per100mlUtblandet: "0,007" },
          { label: "Fluorid",   unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Molybden",  unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Krom",      unit: "µg",  per100gPulver: "<42",   per100mlUtblandet: "<6,1" },
          { label: "Selen",     unit: "µg",  per100gPulver: "22",    per100mlUtblandet: "3,1" },
          { label: "Jod",       unit: "µg",  per100gPulver: "90",    per100mlUtblandet: "13" },
        ],
      },
      {
        title: "Vitaminer",
        rows: [
          { label: "Vitamin A",    unit: "µg",          per100gPulver: "416",        per100mlUtblandet: "60" },
          { label: "Vitamin D",    unit: "µg",          per100gPulver: "12",         per100mlUtblandet: "1,7" },
          { label: "Vitamin E",    unit: "mg (mg α-TE)", per100gPulver: "9,5 (8,2)", per100mlUtblandet: "1,4 (1,2)" },
          { label: "Vitamin C",    unit: "mg",          per100gPulver: "59",         per100mlUtblandet: "8,5" },
          { label: "Vitamin K",    unit: "µg",          per100gPulver: "31",         per100mlUtblandet: "4,5" },
          { label: "Tiamin",       unit: "mg",          per100gPulver: "0,45",       per100mlUtblandet: "0,07" },
          { label: "Riboflavin",   unit: "mg",          per100gPulver: "0,99",       per100mlUtblandet: "0,14" },
          { label: "Niacin",       unit: "mg (mg NE)",  per100gPulver: "3,165 (6,4)", per100mlUtblandet: "0,457 (0,92)" },
          { label: "Pantotensyre", unit: "mg",          per100gPulver: "3,857",      per100mlUtblandet: "0,557" },
          { label: "Vitamin B₆",  unit: "µg",          per100gPulver: "305",        per100mlUtblandet: "44" },
          { label: "Folinsyre",    unit: "µg",          per100gPulver: "59",         per100mlUtblandet: "8,5" },
          { label: "Folat",        unit: "µg",          per100gPulver: "98",         per100mlUtblandet: "14" },
          { label: "Vitamin B₁₂", unit: "µg",          per100gPulver: "1,1",        per100mlUtblandet: "0,16" },
          { label: "Biotin",       unit: "µg",          per100gPulver: "13",         per100mlUtblandet: "1,8" },
        ],
      },
      {
        title: "Annet",
        rows: [
          { label: "L-karnitin",  unit: "mg",           per100gPulver: "14",  per100mlUtblandet: "2,0" },
          { label: "Kolin",       unit: "mg",           per100gPulver: "103", per100mlUtblandet: "15" },
          { label: "Taurin",      unit: "mg",           per100gPulver: "35",  per100mlUtblandet: "5,1" },
          { label: "Inositol",    unit: "mg",           per100gPulver: "48",  per100mlUtblandet: "7,0" },
          { label: "Osmolaritet", unit: "mOsm/l",       per100gPulver: "—",   per100mlUtblandet: "260" },
          { label: "Osmolalitet", unit: "mOsm/kg H₂O", per100gPulver: "—",   per100mlUtblandet: "300" },
        ],
      },
    ],
  },
  tilberedning: [
    "Kok opp vann og avkjøl.",
    "Tilsett måleskje med Pepticate PLUS iht. utblandingstabell på pakning.",
    "Rist eller visp til pulveret har løst seg opp.",
    "Kan drikkes eller gis som sondeernæring.",
    "Kan brukes som erstatning for melk ved matlaging og baking.",
  ],
  dosering: "Anbefalt konsentrasjon er 14,3 % vekt/volum: for hver måleskje (4,8 g) tilsettes 30 ml vann. Se informasjon om utblanding og tilberedning på pakning. Doseringen er individuell og skal alltid gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
  holdbarhet: "18 måneder fra produksjonsdato. Holdbarhetsdato på pakningen. Tilbered alltid bare ett måltid om gangen. Rester etter tilberedt Pepticate PLUS som ikke brukes innen en time skal kastes. Ved sondemating er maks hengetid 4 timer. Uåpnet boks oppbevares i romtemperatur. Åpnet boks oppbevares med lokk, på et svalt og tørt sted. Brukes innen 1 måned. Skal ikke oppbevares i kjøleskap.",
  ingredienser: "Maltodekstrin, myseproteinhydrolysat (fra kumelk), vegetabilske oljer (palmeolje, kokosolje, rapsolje, oljesyrerik solsikkeolje, solsikkeolje), galaktooligosakkarider (fra kumelk), kalsiumfosfat, emulgator (E472c), fruktooligosakkarider, fiskeolje, kaliumklorid, magnesiumhydrogenfosfat, olje fra Mortierella alpina, natriumklorid, kolinklorid, L-tyrosin, L-askorbinsyre, inositol, taurin, natrium-L-askorbat, jernsulfat, sinksulfat, L-karnitin, natriumsitrat, DL-α-tokoferylacetat, uridin-5'-monofosfatnatriumsalt, cytidin-5'-monofosfat, kalsium-D-pantotenat, adenosin-5'-monofosfat, inosin-5'-monofosfatnatriumsalt, nikotinamid, guanosin-5'-monofosfatnatriumsalt, kobbersulfat, DL-α-tokoferol, retinylpalmitat, riboflavin, tiaminhydroklorid, pyridoksinhydroklorid, kaliumjodid, pteroylmonoglutaminsyre, mangansulfat, retinylacetat, natriumselenitt, fytomenadion, D-biotin, kolekalsiferol, cyanokobalamin. Glutenfri.",
  smaksvarianter: "Nøytral smak.",
  indikasjon: "Til kostbehandling av barn med kumelkallergi. Tilskuddsblanding i pulverform. Ikke egnet til bruk som eneste næringskilde. Egnet som en del av en balansert kost fra 6 måneders alder.",
  kontraindikasjon: "Galaktosemi. Intoleranse mot en eller flere av produktets ingredienser. Spedbarn < 6 måneders alder.",
  forsiktighetsregler: "Morsmelk er det beste for spedbarn. Pepticate PLUS skal brukes etter anbefaling fra lege eller klinisk ernæringsfysiolog, og først etter vurdering av øvrig kostbehandling inklusiv amming.",
  bestilling: [
    { produktnavn: "Pepticate PLUS 2", bestillingsnr: "146180", varenr: "897401", salgsenhet: "1 x 450 g boks" },
  ],
};

const PRODUCTS: Product[] = [PEPTICATE_1, PEPTICATE_PLUS_2];

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
  (c: string) => <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M24 4C24.5523 4 25 4.44772 25 5V8.45455C25 8.79457 24.942 9.13383 24.8268 9.45399C24.7117 9.77416 24.54 10.0734 24.3158 10.3316C24.0913 10.59 23.8172 10.8038 23.5047 10.9529C23.1915 11.1023 22.8497 11.1818 22.5002 11.1818H20.2589L20.2389 11.1816C19.0077 11.157 17.7858 11.656 16.8135 12.6284C15.8397 13.6023 15.1911 14.9802 15.0243 16.5086C14.9542 17.3448 15.0364 18.1876 15.2642 18.9816C15.493 19.7789 15.8618 20.5037 16.3404 21.1118C16.8187 21.7196 17.394 22.195 18.0235 22.5164C18.2493 22.6316 18.7551 22.7627 19.4071 22.8613C20.0262 22.9549 20.6417 23 21.0004 23C21.5527 23.0001 22.0004 23.4478 22.0003 24.0001C22.0003 24.5524 21.5525 25.0001 21.0002 25C20.5214 25 19.804 24.944 19.1082 24.8388C18.4452 24.7386 17.654 24.5733 17.1141 24.2976C16.2123 23.8372 15.4153 23.1703 14.7687 22.3487C14.1223 21.5274 13.6385 20.5674 13.3417 19.5331C13.045 18.4988 12.9402 17.4074 13.0325 16.3274L13.0346 16.3056C13.2443 14.3561 14.0749 12.5388 15.3992 11.2143C16.7248 9.88855 18.457 9.14858 20.2684 9.18182H22.5002C22.5445 9.18182 22.5928 9.17199 22.6436 9.14777C22.695 9.12325 22.7515 9.0826 22.8056 9.02026C22.86 8.95768 22.9093 8.87605 22.9448 8.7771C22.9804 8.67813 23 8.56818 23 8.45455V5C23 4.44772 23.4477 4 24 4Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M14.1141 23.7024C15.0167 23.2416 16.0003 23.0001 17.0002 23C17.5525 22.9999 18.0003 23.4476 18.0003 23.9999C18.0004 24.5522 17.5527 24.9999 17.0004 25C16.3252 25.0001 15.6523 25.1626 15.0235 25.4836C14.394 25.805 13.8187 26.2804 13.3404 26.8882C12.8618 27.4963 12.493 28.2211 12.2642 29.0184C12.0364 29.8124 11.9542 30.6552 12.0243 31.4914C12.1911 33.0198 12.8397 34.3977 13.8135 35.3716C14.2229 35.7811 14.9525 36.1621 15.8381 36.4358C16.708 36.7047 17.6014 36.8311 18.2389 36.8184L18.2589 36.8182H22.5002C22.8497 36.8182 23.1915 36.8977 23.5047 37.0471C23.8172 37.1962 24.0913 37.41 24.3158 37.6684C24.54 37.9266 24.7117 38.2258 24.8268 38.546C24.942 38.8662 25 39.2054 25 39.5455V43C25 43.5523 24.5523 44 24 44C23.4477 44 23 43.5523 23 43V39.5455C23 39.4318 22.9804 39.3219 22.9448 39.2229C22.9093 39.124 22.86 39.0423 22.8056 38.9797C22.7515 38.9174 22.695 38.8767 22.6436 38.8522C22.5928 38.828 22.5445 38.8182 22.5002 38.8182H18.2684C17.3844 38.8344 16.2814 38.6662 15.2474 38.3466C14.2251 38.0306 13.14 37.5266 12.3992 36.7857C11.0749 35.4612 10.2443 33.6439 10.0346 31.6944L10.0325 31.6726C9.9402 30.5926 10.045 29.5012 10.3417 28.4669C10.6385 27.4326 11.1223 26.4726 11.7687 25.6513C12.4153 24.8297 13.2123 24.1628 14.1141 23.7024Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M31.003 4C31.5553 4 32.003 4.44772 32.003 5V10.1816C32.0032 11.2022 31.8288 12.2156 31.4874 13.1646C31.146 14.1136 30.6426 14.9842 30.0001 15.7236C29.8265 15.9234 29.6267 16.1314 29.4094 16.3366C31.0698 16.4329 32.8619 16.7241 34.3796 17.5088C35.4115 18.0423 36.3328 18.8116 36.9897 19.9065C37.6456 20.9998 38.0001 22.3544 38.0001 24C38.0001 25.6409 37.6565 26.992 37.018 28.0838C36.3779 29.1785 35.4774 29.9506 34.4633 30.4869C32.9265 31.2998 31.1003 31.5847 29.419 31.6719C29.6227 31.8662 29.8159 32.0693 29.9975 32.2784C31.2915 33.7689 31.999 35.7633 31.9986 37.8182V43C31.9986 43.5523 31.5509 44 30.9986 44C30.4463 44 29.9986 43.5523 29.9986 43V37.8182C29.9989 36.2098 29.443 34.6904 28.4873 33.5896C27.4766 32.4255 26.2032 31.7066 24.9995 31.7059C24.4474 31.7056 24 31.2578 24.0001 30.7056C24.0003 30.1534 24.4479 29.7059 25.0001 29.7059H27.9972C29.9752 29.7059 32.0095 29.5222 33.5282 28.719C34.2659 28.3288 34.8675 27.7994 35.2916 27.0742C35.7173 26.3462 36.0001 25.3591 36.0001 24C36.0001 22.6456 35.7106 21.662 35.2747 20.9354C34.8397 20.2105 34.2212 19.6783 33.4611 19.2854C31.8984 18.4774 29.8138 18.2941 27.8153 18.2941H24.8182C24.266 18.294 23.8182 17.8462 23.8182 17.294C23.8183 16.7417 24.266 16.2941 24.8182 16.2941H24.8209C25.4559 16.2939 26.089 16.1502 26.6855 15.8659C27.2539 15.595 27.9926 14.9848 28.4904 14.4119C28.9628 13.8681 29.3437 13.2152 29.6055 12.4876C29.8673 11.7599 30.0032 10.9761 30.003 10.182V5C30.003 4.44772 30.4507 4 31.003 4Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M16 24C16 23.4477 16.4479 23 17.0002 23H30C30.5523 23 31 23.4477 31 24C31 24.5523 30.5523 25 30 25H17.0004C16.4481 25 16 24.5523 16 24Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M22 17.2942C22 16.7419 22.4477 16.2942 23 16.2942H25C25.5523 16.2942 26 16.7419 26 17.2942C26 17.8464 25.5523 18.2942 25 18.2942H23C22.4477 18.2942 22 17.8464 22 17.2942Z" fill={c}/><path fillRule="evenodd" clipRule="evenodd" d="M17 30.7058C17 30.1536 17.4477 29.7058 18 29.7058L25.0001 29.7059C25.5524 29.7059 26 30.1536 26 30.7058C26 31.2581 25.5518 31.7059 24.9995 31.7059L18 31.7058C17.4477 31.7058 17 31.2581 17 30.7058Z" fill={c}/></svg>,
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
        <Box sx={{ background: "linear-gradient(180deg, #FFFFFF 0%, rgba(74,44,130,0.06) 100%)", border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Bruksområder</Typography>
          {product.bruksomraader.map((b, i) => (
            <Typography key={i} sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.6, mb: 0.5 }}>{b}</Typography>
          ))}
        </Box>

        {/* FODMAP */}
        <Box sx={{ background: "linear-gradient(180deg, #FFFFFF 0%, rgba(74,44,130,0.06) 100%)", border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
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
        <Box sx={{ background: "linear-gradient(180deg, #FFFFFF 0%, rgba(74,44,130,0.06) 100%)", border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: D.text, mb: 1 }}>Viktig å vite</Typography>
          {product.viktigAVite.map((v, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 0.75 }}>
              <CheckIcon color={D.purple} size={14} />
              <Typography sx={{ fontSize: 12.5, color: D.textSub, lineHeight: 1.5 }}>{v}</Typography>
            </Box>
          ))}
        </Box>

        {/* Hurtiginfo */}
        <Box sx={{ background: "linear-gradient(180deg, #FFFFFF 0%, rgba(74,44,130,0.06) 100%)", border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2 }}>
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

const INGR_PROPS = [
  {
    label: "Glutenfri",
    icon: (_c: string) => <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M36.0013 37.4155C32.8166 40.2664 28.6107 42 24 42C14.0589 42 6 33.9411 6 24C6 19.262 7.83061 14.9515 10.8231 11.7373L13.7929 14.7071C14.1834 15.0976 14.8166 15.0976 15.2071 14.7071C15.5976 14.3166 15.5976 13.6834 15.2071 13.2929L12.265 10.3508C15.4161 7.63912 19.5166 6 24 6C33.9411 6 42 14.0589 42 24C42 28.6107 40.2664 32.8166 37.4155 36.0013L31.6221 30.2079C31.8685 29.4894 32 28.7243 32 27.9385V26C32 25.6593 31.8266 25.3421 31.5398 25.1582C31.457 25.1051 31.3681 25.0653 31.276 25.0388C31.7436 24.0927 32 23.0358 32 21.9385V20C32 19.6593 31.8266 19.3421 31.5398 19.1582C31.253 18.9743 30.8923 18.9491 30.5827 19.0912L30.5236 19.1184C30.8329 18.3241 31 17.4658 31 16.5794V15C31 14.6711 30.8383 14.3632 30.5675 14.1766C30.2966 13.99 29.9514 13.9484 29.644 14.0655L27.508 14.8792C27.4241 14.9112 27.341 14.9447 27.2588 14.9796C27.2219 13.2042 26.5764 11.4692 25.3903 10.0855L24.7593 9.34921C24.5693 9.12756 24.2919 9 24 9C23.7081 9 23.4307 9.12756 23.2407 9.34921L22.6097 10.0855C21.4236 11.4692 20.7781 13.2042 20.7412 14.9796C20.659 14.9447 20.5759 14.9112 20.492 14.8792L18.356 14.0655C18.0486 13.9484 17.7034 13.99 17.4325 14.1766C17.1617 14.3632 17 14.6711 17 15V16.5794C17 17.4658 17.1671 18.3241 17.4764 19.1184L17.4173 19.0912C17.1077 18.9491 16.747 18.9743 16.4602 19.1582C16.1734 19.3421 16 19.6593 16 20V21.9385C16 23.0358 16.2564 24.0927 16.724 25.0388C16.6319 25.0653 16.543 25.1051 16.4602 25.1582C16.1734 25.3421 16 25.6593 16 26V27.9385C16 30.6738 17.5932 33.1585 20.0789 34.2999L23 35.6412V38H25V35.6412L27.9211 34.2999C29.0301 33.7907 29.9614 33.014 30.6529 32.0671L36.0013 37.4155ZM44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24ZM24 11.542C25.092 12.9094 25.5026 14.6977 25.1211 16.4007C24.6873 16.8226 24.3106 17.2983 24 17.815C23.6894 17.2983 23.3127 16.8226 22.8789 16.4007C22.4974 14.6977 22.908 12.9094 24 11.542ZM23 21.5489V21.4206C23 19.3459 21.7188 17.4868 19.78 16.7482L19 16.4511V16.5794C19 18.6541 20.2812 20.5132 22.22 21.2518L23 21.5489ZM25 21.5489L25.78 21.2518C27.7188 20.5132 29 18.6541 29 16.5794V16.4511L28.22 16.7482C26.2812 17.4868 25 19.3459 25 21.4206V21.5489ZM25 26.1071C25 24.735 25.7992 23.4885 27.0462 22.9159L30 21.5596V21.9385C30 23.8923 28.862 25.6671 27.0865 26.4824L25 27.4404V26.1071ZM20.0865 22.5176C21.862 23.3329 23 25.1077 23 27.0615V27.4404L20.9135 26.4824C19.138 25.6671 18 23.8923 18 21.9385V21.5596L20.0865 22.5176ZM23 33.4404V33.0615C23 31.1077 21.862 29.3329 20.0865 28.5176L18 27.5596V27.9385C18 29.8923 19.138 31.6671 20.9135 32.4824L23 33.4404ZM25 33.4404L27.0865 32.4824C28.862 31.6671 30 29.8923 30 27.9385V27.5596L27.0462 28.9159C25.7992 29.4885 25 30.735 25 32.1071V33.4404Z" fill="#C8960C"/></svg>,
  },
  {
    label: "Inneholder fiskolje",
    icon: (_c: string) => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.43 0 0 0.43 12 12)"><path fill="#5BA4CF" fillRule="nonzero" transform="translate(-24.99, -25)" d="M 21 8 C 14.015625 8 10.339844 12.527344 10.339844 12.527344 C 10.160156 12.75 10.085938 13.035156 10.132813 13.316406 C 10.179688 13.597656 10.347656 13.84375 10.589844 13.996094 C 10.589844 13.996094 12.039063 14.941406 12.722656 16.492188 C 13.382813 17.988281 13.507813 20.011719 10.621094 22.949219 C 10.277344 22.863281 9.929688 22.65625 9.566406 22.324219 C 9.066406 21.867188 8.585938 21.195313 8.1875 20.503906 C 7.398438 19.117188 6.953125 17.703125 6.953125 17.703125 C 6.824219 17.277344 6.421875 16.988281 5.96875 17 C 5.695313 17.007813 5.433594 17.132813 5.25 17.339844 C 5.25 17.339844 2 20.976563 2 26.046875 C 2 31.121094 5.257813 34.671875 5.257813 34.671875 C 5.5 34.9375 5.867188 35.054688 6.21875 34.976563 C 6.566406 34.898438 6.847656 34.636719 6.953125 34.296875 C 6.953125 34.296875 7.398438 32.882813 8.1875 31.496094 C 8.585938 30.804688 9.066406 30.132813 9.566406 29.675781 C 9.914063 29.359375 10.246094 29.164063 10.574219 29.066406 C 12.253906 31.160156 12.191406 33.046875 11.730469 34.589844 C 11.238281 36.230469 10.253906 37.328125 10.253906 37.328125 C 9.910156 37.714844 9.914063 38.296875 10.265625 38.675781 C 10.265625 38.675781 11.105469 39.574219 12.703125 40.390625 C 14.296875 41.207031 16.714844 42 20 42 C 29.78125 42 38.503906 36.863281 38.503906 36.863281 C 38.679688 36.769531 38.824219 36.621094 38.917969 36.445313 C 44.464844 32.949219 47.433594 28.15625 47.519531 28.015625 C 48.179688 27.214844 48.144531 26.007813 47.398438 25.265625 L 47.261719 25.128906 L 47.085938 25.058594 C 47.085938 25.058594 46.40625 24.746094 45.503906 24.109375 L 45.507813 24.109375 C 45.472656 24.085938 45.109375 23.769531 44.699219 23.375 C 44.289063 22.976563 43.785156 22.484375 43.214844 22 C 43.203125 21.988281 43.1875 21.980469 43.175781 21.96875 C 42.59375 21.265625 42.039063 20.441406 41.605469 19.464844 C 40.683594 17.144531 39.199219 15.03125 37.171875 13.488281 C 37.136719 13.445313 37.097656 13.40625 37.054688 13.375 C 37.054688 13.375 30.792969 8 21 8 Z M 21 10 C 23.699219 10 26.089844 10.4375 28.125 11.046875 C 23.488281 11.429688 19.855469 13.796875 17.078125 16.332031 C 16.339844 17.007813 15.664063 17.695313 15.03125 18.363281 C 15.074219 17.367188 14.890625 16.457031 14.550781 15.6875 C 14.039063 14.523438 13.300781 13.6875 12.679688 13.121094 C 13.535156 12.226563 15.921875 10 21 10 Z M 29.058594 12.996094 C 29.355469 12.988281 29.65625 12.988281 29.964844 13 C 32.1875 13.082031 34.035156 13.707031 35.542969 14.71875 C 35.652344 14.808594 35.75 14.890625 35.75 14.890625 C 35.820313 14.949219 35.898438 15 35.980469 15.039063 C 37.648438 16.300781 38.863281 18.0625 39.675781 20.0625 C 39.457031 20.023438 39.230469 20 39 20 C 37.863281 20 36.882813 20.519531 36.132813 21.191406 C 35.382813 21.867188 34.816406 22.703125 34.363281 23.515625 C 33.464844 25.140625 33.035156 26.734375 33.035156 26.734375 L 32.917969 27.171875 L 33.164063 27.546875 C 33.164063 27.546875 33.988281 28.804688 34.90625 30.480469 C 35.734375 31.980469 36.597656 33.808594 37.015625 35.246094 C 34.265625 36.824219 30.917969 38 27 38 C 23.164063 38 20.207031 35.972656 17.734375 33.566406 C 15.332031 31.234375 13.589844 28.628906 11.722656 27.296875 C 11.636719 27.210938 11.539063 27.140625 11.425781 27.089844 C 11.277344 27.015625 11.109375 26.980469 10.941406 26.988281 C 10.859375 26.996094 10.773438 27.011719 10.691406 27.035156 C 9.722656 27.125 8.882813 27.59375 8.21875 28.199219 C 7.484375 28.867188 6.914063 29.695313 6.453125 30.503906 C 6.039063 31.230469 6.054688 31.371094 5.820313 31.941406 C 5.007813 30.71875 4 28.84375 4 26.046875 C 4 23.25 5.011719 21.332031 5.828125 20.078125 C 6.0625 20.644531 6.042969 20.78125 6.453125 21.496094 C 6.914063 22.304688 7.484375 23.132813 8.21875 23.800781 C 8.890625 24.414063 9.746094 24.890625 10.734375 24.96875 C 10.882813 25.011719 11.042969 25.015625 11.199219 24.984375 C 11.203125 24.980469 11.207031 24.980469 11.210938 24.980469 C 11.238281 24.972656 11.269531 24.96875 11.296875 24.957031 C 11.300781 24.957031 11.304688 24.957031 11.308594 24.953125 C 11.3125 24.953125 11.3125 24.953125 11.3125 24.953125 C 11.472656 24.902344 11.617188 24.8125 11.734375 24.691406 C 12.65625 24.027344 13.527344 23.03125 14.570313 21.851563 C 15.683594 20.597656 16.953125 19.15625 18.425781 17.8125 C 21.191406 15.285156 24.605469 13.113281 29.058594 12.996094 Z M 39 22 C 39.726563 22 40.796875 22.605469 41.765625 23.40625 C 43.617188 25.574219 45.632813 26.539063 45.988281 26.703125 C 45.996094 26.714844 46.007813 26.726563 45.984375 26.75 L 45.902344 26.832031 L 45.839844 26.9375 C 45.839844 26.9375 43.363281 30.941406 38.773438 34.136719 C 38.25 32.5625 37.425781 30.910156 36.660156 29.515625 C 35.84375 28.03125 35.316406 27.230469 35.109375 26.910156 C 35.195313 26.621094 35.449219 25.683594 36.113281 24.484375 C 36.496094 23.796875 36.964844 23.132813 37.46875 22.683594 C 37.972656 22.230469 38.457031 22 39 22 Z M 40 24 C 39.449219 24 39 24.449219 39 25 C 39 25.550781 39.449219 26 40 26 C 40.550781 26 41 25.550781 41 25 C 41 24.449219 40.550781 24 40 24 Z M 13.972656 32.507813 C 14.699219 33.320313 15.472656 34.160156 16.339844 35 C 18.40625 37.011719 20.980469 38.925781 24.171875 39.671875 C 22.816406 39.871094 21.417969 40 20 40 C 17.035156 40 14.953125 39.292969 13.609375 38.609375 C 12.746094 38.167969 12.667969 38.015625 12.402344 37.78125 C 12.816406 37.164063 13.304688 36.296875 13.644531 35.160156 C 13.878906 34.378906 14.015625 33.472656 13.972656 32.507813 Z" strokeLinecap="round"/></g></svg>,
  },
  {
    label: "Inneholder laktose",
    icon: (_c: string) => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(0.42 0 0 0.42 12 12)"><g transform="matrix(1 0 0 1 0 1)"><path fill="rgb(144,202,249)" fillRule="nonzero" transform="translate(-24,-25)" d="M 33 26 C 33 19.5 29 21 29 7 C 29 7 21 7 19 7 C 19 21 15 19.5 15 26 L 15 41.5 C 15 42.328 15.672 43 16.5 43 L 31.5 43 C 32.328 43 33 42.328 33 41.5 L 33 26 z" strokeLinecap="round"/></g><g transform="matrix(1 0 0 1 0 -18)"><path fill="rgb(156,39,176)" fillRule="nonzero" transform="translate(-24,-6)" d="M 30 6.5 C 30 7.328 29.328 8 28.5 8 L 19.5 8 C 18.672 8 18 7.328 18 6.5 L 18 5.5 C 18 4.672 18.672 4 19.5 4 L 28.5 4 C 29.328 4 30 4.672 30 5.5 L 30 6.5 z" strokeLinecap="round"/></g><g transform="matrix(1 0 0 1 0 4)"><path fill="rgb(250,250,250)" fillRule="nonzero" transform="translate(-24,-28)" d="M 31 39.5 C 31 39.776 30.776 40 30.5 40 L 17.5 40 C 17.224 40 17 39.776 17 39.5 L 17 26 C 17 23.836 17.489 22.854 18.229 21.366 C 18.897 20.025 19.65 18.5 20.204 16 L 27.798 16 C 28.352 18.5 29.105 20.025 29.773 21.366 C 30.511 22.854 31 23.836 31 26 L 31 39.5 z" strokeLinecap="round"/></g></g></svg>,
  },
];

function IngrediensTab({ product }: { product: Product }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Ingredienser */}
      <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.text, mb: 1.5 }}>Ingredienser</Typography>
        <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.8 }}>{product.ingredienser}</Typography>

        {/* Property icons */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 3, pt: 2.5, borderTop: `1px solid ${D.border}` }}>
          {INGR_PROPS.map((prop, i) => (
            <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 1.5 }}>
              {prop.icon(D.purple)}
              <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: D.textSub, textAlign: "center", lineHeight: 1.3 }}>{prop.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function AccordionSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ border: `1px solid ${D.border}`, borderRadius: D.radiusSm, overflow: "hidden" }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, cursor: "pointer", bgcolor: D.surface, "&:hover": { bgcolor: D.surfaceAlt } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {icon}
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: D.text }}>{title}</Typography>
        </Box>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" stroke={D.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Box>
      {open && (
        <Box sx={{ px: 2, py: 1.5, bgcolor: D.surfaceAlt, borderTop: `1px solid ${D.border}` }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

function BestillingTab({ product }: { product: Product }) {
  const row = product.bestilling[0];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>Bestillingsinformasjon</Typography>

      {/* Product card */}
      <Box sx={{ display: "flex", gap: 2, p: 2, bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm, alignItems: "center" }}>
        {product.image && (
          <Box component="img" src={product.image} alt={product.name} sx={{ width: 72, height: 72, objectFit: "contain", flexShrink: 0 }} />
        )}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.text, mb: 0.5 }}>{product.name}</Typography>
          {row && [
            { label: "Bestillingsnr.", value: row.bestillingsnr },
            { label: "Varenr.", value: row.varenr },
            { label: "Salgsenhet:", value: row.salgsenhet },
          ].map(({ label, value }) => (
            <Typography key={label} sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.7 }}>
              <Box component="span" sx={{ color: D.textMuted }}>{label} </Box>{value}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* Accordions */}
      <AccordionSection
        title="Holdbarhet og oppbevaring"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/><rect x="7" y="4" width="10" height="6" rx="1.5" stroke={D.purple} strokeWidth="1.5"/><path d="M12 12v4M10 14h4" stroke={D.purple} strokeWidth="1.4" strokeLinecap="round"/></svg>}
      >
        <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.75 }}>{product.holdbarhet}</Typography>
      </AccordionSection>

      <AccordionSection
        title="Viktig informasjon"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={D.purple} strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke={D.purple} strokeWidth="1.5" strokeLinecap="round"/></svg>}
      >
        <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.75, mb: 1 }}>{product.forsiktighetsregler}</Typography>
        {product.kontraindikasjon && (
          <>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.text, mb: 0.5 }}>Kontraindikasjon</Typography>
            <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.75 }}>{product.kontraindikasjon}</Typography>
          </>
        )}
      </AccordionSection>

      <AccordionSection
        title="Kontakt Nutricia"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={D.purple} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.5" stroke={D.purple} strokeWidth="1.4"/></svg>}
      >
        <Typography sx={{ fontSize: 13, color: D.textSub, lineHeight: 1.75, fontStyle: "italic", mb: 1 }}>
          Nutricias produkter er registrerte næringsmidler til spesielle medisinske formål og skal brukes i samråd med helsepersonell. Ved eneste kilde til ernæring må mikronæringsstoffstatus overvåkes.
        </Typography>
        <Typography sx={{ fontSize: 13, color: D.textSub }}>
          Nutricia, % Danone AS &nbsp;|&nbsp; Tlf. +47 23 00 21 00 &nbsp;|&nbsp; E-post nutricia.amnno@danone.com
        </Typography>
      </AccordionSection>
    </Box>
  );
}

type Dokument = { title: string; url: string; sizeLabel: string; color?: string };

function DokumentasjonTab({ dokumenter }: { dokumenter: Dokument[] }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.text }}>Dokumentasjon</Typography>
        <Typography sx={{ fontSize: 13, color: D.textMuted, mt: 0.5 }}>Faglig dokumentasjon og forskningsstøtte</Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {dokumenter.map((doc, i) => (
          <Box
            key={i}
            component="a"
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex", alignItems: "center", gap: 1.5,
              p: 1.5, width: 180,
              bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: D.radiusSm,
              textDecoration: "none", cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": { borderColor: D.borderMed, boxShadow: D.shadow },
            }}
          >
            <Box sx={{ flexShrink: 0 }}>
              <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                <rect x="0.5" y="0.5" width="27" height="33" rx="3.5" fill={doc.color ? doc.color + "14" : "rgba(74,44,130,0.08)"} stroke={doc.color ?? D.purple} strokeOpacity="0.3"/>
                <path d="M6 10h16M6 14h16M6 18h10" stroke={doc.color ?? D.purple} strokeWidth="1.4" strokeLinecap="round"/>
                <rect x="15" y="22" width="10" height="8" rx="2" fill={doc.color ?? D.purple} fillOpacity="0.15"/>
                <text x="20" y="28.5" textAnchor="middle" fontSize="5" fontWeight="700" fill={doc.color ?? D.purple} fontFamily="sans-serif">PDF</text>
              </svg>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: D.text, lineHeight: 1.3, mb: 0.25 }}>{doc.title}</Typography>
              <Typography sx={{ fontSize: 11, color: D.textMuted }}>PDF · {doc.sizeLabel}</Typography>
            </Box>
          </Box>
        ))}
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
  const [selectedId, setSelectedId] = useState<string>(PRODUCTS[0].id);
  const [activeTab, setActiveTab] = useState(0);

  const product = PRODUCTS.find(p => p.id === selectedId) ?? PRODUCTS[0];

  const TABS = ["Oversikt", "Næringsinnhold", "Tilberedning & dosering", "Ingredienser", "Bestillingsinfo", "Dokumentasjon"];

  const PEPTICATE_1_DOKUMENTER: Dokument[] = [
    { title: "Produktark Pepticate", url: "/dokumenter/pepticate-1-produktark.pdf", sizeLabel: "344 KB" },
  ];

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
          {activeTab === 5 && <DokumentasjonTab dokumenter={PEPTICATE_1_DOKUMENTER} />}
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
