import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalStyles as CssVars, useTheme } from "@mui/material";
import { nutritionProducts, type NutritionProduct } from "../data/nutritionProducts";
import { MK, MK_DARK_VARS, MK_LIGHT_VARS } from "./melkeTheme";

// ─── Katalogprodukt (for VNR-varianter) ──────────────────────────────────────
type CatalogProduct = {
  id: string;
  name: string;
  farmaloggNumber: string;
  farmaloggDigits: string;
  skuDigits: string;
};

type VariantRow = { vnr: string; flavor: string };
type VariantInfo = { rows: VariantRow[] };

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\+/g, " ")
    .replace(/\d+\s*x\s*\d+\s*(?:ml|g|cl|l)?\b/g, "")
    .replace(/(\d+)\s+([a-zA-Z])/g, "$1$2")
    .replace(/\bfibre\b/g, "fiber")
    .replace(/\bfibr\b/g, "fiber")
    .replace(/\bfib\b/g, "fiber")
    .replace(/\bcomp\b/g, "compact")
    .replace(/\bactiv\b/g, "active")
    .replace(/\bfr\b/g, "fruit")
    .replace(/\bjucy\b/g, "juicy")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildVariantMap(catalog: CatalogProduct[], npList: NutritionProduct[]): Map<string, VariantInfo> {
  const map = new Map<string, VariantInfo>();
  const npNorms = npList.map((np) => ({ np, norm: normName(np.name) }));
  for (const cp of catalog) {
    const cpNorm = normName(cp.name);
    const vnr = cp.farmaloggNumber.trim();
    if (!vnr) continue;
    let bestNp: NutritionProduct | null = null;
    let bestLen = 0;
    for (const { np, norm: npNorm } of npNorms) {
      if (cpNorm.startsWith(npNorm) && npNorm.length > bestLen) {
        bestNp = np;
        bestLen = npNorm.length;
      }
    }
    if (!bestNp) continue;
    if (!map.has(bestNp.id)) map.set(bestNp.id, { rows: [] });
    const entry = map.get(bestNp.id)!;
    const flavor = cpNorm.slice(bestLen).replace(/\d+\s*x\s*\d+.*/g, "").trim();
    const flavorDisplay = flavor.charAt(0).toUpperCase() + flavor.slice(1);
    if (!entry.rows.some((r) => r.vnr === vnr)) entry.rows.push({ vnr, flavor: flavorDisplay });
  }
  return map;
}

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
};
const AGE_LABELS: Record<string, string> = {
  from1Year: "Fra 1 år", from3Years: "Fra 3 år", over6Years: "Over 6 år", elderly: "Eldre",
};
const ALL_LABELS: Record<string, string> = { ...CLINICAL_LABELS, ...PROP_LABELS, ...AGE_LABELS };
const GROUP_NAMES: Record<GroupKey, string> = { cond: "Egnet ved", prop: "Egenskap", age: "Alder", cat: "Kategori" };

// ─── Indeks over produktene (bygges én gang) ─────────────────────────────────
type Indexed = {
  p: NutritionProduct;
  conds: string[];
  props: string[];
  ages: string[];
  hay: string;
};

const trueKeys = (o: object): string[] =>
  Object.entries(o).filter(([, v]) => v === true || v === "caution").map(([k]) => k);

const INDEX: Indexed[] = nutritionProducts.map((p) => {
  const conds = trueKeys(p.clinicalUse);
  const props = trueKeys(p.properties);
  const ages = trueKeys(p.age);
  const hay = [p.name, p.category, ...(p.notes ?? []), ...conds, ...props, ...ages]
    .map((s) => ALL_LABELS[s] ?? s)
    .join(" ")
    .toLowerCase();
  return { p, conds, props, ages, hay };
});

const CATEGORIES = Array.from(new Set(nutritionProducts.map((p) => p.category))).sort((a, b) => a.localeCompare(b, "nb"));
const countWhere = (fn: (x: Indexed) => boolean) => INDEX.filter(fn).length;

