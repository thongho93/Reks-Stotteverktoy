import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Dialog, GlobalStyles as CssVars, useTheme } from "@mui/material";
import { nutritionProducts, type NutritionProduct } from "../data/nutritionProducts";
import { buildVariantMap, type CatalogProduct, type VariantInfo } from "../data/nutritionVariants";
import { MK, MK_DARK_VARS, MK_LIGHT_VARS } from "./melkeTheme";

// ─── Etiketter og grupper ────────────────────────────────────────────────────
type GroupKey = "cond" | "prop" | "age" | "cat";
type Selection = Record<GroupKey, string[]>;
type Option = { key: string; label: string; count: number; on: boolean };

const PROP_LABELS: Record<string, string> = {
  completeNutrition: "Komplett ernæring", fiber: "Kostfiber", glutenFree: "Glutenfri",
  lactoseFree: "Laktosefri", lowLactose: "Laktosefattig", fatFree: "Fettfri",
  vegan: "Vegansk", vegetarian: "Vegetarisk", proteinRich: "Proteinrik", liteProtein: "Lite protein",
};
const CLINICAL_LABELS: Record<string, string> = {
  diabetes: "Diabetes", pressureUlcers: "Trykksår", preoperative: "Preoperativ",
  postoperative: "Postoperativ", copd: "KOLS", kidneyFailure: "Nyresvikt",
  cancer: "Kreft", constipationDiarrhea: "Forstoppelse/diaré",
  elderlyUndernutrition: "Underernæring eldre", malabsorption: "Malabsorpsjon",
  diseaseRelatedMalnutrition: "Sykdomsrelatert underernæring", dysphagia: "Dysfagi", crohnsDisease: "Crohns sykdom",
};
const AGE_LABELS: Record<string, string> = {
  fromInfancy: "Fra spedbarn", from1Year: "Fra 1 år", from3Years: "Fra 3 år", from5Years: "Fra 5 år", over6Years: "Over 6 år", from15Years: "Fra 15 år", elderly: "Eldre",
};
const ALL_LABELS: Record<string, string> = { ...CLINICAL_LABELS, ...PROP_LABELS, ...AGE_LABELS };
const GROUP_NAMES: Record<GroupKey, string> = { cond: "Egnet ved", prop: "Egenskap", age: "Alder", cat: "Kategori" };

// ─── Indeks over produktene (bygges én gang) ─────────────────────────────────
type Indexed = {
  p: NutritionProduct;
  conds: string[];
  props: string[];
  ages: string[];
  unreviewed: boolean;
  hay: string;
};

const trueKeys = (o: object): string[] =>
  Object.entries(o).filter(([, v]) => v === true || v === "caution").map(([k]) => k);

const INDEX: Indexed[] = nutritionProducts.map((p) => {
  const conds = trueKeys(p.clinicalUse);
  const props = trueKeys(p.properties);
  const ages = trueKeys(p.age);
  const unreviewed = p.unreviewed === true;
  const hay = [p.name, p.category, p.summary ?? "", p.indication ?? "", p.description ?? "", ...(p.notes ?? []), ...(unreviewed ? ["ikke gjennomgått"] : []), ...conds, ...props, ...ages]
    .map((s) => ALL_LABELS[s] ?? s)
    .join(" ")
    .toLowerCase();
  return { p, conds, props, ages, unreviewed, hay };
});

const CATEGORIES = Array.from(new Set(nutritionProducts.map((p) => p.category))).sort((a, b) => a.localeCompare(b, "nb"));
const countWhere = (fn: (x: Indexed) => boolean) => INDEX.filter(fn).length;

function ageSummary(ages: string[]): string {
  if (ages.includes("fromInfancy")) return "Fra spedbarn";
  if (ages.includes("from1Year")) return "Fra 1 år";
  if (ages.includes("from3Years")) return "Fra 3 år";
  if (ages.includes("from5Years")) return "Fra 5 år";
  if (ages.includes("over6Years")) return "Over 6 år";
  if (ages.includes("from15Years")) return "Fra 15 år";
  if (ages.includes("elderly")) return "Eldre";
  return "Alder ikke oppgitt";
}

// Kortene fyller bredden (så mange kolonner som får plass) og siden fyller høyden (så mange rader som får plass).
const CARD_MIN_WIDTH = 320;
const CARD_GAP = 10;
const ROW_HEIGHT = 124; // kort + mellomrom, med litt luft for kort med to rader tagger
const CHROME_HEIGHT = 160; // antall-linjen, sidetall og mellomrom rundt listen
const MIN_ROWS = 3;
const MAX_ROWS = 6;
const MAX_SCALE = 1.4; // hvor mye kortene kan skaleres opp når det er god plass
const VNR_RE = /^\d+$/;
const EMPTY_SELECTION: Selection = { cond: [], prop: [], age: [], cat: [] };

