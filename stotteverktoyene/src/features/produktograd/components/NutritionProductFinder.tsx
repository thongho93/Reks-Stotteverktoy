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
  glutenFree: "#0284c7", lactoseFree: "#0891b2", lowLactose: "#0891b2",
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

// ─── Icon maps ────────────────────────────────────────────────────────────────
const PROP_ICONS:     Record<string, string> = {
  completeNutrition: "⭐", fiber: "🌾", glutenFree: "🚫", lactoseFree: "🥛",
  lowLactose: "🥛", fatFree: "💧", vegan: "🌱", vegetarian: "🥦",
  proteinRich: "💪", liteProtein: "🫀",
};
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
  { label: string; icon?: string; color?: string; checked: boolean; onChange: (v: boolean) => void }) {
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
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                color: getC(key), background: `${getC(key)}12`,
                border: `1px solid ${getC(key)}30`,
              }}>
                <span style={{ fontSize: 10 }}>{PROP_ICONS[key] ?? "•"}</span>
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
  const [search,          setSearch]          = useState("");
  const [page,            setPage]            = useState(1);
  const [filterAge,       setFilterAge]       = useState<Record<string, boolean>>({});
  const [filterClinical,  setFilterClinical]  = useState<Record<string, boolean>>({});
  const [filterProps,     setFilterProps]     = useState<Record<string, boolean>>({});

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
              <SidebarPill key={k} label={label} icon={PROP_ICONS[k]} color={getC(k)}
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
              <input type="text" value={search}
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