function ageSummary(ages: string[]): string {
  if (ages.includes("from1Year")) return "Fra 1 år";
  if (ages.includes("from3Years")) return "Fra 3 år";
  if (ages.includes("over6Years")) return "Over 6 år";
  if (ages.includes("elderly")) return "Eldre";
  return "Alder ikke oppgitt";
}

const PAGE_SIZE = 10;
const VNR_RE = /^\d+$/;
const EMPTY_SELECTION: Selection = { cond: [], prop: [], age: [], cat: [] };

// ─── Stil (bruker samme fargevariabler som Melkeerstatning, også i mørk modus) ─
const CSS = `
.nm-root{font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif;color:${MK.text};background:${MK.bg};padding:20px 22px 40px;box-sizing:border-box}
.nm-root button,.nm-root input,.nm-root select{font-family:inherit}
.nm-root button:focus-visible,.nm-root input:focus-visible,.nm-root select:focus-visible{outline:2px solid ${MK.accent};outline-offset:2px}
.nm-root input::placeholder{color:${MK.muted}}
.nm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.nm-chip{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer;transition:border-color .12s,background .12s}
.nm-chip:hover{border-color:${MK.hoverBorder};background:${MK.hover}}
.nm-chip[aria-pressed="true"]{background:${MK.accentBg};border-color:${MK.accentBg};color:${MK.onAccent}}
.nm-chip .nm-count{font-size:12.5px;font-weight:500;color:${MK.muted}}
.nm-chip[aria-pressed="true"] .nm-count{color:${MK.onAccent};opacity:.85}
.nm-trig{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer}
.nm-trig:hover{border-color:${MK.hoverBorder}}
.nm-trig[data-active="true"]{border-color:${MK.accent};background:${MK.pill};color:${MK.pillText}}
.nm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;background:${MK.accentBg};color:${MK.onAccent};font-size:12px;font-weight:700}
.nm-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;z-index:20;border:0;padding:0;background:transparent;cursor:default}
.nm-menu{position:absolute;top:46px;left:0;z-index:21;width:260px;max-height:340px;overflow:auto;box-sizing:border-box;padding:6px;border-radius:14px;border:1px solid ${MK.borderMed};background:${MK.surface};box-shadow:0 14px 36px ${MK.shadow}}
.nm-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:${MK.text};font-size:14px;text-align:left;cursor:pointer}
.nm-opt:hover{background:${MK.hover}}
.nm-box{flex:none;display:grid;place-items:center;width:20px;height:20px;box-sizing:border-box;border-radius:6px;border:1.5px solid ${MK.borderAccent};background:${MK.surface}}
.nm-box svg{opacity:0}
.nm-opt[aria-pressed="true"] .nm-box{background:${MK.accentBg};border-color:${MK.accentBg}}
.nm-opt[aria-pressed="true"] .nm-box svg{opacity:1}
.nm-opt .nm-count{margin-left:auto;font-size:12.5px;color:${MK.muted}}
.nm-active{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 6px 0 12px;border-radius:999px;border:0;background:${MK.pill};color:${MK.pillText};font-size:13px;font-weight:600;cursor:pointer}
.nm-active:hover{background:${MK.pillHover}}
.nm-link{border:0;background:transparent;padding:6px 4px;color:${MK.accent};font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.nm-row{display:grid;grid-template-columns:52px minmax(0,1fr) 24px;gap:10px 14px;align-items:center;width:100%;box-sizing:border-box;padding:12px 16px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.nm-row:hover,.nm-row[aria-expanded="true"]{background:${MK.sel}}
.nm-tags{grid-column:2 / 4}
.nm-chev{display:grid;place-items:center;transition:transform .15s}
.nm-row[aria-expanded="true"] .nm-chev{transform:rotate(180deg)}
@container (min-width:640px){
.nm-row{grid-template-columns:52px minmax(190px,1fr) minmax(0,1.7fr) 24px}
.nm-tags{grid-column:auto}
}
.nm-thumb{width:52px;height:52px;border-radius:12px;overflow:hidden;background:${MK.thumbBg};border:1px solid ${MK.lineSoft};box-sizing:border-box;display:grid;place-items:center}
.nm-thumb img{width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box}
.nm-mono{width:100%;height:100%;display:grid;place-items:center;background:${MK.pill};color:${MK.pillText};font-size:20px;font-weight:700}
.nm-tag{display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:8px;background:${MK.alt};border:1px solid ${MK.lineSoft};color:${MK.sub};font-size:12.5px;font-weight:500}
.nm-tag-more{background:transparent;border:1px dashed ${MK.borderAccent};color:${MK.muted}}
.nm-pill{display:inline-flex;align-items:center;min-height:28px;padding:0 11px;border-radius:999px;border:1px solid ${MK.borderMed};background:${MK.surface};color:${MK.text};font-size:13px;font-weight:500}
.nm-h{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${MK.muted}}
.nm-more{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;border-radius:12px;border:1px solid ${MK.accent};background:${MK.surface};color:${MK.accent};font-size:14.5px;font-weight:600;cursor:pointer}
.nm-more:hover{background:${MK.pill}}
.nm-select{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid ${MK.borderAccent};background:${MK.surface};color:${MK.text};font-size:14px;font-weight:600;cursor:pointer}
.nm-copy{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 10px;border-radius:8px;border:1px solid ${MK.borderMed};background:${MK.surface};color:${MK.text};font-size:13px;font-weight:600;cursor:pointer}
.nm-copy:hover{border-color:${MK.hoverBorder};background:${MK.hover}}
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
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);

// ─── Produktbilde (med bokstav som reserve) ──────────────────────────────────
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const missingImages = new Set<string>();

function ProductThumb({ id, name }: { id: string; name: string }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(() => missingImages.has(id));
  return (
    <span className="nm-thumb" aria-hidden="true">
      {failed ? (
        <span className="nm-mono">{name.charAt(0).toUpperCase()}</span>
      ) : (
        <img
          key={idx}
          src={`/nutrition/${id}.${IMAGE_EXTS[idx]}`}
          alt=""
          loading="lazy"
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
                <span className="nm-count">{o.count}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Produktrad ──────────────────────────────────────────────────────────────
function ProductRow({
  item, variant, open, onToggle, copiedVnr, onCopy,
}: {
  item: Indexed;
  variant?: VariantInfo;
  open: boolean;
  onToggle: () => void;
  copiedVnr: string | null;
  onCopy: (vnr: string) => void;
}) {
  const { p, conds, props, ages } = item;
  const condNames = conds.map((k) => CLINICAL_LABELS[k] ?? k);
  const propNames = props.map((k) => PROP_LABELS[k] ?? k);
  const rows = variant?.rows ?? [];
  const meta = [p.category, ageSummary(ages), rows.length > 0 ? `${rows.length} varenr.` : null].filter(Boolean).join(" · ");
  const propsLine = propNames.slice(0, 4).join(" · ") + (propNames.length > 4 ? ` · +${propNames.length - 4}` : "");

  return (
    <li style={{ background: MK.surface, border: `1px solid ${MK.border}`, borderRadius: 16, overflow: "hidden" }}>
      <button type="button" className="nm-row" aria-expanded={open} onClick={onToggle}>
        <ProductThumb id={p.id} name={p.name} />
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.name}</span>
          <span style={{ fontSize: 13, color: MK.muted }}>{meta}</span>
        </span>
        <span className="nm-tags" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {condNames.slice(0, 4).map((c) => <span key={c} className="nm-tag">{c}</span>)}
            {condNames.length > 4 && <span className="nm-tag nm-tag-more">+{condNames.length - 4}</span>}
            {condNames.length === 0 && <span style={{ fontSize: 13, color: MK.muted }}>Ingen klinisk indikasjon oppgitt</span>}
          </span>
          {propsLine && <span style={{ fontSize: 12.5, color: MK.muted }}>{propsLine}</span>}
        </span>
        <span className="nm-chev" aria-hidden="true" style={{ color: MK.muted }}><ChevronIcon size={20} /></span>
      </button>

      {open && (
        <div
          style={{
            borderTop: `1px solid ${MK.border}`, padding: 20, background: MK.soft,
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "22px 28px",
          }}
        >
          <div>
            <h3 className="nm-h">Egnet ved</h3>
            {condNames.length > 0 ? (
              <>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {condNames.map((c) => (
                    <li key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <span style={{ color: MK.accent, display: "inline-flex" }}><CheckIcon size={16} stroke={2.6} /></span>
                      {c}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.45, color: MK.muted }}>Krever avtale med lege eller KEF.</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: MK.muted }}>Ingen klinisk indikasjon oppgitt.</p>
            )}
          </div>
          <div>
            <h3 className="nm-h">Egenskaper</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {propNames.length > 0
                ? propNames.map((n) => <span key={n} className="nm-pill">{n}</span>)
                : <span style={{ fontSize: 14, color: MK.muted }}>Ingen oppgitt.</span>}
            </div>
          </div>
          <div>
            <h3 className="nm-h">Passer for alder</h3>
            {ages.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ages.map((k) => <span key={k} className="nm-pill">{AGE_LABELS[k] ?? k}</span>)}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: MK.muted }}>Alder ikke oppgitt.</p>
            )}
          </div>
          {p.notes && p.notes.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <h3 className="nm-h">Merknader</h3>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 14, lineHeight: 1.5 }}>
                {p.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", paddingTop: 16, borderTop: `1px dashed ${MK.borderMed}` }}>
            <h3 className="nm-h">VNR-varianter</h3>
            {rows.length > 0 ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                {rows.map((r) => (
                  <li key={r.vnr} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                      {r.flavor || <span style={{ color: MK.muted, fontStyle: "italic" }}>Nøytral</span>}
                    </span>
                    <button
                      type="button"
                      className="nm-copy"
                      onClick={() => onCopy(r.vnr)}
                      aria-label={`Kopier varenummer ${r.vnr}`}
                      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.04em" }}
                    >
                      {copiedVnr === r.vnr ? "Kopiert" : r.vnr}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: MK.muted }}>Fant ingen varenumre i produktkatalogen.</p>
            )}
          </div>
        </div>
      )}
    </li>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("az");
  const [limit, setLimit] = useState(PAGE_SIZE);
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
        setLimit(PAGE_SIZE);
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
    setLimit(PAGE_SIZE);
  }, []);

  const resetAll = useCallback(() => {
    setQuery("");
    setSel(EMPTY_SELECTION);
    setOpenMenu(null);
    setLimit(PAGE_SIZE);
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

  const copyVnr = (vnr: string) => {
    void navigator.clipboard?.writeText(vnr).then(() => setCopiedVnr(vnr)).catch(() => undefined);
  };

  const total = INDEX.length;
  const shown = filtered.slice(0, limit);
  const remaining = filtered.length - shown.length;
  const countLabel = `${filtered.length < total ? `${filtered.length} av ${total}` : filtered.length} produkter`;

  const pickMenu = (group: MenuKey) => (key: string) => toggle(group, key);
  const menuToggle = (m: MenuKey) => () => setOpenMenu((cur) => (cur === m ? null : m));
  const closeMenu = () => setOpenMenu(null);

  return (
    <div className="nm-root" style={{ containerType: "inline-size", minHeight: "100%" }}>
      <CssVars styles={{ ":root": mkVars }} />
      <style>{CSS}</style>
      <div style={{ maxWidth: 924, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 className="nm-sr">Næringsmidler</h2>

        <section
          aria-label="Søk og filter"
          style={{
            background: MK.surface, border: `1px solid ${MK.border}`, borderRadius: 20, padding: 20,
            display: "flex", flexDirection: "column", gap: 18, boxShadow: `0 1px 2px ${MK.shadowSoft}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <label className="nm-sr" htmlFor="nm-q">Søk etter produkt, tilstand, egenskap eller VNR</label>
              <span style={{ position: "absolute", left: 18, top: 18, color: MK.muted, display: "inline-flex" }}><SearchIcon /></span>
              <input
                ref={searchRef}
                id="nm-q"
                type="text"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
                placeholder="Søk produkt, tilstand eller VNR …"
                style={{
                  width: "100%", boxSizing: "border-box", height: 56, padding: "0 56px 0 52px", borderRadius: 14,
                  border: `1.5px solid ${MK.borderAccent}`, background: MK.surface, color: MK.text, fontSize: 16,
                }}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  aria-label="Tøm søket"
                  onClick={() => { setQuery(""); setLimit(PAGE_SIZE); searchRef.current?.focus(); }}
                  style={{
                    position: "absolute", right: 10, top: 10, width: 36, height: 36, border: 0, borderRadius: 10,
                    background: MK.alt, color: MK.sub, cursor: "pointer", display: "grid", placeItems: "center",
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, color: MK.muted }}>Bruk som filter:</span>
                {suggestions.map((s) => (
                  <button
                    key={`${s.group}:${s.key}`}
                    type="button"
                    className="nm-chip"
                    aria-pressed="false"
                    onClick={() => { toggle(s.group, s.key); setQuery(""); }}
                  >
                    <span style={{ fontWeight: 500, color: MK.muted }}>{GROUP_NAMES[s.group]}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "4px 16px" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MK.muted }}>Egnet ved</h3>
              <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: MK.muted }}>
                <InfoIcon />
                Alle indikasjoner krever avtale med lege eller klinisk ernæringsfysiolog (KEF).
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {condOptions.map((o) => (
                <button key={o.key} type="button" className="nm-chip" aria-pressed={o.on} onClick={() => toggle("cond", o.key)}>
                  {o.label}
                  <span className="nm-count">{o.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 16, borderTop: `1px solid ${MK.lineSoft}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: MK.muted }}>Flere filter</span>
            <FilterMenu label="Egenskaper" options={propOptions} open={openMenu === "prop"} onToggle={menuToggle("prop")} onClose={closeMenu} onPick={pickMenu("prop")} />
            <FilterMenu label="Alder" options={ageOptions} open={openMenu === "age"} onToggle={menuToggle("age")} onClose={closeMenu} onPick={pickMenu("age")} />
            <FilterMenu label="Kategori" options={catOptions} open={openMenu === "cat"} onToggle={menuToggle("cat")} onClose={closeMenu} onPick={pickMenu("cat")} />
          </div>

          {activeChips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
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

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px 16px" }}>
          <p aria-live="polite" style={{ margin: 0, fontSize: 15 }}><strong style={{ fontWeight: 700 }}>{countLabel}</strong></p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="nm-sort" style={{ fontSize: 13.5, color: MK.muted }}>Sorter</label>
            <select id="nm-sort" className="nm-select" value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setLimit(PAGE_SIZE); }}>
              <option value="az">Navn A–Å</option>
              <option value="cat">Kategori</option>
              <option value="many">Flest indikasjoner</option>
            </select>
          </div>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((item) => (
            <ProductRow
              key={item.p.id}
              item={item}
              variant={variantMap.get(item.p.id)}
              open={expanded === item.p.id}
              onToggle={() => setExpanded((cur) => (cur === item.p.id ? null : item.p.id))}
              copiedVnr={copiedVnr}
              onCopy={copyVnr}
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

        {remaining > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 6 }}>
            <button type="button" className="nm-more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Vis {Math.min(PAGE_SIZE, remaining)} flere
            </button>
            <span style={{ fontSize: 13, color: MK.muted }}>Viser {shown.length} av {filtered.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
