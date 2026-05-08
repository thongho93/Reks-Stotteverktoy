import React, { useState, useMemo, useCallback } from "react";
import {
  nutritionProducts,
  type NutritionProduct,
} from "../data/nutritionProducts";

// ─── Color system ─────────────────────────────────────────────────────────────
const COLORS = {
  completeNutrition: "#16a34a",
  fiber: "#9333ea",
  proteinRich: "#2563eb",
  glutenFree: "#0284c7",
  lactoseFree: "#0891b2",
  lowLactose: "#0891b2",
  fatFree: "#d97706",
  vegan: "#15803d",
  vegetarian: "#15803d",
  liteProtein: "#7c3aed",
  diabetes: "#1d4ed8",
  kidneyFailure: "#b45309",
  cancer: "#db2777",
  copd: "#0f766e",
  pressureUlcers: "#dc2626",
  preoperative: "#7c3aed",
  postoperative: "#6d28d9",
  malabsorption: "#ea580c",
  constipationDiarrhea: "#65a30d",
  elderlyUndernutrition: "#0369a1",
  caution: "#92400e",
  cautionBg: "#fef3c7",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Komplett ernæring": "#166534",
  Proteinrik: "#1e40af",
  Fettkilde: "#92400e",
  Preoperativ: "#6d28d9",
  Sårernæring: "#991b1b",
  "KOLS-ernæring": "#134e4a",
  Nyreernæring: "#713f12",
  Diabetesernæring: "#1e3a8a",
  Malabsorpsjon: "#9a3412",
  Kreftspesifikk: "#831843",
};

// ─── Icon maps ────────────────────────────────────────────────────────────────
const PROPERTY_ICONS: Record<string, string> = {
  completeNutrition: "⭐",
  fiber: "🌾",
  glutenFree: "🚫",
  lactoseFree: "🥛",
  lowLactose: "🥛",
  fatFree: "💧",
  vegan: "🌱",
  vegetarian: "🥦",
  proteinRich: "💪",
  liteProtein: "🫀",
};

const CLINICAL_ICONS: Record<string, string> = {
  diabetes: "💉",
  pressureUlcers: "🩹",
  preoperative: "🔬",
  postoperative: "🏥",
  copd: "💨",
  kidneyFailure: "🫘",
  cancer: "🎗️",
  constipationDiarrhea: "🌿",
  malabsorption: "🧪",
  elderlyUndernutrition: "🧓",
};

const AGE_ICONS: Record<string, string> = {
  from1Year: "👶",
  from3Years: "🧒",
  over6Years: "🧑",
  elderly: "🧓",
};

// ─── Label maps ───────────────────────────────────────────────────────────────
const PROPERTY_LABELS: Record<string, string> = {
  completeNutrition: "Komplett ernæring",
  fiber: "Kostfiber",
  glutenFree: "Glutenfri",
  lactoseFree: "Laktosefri",
  lowLactose: "Laktosefattig",
  fatFree: "Fettfri",
  vegan: "Vegansk",
  vegetarian: "Vegetarisk",
  proteinRich: "Proteinrik",
  liteProtein: "Lite protein",
};

const CLINICAL_LABELS: Record<string, string> = {
  diabetes: "Diabetes",
  pressureUlcers: "Trykksår",
  preoperative: "Preoperativ",
  postoperative: "Postoperativ",
  copd: "KOLS",
  kidneyFailure: "Nyresvikt",
  cancer: "Kreft",
  constipationDiarrhea: "Forstoppelse/Diaré",
  elderlyUndernutrition: "Underernæring eldre",
  malabsorption: "Malabsorpsjon",
};

const AGE_LABELS: Record<string, string> = {
  from1Year: "Fra 1 år",
  from3Years: "Fra 3 år",
  over6Years: "Over 6 år",
  elderly: "Eldre",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getColor(key: string): string {
  return (COLORS as Record<string, string>)[key] ?? "#6b7280";
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#374151";
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-");
}

// ─── IconCircle ───────────────────────────────────────────────────────────────
// Compact colored circle with emoji + tooltip — used in product cards
function IconCircle({
  icon,
  color,
  label,
  caution,
}: {
  icon: string;
  color: string;
  label: string;
  caution?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: caution ? COLORS.cautionBg : `${color}22`,
        border: `2px solid ${caution ? COLORS.caution : color}`,
        fontSize: 13,
        cursor: "default",
        flexShrink: 0,
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        transform: hovered ? "scale(1.18)" : "scale(1)",
        boxShadow: hovered ? `0 2px 8px ${color}55` : "none",
      }}
    >
      {icon}
      {hovered && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 5px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f2937",
            color: "#f9fafb",
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 99,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {caution ? "⚠ " : ""}{label}
        </span>
      )}
    </span>
  );
}

