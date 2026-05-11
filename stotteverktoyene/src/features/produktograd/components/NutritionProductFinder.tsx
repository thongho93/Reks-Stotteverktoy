import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { nutritionProducts, type NutritionProduct } from "../data/nutritionProducts";

// ─── Catalog product (subset of AdviceProduct from ProduktOgRadPage) ──────────
type CatalogProduct = {
  id: string;
  name: string;
  farmaloggNumber: string;
  farmaloggDigits: string;
  skuDigits: string;
};

// ─── Variant info built from catalog ─────────────────────────────────────────
type VariantRow = {
  vnr: string;     // raw farmalogg number
  flavor: string;  // e.g. "Sjokolade", "Jordbær" (empty string = no flavor suffix)
};

type VariantInfo = {
  rows: VariantRow[];
};

/** Build nutrition product id → VariantInfo from catalog */
function buildVariantMap(
  catalog: CatalogProduct[],
  npList: NutritionProduct[]
): Map<string, VariantInfo> {
  const map = new Map<string, VariantInfo>();

  // Pre-normalise nutrition product names once
  const npNorms = npList.map(np => ({ np, norm: normName(np.name) }));

  for (const cp of catalog) {
    const cpNorm = normName(cp.name);
    const vnr    = cp.farmaloggNumber.trim();
    if (!vnr) continue;

    // Find best (longest normalised prefix) nutrition product
    let bestNp: NutritionProduct | null = null;
    let bestLen = 0;
    for (const { np, norm: npNorm } of npNorms) {
      if (cpNorm.startsWith(npNorm) && npNorm.length > bestLen) {
        bestNp  = np;
        bestLen = npNorm.length;
      }
    }
    if (!bestNp) continue;

    if (!map.has(bestNp.id)) map.set(bestNp.id, { rows: [] });
    const entry = map.get(bestNp.id)!;

    // Extract flavor: what comes after the matched prefix in the normalized name
    const flavor = cpNorm.slice(bestLen).replace(/\d+\s*x\s*\d+.*/g, "").trim();
    const flavorDisplay = flavor.charAt(0).toUpperCase() + flavor.slice(1);

    // Only add if this VNR isn't already recorded
    if (!entry.rows.some(r => r.vnr === vnr)) {
      entry.rows.push({ vnr, flavor: flavorDisplay });
    }
  }

  return map;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  completeNutrition: "#16a34a", fiber: "#9333ea", proteinRich: "#2563eb",
  glutenFree: "#ca8a04", lactoseFree: "#1c1917", lowLactose: "#6b7280",
  fatFree: "#d97706", vegan: "#15803d", vegetarian: "#15803d", liteProtein: "#7c3aed",
  diabetes: "#1d4ed8", kidneyFailure: "#b45309", cancer: "#db2777",
  copd: "#0f766e", pressureUlcers: "#dc2626", preoperative: "#7c3aed",
  postoperative: "#6d28d9", malabsorption: "#ea580c",
  constipationDiarrhea: "#65a30d", elderlyUndernutrition: "#0369a1",
  caution: "#92400e", cautionBg: "#fef3c7",
};

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "Komplett ernæring": { bg: "#dcfce7", text: "#14532d" },
  Proteinrik:          { bg: "#dbeafe", text: "#1e3a8a" },
  Fettkilde:           { bg: "#fef3c7", text: "#78350f" },
  Preoperativ:         { bg: "#ede9fe", text: "#4c1d95" },
  Sårernæring:         { bg: "#fee2e2", text: "#7f1d1d" },
  "KOLS-ernæring":     { bg: "#ccfbf1", text: "#134e4a" },
  Nyreernæring:        { bg: "#fef9c3", text: "#713f12" },
  Diabetesernæring:    { bg: "#dbeafe", text: "#1e3a8a" },
  Malabsorpsjon:       { bg: "#ffedd5", text: "#7c2d12" },
  Kreftspesifikk:      { bg: "#fce7f3", text: "#831843" },
};

const getCat = (cat: string) => CAT_COLORS[cat] ?? { bg: "#f1f5f9", text: "#475569" };
const getC   = (key: string) => (C as Record<string, string>)[key] ?? "#64748b";