// ─── Stil (bruker samme fargevariabler som Melkeerstatning, også i mørk modus) ─
const CSS = `
.nm-root{font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif;color:${MK.text};background:${MK.bg};padding:14px 18px 24px;box-sizing:border-box}
.nm-root button,.nm-root input,.nm-root select{font-family:inherit}
.nm-root button:focus-visible,.nm-root input:focus-visible,.nm-root select:focus-visible{outline:2px solid ${MK.accent};outline-offset:2px}
.nm-root input::placeholder{color:${MK.muted}}
.nm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.nm-chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:13.5px;font-weight:600;cursor:pointer;transition:border-color .12s,background .12s}
.nm-chip:hover{border-color:${MK.hoverBorder};background:${MK.hover}}
.nm-chip[aria-pressed="true"]{background:${MK.accentBg};border-color:${MK.accentBg};color:${MK.onAccent}}
.nm-trig{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 14px;border-radius:12px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer}
.nm-trig:hover{border-color:${MK.hoverBorder}}
.nm-trig[data-active="true"]{border-color:${MK.accent};background:${MK.pill};color:${MK.pillText}}
.nm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;background:${MK.accentBg};color:${MK.onAccent};font-size:12px;font-weight:700}
.nm-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;z-index:20;border:0;padding:0;background:transparent;cursor:default}
.nm-menu{position:absolute;top:52px;left:0;z-index:21;width:260px;max-height:340px;overflow:auto;box-sizing:border-box;padding:6px;border-radius:14px;border:1px solid ${MK.borderMed};background:${MK.surface};box-shadow:0 14px 36px ${MK.shadow}}
.nm-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:${MK.text};font-size:14px;text-align:left;cursor:pointer}
.nm-opt:hover{background:${MK.hover}}
.nm-box{flex:none;display:grid;place-items:center;width:20px;height:20px;box-sizing:border-box;border-radius:6px;border:1.5px solid ${MK.borderAccent};background:${MK.surface}}
.nm-box svg{opacity:0}
.nm-opt[aria-pressed="true"] .nm-box{background:${MK.accentBg};border-color:${MK.accentBg}}
.nm-opt[aria-pressed="true"] .nm-box svg{opacity:1}
.nm-active{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 6px 0 12px;border-radius:999px;border:0;background:${MK.pill};color:${MK.pillText};font-size:13px;font-weight:600;cursor:pointer}
.nm-active:hover{background:${MK.pillHover}}
.nm-link{border:0;background:transparent;padding:6px 4px;color:${MK.accent};font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.nm-row{display:grid;grid-template-columns:calc(48px*var(--nm-s,1)) minmax(0,1fr) 20px;grid-template-areas:"thumb head chev" "thumb tags tags";gap:calc(6px*var(--nm-s,1)) calc(12px*var(--nm-s,1));align-items:center;align-content:center;width:100%;box-sizing:border-box;padding:calc(10px*var(--nm-s,1)) calc(12px*var(--nm-s,1));border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.nm-row:hover{background:${MK.sel}}
.nm-chev{display:grid;place-items:center}
.nm-thumb{width:calc(48px*var(--nm-s,1));height:calc(48px*var(--nm-s,1));border-radius:calc(10px*var(--nm-s,1));overflow:hidden;background:${MK.thumbBg};border:1px solid ${MK.lineSoft};box-sizing:border-box;display:grid;grid-template:100%/100%;place-items:center}
.nm-thumb.nm-tall{height:calc(72px*var(--nm-s,1))}
.nm-thumb img{width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box}
.nm-mono{width:100%;height:100%;display:grid;place-items:center;background:${MK.pill};color:${MK.pillText};font-size:calc(20px*var(--nm-s,1));font-weight:700}
.nm-tag{display:inline-flex;align-items:center;min-height:calc(24px*var(--nm-s,1));padding:0 calc(9px*var(--nm-s,1));border-radius:7px;background:${MK.alt};border:1px solid ${MK.lineSoft};color:${MK.sub};font-size:calc(12px*var(--nm-s,1));font-weight:500;white-space:nowrap}
.nm-tag-more{background:transparent;border:1px dashed ${MK.borderAccent};color:${MK.muted}}
.nm-tag-warn{background:${MK.warnBg};border:1px solid ${MK.warnBorder};color:${MK.warnText}}
.nm-h{margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${MK.muted}}
.nm-cnt{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 7px;box-sizing:border-box;border-radius:11px;background:${MK.pill};color:${MK.pillText};font-size:12px;font-weight:700}
.nm-dchip{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:0 11px;border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:.01em}
.nm-dchip-cat{background:${MK.surface};border:1px solid ${MK.borderMed};color:${MK.sub}}
.nm-dchip-warn{background:${MK.warnBg};border:1px solid ${MK.warnBorder};color:${MK.warnText}}
.nm-age{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 13px 0 10px;box-sizing:border-box;border-radius:999px;border:1px solid ${MK.accent};background:${MK.pill};color:${MK.pillText};font-size:13.5px;font-weight:600}
.nm-ok{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;background:${MK.okBg};color:${MK.ok}}
.nm-cond{display:flex;align-items:center;gap:9px;min-height:36px;padding:0 12px;box-sizing:border-box;border-radius:10px;background:${MK.surface};border:1px solid ${MK.border};font-size:14px;font-weight:500}
.nm-dot{flex:none;width:10px;height:10px;border-radius:50%}
.nm-alert{flex:none;min-width:0;display:flex;align-items:flex-start;gap:12px;padding:12px 16px;box-sizing:border-box;border-radius:14px;background:${MK.warnBg};border:1.5px solid ${MK.warnBorder};color:${MK.warnText}}
.nm-alert-icon{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:${MK.warnText};color:${MK.warnBg}}
.nm-alert ul{margin:4px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:3px;font-size:14px;line-height:1.45}
.nm-accs{border:1px solid ${MK.border};border-radius:14px;background:${MK.surface};overflow:hidden}
.nm-acc + .nm-acc{border-top:1px solid ${MK.border}}
.nm-acc summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:0 16px;cursor:pointer;font-size:14.5px;font-weight:600;color:${MK.text}}
.nm-acc summary::-webkit-details-marker{display:none}
.nm-acc summary:hover{background:${MK.hover}}
.nm-acc summary:focus-visible{outline:2px solid ${MK.accent};outline-offset:-2px}
.nm-acc .nm-acc-chev{display:inline-flex;color:${MK.muted};transition:transform .15s}
.nm-acc[open] .nm-acc-chev{transform:rotate(180deg)}
.nm-acc-body{padding:2px 16px 16px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.5;color:${MK.sub}}
.nm-d{display:flex;flex:1 1 auto;min-height:0}
.nm-rail{flex:none;width:360px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:18px 24px;background:#2A1425;color:#fff;overflow:auto;scrollbar-width:none}
.nm-rail::-webkit-scrollbar{display:none}
.nm-rail > *{flex-shrink:0}
.nm-rail > .nm-rail-img{flex:1 1 124px;flex-shrink:1;min-height:56px;max-height:124px;display:flex;justify-content:center}
.nm-rail-eyebrow{margin:0;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#E6B8D2}
.nm-rstat{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:6px 0;border-top:1px solid rgba(255,255,255,.14);font-size:13.5px;color:#E9D3DF}
.nm-rstat b{font-weight:600;color:#fff;text-align:right}
.nm-rchip{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:2px 10px;box-sizing:border-box;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-weight:500}
.nm-rpdf{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:none;min-height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.45);background:transparent;color:#fff;font-size:14px;font-weight:600;text-decoration:none}
.nm-rpdf:hover{background:rgba(255,255,255,.12)}
.nm-rpdf:focus-visible{outline:2px solid #fff;outline-offset:2px}
.nm-d-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;background:${MK.soft}}
.nm-d-top{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px 0 28px;border-bottom:1px solid ${MK.border};background:${MK.surface}}
.nm-d-tabs{display:flex;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.nm-d-tabs::-webkit-scrollbar{display:none}
.nm-d-tab{flex:none;height:48px;padding:0 4px;margin-right:18px;border:0;border-bottom:3px solid transparent;background:transparent;color:${MK.sub};font-size:14.5px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}
.nm-d-tab:hover{color:${MK.text}}
.nm-d-tab[aria-selected="true"]{color:${MK.text};border-bottom-color:${MK.accent}}
.nm-d-tab[data-empty="true"]{color:${MK.muted};font-weight:500}
.nm-d-tab:focus-visible{outline:2px solid ${MK.accent};outline-offset:-2px;border-radius:8px}
.nm-d-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:20px 28px 28px;display:flex;flex-direction:column;gap:16px}
.nm-block{background:${MK.surface};border:1px solid ${MK.border};border-radius:20px;padding:18px 20px}
.nm-block p{margin:0}
.nm-b-row{display:flex;align-items:center;gap:12px;min-height:50px;padding:0 16px;box-sizing:border-box;border-radius:16px;background:${MK.surface};border:1px solid ${MK.border};font-size:15px;font-weight:500}
.nm-big{margin:8px 0 4px;font-size:42px;line-height:1.05;font-weight:650;letter-spacing:-0.035em}
.nm-empty{margin:0;padding:18px 16px;border-radius:14px;border:1px dashed ${MK.borderAccent};background:${MK.surface};color:${MK.muted};font-size:14px}
@media (max-width:760px){.nm-d{flex-direction:column;overflow-y:auto}.nm-rail{width:auto;overflow:visible}.nm-d-main{flex:none;overflow:visible}.nm-d-body{overflow:visible}}
.nm-doc-sm{min-height:34px;padding:0 12px;border-radius:10px;font-size:13.5px}
.nm-vnr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 6px 6px 12px;box-sizing:border-box;border-radius:10px;border:1px solid ${MK.border};background:${MK.surface}}
.nm-table{width:100%;border-collapse:collapse;font-size:13.5px}
.nm-table th{padding:8px 12px;text-align:right;font-size:11.5px;font-weight:600;color:${MK.muted};background:${MK.alt};border-bottom:1px solid ${MK.border}}
.nm-table th:first-child{text-align:left}
.nm-table td{padding:6px 12px;text-align:right;font-variant-numeric:tabular-nums;border-bottom:1px solid ${MK.lineSoft}}
.nm-table td:first-child{text-align:left}
.nm-table tr:last-child td{border-bottom:0}
.nm-table .nm-sub td{color:${MK.muted};font-size:12.5px}
.nm-table .nm-sub td:first-child{padding-left:26px}
.nm-doc{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid ${MK.accent};background:${MK.surface};color:${MK.accent};font-size:14.5px;font-weight:600;text-decoration:none}
.nm-doc:hover{background:${MK.pill}}
.nm-doc:focus-visible{outline:2px solid ${MK.accent};outline-offset:2px}
.nm-more{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;border-radius:12px;border:1px solid ${MK.accent};background:${MK.surface};color:${MK.accent};font-size:14.5px;font-weight:600;cursor:pointer}
.nm-more:hover{background:${MK.pill}}
.nm-select{min-height:36px;padding:0 10px;border-radius:10px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer}
.nm-copy{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:0 10px;border-radius:8px;border:1px solid ${MK.borderMed};background:${MK.alt};color:${MK.text};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13.5px;font-weight:600;letter-spacing:.03em;cursor:pointer}
.nm-copy:hover{border-color:${MK.accent};background:${MK.pill};color:${MK.pillText}}
.nm-close{display:inline-grid;place-items:center;flex:none;width:40px;height:40px;border:0;border-radius:11px;background:${MK.surface};box-shadow:inset 0 0 0 1px ${MK.border};color:${MK.sub};cursor:pointer}
.nm-close:hover{background:${MK.hover}}
.nm-close:focus-visible,.nm-copy:focus-visible,.nm-more:focus-visible{outline:2px solid ${MK.accent};outline-offset:2px}
.nm-pages{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px}
.nm-page{display:inline-grid;place-items:center;min-width:40px;height:40px;padding:0 10px;box-sizing:border-box;border-radius:10px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer}
.nm-page:hover:not(:disabled){background:${MK.hover};border-color:${MK.hoverBorder}}
.nm-page[aria-current="page"]{background:${MK.accentBg};border-color:${MK.accentBg};color:${MK.onAccent}}
.nm-page:disabled{opacity:.4;cursor:default}
.nm-gap{display:inline-grid;place-items:center;min-width:20px;height:40px;color:${MK.muted}}
`;