// ─── CautionBadge ─────────────────────────────────────────────────────────────
function CautionBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.6,
        color: COLORS.caution,
        background: COLORS.cautionBg,
        border: `1px solid ${COLORS.caution}44`,
        whiteSpace: "nowrap",
      }}
    >
      ⚠ {label}
    </span>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({
  label,
  icon,
  active,
  color,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 13px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        border: `2px solid ${color ?? "#6b7280"}`,
        background: active ? (color ?? "#6b7280") : "transparent",
        color: active ? "#fff" : (color ?? "#374151"),
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ─── PropIconRow ──────────────────────────────────────────────────────────────
// Row of small icon pills for product properties
function PropIconRow({ entries }: { entries: [string, boolean][] }) {
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {entries.map(([key]) => (
        <span
          key={key}
          title={PROPERTY_LABELS[key] ?? key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px 2px 5px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            color: getColor(key),
            background: `${getColor(key)}18`,
            border: `1.5px solid ${getColor(key)}55`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 12 }}>{PROPERTY_ICONS[key] ?? "•"}</span>
          {PROPERTY_LABELS[key] ?? key}
        </span>
      ))}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  listView,
}: {
  product: NutritionProduct;
  listView: boolean;
}) {
  const propEntries = Object.entries(product.properties).filter(
    ([, v]) => v === true
  ) as [string, boolean][];

  const clinicalEntries = Object.entries(product.clinicalUse).filter(
    ([, v]) => v !== undefined && v !== false
  ) as [string, boolean | "caution"][];

  const ageEntries = Object.entries(product.age).filter(
    ([, v]) => v === true
  ) as [string, boolean][];

  if (listView) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr 160px",
          gap: 12,
          alignItems: "start",
          padding: "10px 14px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          marginBottom: 6,
        }}
      >
        {/* Name + category */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: getCategoryColor(product.category),
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 2,
            }}
          >
            {product.category}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            {product.name}
          </div>
          {product.notes && product.notes.length > 0 && (
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>
              {product.notes.join(" • ")}
            </div>
          )}
        </div>
        {/* Properties */}
        <PropIconRow entries={propEntries} />
        {/* Clinical */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {clinicalEntries.map(([key, val]) =>
            val === "caution" ? (
              <CautionBadge key={key} label={CLINICAL_LABELS[key] ?? key} />
            ) : (
              <IconCircle
                key={key}
                icon={CLINICAL_ICONS[key] ?? "•"}
                color={getColor(key)}
                label={CLINICAL_LABELS[key] ?? key}
              />
            )
          )}
        </div>
        {/* Age */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {ageEntries.map(([key]) => (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                color: "#374151",
                background: "#f3f4f6",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 11 }}>{AGE_ICONS[key] ?? "👤"}</span>
              {AGE_LABELS[key] ?? key}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Card view ──
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 180,
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Category label */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: getCategoryColor(product.category),
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          borderBottom: `2px solid ${getCategoryColor(product.category)}`,
          paddingBottom: 1,
          alignSelf: "flex-start",
        }}
      >
        {product.category}
      </span>

      {/* Product name */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
        {product.name}
      </div>

      {/* Property icon pills */}
      <PropIconRow entries={propEntries} />

      {/* Clinical use icon circles */}
      {clinicalEntries.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid #f3f4f6", margin: "2px 0" }} />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Klinisk egnet ved
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {clinicalEntries.map(([key, val]) =>
              val === "caution" ? (
                <IconCircle
                  key={key}
                  icon={CLINICAL_ICONS[key] ?? "⚠️"}
                  color={COLORS.caution}
                  label={CLINICAL_LABELS[key] ?? key}
                  caution
                />
              ) : (
                <IconCircle
                  key={key}
                  icon={CLINICAL_ICONS[key] ?? "•"}
                  color={getColor(key)}
                  label={CLINICAL_LABELS[key] ?? key}
                />
              )
            )}
          </div>
        </>
      )}

      {/* Footer: age badges + notes */}
      <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {ageEntries.map(([key]) => (
          <span
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              fontWeight: 600,
              color: "#374151",
              background: "#f3f4f6",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>{AGE_ICONS[key] ?? "👤"}</span>
            {AGE_LABELS[key] ?? key}
          </span>
        ))}
        {product.notes &&
          product.notes.map((note, i) => (
            <span key={i} style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>
              {note}
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── FilterSection ────────────────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{children}</div>
    </div>
  );
}

function SidebarCheckbox({
  label,
  icon,
  color,
  checked,
  onChange,
}: {
  label: string;
  icon?: string;
  color?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: checked ? "#111827" : "#374151",
        cursor: "pointer",
        fontWeight: checked ? 700 : 400,
        padding: "2px 4px",
        borderRadius: 5,
        background: checked && color ? `${color}14` : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: color ?? "#6b7280", width: 13, height: 13 }}
      />
      {icon ? (
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: color ? `${color}22` : "#f3f4f6",
            border: `1.5px solid ${color ?? "#d1d5db"}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      ) : color ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      ) : null}
      {label}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

type SortOrder = "az" | "za";

export default function NutritionProductFinder() {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [listView, setListView] = useState(false);
  const [page, setPage] = useState(1);

  // Sidebar filters
  const [filterAge, setFilterAge] = useState<Record<string, boolean>>({});
  const [filterClinical, setFilterClinical] = useState<Record<string, boolean>>({});
  const [filterProps, setFilterProps] = useState<Record<string, boolean>>({});

  const toggleFilter = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
      key: string,
      val: boolean
    ) => {
      setter((prev) => {
        const next = { ...prev };
        if (!val) delete next[key];
        else next[key] = true;
        return next;
      });
      setPage(1);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilterAge({});
    setFilterClinical({});
    setFilterProps({});
    setPage(1);
  }, []);

  const activeAgeKeys = Object.keys(filterAge).filter((k) => filterAge[k]);
  const activeClinicalKeys = Object.keys(filterClinical).filter((k) => filterClinical[k]);
  const activePropKeys = Object.keys(filterProps).filter((k) => filterProps[k]);

  const filtered = useMemo(() => {
    let list = [...nutritionProducts];

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.notes ?? []).some((n) => n.toLowerCase().includes(q))
      );
    }

    // Age filter (OR within group)
    if (activeAgeKeys.length > 0) {
      list = list.filter((p) =>
        activeAgeKeys.some((k) => (p.age as Record<string, boolean>)[k] === true)
      );
    }

    // Clinical filter (OR within group)
    if (activeClinicalKeys.length > 0) {
      list = list.filter((p) =>
        activeClinicalKeys.some(
          (k) =>
            (p.clinicalUse as Record<string, boolean | "caution">)[k] === true ||
            (p.clinicalUse as Record<string, boolean | "caution">)[k] === "caution"
        )
      );
    }

    // Prop / category filter (OR within group)
    if (activePropKeys.length > 0) {
      list = list.filter((p) => {
        return activePropKeys.some((k) => {
          if (k.startsWith("cat:")) {
            return slugify(p.category) === k.slice(4);
          }
          return (p.properties as Record<string, boolean>)[k] === true;
        });
      });
    }

    // Sort
    list.sort((a, b) =>
      sortOrder === "az"
        ? a.name.localeCompare(b.name, "nb")
        : b.name.localeCompare(a.name, "nb")
    );

    return list;
  }, [search, activeAgeKeys, activeClinicalKeys, activePropKeys, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasActiveFilters =
    search.trim() ||
    activeAgeKeys.length > 0 ||
    activeClinicalKeys.length > 0 ||
    activePropKeys.length > 0;

  // Quick-filter chips
  const quickFilters = [
    { key: "completeNutrition", label: "Komplett ernæring", icon: "⭐", type: "prop", color: COLORS.completeNutrition },
    { key: "fiber",             label: "Kostfiber",          icon: "🌾", type: "prop",     color: COLORS.fiber },
    { key: "proteinRich",       label: "Proteinrik",         icon: "💪", type: "prop",     color: COLORS.proteinRich },
    { key: "diabetes",          label: "Diabetes",           icon: "💉", type: "clinical", color: COLORS.diabetes },
    { key: "kidneyFailure",     label: "Nyresvikt",          icon: "🫘", type: "clinical", color: COLORS.kidneyFailure },
    { key: "cancer",            label: "Kreft",              icon: "🎗️", type: "clinical", color: COLORS.cancer },
    { key: "preoperative",      label: "Pre/Post-op",        icon: "🔬", type: "clinical", color: COLORS.preoperative },
    { key: "copd",              label: "KOLS",               icon: "💨", type: "clinical", color: COLORS.copd },
    { key: "from1Year",         label: "Barn",               icon: "👶", type: "age",      color: "#374151" },
    { key: "elderly",           label: "Eldre",              icon: "🧓", type: "age",      color: "#0369a1" },
  ];

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "#f9fafb",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 20px 10px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111827" }}>
              🥗 Ernæringsprodukt-søk
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
              {nutritionProducts.length} produkter • Finn riktig produkt til riktig pasient
            </p>
          </div>

          {/* Search */}
          <div
            style={{
              flex: 1,
              minWidth: 180,
              maxWidth: 320,
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1.5px solid #d1d5db",
              borderRadius: 8,
              padding: "5px 10px",
              background: "#fff",
            }}
          >
            <span style={{ fontSize: 14, color: "#9ca3af" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Søk etter produkt..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13,
                background: "transparent",
                color: "#111827",
              }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1.5px solid #d1d5db",
              fontSize: 12,
              background: "#fff",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <option value="az">A–Å (alfabetisk)</option>
            <option value="za">Å–A (omvendt)</option>
          </select>

          {/* View toggle */}
          <div style={{ display: "flex", border: "1.5px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => setListView(false)}
              title="Kortvisning"
              style={{
                padding: "5px 12px",
                background: !listView ? "#1e40af" : "#fff",
                color: !listView ? "#fff" : "#6b7280",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ⊞ <span style={{ fontSize: 11 }}>Kort</span>
            </button>
            <button
              onClick={() => setListView(true)}
              title="Listevisning"
              style={{
                padding: "5px 12px",
                background: listView ? "#1e40af" : "#fff",
                color: listView ? "#fff" : "#6b7280",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              ≡ <span style={{ fontSize: 11 }}>Liste</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1.5px solid #fca5a5",
                background: "#fff",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🔄 Nullstill filter
            </button>
          )}
        </div>

        {/* Quick filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            paddingBottom: 2,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", alignSelf: "center", marginRight: 2 }}>
            Hurtigfilter
          </span>
          {quickFilters.map((qf) => {
            const filterMap =
              qf.type === "prop" ? filterProps : qf.type === "clinical" ? filterClinical : filterAge;
            const setter =
              qf.type === "prop" ? setFilterProps : qf.type === "clinical" ? setFilterClinical : setFilterAge;
            const active = !!filterMap[qf.key];
            return (
              <FilterChip
                key={`${qf.type}-${qf.key}`}
                label={qf.label}
                icon={qf.icon}
                active={active}
                color={qf.color}
                onClick={() => toggleFilter(setter, qf.key, !active)}
              />
            );
          })}
          <button
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              border: "1.5px dashed #d1d5db",
              background: "transparent",
              color: "#6b7280",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Bruk sidefilteret for flere filtre"
          >
            🔧 Flere filtre
          </button>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, gap: 0, minHeight: 0 }}>
        {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
        <aside
          style={{
            width: 210,
            minWidth: 190,
            background: "#fff",
            borderRight: "1px solid #e5e7eb",
            padding: "16px 14px",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <FilterSection title="Alder">
            {Object.entries(AGE_LABELS).map(([key, label]) => (
              <SidebarCheckbox
                key={key}
                label={label}
                icon={AGE_ICONS[key]}
                checked={!!filterAge[key]}
                onChange={(v) => toggleFilter(setFilterAge, key, v)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Tilstand / Indikasjon">
            {Object.entries(CLINICAL_LABELS).map(([key, label]) => (
              <SidebarCheckbox
                key={key}
                label={label}
                icon={CLINICAL_ICONS[key]}
                color={getColor(key)}
                checked={!!filterClinical[key]}
                onChange={(v) => toggleFilter(setFilterClinical, key, v)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Andre filter">
            {Object.entries(PROPERTY_LABELS).map(([key, label]) => (
              <SidebarCheckbox
                key={key}
                label={label}
                icon={PROPERTY_ICONS[key]}
                color={getColor(key)}
                checked={!!filterProps[key]}
                onChange={(v) => toggleFilter(setFilterProps, key, v)}
              />
            ))}
          </FilterSection>

          {/* Category filter */}
          <FilterSection title="Kategori">
            {Array.from(new Set(nutritionProducts.map((p) => p.category)))
              .sort()
              .map((cat) => (
                <SidebarCheckbox
                  key={cat}
                  label={cat}
                  color={getCategoryColor(cat)}
                  checked={!!filterProps[`cat:${slugify(cat)}`]}
                  onChange={(v) => toggleFilter(setFilterProps, `cat:${slugify(cat)}`, v)}
                />
              ))}
          </FilterSection>

          {/* Caution legend */}
          <div
            style={{
              marginTop: 12,
              padding: "8px 10px",
              background: COLORS.cautionBg,
              borderRadius: 7,
              border: `1px solid ${COLORS.caution}33`,
              fontSize: 10,
              color: COLORS.caution,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            ℹ X = Ved forsiktighet/avtale med lege eller KEF
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minWidth: 0 }}>
          {/* Result count + pagination info */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              Viser {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} av {filtered.length} produkter
              {totalPages > 1 && (
                <span style={{ color: "#9ca3af" }}> • Side {currentPage} av {totalPages}</span>
              )}
            </div>
            {/* Per-page (static label for reference matching) */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af" }}>
              Vis per side:
              <span style={{
                padding: "2px 8px",
                border: "1px solid #e5e7eb",
                borderRadius: 5,
                background: "#fff",
                fontWeight: 600,
                color: "#374151",
              }}>
                {PAGE_SIZE}
              </span>
            </div>
          </div>

          {/* List header (list view only) */}
          {listView && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 160px", gap: 12, padding: "4px 14px", marginBottom: 4 }}>
              {["Produkt", "Egenskaper", "Klinisk bruk", "Alder"].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {h}
                </div>
              ))}
            </div>
          )}

          {/* Product grid / list */}
          {pageItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 14 }}>
              Ingen produkter matcher søkekriteriene.
              {hasActiveFilters && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={resetFilters}
                    style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                  >
                    Nullstill filtre
                  </button>
                </div>
              )}
            </div>
          ) : listView ? (
            <div>{pageItems.map((p) => <ProductCard key={p.id} product={p} listView={true} />)}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
              {pageItems.map((p) => <ProductCard key={p.id} product={p} listView={false} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 24, flexWrap: "wrap" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "1.5px solid #d1d5db",
                  background: currentPage === 1 ? "#f9fafb" : "#fff",
                  color: currentPage === 1 ? "#d1d5db" : "#374151",
                  cursor: currentPage === 1 ? "default" : "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                ← Forrige
              </button>

              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    padding: "5px 10px", borderRadius: 6,
                    border: `1.5px solid ${n === currentPage ? "#1d4ed8" : "#d1d5db"}`,
                    background: n === currentPage ? "#1d4ed8" : "#fff",
                    color: n === currentPage ? "#fff" : "#374151",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, minWidth: 34,
                  }}
                >
                  {n}
                </button>
              ))}
              {totalPages > 8 && (
                <span style={{ color: "#9ca3af", fontSize: 12 }}>…</span>
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "1.5px solid #d1d5db",
                  background: currentPage === totalPages ? "#f9fafb" : "#fff",
                  color: currentPage === totalPages ? "#d1d5db" : "#374151",
                  cursor: currentPage === totalPages ? "default" : "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                Neste →
              </button>
            </div>
          )}

          {/* Caution footnote */}
          <div
            style={{
              marginTop: 28,
              padding: "10px 14px",
              background: COLORS.cautionBg,
              borderRadius: 8,
              border: `1px solid ${COLORS.caution}33`,
              fontSize: 11,
              color: COLORS.caution,
              fontWeight: 500,
            }}
          >
            ⚠ Alle kliniske indikasjoner er markert som forsiktighetsregel – krever avtale med lege eller klinisk ernæringsfysiolog (KEF).
          </div>
        </main>
      </div>
    </div>
  );
}