// ─── Gluten-free SVG icon ─────────────────────────────────────────────────────
function GlutenFreeIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M36.0013 37.4155C32.8166 40.2664 28.6107 42 24 42C14.0589 42 6 33.9411 6 24C6 19.262 7.83061 14.9515 10.8231 11.7373L13.7929 14.7071C14.1834 15.0976 14.8166 15.0976 15.2071 14.7071C15.5976 14.3166 15.5976 13.6834 15.2071 13.2929L12.265 10.3508C15.4161 7.63912 19.5166 6 24 6C33.9411 6 42 14.0589 42 24C42 28.6107 40.2664 32.8166 37.4155 36.0013L31.6221 30.2079C31.8685 29.4894 32 28.7243 32 27.9385V26C32 25.6593 31.8266 25.3421 31.5398 25.1582C31.457 25.1051 31.3681 25.0653 31.276 25.0388C31.7436 24.0927 32 23.0358 32 21.9385V20C32 19.6593 31.8266 19.3421 31.5398 19.1582C31.253 18.9743 30.8923 18.9491 30.5827 19.0912L30.5236 19.1184C30.8329 18.3241 31 17.4658 31 16.5794V15C31 14.6711 30.8383 14.3632 30.5675 14.1766C30.2966 13.99 29.9514 13.9484 29.644 14.0655L27.508 14.8792C27.4241 14.9112 27.341 14.9447 27.2588 14.9796C27.2219 13.2042 26.5764 11.4692 25.3903 10.0855L24.7593 9.34921C24.5693 9.12756 24.2919 9 24 9C23.7081 9 23.4307 9.12756 23.2407 9.34921L22.6097 10.0855C21.4236 11.4692 20.7781 13.2042 20.7412 14.9796C20.659 14.9447 20.5759 14.9112 20.492 14.8792L18.356 14.0655C18.0486 13.9484 17.7034 13.99 17.4325 14.1766C17.1617 14.3632 17 14.6711 17 15V16.5794C17 17.4658 17.1671 18.3241 17.4764 19.1184L17.4173 19.0912C17.1077 18.9491 16.747 18.9743 16.4602 19.1582C16.1734 19.3421 16 19.6593 16 20V21.9385C16 23.0358 16.2564 24.0927 16.724 25.0388C16.6319 25.0653 16.543 25.1051 16.4602 25.1582C16.1734 25.3421 16 25.6593 16 26V27.9385C16 30.6738 17.5932 33.1585 20.0789 34.2999L23 35.6412V38H25V35.6412L27.9211 34.2999C29.0301 33.7907 29.9614 33.014 30.6529 32.0671L36.0013 37.4155ZM44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24ZM24 11.542C25.092 12.9094 25.5026 14.6977 25.1211 16.4007C24.6873 16.8226 24.3106 17.2983 24 17.815C23.6894 17.2983 23.3127 16.8226 22.8789 16.4007C22.4974 14.6977 22.908 12.9094 24 11.542ZM23 21.5489V21.4206C23 19.3459 21.7188 17.4868 19.78 16.7482L19 16.4511V16.5794C19 18.6541 20.2812 20.5132 22.22 21.2518L23 21.5489ZM25 21.5489L25.78 21.2518C27.7188 20.5132 29 18.6541 29 16.5794V16.4511L28.22 16.7482C26.2812 17.4868 25 19.3459 25 21.4206V21.5489ZM25 26.1071C25 24.735 25.7992 23.4885 27.0462 22.9159L30 21.5596V21.9385C30 23.8923 28.862 25.6671 27.0865 26.4824L25 27.4404V26.1071ZM20.0865 22.5176C21.862 23.3329 23 25.1077 23 27.0615V27.4404L20.9135 26.4824C19.138 25.6671 18 23.8923 18 21.9385V21.5596L20.0865 22.5176ZM23 33.4404V33.0615C23 31.1077 21.862 29.3329 20.0865 28.5176L18 27.5596V27.9385C18 29.8923 19.138 31.6671 20.9135 32.4824L23 33.4404ZM25 33.4404L27.0865 32.4824C28.862 31.6671 30 29.8923 30 27.9385V27.5596L27.0462 28.9159C25.7992 29.4885 25 30.735 25 32.1071V33.4404Z" fill="currentColor"/>
    </svg>
  );
}