// ─── Ikoner ──────────────────────────────────────────────────────────────────
const svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const CloseIcon = ({ size = 16, stroke = 2.4 }: { size?: number; stroke?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={stroke} {...svgProps}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
const ChevronIcon = ({ size = 16, stroke = 2.2 }: { size?: number; stroke?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={stroke} {...svgProps}><path d="m6 9 6 6 6-6" /></svg>
);
const CheckIcon = ({ size = 12, stroke = 3.2 }: { size?: number; stroke?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={stroke} {...svgProps}><path d="m5 12 5 5 9-10" /></svg>
);

const WarnIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...svgProps}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v5M12 18h.01" /></svg>
);
const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
);
const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2.2" {...svgProps}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
);

// Fargeprikker per tilstand (kun pynt – navnet står alltid ved siden av).
const COND_COLORS: Record<string, string> = {
  diabetes: "#3B82F6", pressureUlcers: "#EF4444", preoperative: "#8B5CF6", postoperative: "#7C3AED",
  copd: "#14B8A6", kidneyFailure: "#D97706", cancer: "#DB2777", constipationDiarrhea: "#65A30D",
  elderlyUndernutrition: "#0EA5E9", malabsorption: "#F97316", diseaseRelatedMalnutrition: "#6366F1", dysphagia: "#CA8A04", crohnsDisease: "#BE123C",
};