// ─── Lactose-free SVG icon ────────────────────────────────────────────────────
function LaktosefriIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42ZM24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M19.2 11.2174C19.2 10 19.8 10 21.6 10H26.4C28.2 10 28.8 10 28.8 11.2174C28.8 12.4348 27.6 13.0435 27.6 13.0435L30 22.1739V35.5652C30 36.9099 28.9255 38 27.6 38H20.4C19.0745 38 18 36.9099 18 35.5652V22.1739L20.4 13.0435C20.4 13.0435 19.2 12.4348 19.2 11.2174ZM24 23.5532C22.6667 22.3085 20 23.5532 20 23.5532V35C20 35.5523 20.4477 36 21 36H27C27.5523 36 28 35.5523 28 35V24.7979C28 24.7979 25.3333 24.7979 24 23.5532Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.2929 9.79289C10.6834 9.40237 11.3166 9.40237 11.7071 9.79289L17.2071 15.2929C17.5976 15.6834 17.5976 16.3166 17.2071 16.7071C16.8166 17.0976 16.1834 17.0976 15.7929 16.7071L10.2929 11.2071C9.90237 10.8166 9.90237 10.1834 10.2929 9.79289Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M37.2929 38.7071L28.2929 29.7071L29.7071 28.2929L38.7071 37.2929L37.2929 38.7071Z" fill="currentColor"/>
    </svg>
  );
}

// ─── Low-lactose SVG icon ─────────────────────────────────────────────────────
function LaktosefattigIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
      <g transform="matrix(0.45 0 0 0.45 12 12)">
        <path fill="currentColor" fillRule="nonzero" transform="translate(-25, -25)" d="M 16 3 C 15.447738123791542 3.0000552179053495 15.000055217905349 3.4477381237915417 15 4.000000000000001 L 15 7.6289062 L 9.2402344 14.349609 C 9.235611999065108 14.355417743582233 9.231054416584485 14.36127777345569 9.2265625 14.367188 C 9.223277559201216 14.371069118240886 9.220022264540527 14.374975231826733 9.2167969 14.378906 C 9.203897749252851 14.395440083526905 9.19152183070969 14.412375789721528 9.1796875 14.429688 C 9.163695121462382 14.453128137625658 9.148707593404046 14.477238286909984 9.1347656 14.501953 C 9.129414068987154 14.510985090719597 9.124205089977023 14.52010088733099 9.1191406 14.529297 C 9.11305149500169 14.540899382434677 9.107190996801013 14.552620312156492 9.1015625 14.564453 C 9.090952698314844 14.586868215822031 9.081180309627506 14.609670311548122 9.0722656 14.632812 C 9.069605137122602 14.638646485105678 9.067000850013388 14.64450642278157 9.0644531 14.650391 C 9.054973357564174 14.6754312195503 9.046502999858765 14.70084202578484 9.0390625 14.726562 C 9.037015069571225 14.734350790019183 9.03506179375724 14.742164026618191 9.0332031 14.75 C 9.028096648813117 14.768743539543639 9.02353741430429 14.787631887309082 9.0195312 14.806641 C 9.014696685075632 14.83122481020603 9.0107876936991 14.855981611044308 9.0078125 14.880859 C 9.00709758693017 14.88736312068583 9.006446522245097 14.89387410088596 9.0058594 14.900391 C 9.002728318352238 14.928291013573535 9.000773453441377 14.95631049930139 9 14.984375 C 8.999977112932108 14.988281299809705 8.999977112932108 14.992187700190295 9 14.996094 C 8.999997457445831 14.997395998758721 8.999997457445831 14.998698001241278 9 15 L 9 46 C 9.000055217905349 46.55226187620846 9.447738123791542 46.99994478209465 10 47 L 30 47 L 40 47 C 40.55226187620846 46.99994478209465 40.99994478209465 46.55226187620846 41 46 L 41 15 C 41.00036864652495 14.791386143852312 40.93549213358472 14.587878990930875 40.814453 14.417969 L 36 7.6777344 L 36 4 C 35.99994478209465 3.4477381237915408 35.55226187620846 3.0000552179053495 35 3 L 16 3 z M 17 5 L 34 5 L 34 7 L 17 7 L 17 5 z M 16.458984 9 L 33.056641 9 L 29.486328 14 L 12.173828 14 L 16.458984 9 z M 35 9.7226562 L 39 15.320312 L 39 45 L 31 45 L 31 15.322266 L 35 9.7226562 z M 11 16 L 29 16 L 29 45 L 11 45 L 11 16 z M 15 25 C 13.895 25 13 25.895 13 27 C 13 28.105 13.895 29 15 29 C 16.105 29 17 28.105 17 27 C 17 25.895 16.105 25 15 25 z M 25 25 C 23.895 25 23 25.895 23 27 C 23 28.105 23.895 29 25 29 C 26.105 29 27 28.105 27 27 C 27 25.895 26.105 25 25 25 z M 24.023438 31.988281 C 23.693476915987283 31.98302059883501 23.38216098338928 32.14087078856904 23.191406 32.410156 C 23.191406 32.410156 22.015066 34 20 34 C 17.984934 34 16.808594 32.410156 16.808594 32.410156 C 16.482832154020805 31.96358186499532 15.856730135004682 31.865644154020806 15.410156 32.191406 C 14.96358186499532 32.517167845979195 14.865644154020806 33.14326986499532 15.191406 33.589844 C 15.191406 33.589844 16.935066 36 20 36 C 23.064934 36 24.808594 33.589844 24.808594 33.589844 C 25.035156075348077 33.288937593320505 25.07343739593875 32.88625736661905 24.907633487686418 32.5480501763125 C 24.74182957943409 32.20984298600596 24.400065181014337 31.993477738206582 24.023438 31.988281 z" />
      </g>
    </svg>
  );
}

// ─── Icon maps ────────────────────────────────────────────────────────────────
const PROP_ICONS: Record<string, string> = {
  completeNutrition: "⭐", fiber: "🌾",
  fatFree: "💧", vegan: "🌱", vegetarian: "🥦",
  proteinRich: "💪", liteProtein: "🫀",
};

function renderPropIcon(key: string): React.ReactNode {
  if (key === "glutenFree") return <GlutenFreeIcon size={24} />;
  if (key === "lactoseFree") return <LaktosefriIcon size={20} />;
  if (key === "lowLactose") return <LaktosefattigIcon size={20} />;
  return PROP_ICONS[key] ?? "•";
}
const CLINICAL_ICONS: Record<string, string> = {
  diabetes: "💉", pressureUlcers: "🩹", preoperative: "🔬", postoperative: "🏥",
  copd: "💨", kidneyFailure: "🫘", cancer: "🎗️",
  constipationDiarrhea: "🌿", malabsorption: "🧪", elderlyUndernutrition: "🧓",
};
const AGE_ICONS: Record<string, string> = {
  from1Year: "👶", from3Years: "🧒", over6Years: "🧑", elderly: "🧓",
};

// ─── Labels ───────────────────────────────────────────────────────────────────
const PROP_LABELS: Record<string, string> = {
  completeNutrition: "Komplett ernæring", fiber: "Kostfiber", glutenFree: "Glutenfri",
  lactoseFree: "Laktosefri", lowLactose: "Laktosefattig", fatFree: "Fettfri",
  vegan: "Vegansk", vegetarian: "Vegetarisk", proteinRich: "Proteinrik", liteProtein: "Lite protein",
};
const CLINICAL_LABELS: Record<string, string> = {
  diabetes: "Diabetes", pressureUlcers: "Trykksår", preoperative: "Preoperativ",
  postoperative: "Postoperativ", copd: "KOLS", kidneyFailure: "Nyresvikt",
  cancer: "Kreft", constipationDiarrhea: "Forstoppelse/Diaré",
  elderlyUndernutrition: "Underernæring eldre", malabsorption: "Malabsorpsjon",
};
const AGE_LABELS: Record<string, string> = {
  from1Year: "Fra 1 år", from3Years: "Fra 3 år", over6Years: "Over 6 år", elderly: "Eldre",
};

function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, "-"); }

/**
 * Normalize a product name for fuzzy prefix matching.
 * - Lowercase
 * - Remove pack descriptors: "4x125", "4x125ml", "4 x 200 ml"
 * - Collapse space between digit and letter: "2 kcal" → "2kcal"
 * - Collapse multiple spaces
 */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")                     // "4,0" → "4.0"
    .replace(/\+/g, " ")                                 // "2,0+fibre" → "2,0 fibre"
    .replace(/\d+\s*x\s*\d+\s*(?:ml|g|cl|l)?\b/g, "") // "4x125ml" etc.
    .replace(/(\d+)\s+([a-zA-Z])/g, "$1$2")             // "2 kcal" → "2kcal"
    .replace(/\bfibre\b/g, "fiber")                      // "fibre" → "fiber"
    .replace(/\bfibr\b/g, "fiber")                       // "fibr" → "fiber"
    .replace(/\bfib\b/g, "fiber")                        // "fib" → "fiber"
    .replace(/\bcomp\b/g, "compact")                     // "comp" → "compact"
    .replace(/\bactiv\b/g, "active")                     // "activ" → "active"
    .replace(/\bfr\b/g, "fruit")                         // "dessert fr" → "dessert fruit"
    .replace(/\bjucy\b/g, "juicy")                       // catalog typo: "jucy" → "juicy"
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Auto image ───────────────────────────────────────────────────────────────
const EXTS = ["jpg", "jpeg", "png", "webp"];
function ProductImage({ id, name }: { id: string; name: string; catBg?: string }) {
  const [idx, setIdx]       = useState(0);
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 36, fontWeight: 900, color: "#94a3b8", opacity: 0.35, userSelect: "none" }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
  return (
    <img key={idx} src={`/nutrition/${id}.${EXTS[idx]}`} alt={name}
      onError={() => idx + 1 < EXTS.length ? setIdx(i => i + 1) : setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} />
  );
}