// ─── Produktbilde (med bokstav som reserve) ──────────────────────────────────
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const missingImages = new Set<string>();

function ProductThumb({ id, name, size, fit }: { id: string; name: string; size?: number; /** Fyll høyden til en fleksibel beholder (kvadratisk). */ fit?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(() => missingImages.has(id));
  const [tall, setTall] = useState(false);
  return (
    <span
      className={tall && !size && !fit ? "nm-thumb nm-tall" : "nm-thumb"}
      aria-hidden="true"
      style={fit ? { width: "auto", height: "100%", aspectRatio: "1 / 1", maxWidth: "100%", borderRadius: 22 } : size ? { width: size, height: size, borderRadius: size / 4 } : undefined}
    >
      {failed ? (
        <span className="nm-mono" style={size ? { fontSize: size * 0.42 } : undefined}>{name.charAt(0).toUpperCase()}</span>
      ) : (
        <img
          key={idx}
          src={`/nutrition/${id}.${IMAGE_EXTS[idx]}`}
          alt=""
          loading="lazy"
          onLoad={(e) => setTall(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.3)}
          onError={() => {
            if (idx + 1 < IMAGE_EXTS.length) setIdx(idx + 1);
            else {
              missingImages.add(id);
              setFailed(true);
            }
          }}
        />
      )}
    </span>
  );
}

// ─── Nedtrekksmeny for filter ────────────────────────────────────────────────
function FilterMenu({
  label, options, open, onToggle, onClose, onPick,
}: {
  label: string;
  options: Option[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const active = options.filter((o) => o.on).length;
  return (
    <div
      style={{ position: "relative" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button type="button" className="nm-trig" data-active={active > 0} aria-haspopup="true" aria-expanded={open} onClick={onToggle}>
        {label}
        {active > 0 && <span className="nm-badge">{active}</span>}
        <ChevronIcon />
      </button>
      {open && (
        <>
          <button type="button" className="nm-backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
          <div className="nm-menu" role="group" aria-label={label}>
            {options.map((o) => (
              <button key={o.key} type="button" className="nm-opt" aria-pressed={o.on} onClick={() => onPick(o.key)}>
                <span className="nm-box"><CheckIcon /></span>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sidetall (1 2 3 … 17) ───────────────────────────────────────────────────
function pageNumbers(page: number, total: number): (number | "gap")[] {
  const pages = new Set<number>([1, total]);
  const start = Math.max(1, Math.min(page - 1, total - 3));
  const end = Math.min(total, Math.max(page + 1, 4));
  for (let i = start; i <= end; i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Sider" className="nm-pages">
      <button type="button" className="nm-page" aria-label="Forrige side" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}><ChevronIcon size={18} /></span>
      </button>
      {pageNumbers(page, totalPages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="nm-gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={n}
            type="button"
            className="nm-page"
            aria-label={`Side ${n}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        )
      )}
      <button type="button" className="nm-page" aria-label="Neste side" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}><ChevronIcon size={18} /></span>
      </button>
    </nav>
  );
}

// ─── Produktkort i listen (åpner pop-up) ─────────────────────────────────────
function ProductRow({ item, onOpen }: { item: Indexed; onOpen: () => void }) {
  const { p, conds, ages, unreviewed } = item;
  const condNames = conds.map((k) => CLINICAL_LABELS[k] ?? k);
  const meta = [p.category, p.ageNote ?? (ages.length > 0 ? ageSummary(ages) : null)].filter(Boolean).join(" · ");

  return (
    <li style={{ display: "flex", background: MK.surface, border: `1px solid ${MK.border}`, borderRadius: 14, overflow: "hidden" }}>
      <button type="button" className="nm-row" aria-haspopup="dialog" onClick={onOpen}>
        <span style={{ gridArea: "thumb", display: "inline-flex" }}><ProductThumb id={p.id} name={p.name} /></span>
        <span style={{ gridArea: "head", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: "calc(15px * var(--nm-s, 1))", fontWeight: 600, letterSpacing: "-0.01em", overflowWrap: "anywhere" }}>{p.name}</span>
          <span style={{ fontSize: "calc(12.5px * var(--nm-s, 1))", color: MK.muted }}>{meta}</span>
        </span>
        <span style={{ gridArea: "tags", minWidth: 0, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {condNames.slice(0, 3).map((c) => <span key={c} className="nm-tag">{c}</span>)}
          {condNames.length > 3 && <span className="nm-tag nm-tag-more">+{condNames.length - 3}</span>}
          {condNames.length === 0 && (unreviewed
            ? <span className="nm-tag nm-tag-warn">Ikke gjennomgått</span>
            : <span style={{ fontSize: "calc(12.5px * var(--nm-s, 1))", color: MK.muted }}>{p.indication ?? "Ingen klinisk indikasjon oppgitt"}</span>)}
        </span>
        <span className="nm-chev" aria-hidden="true" style={{ gridArea: "chev", color: MK.muted, transform: "rotate(-90deg)" }}>
          <ChevronIcon size={18} />
        </span>
      </button>
    </li>
  );
}

// Seksjonene fra produktarkene fordeles på fanene i produktkortet (samme inndeling som på farmasiet.no).
const INTRO_SECTION = /^bruksområde$/i;
const INGREDIENT_SECTION = /^ingredienser$/i;
const COMPOSITION_SECTION = /^sammensetning$/i;
const ORDER_SECTION = /^bestilling$/i;
const USE_SECTION = /dosering|tilbered|slik blander|^bruk$|oppbevaring|holdbarhet|hengetid|lagring|blandingsforhold|husholdningsmål|berikning/i;

type DialogTab = "info" | "use" | "ingredients" | "vnr";

// ─── Pop-up med produktkort ──────────────────────────────────────────────────
const DIALOG_FONT = "-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif";

function ProductDialog({
  item, variant, onClose, copiedVnr, onCopy,
}: {
  item: Indexed;
  variant?: VariantInfo;
  onClose: () => void;
  copiedVnr: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const { p, conds, props, ages, unreviewed } = item;
  const rows = variant?.rows ?? [];
  const headline = (p.summary ?? "").split(" · ")[0];
  const ageText = p.ageNote ?? (ages.length > 0 ? ageSummary(ages) : "Ikke oppgitt");
  const traits = [...props.map((k) => PROP_LABELS[k] ?? k), ...(p.facts?.traits ?? [])];
  const factRows = [{ label: "Alder", value: ageText }, ...(p.facts?.rows ?? [])];

  const allSections = p.sections ?? [];
  const introSections = allSections.filter((sec) => INTRO_SECTION.test(sec.title));
  // Sammensetning står først i Ingredienser-fanen, over selve ingredienslisten.
  const ingredientSections = [
    ...allSections.filter((sec) => COMPOSITION_SECTION.test(sec.title)),
    ...allSections.filter((sec) => INGREDIENT_SECTION.test(sec.title)),
  ];
  const orderSections = allSections.filter((sec) => ORDER_SECTION.test(sec.title));
  const useSections = allSections.filter((sec) => USE_SECTION.test(sec.title) && !INGREDIENT_SECTION.test(sec.title));
  const moreSections = allSections.filter((sec) => ![INTRO_SECTION, COMPOSITION_SECTION, INGREDIENT_SECTION, ORDER_SECTION, USE_SECTION].some((re) => re.test(sec.title)));
  const hasNutrition = (p.nutrition?.length ?? 0) > 0;
  const moreItems: { title: string; lines: string[] }[] = [
    ...(!p.indication ? introSections : []),
    ...(p.notes && p.notes.length > 0 ? [{ title: "Merknader", lines: p.notes }] : []),
    ...moreSections,
  ];

  const [tab, setTab] = useState<DialogTab>("info");
  const tabs: { key: DialogTab; label: string; empty: boolean; count?: number }[] = [
    { key: "info", label: "Produktinfo", empty: false },
    { key: "use", label: "Bruk og dosering", empty: useSections.length === 0 },
    { key: "ingredients", label: "Ingredienser", empty: ingredientSections.length === 0 && !hasNutrition },
    { key: "vnr", label: "Varenumre", empty: rows.length === 0 && orderSections.length === 0, count: rows.length || undefined },
  ];
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length].key;
    setTab(target);
    document.getElementById(`nm-tab-${target}`)?.focus();
  };

  const renderSection = (sec: { title: string; lines: string[]; highlight?: string }) => (
    <section key={sec.title} className="nm-block">
      <h3 className="nm-h">{sec.title}</h3>
      {sec.highlight && <div className="nm-big">{sec.highlight}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, fontSize: 15, lineHeight: 1.5 }}>
        {sec.lines.map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </section>
  );
  const renderAccordion = (items: { title: string; lines: string[] }[]) => (
    <div className="nm-accs">
      {items.map((sec) => (
        <details key={sec.title} className="nm-acc">
          <summary>{sec.title}<span className="nm-acc-chev" aria-hidden="true"><ChevronIcon size={18} /></span></summary>
          <div className="nm-acc-body">{sec.lines.map((line, i) => <p key={i} style={{ margin: 0 }}>{line}</p>)}</div>
        </details>
      ))}
    </div>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      scroll="paper"
      maxWidth={false}
      aria-labelledby="nm-dialog-title"
      slotProps={{
        paper: {
          sx: {
            width: 960, maxWidth: "calc(100% - 32px)", height: "min(700px, calc(100% - 32px))", m: 2,
            borderRadius: "30px", bgcolor: MK.surface, color: MK.text, backgroundImage: "none",
            border: `1px solid ${MK.border}`, boxShadow: `0 24px 64px ${MK.shadow}`, overflow: "hidden",
          },
        },
      }}
    >
      <div className="nm-d" style={{ fontFamily: DIALOG_FONT }}>
        <aside className="nm-rail" aria-label="Fakta om produktet">
          <div className="nm-rail-img">
            <ProductThumb id={p.id} name={p.name} fit />
          </div>
          <div>
            <p className="nm-rail-eyebrow">{p.category}</p>
            <h2 id="nm-dialog-title" style={{ margin: "4px 0 0", fontSize: 32, lineHeight: 1.08, fontWeight: 650, letterSpacing: "-0.03em", overflowWrap: "anywhere" }}>
              {p.name}
            </h2>
            {headline && <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.4, color: "#E9D3DF" }}>{headline}</p>}
            {unreviewed && <span className="nm-rchip" style={{ marginTop: 8, background: MK.warnBg, color: MK.warnText }}><WarnIcon size={13} />Ikke gjennomgått</span>}
          </div>
          <section aria-label="Fakta" style={{ display: "flex", flexDirection: "column" }}>
            <p className="nm-rail-eyebrow">Fakta</p>
            {p.facts?.energy && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "2px 0 4px", flexWrap: "wrap" }}>
                <span style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 650, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{p.facts.energy.value}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.3, color: "#E9D3DF" }}>{p.facts.energy.unit}</span>
              </div>
            )}
            <div style={{ marginTop: p.facts?.energy ? 0 : 6 }}>
              {factRows.map((r) => (
                <div key={r.label} className="nm-rstat"><span>{r.label}</span><b>{r.value}</b></div>
              ))}
            </div>
            {traits.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {traits.map((t) => (
                  <span key={t} className="nm-rchip"><CheckIcon size={12} stroke={3.4} />{t}</span>
                ))}
              </div>
            )}
          </section>
          {p.documents?.map((d) => (
            <a key={d.url} className="nm-rpdf" href={d.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto" }}>
              <FileIcon />
              Åpne produktark
            </a>
          ))}
        </aside>

        <div className="nm-d-main">
          <div className="nm-d-top">
            <div className="nm-d-tabs" role="tablist" aria-label="Produktinformasjon" onKeyDown={onTabKey}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  id={`nm-tab-${t.key}`}
                  type="button"
                  role="tab"
                  className="nm-d-tab"
                  aria-selected={tab === t.key}
                  aria-controls="nm-tabpanel"
                  tabIndex={tab === t.key ? 0 : -1}
                  data-empty={t.empty ? "true" : undefined}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.count !== undefined && <span className="nm-cnt">{t.count}</span>}
                </button>
              ))}
            </div>
            <button type="button" className="nm-close" aria-label="Lukk" onClick={onClose} style={{ marginBottom: 8 }}>
              <CloseIcon size={18} />
            </button>
          </div>

          <div id="nm-tabpanel" role="tabpanel" aria-labelledby={`nm-tab-${tab}`} className="nm-d-body">
            {tab === "info" && p.warnings && p.warnings.length > 0 && (
              <div className="nm-alert" role="note">
                <span className="nm-alert-icon" aria-hidden="true"><WarnIcon size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 15 }}>Viktig før du anbefaler</strong>
                  <ul>
                    {p.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {tab === "info" && (
              <>
                {p.description && (
                  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="nm-h">Om produktet</h3>
                    <p className="nm-block" style={{ fontSize: 15, lineHeight: 1.6 }}>{p.description}</p>
                  </section>
                )}
                {(conds.length > 0 || p.indication) && (
                  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="nm-h">Egnet ved</h3>
                    {conds.length > 0 ? (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                        {conds.map((k) => (
                          <li key={k} className="nm-b-row">
                            <span className="nm-dot" aria-hidden="true" style={{ background: COND_COLORS[k] ?? MK.muted }} />
                            {CLINICAL_LABELS[k] ?? k}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="nm-block" style={{ fontSize: 16.5, lineHeight: 1.5 }}>{p.indication}</p>
                    )}
                  </section>
                )}
                {unreviewed && (
                  <p className="nm-empty" style={{ borderColor: MK.warnBorder, background: MK.warnBg, color: MK.warnText }}>
                    <strong>Kliniske data er ikke gjennomgått.</strong> Sjekk produktbladet før produktet brukes i rådgivning.
                  </p>
                )}
                {moreItems.length > 0 && (
                  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="nm-h">Mer om produktet</h3>
                    {renderAccordion(moreItems)}
                  </section>
                )}
                {conds.length === 0 && !p.indication && !unreviewed && moreItems.length === 0 && (
                  <p className="nm-empty">Ingen klinisk informasjon er lagt inn for dette produktet ennå.</p>
                )}
              </>
            )}

            {tab === "use" && (
              useSections.length > 0
                ? useSections.map(renderSection)
                : <p className="nm-empty">Dosering og bruk er ikke lagt inn for dette produktet ennå.</p>
            )}

            {tab === "ingredients" && (
              <>
                {ingredientSections.map(renderSection)}
                {hasNutrition && (
                  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="nm-h">Næringsinnhold</h3>
                    <div className="nm-accs">
                      {p.nutrition!.map((table) => (
                        <details key={table.title} className="nm-acc">
                          <summary>{table.title}<span className="nm-acc-chev" aria-hidden="true"><ChevronIcon size={18} /></span></summary>
                          <div className="nm-acc-body">
                            <table className="nm-table">
                              <thead>
                                <tr>
                                  <th scope="col"><span className="nm-sr">Næringsstoff</span></th>
                                  {table.columns.map((c) => <th key={c} scope="col">{c}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((r) => (
                                  <tr key={r.label} className={r.sub ? "nm-sub" : undefined}>
                                    <td>{r.label}</td>
                                    {r.values.map((v, i) => <td key={i}>{v}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {table.note && <p style={{ margin: 0, fontSize: 12.5, color: MK.muted }}>{table.note}</p>}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                )}
                {ingredientSections.length === 0 && !hasNutrition && <p className="nm-empty">Ingredienser er ikke lagt inn for dette produktet ennå.</p>}
              </>
            )}

            {tab === "vnr" && (
              <>
                {rows.length > 0 ? (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {rows.map((r) => (
                      <li key={r.vnr} className="nm-vnr" style={{ minHeight: 54, borderRadius: 16, padding: "6px 10px 6px 16px" }}>
                        <span style={{ minWidth: 0, fontSize: 15 }}>
                          <b style={{ fontWeight: 600 }}>{r.flavor || <span style={{ color: MK.muted, fontStyle: "italic", fontWeight: 400 }}>Standard</span>}</b>
                          {r.pack && <span style={{ color: MK.muted }}> · {r.pack}</span>}
                        </span>
                        <button type="button" className="nm-copy" aria-label={`Kopier varenummer ${r.vnr}`} onClick={() => onCopy(r.vnr, r.vnr)}>
                          {copiedVnr === r.vnr ? "Kopiert" : r.vnr}
                          {copiedVnr === r.vnr ? <CheckIcon size={15} stroke={3} /> : <CopyIcon />}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="nm-empty">Fant ingen varenumre i produktkatalogen.</p>
                )}
                {orderSections.length > 0 && renderAccordion(orderSections)}
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Hovedkomponent ──────────────────────────────────────────────────────────
type SortKey = "az" | "cat" | "many";
type MenuKey = "prop" | "age" | "cat";

export default function NutritionProductFinder({ catalogProducts = [] }: { catalogProducts?: CatalogProduct[] }) {
  const muiTheme = useTheme();
  const mkVars = muiTheme.palette.mode === "dark" ? MK_DARK_VARS : MK_LIGHT_VARS;
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Selection>(EMPTY_SELECTION);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("az");
  const [page, setPage] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [layout, setLayout] = useState({ cols: 2, rows: 4, rowH: ROW_HEIGHT });
  const pageSize = layout.cols * layout.rows;
  const cardScale = Math.round((layout.rowH / ROW_HEIGHT) * 100) / 100;

  // Mål plassen: antall kolonner følger bredden, antall rader følger høyden på sidefeltet.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = root.parentElement;
    const measure = () => {
      const width = listRef.current?.clientWidth ?? root.clientWidth;
      const cols = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
      const hostHeight = host?.clientHeight ?? window.innerHeight;
      const free = hostHeight - (sectionRef.current?.offsetHeight ?? 200) - CHROME_HEIGHT;
      const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.floor(free / ROW_HEIGHT)));
      // Resten av høyden fordeles på radene, så kortene fyller siden i stedet for å la plassen stå tom.
      const rowH = Math.round(Math.min(ROW_HEIGHT * MAX_SCALE, Math.max(ROW_HEIGHT, free / rows)));
      setLayout((prev) => (prev.cols === cols && prev.rows === rows && prev.rowH === rowH ? prev : { cols, rows, rowH }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [host, sectionRef.current, listRef.current]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [copiedVnr, setCopiedVnr] = useState<string | null>(null);

  // Ctrl/Cmd+S fokuserer søkefeltet, Esc tømmer det.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "Escape" && searchRef.current === document.activeElement) {
        e.preventDefault();
        setQuery("");
        setPage(1);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!copiedVnr) return;
    const t = setTimeout(() => setCopiedVnr(null), 1500);
    return () => clearTimeout(t);
  }, [copiedVnr]);

  const variantMap = useMemo(() => buildVariantMap(catalogProducts, nutritionProducts), [catalogProducts]);

  const vnrIndex = useMemo(() => {
    const idx = new Map<string, string>();
    for (const [npId, info] of variantMap) {
      for (const { vnr } of info.rows) {
        const digits = vnr.replace(/\D/g, "").replace(/^0+/, "") || vnr.replace(/\D/g, "");
        if (digits) idx.set(digits, npId);
      }
    }
    return idx;
  }, [variantMap]);

  const toggle = useCallback((group: GroupKey, key: string) => {
    setSel((prev) => {
      const cur = prev[group];
      return { ...prev, [group]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
    setPage(1);
  }, []);

  const resetAll = useCallback(() => {
    setQuery("");
    setSel(EMPTY_SELECTION);
    setOpenMenu(null);
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let vnrIds: Set<string> | null = null;
    if (q && VNR_RE.test(q)) {
      const digits = q.replace(/^0+/, "") || q;
      const ids = new Set<string>();
      for (const [vnrDigits, npId] of vnrIndex) {
        if (vnrDigits === digits || vnrDigits.startsWith(digits) || digits.startsWith(vnrDigits)) ids.add(npId);
      }
      if (ids.size > 0) vnrIds = ids;
    }
    const tokens = q && !vnrIds ? q.split(/\s+/) : [];

    const list = INDEX.filter((x) => {
      if (vnrIds && !vnrIds.has(x.p.id)) return false;
      if (!tokens.every((t) => x.hay.includes(t))) return false;
      if (!sel.cond.every((k) => x.conds.includes(k))) return false;
      if (!sel.prop.every((k) => x.props.includes(k))) return false;
      if (sel.age.length > 0 && !sel.age.some((k) => x.ages.includes(k))) return false;
      if (sel.cat.length > 0 && !sel.cat.includes(x.p.category)) return false;
      return true;
    });

    const byName = (a: Indexed, b: Indexed) => a.p.name.localeCompare(b.p.name, "nb");
    if (sort === "cat") list.sort((a, b) => a.p.category.localeCompare(b.p.category, "nb") || byName(a, b));
    else if (sort === "many") list.sort((a, b) => b.conds.length - a.conds.length || byName(a, b));
    else list.sort(byName);
    return list;
  }, [query, sel, sort, vnrIndex]);

  const makeOptions = (entries: [string, string][], group: GroupKey, countFn: (key: string) => number): Option[] =>
    entries
      .map(([key, label]) => ({ key, label, count: countFn(key), on: sel[group].includes(key) }))
      .filter((o) => o.count > 0);

  const condOptions = makeOptions(Object.entries(CLINICAL_LABELS), "cond", (k) => countWhere((x) => x.conds.includes(k)));
  const propOptions = makeOptions(Object.entries(PROP_LABELS), "prop", (k) => countWhere((x) => x.props.includes(k)));
  const ageOptions = makeOptions(Object.entries(AGE_LABELS), "age", (k) => countWhere((x) => x.ages.includes(k)));
  const catOptions: Option[] = CATEGORIES.map((c) => ({
    key: c, label: c, count: countWhere((x) => x.p.category === c), on: sel.cat.includes(c),
  }));

  // Forslag: «Bruk som filter» når søkeordet matcher en tilstand, egenskap, alder eller kategori.
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || VNR_RE.test(q)) return [];
    const pool: { group: GroupKey; key: string; label: string }[] = [
      ...Object.entries(CLINICAL_LABELS).map(([key, label]) => ({ group: "cond" as const, key, label })),
      ...Object.entries(PROP_LABELS).map(([key, label]) => ({ group: "prop" as const, key, label })),
      ...Object.entries(AGE_LABELS).map(([key, label]) => ({ group: "age" as const, key, label })),
      ...CATEGORIES.map((c) => ({ group: "cat" as const, key: c, label: c })),
    ];
    return pool
      .filter((it) => !sel[it.group].includes(it.key) && it.label.toLowerCase().includes(q))
      .filter((it) => (it.group === "age" ? countWhere((x) => x.ages.includes(it.key)) > 0 : true))
      .slice(0, 4);
  }, [query, sel]);

  const activeChips = (Object.keys(sel) as GroupKey[]).flatMap((group) =>
    sel[group].map((key) => ({ group, key, label: group === "cat" ? key : ALL_LABELS[key] ?? key }))
  );

  const copyText = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).then(() => setCopiedVnr(key)).catch(() => undefined);
  };

  const total = INDEX.length;
  const selectedItem = selectedId ? INDEX.find((x) => x.p.id === selectedId) : undefined;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToPage = (n: number) => {
    setPage(n);
    resultsTopRef.current?.scrollIntoView({ block: "nearest" });
  };
  const countLabel = `${filtered.length < total ? `${filtered.length} av ${total}` : filtered.length} produkter`;

  const pickMenu = (group: MenuKey) => (key: string) => toggle(group, key);
  const menuToggle = (m: MenuKey) => () => setOpenMenu((cur) => (cur === m ? null : m));
  const closeMenu = () => setOpenMenu(null);

  return (
    <div ref={rootRef} className="nm-root" style={{ minHeight: "100%" }}>
      <CssVars styles={{ ":root": mkVars }} />
      <style>{CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="nm-sr">Næringsmidler</h2>

        <section
          ref={sectionRef}
          aria-label="Søk og filter"
          style={{
            background: MK.surface, border: `1px solid ${MK.border}`, borderRadius: 18, padding: 14,
            display: "flex", flexDirection: "column", gap: 12, boxShadow: `0 1px 2px ${MK.shadowSoft}`,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: "1 1 320px", minWidth: 0 }}>
              <label className="nm-sr" htmlFor="nm-q">Søk etter produkt, tilstand, egenskap eller VNR</label>
              <span style={{ position: "absolute", left: 16, top: 13, color: MK.muted, display: "inline-flex" }}><SearchIcon /></span>
              <input
                ref={searchRef}
                id="nm-q"
                type="text"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Søk produkt, tilstand eller VNR …"
                style={{
                  width: "100%", boxSizing: "border-box", height: 46, padding: "0 48px 0 46px", borderRadius: 12,
                  border: `1.5px solid ${MK.borderAccent}`, background: MK.surface, color: MK.text, fontSize: 15.5,
                }}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  aria-label="Tøm søket"
                  onClick={() => { setQuery(""); setPage(1); searchRef.current?.focus(); }}
                  style={{
                    position: "absolute", right: 6, top: 5, width: 36, height: 36, border: 0, borderRadius: 9,
                    background: MK.alt, color: MK.sub, cursor: "pointer", display: "grid", placeItems: "center",
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <FilterMenu label="Egenskaper" options={propOptions} open={openMenu === "prop"} onToggle={menuToggle("prop")} onClose={closeMenu} onPick={pickMenu("prop")} />
            <FilterMenu label="Alder" options={ageOptions} open={openMenu === "age"} onToggle={menuToggle("age")} onClose={closeMenu} onPick={pickMenu("age")} />
            <FilterMenu label="Kategori" options={catOptions} open={openMenu === "cat"} onToggle={menuToggle("cat")} onClose={closeMenu} onPick={pickMenu("cat")} />
          </div>

          {suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: MK.muted }}>Bruk som filter:</span>
              {suggestions.map((sug) => (
                <button
                  key={`${sug.group}:${sug.key}`}
                  type="button"
                  className="nm-chip"
                  aria-pressed="false"
                  onClick={() => { toggle(sug.group, sug.key); setQuery(""); }}
                >
                  <span style={{ fontWeight: 500, color: MK.muted }}>{GROUP_NAMES[sug.group]}</span>
                  {sug.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 12px" }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MK.muted }}>Egnet ved</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {condOptions.map((o) => (
                <button key={o.key} type="button" className="nm-chip" aria-pressed={o.on} onClick={() => toggle("cond", o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: MK.muted }}>Valgt:</span>
              {activeChips.map((a) => (
                <button
                  key={`${a.group}:${a.key}`}
                  type="button"
                  className="nm-active"
                  aria-label={`Fjern filter ${GROUP_NAMES[a.group].toLowerCase()}: ${a.label}`}
                  onClick={() => toggle(a.group, a.key)}
                >
                  {a.label}
                  <CloseIcon size={20} />
                </button>
              ))}
              <button type="button" className="nm-link" onClick={resetAll}>Nullstill alt</button>
            </div>
          )}
        </section>

        <div
          ref={resultsTopRef}
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: "6px 16px", scrollMarginTop: 8 }}
        >
          {/* Antall treff vises ikke, men leses fortsatt opp for skjermlesere. */}
          <p aria-live="polite" className="nm-sr">
            {countLabel}
            {totalPages > 1 ? `, side ${currentPage} av ${totalPages}` : ""}
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="nm-sort" style={{ fontSize: 13.5, color: MK.muted }}>Sorter</label>
            <select id="nm-sort" className="nm-select" value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}>
              <option value="az">Navn A–Å</option>
              <option value="cat">Kategori</option>
              <option value="many">Flest indikasjoner</option>
            </select>
          </div>
        </div>

        <ul
          ref={listRef}
          style={{
            listStyle: "none", margin: 0, padding: 0, display: "grid", gap: CARD_GAP,
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridAutoRows: `minmax(${layout.rowH - CARD_GAP}px, auto)`,
            "--nm-s": cardScale,
          } as CSSProperties}
        >
          {shown.map((item) => (
            <ProductRow
              key={item.p.id}
              item={item}
              onOpen={() => setSelectedId(item.p.id)}
            />
          ))}
        </ul>

        {filtered.length === 0 && (
          <div
            style={{
              background: MK.surface, border: `1px dashed ${MK.borderAccent}`, borderRadius: 16, padding: "40px 24px",
              textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Ingen produkter passer</h3>
            <p style={{ margin: 0, maxWidth: 440, fontSize: 14.5, lineHeight: 1.5, color: MK.muted }}>
              Prøv et annet søkeord, eller fjern ett av filtrene. Filtrene snevrer inn, så jo flere du velger, jo færre treff.
            </p>
            <button type="button" className="nm-more" onClick={resetAll}>Nullstill alt</button>
          </div>
        )}

        <Pagination page={currentPage} totalPages={totalPages} onChange={goToPage} />

        {selectedItem && (
          <ProductDialog
            item={selectedItem}
            variant={variantMap.get(selectedItem.p.id)}
            onClose={() => setSelectedId(null)}
            copiedVnr={copiedVnr}
            onCopy={copyText}
          />
        )}
      </div>
    </div>
  );
}