// ─── Clinical dot ─────────────────────────────────────────────────────────────
function ClinicalDot({ icon, label, caution }: { icon: string; label: string; caution?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <span title={label}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        justifyContent: "center", width: 26, height: 26, borderRadius: 8,
        fontSize: 13, cursor: "default", flexShrink: 0, userSelect: "none",
        background: caution ? "#fef3c7" : "#f1f5f9",
        outline: caution ? "1.5px solid #d97706" : "1.5px solid #e2e8f0",
        transition: "transform 0.1s, box-shadow 0.1s",
        transform: hov ? "scale(1.2)" : "scale(1)",
        boxShadow: hov ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
      }}>
      {icon}
      {hov && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 5px)", left: "50%",
          transform: "translateX(-50%)", background: "#0f172a", color: "#f8fafc",
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 99,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          {caution ? "⚠ " : ""}{label}
        </span>
      )}
    </span>
  );
}

// ─── Quick chip ───────────────────────────────────────────────────────────────
function QuickChip({ label, icon, active, color, onClick }:
  { label: string; icon: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: `1.5px solid ${active ? color : "#e2e8f0"}`,
      background: active ? color : "#fff",
      color: active ? "#fff" : "#374151",
      transition: "all 0.14s ease", whiteSpace: "nowrap",
      boxShadow: active ? `0 2px 8px ${color}44` : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>{label}
    </button>
  );
}

// ─── Sidebar pill filter ──────────────────────────────────────────────────────
function SidebarPill({ label, icon, color, checked, onChange }:
  { label: string; icon?: React.ReactNode; color?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%",
      padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
      background: checked ? (color ? `${color}18` : "#f1f5f9") : "transparent",
      textAlign: "left", transition: "background 0.12s ease",
    }}>
      {icon ? (
        <span style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: checked ? (color ? `${color}30` : "#e2e8f0") : "#f1f5f9",
          border: `1.5px solid ${checked ? (color ?? "#94a3b8") : "#e2e8f0"}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, transition: "all 0.12s ease",
        }}>{icon}</span>
      ) : color ? (
        <span style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
          background: checked ? color : "#cbd5e1", transition: "background 0.12s",
        }} />
      ) : null}
      <span style={{
        fontSize: 12.5, fontWeight: checked ? 600 : 400,
        color: checked ? "#0f172a" : "#475569", lineHeight: 1.2,
      }}>{label}</span>
      {checked && (
        <span style={{
          marginLeft: "auto", width: 16, height: 16, borderRadius: "50%",
          background: color ?? "#64748b", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── FilterSection ────────────────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, paddingLeft: 4,
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

// ─── VNR Modal ────────────────────────────────────────────────────────────────
function VnrModal({ productName, rows, onClose }: {
  productName: string;
  rows: VariantRow[];
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 18,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        width: "100%", maxWidth: 480,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              VNR-varianter
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{productName}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 999,
              border: "1px solid #e2e8f0", background: "#f8fafc",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: "#64748b",
            }}
          >✕</button>
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            padding: "6px 20px 4px",
            borderBottom: "1px solid #f1f5f9",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Smak / variant</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>VNR</span>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.vnr}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                padding: "10px 20px",
                background: i % 2 === 0 ? "#fff" : "#f8fafc",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                {row.flavor || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Nøytral</span>}
              </span>
              <span style={{
                fontSize: 13, fontFamily: "monospace", fontWeight: 600,
                color: "#475569", letterSpacing: "0.04em",
              }}>
                {row.vnr}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 20px", borderRadius: 10,
              background: "#0f172a", border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer",
            }}
          >
            Lukk
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, variant }: { product: NutritionProduct; variant?: VariantInfo }) {
  const propEntries     = Object.entries(product.properties).filter(([, v]) => v === true) as [string, boolean][];
  const clinicalEntries = Object.entries(product.clinicalUse).filter(([, v]) => v !== undefined && v !== false) as [string, boolean | "caution"][];
  const ageEntries      = Object.entries(product.age).filter(([, v]) => v === true) as [string, boolean][];
  const cat             = getCat(product.category);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.11)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)";
      }}
    >
      {/* Image area */}
      <div style={{
        height: 110, background: `linear-gradient(145deg, ${cat.bg}, #f8fafc)`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <ProductImage id={product.id} name={product.name} catBg={cat.bg} />
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {/* Category pill */}
        <span style={{
          alignSelf: "flex-start", fontSize: 10, fontWeight: 700,
          padding: "2px 8px", borderRadius: 999,
          background: cat.bg, color: cat.text, letterSpacing: "0.04em",
        }}>
          {product.category}
        </span>

        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
          {product.name}
        </div>

        {/* VNR variants */}
        {variant && variant.rows.length > 0 && (
          <>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 999,
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                fontSize: 10, fontWeight: 600, color: "#475569",
                cursor: "pointer",
              }}
            >
              🏷 {variant.rows.length} VNR-variant{variant.rows.length !== 1 ? "er" : ""}
            </button>
            {modalOpen && (
              <VnrModal
                productName={product.name}
                rows={variant.rows}
                onClose={() => setModalOpen(false)}
              />
            )}
          </>
        )}

        {/* Property pills */}
        {propEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {propEntries.map(([key]) => (
              <span key={key} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 999, fontSize: 8, fontWeight: 600,
                color: getC(key), background: `${getC(key)}12`,
                border: `1px solid ${getC(key)}30`,
              }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}>{renderPropIcon(key)}</span>
                {PROP_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        )}

        {/* Clinical icons */}
        {clinicalEntries.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
              Klinisk egnet ved
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {clinicalEntries.map(([key, val]) => (
                <ClinicalDot key={key}
                  icon={CLINICAL_ICONS[key] ?? "•"}
                  label={CLINICAL_LABELS[key] ?? key}
                  caution={val === "caution"} />
              ))}
            </div>
          </div>
        )}

        {/* Spacer + footer */}
        <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
          {ageEntries.map(([key]) => (
            <span key={key} style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, fontWeight: 500, color: "#64748b",
            }}>
              <span style={{ fontSize: 11 }}>{AGE_ICONS[key] ?? "👤"}</span>
              {AGE_LABELS[key] ?? key}
            </span>
          ))}
          {product.notes?.map((note, i) => (
            <span key={i} style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>{note}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const VNR_RE   = /^\d+$/;

export default function NutritionProductFinder({ catalogProducts = [] }: { catalogProducts?: CatalogProduct[] }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search,          setSearch]          = useState("");
  const [page,            setPage]            = useState(1);
  const [filterAge,       setFilterAge]       = useState<Record<string, boolean>>({});
  const [filterClinical,  setFilterClinical]  = useState<Record<string, boolean>>({});
  const [filterProps,     setFilterProps]     = useState<Record<string, boolean>>({});

  // Ctrl+S / Cmd+S → focus search field
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const input = searchRef.current;
        if (!input) return;
        input.focus();
        input.select();
        return;
      }
      if (e.key === "Escape" && searchRef.current === document.activeElement) {
        e.preventDefault();
        setSearch("");
        setPage(1);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Build nutrition product id → VariantInfo from catalog
  const variantMap = useMemo(
    () => buildVariantMap(catalogProducts, nutritionProducts),
    [catalogProducts]
  );

  // Build vnr digits → nutrition product id for VNR search
  const vnrIndex = useMemo(() => {
    const idx = new Map<string, string>(); // digits → np.id
    for (const [npId, info] of variantMap) {
      for (const { vnr } of info.rows) {
        const digits = vnr.replace(/\D/g, "").replace(/^0+/, "") || vnr.replace(/\D/g, "");
        if (digits) idx.set(digits, npId);
      }
    }
    return idx;
  }, [variantMap]);

  const toggle = useCallback((
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string, val: boolean
  ) => {
    setter(prev => { const n = { ...prev }; if (!val) delete n[key]; else n[key] = true; return n; });
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setSearch(""); setFilterAge({}); setFilterClinical({}); setFilterProps({}); setPage(1);
  }, []);

  const activeAge      = Object.keys(filterAge).filter(k => filterAge[k]);
  const activeClinical = Object.keys(filterClinical).filter(k => filterClinical[k]);
  const activeProps    = Object.keys(filterProps).filter(k => filterProps[k]);
  const hasActive      = !!(search.trim() || activeAge.length || activeClinical.length || activeProps.length);

  const filtered = useMemo(() => {
    let list = [...nutritionProducts];
    const q = search.trim();

    if (q) {
      // VNR search: purely numeric → match via vnrIndex
      if (VNR_RE.test(q)) {
        const digits = q.replace(/^0+/, "") || q;
        const matchedIds = new Set<string>();
        for (const [vnrDigits, npId] of vnrIndex) {
          if (vnrDigits === digits || vnrDigits.startsWith(digits) || digits.startsWith(vnrDigits)) {
            matchedIds.add(npId);
          }
        }
        if (matchedIds.size > 0) {
          list = list.filter(p => matchedIds.has(p.id));
        } else {
          // Fall back to name search if no VNR match
          list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
        }
      } else {
        const ql = q.toLowerCase();
        list = list.filter(p =>
          p.name.toLowerCase().includes(ql) ||
          p.category.toLowerCase().includes(ql) ||
          (p.notes ?? []).some(n => n.toLowerCase().includes(ql))
        );
      }
    }

    if (activeAge.length)
      list = list.filter(p => activeAge.some(k => (p.age as Record<string, boolean>)[k]));
    if (activeClinical.length)
      list = list.filter(p => activeClinical.some(k => {
        const v = (p.clinicalUse as Record<string, boolean | "caution">)[k];
        return v === true || v === "caution";
      }));
    if (activeProps.length)
      list = list.filter(p => activeProps.some(k => {
        if (k.startsWith("cat:")) return slugify(p.category) === k.slice(4);
        return (p.properties as Record<string, boolean>)[k] === true;
      }));
    list.sort((a, b) => a.name.localeCompare(b.name, "nb"));
    return list;
  }, [search, activeAge, activeClinical, activeProps, vnrIndex]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const quickFilters = [
    { key: "completeNutrition", label: "Komplett ernæring", icon: "⭐", type: "prop",     color: C.completeNutrition },
    { key: "fiber",             label: "Kostfiber",          icon: "🌾", type: "prop",     color: C.fiber },
    { key: "proteinRich",       label: "Proteinrik",         icon: "💪", type: "prop",     color: C.proteinRich },
    { key: "diabetes",          label: "Diabetes",           icon: "💉", type: "clinical", color: C.diabetes },
    { key: "kidneyFailure",     label: "Nyresvikt",          icon: "🫘", type: "clinical", color: C.kidneyFailure },
    { key: "cancer",            label: "Kreft",              icon: "🎗️", type: "clinical", color: C.cancer },
    { key: "preoperative",      label: "Pre/Post-op",        icon: "🔬", type: "clinical", color: C.preoperative },
    { key: "copd",              label: "KOLS",               icon: "💨", type: "clinical", color: C.copd },
    { key: "from1Year",         label: "Barn",               icon: "👶", type: "age",      color: "#475569" },
    { key: "elderly",           label: "Eldre",              icon: "🧓", type: "age",      color: C.elderlyUndernutrition },
  ];

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column",
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "10px 20px", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 4 }}>
            Hurtigfilter
          </span>
          {quickFilters.map(qf => {
            const fm     = qf.type === "prop" ? filterProps : qf.type === "clinical" ? filterClinical : filterAge;
            const setter = qf.type === "prop" ? setFilterProps : qf.type === "clinical" ? setFilterClinical : setFilterAge;
            const active = !!fm[qf.key];
            return (
              <QuickChip key={qf.key} label={qf.label} icon={qf.icon}
                active={active} color={qf.color}
                onClick={() => toggle(setter, qf.key, !active)} />
            );
          })}
          <button style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
            border: "1.5px dashed #cbd5e1", background: "transparent", color: "#94a3b8",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }} title="Bruk sidefilteret for mer">
            🔧 Flere filtre
          </button>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside style={{
          width: 210, minWidth: 190, background: "#fff",
          borderRight: "1px solid #e2e8f0", padding: "16px 10px",
          overflowY: "auto", flexShrink: 0,
        }}>
          <FilterSection title="Alder">
            {Object.entries(AGE_LABELS).map(([k, label]) => (
              <SidebarPill key={k} label={label} icon={AGE_ICONS[k]}
                checked={!!filterAge[k]} onChange={v => toggle(setFilterAge, k, v)} />
            ))}
          </FilterSection>

          <FilterSection title="Tilstand / Indikasjon">
            {Object.entries(CLINICAL_LABELS).map(([k, label]) => (
              <SidebarPill key={k} label={label} icon={CLINICAL_ICONS[k]} color={getC(k)}
                checked={!!filterClinical[k]} onChange={v => toggle(setFilterClinical, k, v)} />
            ))}
          </FilterSection>

          <FilterSection title="Andre filter">
            {Object.entries(PROP_LABELS).map(([k, label]) => (
              <SidebarPill key={k} label={label} icon={renderPropIcon(k)} color={getC(k)}
                checked={!!filterProps[k]} onChange={v => toggle(setFilterProps, k, v)} />
            ))}
          </FilterSection>

          <FilterSection title="Kategori">
            {Array.from(new Set(nutritionProducts.map(p => p.category))).sort().map(cat => (
              <SidebarPill key={cat} label={cat} color={getCat(cat).text}
                checked={!!filterProps[`cat:${slugify(cat)}`]}
                onChange={v => toggle(setFilterProps, `cat:${slugify(cat)}`, v)} />
            ))}
          </FilterSection>

          <div style={{
            margin: "8px 4px 0", padding: "8px 10px", borderRadius: 10,
            background: "#fefce8", border: "1px solid #fde68a",
            fontSize: 10, color: "#92400e", fontWeight: 500, lineHeight: 1.5,
          }}>
            ℹ Kliniske ikoner med ⚠ = forsiktighet – krever avtale med lege/KEF
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minWidth: 0 }}>

          {/* Search + count row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
              padding: "6px 12px", minWidth: 180, maxWidth: 280, flex: "0 0 auto",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <span style={{ color: "#94a3b8", fontSize: 14 }}>🔍</span>
              <input ref={searchRef} type="text" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Søk etter produkt..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#0f172a" }}
                onFocus={async () => {
                  try {
                    const text = (await navigator.clipboard.readText()).trim();
                    if (/^\d+$/.test(text)) { setSearch(text); setPage(1); }
                  } catch { /* clipboard access denied — silently ignore */ }
                }} />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 0, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>

            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              {filtered.length} produkter
              {totalPages > 1 && <span style={{ color: "#94a3b8" }}> · Side {currentPage}/{totalPages}</span>}
            </span>

            {hasActive && (
              <button onClick={reset} style={{
                marginLeft: "auto", padding: "5px 13px", borderRadius: 8,
                border: "1.5px solid #fca5a5", background: "#fff", color: "#dc2626",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>
                ↺ Nullstill filter
              </button>
            )}
          </div>

          {/* Grid */}
          {pageItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Ingen produkter matcher søket</div>
              {hasActive && (
                <button onClick={reset} style={{
                  marginTop: 12, color: "#3b82f6", background: "none", border: "none",
                  cursor: "pointer", fontSize: 13, textDecoration: "underline",
                }}>Nullstill filtre</button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
              {pageItems.map(p => <ProductCard key={p.id} product={p} variant={variantMap.get(p.id)} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 28, flexWrap: "wrap" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  background: currentPage === 1 ? "#f8fafc" : "#fff",
                  color: currentPage === 1 ? "#cbd5e1" : "#374151",
                  cursor: currentPage === 1 ? "default" : "pointer",
                  fontSize: 12, fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}>← Forrige</button>

              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} style={{
                  padding: "6px 11px", borderRadius: 8, minWidth: 36,
                  border: `1.5px solid ${n === currentPage ? "#3b82f6" : "#e2e8f0"}`,
                  background: n === currentPage ? "#3b82f6" : "#fff",
                  color: n === currentPage ? "#fff" : "#374151",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                  boxShadow: n === currentPage ? "0 2px 8px #3b82f633" : "0 1px 2px rgba(0,0,0,0.04)",
                }}>{n}</button>
              ))}
              {totalPages > 8 && <span style={{ color: "#94a3b8", fontSize: 12 }}>…</span>}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  background: currentPage === totalPages ? "#f8fafc" : "#fff",
                  color: currentPage === totalPages ? "#cbd5e1" : "#374151",
                  cursor: currentPage === totalPages ? "default" : "pointer",
                  fontSize: 12, fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}>Neste →</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
