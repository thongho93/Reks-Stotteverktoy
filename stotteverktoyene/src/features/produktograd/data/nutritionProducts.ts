/** Tekstseksjon fra produktarket (dosering, tilberedning, kontraindikasjoner …). */
export type NutritionInfoSection = { title: string; lines: string[]; wide?: boolean };

/** Næringsinnholdstabell, én per smak/variant. */
export type NutritionTable = {
  title: string;
  /** F.eks. utblandingsforhold. */
  note?: string;
  columns: string[];
  rows: { label: string; values: string[]; sub?: boolean }[];
};

export type NutritionDocument = { title: string; url: string; sizeLabel?: string };

export type NutritionProduct = {
  id: string;
  name: string;
  category: string;
  properties: {
    completeNutrition?: boolean;
    fiber?: boolean;
    glutenFree?: boolean;
    lactoseFree?: boolean;
    lowLactose?: boolean;
    fatFree?: boolean;
    vegan?: boolean;
    vegetarian?: boolean;
    proteinRich?: boolean;
    liteProtein?: boolean;
  };
  age: {
    from1Year?: boolean;
    from3Years?: boolean;
    from5Years?: boolean;
    over6Years?: boolean;
    from15Years?: boolean;
    elderly?: boolean;
  };
  clinicalUse: {
    diabetes?: boolean | "caution";
    pressureUlcers?: boolean | "caution";
    preoperative?: boolean | "caution";
    postoperative?: boolean | "caution";
    copd?: boolean | "caution";
    kidneyFailure?: boolean | "caution";
    cancer?: boolean | "caution";
    constipationDiarrhea?: boolean | "caution";
    elderlyUndernutrition?: boolean | "caution";
    malabsorption?: boolean | "caution";
    diseaseRelatedMalnutrition?: boolean | "caution";
    dysphagia?: boolean | "caution";
    crohnsDisease?: boolean | "caution";
  };
  notes?: string[];
  /** Andre navn i produktkatalogen (forkortelser, annen stavemåte) – brukes til å finne VNR-varianter. */
  aliases?: string[];
  /** Lagt inn fra produktkatalogen uten at kliniske data er gjennomgått mot PDF-kildene. */
  unreviewed?: boolean;
  /** Kort beskrivelse under navnet i produktkortet. */
  summary?: string;
  /** Bruksområde i tekst når det ikke passer en av tilstandene i `clinicalUse`. */
  indication?: string;
  /** Viktige begrensninger og advarsler (aldersgrenser, kontraindikasjoner …) – vises øverst i produktkortet. */
  warnings?: string[];
  sections?: NutritionInfoSection[];
  nutrition?: NutritionTable[];
  documents?: NutritionDocument[];
};

// All clinical use entries marked as "caution" = require agreement with doctor or clinical nutritionist (KEF).
// Source: "Ernæring alder og sykdom.pdf" (PDF2) + "ernæring innhold.pdf" (PDF1)

const reviewedProducts: NutritionProduct[] = [
  // ─── Nutricia / Nutridrink-serien ───────────────────────────────────────────
  {
    id: "nutridrink",
    name: "Nutridrink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-multi-fiber",
    name: "Nutridrink Multi Fiber",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      diabetes: "caution",
      postoperative: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-protein",
    name: "Nutridrink Protein",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
      proteinRich: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
      postoperative: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-2kcal",
    name: "Nutridrink 2kcal",
    aliases: ["Nutridrink 2,0"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-compact",
    name: "Nutridrink Compact",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-compact-fiber",
    name: "Nutridrink Compact Fiber",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      diabetes: "caution",
      postoperative: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-yoghurt-style",
    name: "Nutridrink Yoghurt Style",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-plantbased",
    name: "Nutridrink PlantBased",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lactoseFree: true,
      vegan: true,
      vegetarian: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "nutridrink-juice-style",
    name: "Nutridrink Juice Style",
    aliases: ["Nutridrink juice"],
    category: "Proteinrik",
    properties: {
      glutenFree: true,
      lowLactose: true,
      fatFree: true,
    },
    age: { from3Years: true, over6Years: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
      malabsorption: "caution",
    },
  },
  {
    id: "nutridrink-compact-protein",
    name: "Nutridrink Compact Protein",
    aliases: ["Nutridrink comp prot"],
    category: "Proteinrik",
    properties: {
      glutenFree: true,
      lowLactose: true,
      proteinRich: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
    notes: ["Typo i PDF1 (Compat Protein) – korrekt navn er Compact Protein"],
  },

  // ─── Nutilis ────────────────────────────────────────────────────────────────
  {
    id: "nutilis-fruit-stage-3",
    name: "Nutilis Fruit Stage 3",
    aliases: ["Nutilis fruit"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      diabetes: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },

  // ─── Fortini (barn) ─────────────────────────────────────────────────────────
  {
    id: "fortini-smoothie",
    name: "Fortini Smoothie",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fortini-compact-multi-fiber",
    name: "Fortini Compact Multi Fiber",
    aliases: ["Fortini comp multi"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fortini-multi-fiber",
    name: "Fortini Multi Fiber",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fortini-creamy",
    name: "Fortini Creamy",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      postoperative: "caution",
      cancer: "caution",
      constipationDiarrhea: "caution",
      elderlyUndernutrition: "caution",
    },
  },

  // ─── Preoperativ ────────────────────────────────────────────────────────────
  {
    id: "preop",
    name: "preOp",
    category: "Preoperativ",
    properties: {
      glutenFree: true,
      lactoseFree: true,
      fatFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      preoperative: "caution",
    },
    notes: ["Med sukker og søtstoff"],
  },

  // ─── Sårspesifikke / KOLS / Nyre ────────────────────────────────────────────
  {
    id: "cubitan",
    name: "Cubitan",
    category: "Sårernæring",
    properties: {
      glutenFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
    },
  },
  {
    id: "respifor",
    name: "Respifor",
    category: "KOLS-ernæring",
    properties: {
      glutenFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      copd: "caution",
    },
  },
  {
    id: "renilon-40",
    name: "Renilon 4.0",
    category: "Nyreernæring",
    properties: {
      glutenFree: true,
      lowLactose: true,
      liteProtein: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      kidneyFailure: "caution",
    },
    notes: ["Predialytisk nyresvikt", "Lite protein, ikke vitamin A"],
  },
  {
    id: "renilon-75",
    name: "Renilon 7.5",
    category: "Nyreernæring",
    properties: {
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      kidneyFailure: "caution",
    },
    notes: ["Dialyse", "Normalt proteininnhold"],
  },

  // ─── Diabetesernæring ───────────────────────────────────────────────────────
  {
    id: "diasip",
    name: "Diasip",
    category: "Diabetesernæring",
    properties: {
      fiber: true,
      glutenFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      diabetes: "caution",
    },
  },
  {
    id: "diben-drink",
    name: "Diben Drink",
    category: "Diabetesernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      diabetes: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },

  // ─── Malabsorpsjon / elementær ──────────────────────────────────────────────
  {
    id: "elemental-028-extra",
    name: "Elemental 028 Extra",
    aliases: ["Elemental 028 ext*"],
    category: "Malabsorpsjon",
    properties: {
      glutenFree: true,
      lactoseFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      elderlyUndernutrition: "caution",
      malabsorption: "caution",
    },
    notes: ["35% MCT-fett"],
  },

  // ─── Fettkilde ──────────────────────────────────────────────────────────────
  {
    id: "calogen",
    name: "Calogen",
    category: "Fettkilde",
    properties: {
      glutenFree: true,
      lactoseFree: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      diabetes: "caution",
      pressureUlcers: "caution",
      postoperative: "caution",
      copd: "caution",
      kidneyFailure: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "calogen-shot",
    name: "Calogen Shot",
    aliases: ["Calogen extra shot*"],
    category: "Fettkilde",
    properties: {
      glutenFree: true,
      lowLactose: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      diabetes: "caution",
      pressureUlcers: "caution",
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },

  // ─── Fresubin-serien ────────────────────────────────────────────────────────
  {
    id: "fresubin-2kcal-drink",
    name: "Fresubin 2 kcal Drink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-2kcal-fiber-drink",
    name: "Fresubin 2 kcal Fiber Drink",
    aliases: ["Fresubin 2kcal fib dri*"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-protein-energy-drink",
    name: "Fresubin Protein Energy Drink",
    aliases: ["Fresubin protein e drink", "Fresubin prot ener drink", "Fresubin prot energy drk", "Fresubin prot energy drink"],
    category: "Proteinrik",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
      proteinRich: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-yodrink",
    name: "Fresubin Yodrink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-2kcal-creme",
    name: "Fresubin 2 kcal Creme",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-yocreme",
    name: "Fresubin Yocreme",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: {},
    clinicalUse: {
      postoperative: "caution",
      copd: "caution",
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
  },
  {
    id: "fresubin-dessert-fruit",
    name: "Fresubin Dessert Fruit",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {},
  },
  {
    id: "fresubin-energy-fiber-drink",
    name: "Fresubin Energy Fiber Drink",
    aliases: ["Fresubin ener fib drink"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {},
  },
  {
    id: "fresubin-energy-drink",
    name: "Fresubin Energy Drink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {},
  },
  {
    id: "fresubin-original-drink",
    name: "Fresubin Original Drink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { over6Years: true },
    clinicalUse: {},
  },
  {
    id: "fresubin-juicy-drink",
    name: "Fresubin Juicy Drink",
    category: "Komplett ernæring",
    properties: {
      glutenFree: true,
      lowLactose: true,
      fatFree: true,
      vegetarian: true,
    },
    age: { over6Years: true },
    clinicalUse: {},
  },
  {
    id: "fresubin-renal",
    name: "Fresubin Renal",
    category: "Nyreernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      kidneyFailure: "caution",
    },
    notes: ["Predialytisk nyresvikt"],
  },
  {
    id: "fresubin-thickened-niva-2",
    name: "Fresubin Thickened nivå 2",
    aliases: ["Fresubin thick lev 2"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {},
  },
  {
    id: "fresubin-thickened-niva-3",
    name: "Fresubin Thickened nivå 3",
    aliases: ["Fresubin thick lev 3"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {},
  },
  {
    id: "supportan-drink",
    name: "Supportan Drink",
    category: "Kreftspesifikk",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "fresubin-5kcal-shot",
    name: "Fresubin 5 kcal Shot",
    category: "Fettkilde",
    properties: {
      glutenFree: true,
      lactoseFree: true,
      lowLactose: true,
      vegan: true,
      vegetarian: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      diabetes: "caution",
      copd: "caution",
      cancer: "caution",
    },
  },

  // ─── ProvideXtra / Survimed ─────────────────────────────────────────────────
  {
    id: "providextra-drink",
    name: "ProvideXtra Drink",
    category: "Malabsorpsjon",
    properties: {
      glutenFree: true,
      lactoseFree: true,
      lowLactose: true,
      fatFree: true,
      vegetarian: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      preoperative: "caution",
      malabsorption: "caution",
    },
  },
  {
    id: "survimed-opd-drink",
    name: "Survimed OPD Drink",
    category: "Malabsorpsjon",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: {},
    clinicalUse: {
      malabsorption: "caution",
    },
  },
  {
    id: "survimed-opd-15kcal-drink",
    name: "Survimed OPD 1,5 kcal Drink",
    category: "Malabsorpsjon",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
      vegetarian: true,
    },
    age: {},
    clinicalUse: {
      malabsorption: "caution",
    },
  },

  // ─── Frebini (barn) ─────────────────────────────────────────────────────────
  {
    id: "frebini-energy-drink",
    name: "Frebini Energy Drink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      lowLactose: true,
      vegetarian: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      cancer: "caution",
    },
  },
  {
    id: "frebini-energy-fiber-drink",
    name: "Frebini Energy Fiber Drink",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      lowLactose: true,
      vegetarian: true,
    },
    age: { from1Year: true },
    clinicalUse: {
      cancer: "caution",
    },
  },

  // ─── Resource-serien ────────────────────────────────────────────────────────
  {
    id: "resource-ultra",
    name: "Resource Ultra",
    category: "Proteinrik",
    properties: {
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      diabetes: "caution",
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "resource-2-0",
    name: "Resource 2.0",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "resource-2-0-fiber",
    name: "Resource 2.0 Fiber",
    aliases: ["Resource 2,0+fibre"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      diabetes: "caution",
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "resource-active",
    name: "Resource Active",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: {},
    clinicalUse: {
      diabetes: "caution",
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "resource-protein",
    name: "Resource Protein",
    category: "Proteinrik",
    properties: {
      completeNutrition: true,
      glutenFree: true,
      proteinRich: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
      malabsorption: "caution",
    },
  },
  {
    id: "resource-komplett",
    name: "Resource Komplett",
    aliases: ["Resource kompl nær"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      copd: "caution",
      cancer: "caution",
    },
  },
  {
    id: "resource-ultra-fruit",
    name: "Resource Ultra Fruit",
    category: "Proteinrik",
    properties: {
      glutenFree: true,
      fatFree: true,
      proteinRich: true,
    },
    age: {},
    clinicalUse: {
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
      malabsorption: "caution",
    },
    notes: ["Ekstra mye protein"],
  },
  {
    id: "resource-addera-plus",
    name: "Resource Addera Plus",
    aliases: ["Resource addera+"],
    category: "Proteinrik",
    properties: {
      glutenFree: true,
      fatFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      pressureUlcers: "caution",
      copd: "caution",
      cancer: "caution",
      malabsorption: "caution",
    },
  },
  {
    id: "resource-minimax",
    name: "Resource Minimax",
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from1Year: true },
    clinicalUse: {},
  },

  // ─── Barnesondeernæring ──────────────────────────────────────────────────────
  {
    id: "minimax-barnesondeernering",
    name: "Minimax Barnesondeernæring",
    aliases: ["Minimax barnesondenæring"],
    category: "Komplett ernæring",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from1Year: true },
    clinicalUse: {},
  },

  // ─── Nutrifriend ─────────────────────────────────────────────────────────────
  {
    id: "nutrifriend",
    name: "Nutrifriend",
    category: "Proteinrik",
    properties: {
      fiber: true,
      glutenFree: true,
      lowLactose: true,
    },
    age: { from3Years: true, over6Years: true },
    clinicalUse: {
      cancer: "caution",
      elderlyUndernutrition: "caution",
    },
    notes: ["Omega-3"],
  },

  // ─── Calshake POWDER (Fresenius Kabi) ────────────────────────────────────────
  // Kilde: produktark «Calshake POWDER» (stem.no 240283, august 2025).
  {
    id: "calshake",
    name: "Calshake Powder",
    aliases: ["Calshake"],
    category: "Pulver og tilskudd",
    summary: "Energiberikningspulver til utblanding i melk · 1,9 kcal/ml ferdig tilberedt · 7 doseringsposer à 87–90 g",
    properties: {
      glutenFree: true,
    },
    age: { over6Years: true },
    clinicalUse: {
      diseaseRelatedMalnutrition: "caution",
    },
    notes: ["Til kostbehandling av sykdomsrelatert underernæring, spesielt ved høyt energibehov."],
    warnings: [
      "Skal brukes under medisinsk kontroll.",
      "Ikke egnet som eneste næringskilde.",
      "Ikke egnet til barn under 3 år. Anvendes med forsiktighet til barn under 6 år.",
      "Ikke egnet ved galaktosemi.",
      "Skal ikke benyttes dersom enteral ernæring er kontraindisert, som ved akutt gastrointestinal blødning, ileus og sjokk.",
      "Brukes med forsiktighet ved alvorlige former for nedsatt fordøyelse og absorpsjon. Ikke egnet ved manglende evne til å metabolisere noen av næringsstoffene i Calshake POWDER.",
    ],
    sections: [
      {
        title: "Dosering",
        lines: [
          "Skal vurderes ut ifra pasientens behov av relevant helsepersonell.",
          "Anbefalt dosering som supplerende ernæring er 1 pose per dag. Hver pose Jordbær inneholder 87 g pulver, hver pose Sjokolade 90 g.",
        ],
      },
      {
        title: "Tilberedning",
        lines: [
          "Tilsett innholdet i 1 pose til 240 ml melk (3,5 % fett).",
          "Bland kraftig med visp, gaffel eller shaker. Serveres best kald.",
        ],
      },
      {
        title: "Lagring og håndtering",
        lines: [
          "Oppbevares tørt og ved romtemperatur.",
          "Skal benyttes umiddelbart etter tilberedning, eller oppbevares kjølig og benyttes innen 24 timer. Omrøres igjen etter oppbevaring og før inntak.",
        ],
      },
      {
        title: "Flerkulturell egnethet",
        lines: ["Ikke halalsertifisert eller koshersertifisert."],
      },
      {
        title: "Kjente FODMAPs (per 100 g pulver)",
        lines: ["Laktose: 0,4 g (Jordbær) / 0,8 g (Sjokolade)."],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Jordbær: Fettpulver (palmeolje, glukosesirup, melkeprotein, stabilisatorer (E 452, E 340)), dekstrose, maltodekstrin, pulver av triglyserider av middels kjedelengde (vegetabilske oljer (kokosnøttolje, palmeolje, rapsolje), glukosesirup, melkeprotein, emulgator (E 472c)), skummetmelkpulver, aroma (inneholdende melk), sukker, farge (E 162), surhetsregulerende middel (E 170), magnesiumoksid, kaliumklorid.",
          "Sjokolade: Fettpulver (palmeolje, glukosesirup, melkeprotein, stabilisatorer (E 452, E 340)), dekstrose, maltodekstrin, sukker, kakaopulver, fettpulver (palmefett, laktose (melk), melkeprotein), pulver av triglyserider av middels kjedelengde (vegetabilske oljer (kokosnøttolje, palmeolje, rapsolje), glukosesirup, melkeprotein, emulgator (E 472c)), aroma (inneholdende fargestoff (E 150c)), surhetsregulerende middel (E 170), magnesiumoksid.",
          "Kan også inneholde spor av egg, gluten (og frokostblandinger inneholdende gluten), selleri, sennep og soya.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Jordbær",
        note: "Utblandingsforhold: 87 g pulver + 240 ml melk (3,5 % fett). Utgjør ca. 315 ml.",
        columns: ["Per 100 g pulver", "Per 100 ml ferdig tilberedt"],
        rows: [
          { label: "Energi (kcal)", values: ["493", "187"] },
          { label: "Energi (kJ)", values: ["2065", "782"] },
          { label: "Fett (g)", values: ["22,9", "9,1"] },
          { label: "hvorav mettede fettsyrer", values: ["15,6", "6,1"], sub: true },
          { label: "Karbohydrater (g)", values: ["69,3", "22,9"] },
          { label: "hvorav sukkerarter", values: ["35,3", "13,5"], sub: true },
          { label: "Fiber (g)", values: ["0", "0"] },
          { label: "Protein (g)", values: ["2,3", "3,3"] },
          { label: "Salt (g)", values: ["0,35", "0,19"] },
        ],
      },
      {
        title: "Sjokolade",
        note: "Utblandingsforhold: 90 g pulver + 240 ml melk (3,5 % fett). Utgjør ca. 315 ml.",
        columns: ["Per 100 g pulver", "Per 100 ml ferdig tilberedt"],
        rows: [
          { label: "Energi (kcal)", values: ["495", "192"] },
          { label: "Energi (kJ)", values: ["2072", "802"] },
          { label: "Fett (g)", values: ["24,6", "9,8"] },
          { label: "hvorav mettede fettsyrer", values: ["16,6", "6,5"], sub: true },
          { label: "Karbohydrater (g)", values: ["64,4", "22,1"] },
          { label: "hvorav sukkerarter", values: ["35,5", "13,9"], sub: true },
          { label: "Fiber (g)", values: ["1,8", "0,5"] },
          { label: "Protein (g)", values: ["3,1", "3,5"] },
          { label: "Salt (g)", values: ["0,35", "0,2"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Calshake Powder",
        url: "/dokumenter/N%C3%A6ringsmidler/Calshake%20POWDER.pdf",
        sizeLabel: "402 KB",
      },
    ],
  },

  // ─── Compleat Mix (Nestlé Health Science) ────────────────────────────────────
  // Kilde: produktark «Compleat Mix» (NHS/Comp MIX/ACBL345-2/2512 NO).
  {
    id: "compleat-mix",
    name: "Compleat Mix",
    category: "Sondeernæring",
    summary: "Fullverdig sondenæring med ingredienser fra nøye utvalgte råvarer · 1,1 kcal/ml · 12 × 500 ml og 9 × 1000 ml",
    indication: "Pasienter med, eller i risiko for, underernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {},
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål, ernæringsmessig fullverdig.",
          "Tilpasset ernæringsbehandling av pasienter med, eller i risiko for, underernæring.",
          "Egnet som eneste næringskilde og kan brukes fra 3 års alder.",
          "Kan foreskrives på blå resept.",
        ],
      },
      {
        title: "Dosering",
        lines: ["1500–2000 ml for fullverdig ernæring, eller i følge anbefaling fra lege/klinisk ernæringsfysiolog."],
      },
      {
        title: "Oppbevaring og hengetid",
        lines: [
          "Uåpnet forpakning oppbevares svalt og tørt. Flasken ristes før bruk.",
          "Sammenkoblet med ernæringssett administreres produktet innen 24 timer.",
          "Åpnet flaske oppbevares i kjøleskap med korken på og brukes innen 24 timer.",
        ],
      },
      {
        title: "Sammensetning",
        lines: [
          "Ingredienser fra råvarer: kylling, erter, bønner, fersken og appelsin.",
          "Fire fettkilder (raps-, solsikke-, MCT- og fiskolje), tre proteinkilder (melkeprotein, kylling og erter) og seks fiberkilder (ertefiber, fruktooligosakkarider, akasiegummi, inulin, erter og fersken).",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Glutenfri.", "Halal-sertifisert.", "Laktose: under 0,05 g per 100 ml."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Vann, maltodekstrin, rehydrert kyllingkjøtt (6,9 %), rehydrerte grønnsaker (5,95 %, (erter (5,2 %), grønne bønner (0,75 %)), melkeproteiner, appelsinjuice (1,8 %) fra konsentrat, ferskenpuré (1,5 %), vegetabilske oljer (raps, solsikke), fiber (ertefiber, akasiegummi, fruktooligosakkarider, inulin), MCT-olje, mineraler (natrium, kalium, kalsium, magnesium, jern, sink, kobber, mangan, fluorid, krom, molybden, jod, selen), emulgeringsmiddel (E472c, E471), fiskolje, vitaminer (C, E, niacin, pantotensyre, B6, tiamin, riboflavin, A, folsyre, K, biotin, D, B12), kolin, stabiliseringsmiddel (E407), antioksidant (E304). UHT-behandlet. Pakket i beskyttet atmosfære.",
          "Kontroller alltid informasjonen på forpakningen før bruk.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Energi og næringsstoffer",
        columns: ["Per 100 ml", "Energi %"],
        rows: [
          { label: "Energi (kcal)", values: ["110", ""] },
          { label: "Energi (kJ)", values: ["461", ""] },
          { label: "Fett (g)", values: ["3,7", "30"] },
          { label: "hvorav mettet", values: ["1,6", ""], sub: true },
          { label: "hvorav MCT", values: ["0,70", ""], sub: true },
          { label: "hvorav enumettet", values: ["1,4", ""], sub: true },
          { label: "hvorav flerumettet", values: ["0,7", ""], sub: true },
          { label: "hvorav omega-3", values: ["0,13", ""], sub: true },
          { label: "Karbohydrat (g)", values: ["14", "51"] },
          { label: "hvorav sukkerarter", values: ["1,4", ""], sub: true },
          { label: "hvorav laktose", values: ["<0,05", ""], sub: true },
          { label: "Kostfiber (g)", values: ["1,4", "3"] },
          { label: "løselige", values: ["0,7", ""], sub: true },
          { label: "uløselige", values: ["0,7", ""], sub: true },
          { label: "Protein (g)", values: ["4,4", "16"] },
        ],
      },
      {
        title: "Mineraler",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Natrium (mg)", values: ["100"] },
          { label: "Kalium (mg)", values: ["130"] },
          { label: "Klorid (mg)", values: ["85"] },
          { label: "Kalsium (mg)", values: ["80"] },
          { label: "Fosfor (mg)", values: ["70"] },
          { label: "Magnesium (mg)", values: ["18"] },
          { label: "Jern (mg)", values: ["1,5"] },
          { label: "Sink (mg)", values: ["1,2"] },
          { label: "Kobber (mg)", values: ["0,19"] },
          { label: "Mangan (mg)", values: ["0,29"] },
          { label: "Fluorid (mg)", values: ["0,15"] },
          { label: "Selen (µg)", values: ["8,2"] },
          { label: "Krom (µg)", values: ["11"] },
          { label: "Molybden (µg)", values: ["14"] },
          { label: "Jod (µg)", values: ["17"] },
        ],
      },
      {
        title: "Vitaminer og øvrig",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Vitamin A (µg RE)", values: ["130"] },
          { label: "Vitamin D (µg)", values: ["1,6"] },
          { label: "Vitamin E (mg)", values: ["2,0"] },
          { label: "Vitamin K (µg)", values: ["8,5"] },
          { label: "Vitamin C (mg)", values: ["11"] },
          { label: "Tiamin (mg)", values: ["0,16"] },
          { label: "Riboflavin (mg)", values: ["0,19"] },
          { label: "Niacin (mg NE)", values: ["2,2"] },
          { label: "Vitamin B6 (mg)", values: ["0,2"] },
          { label: "Folsyre (µg)", values: ["31"] },
          { label: "Vitamin B12 (µg)", values: ["0,37"] },
          { label: "Biotin (µg)", values: ["5,5"] },
          { label: "Pantotensyre (mg)", values: ["0,80"] },
          { label: "Kolin (mg)", values: ["42"] },
          { label: "Osmolaritet (mOsm/L)", values: ["315"] },
          { label: "Osmolalitet (mOsm/kg H₂O)", values: ["380"] },
          { label: "Vann (g)", values: ["84"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Compleat Mix",
        url: "/dokumenter/N%C3%A6ringsmidler/Compleat%20Mix.pdf",
        sizeLabel: "486 KB",
      },
    ],
  },

  // ─── Compleat Mix Protein (Nestlé Health Science) ────────────────────────────
  // Kilde: produktark «Compleat Mix Protein» (NHS/Comp MIX Protein/ACBL345-2/2512 NO).
  {
    id: "compleat-mix-protein",
    name: "Compleat Mix Protein",
    category: "Sondeernæring",
    summary: "Fullverdig energi- og proteinrik sondenæring med ingredienser fra nøye utvalgte råvarer · 1,5 kcal/ml · 12 × 500 ml",
    indication: "Pasienter med, eller i risiko for, underernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
      proteinRich: true,
    },
    age: { from15Years: true },
    clinicalUse: {},
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål, næringsmessig fullverdig, med høyt energi- og proteininnhold.",
          "Ment for kostbehandling av pasienter med, eller i risiko for, underernæring.",
          "Egnet som eneste næringskilde og kan brukes fra 15 års alder.",
          "Kan foreskrives på blå resept.",
        ],
      },
      {
        title: "Dosering",
        lines: ["1000–1500 ml/dag for fullverdig ernæring, eller over 500 ml for delvis ernæring, i henhold til anbefaling fra lege eller klinisk ernæringsfysiolog."],
      },
      {
        title: "Oppbevaring og hengetid",
        lines: [
          "Uåpnet forpakning oppbevares svalt og tørt. Flasken ristes nøye før bruk.",
          "Sammenkoblet med ernæringssett administreres produktet innen 24 timer.",
          "Åpnet flaske med korken på kan oppbevares i kjøleskap og brukes innen 24 timer.",
        ],
      },
      {
        title: "Sammensetning",
        lines: [
          "Ingredienser fra råvarer: kylling, erter, bønner, fersken og appelsinjuice.",
          "Fire fettkilder (raps-, solsikke-, MCT- og fiskolje). 26 % av proteinet kommer fra kylling, resten er melkeprotein. Fem fiberkilder (havrefiber, fruktooligosakkarider, akasiegummi, inulin og fersken).",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Glutenfri.", "Halal-sertifisert.", "Laktose: høyst 0,1 g per 100 ml."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Vann, maltodekstrin, rehydrert kyllingkjøtt 13 %, melkeproteiner, vegetabilske oljer (raps, soya), ferskenpuré 2,2 %, appelsinjuice fra konsentrat 1,8 %, fiber (glutenfri havrefiber, fruktooligosakkarider, akasiegummi, inulin), MCT-olje, rehydrerte grønnsaker 2,1 % (grønne bønner 2,0 %, erter 0,1 %), mineraler (natrium, kalium, kalsium, magnesium, jern, sink, kobber, mangan, krom, molybden, fluorid, jod, selen), emulgeringsmiddel (E471, E472c), kolin, fiskolje, surhetsregulerende middel (E330), vitaminer (C, E, niacin, pantotensyre, folsyre, B6, tiamin, riboflavin, A, K, biotin, D, B12), antioksidant (E304). UHT-behandlet. Pakket i beskyttet atmosfære.",
          "Kontroller alltid informasjonen på forpakningen før bruk.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Energi og næringsstoffer",
        columns: ["Per 100 ml", "Energi %"],
        rows: [
          { label: "Energi (kcal)", values: ["150", ""] },
          { label: "Energi (kJ)", values: ["625", ""] },
          { label: "Fett (g)", values: ["7,3", "44"] },
          { label: "hvorav mettet", values: ["2,9", ""], sub: true },
          { label: "hvorav MCT", values: ["1,5", ""], sub: true },
          { label: "hvorav enumettet", values: ["1,2", ""], sub: true },
          { label: "hvorav flerumettet", values: ["1,0", ""], sub: true },
          { label: "hvorav omega-3", values: ["0,19", ""], sub: true },
          { label: "Karbohydrat (g)", values: ["12,7", "34"] },
          { label: "hvorav sukkerarter", values: ["1,4", ""], sub: true },
          { label: "hvorav laktose", values: ["≤ 0,1", ""], sub: true },
          { label: "Kostfiber (g)", values: ["1,5", "2"] },
          { label: "løselige", values: ["0,75", ""], sub: true },
          { label: "uløselige", values: ["0,75", ""], sub: true },
          { label: "Protein (g)", values: ["7,5", "20"] },
          { label: "Salt (g)", values: ["0,32", ""] },
        ],
      },
      {
        title: "Mineraler",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Natrium (mg)", values: ["130"] },
          { label: "Kalium (mg)", values: ["180"] },
          { label: "Klorid (mg)", values: ["100"] },
          { label: "Kalsium (mg)", values: ["110"] },
          { label: "Fosfor (mg)", values: ["90"] },
          { label: "Magnesium (mg)", values: ["29"] },
          { label: "Jern (mg)", values: ["1,6"] },
          { label: "Sink (mg)", values: ["1,3"] },
          { label: "Kobber (mg)", values: ["0,16"] },
          { label: "Mangan (mg)", values: ["0,37"] },
          { label: "Fluorid (mg)", values: ["0,075"] },
          { label: "Selen (µg)", values: ["12"] },
          { label: "Krom (µg)", values: ["9,0"] },
          { label: "Molybden (µg)", values: ["11"] },
          { label: "Jod (µg)", values: ["16"] },
        ],
      },
      {
        title: "Vitaminer og øvrig",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Vitamin A (µg RE)", values: ["150"] },
          { label: "Vitamin D (µg)", values: ["2,5"] },
          { label: "Vitamin E (mg)", values: ["2,5"] },
          { label: "Vitamin K (µg)", values: ["13"] },
          { label: "Vitamin C (mg)", values: ["13"] },
          { label: "Tiamin (mg)", values: ["0,30"] },
          { label: "Riboflavin (mg)", values: ["0,28"] },
          { label: "Niacin (mg)", values: ["2,2"] },
          { label: "Niacin (mg NE)", values: ["3,3"] },
          { label: "Vitamin B6 (mg)", values: ["0,38"] },
          { label: "Folsyre (µg)", values: ["60"] },
          { label: "Vitamin B12 (µg)", values: ["0,69"] },
          { label: "Biotin (µg)", values: ["8,5"] },
          { label: "Pantotensyre (mg)", values: ["0,90"] },
          { label: "Kolin (mg)", values: ["48"] },
          { label: "Osmolaritet (mOsm/L)", values: ["390"] },
          { label: "Osmolalitet (mOsm/kg H₂O)", values: ["500"] },
          { label: "Vann (g)", values: ["78"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Compleat Mix Protein",
        url: "/dokumenter/N%C3%A6ringsmidler/Compleat%20Mix%20Protein.pdf",
        sizeLabel: "335 KB",
      },
    ],
  },

  // ─── Compleat Paediatric Mix (Nestlé Health Science) ─────────────────────────
  // Kilde: produktark «Compleat Paediatric Mix» (NHS/Comp paed MIX/ACBL347/2512 NO).
  {
    id: "compleat-paediatric-mix",
    name: "Compleat Paediatric Mix",
    category: "Sondeernæring",
    summary: "Fullverdig sondenæring med ingredienser fra nøye utvalgte råvarer, spesialtilpasset for barn · 1,17 kcal/ml · 12 × 500 ml",
    indication: "Barn med, eller i risiko for, underernæring",
    properties: {
      completeNutrition: true,
      fiber: true,
      glutenFree: true,
    },
    age: { from1Year: true },
    clinicalUse: {},
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål, ernæringsmessig fullverdig og spesialtilpasset for barn.",
          "Tilpasset kostbehandling av barn med, eller i risiko for, underernæring.",
          "Kan brukes som eneste næringskilde fra 1 års alder.",
          "Kan foreskrives på blå resept.",
        ],
      },
      {
        title: "Dosering",
        lines: ["Anbefalt daglig inntak er 500–1700 ml avhengig av barnets behov, eller etter anbefaling fra kvalifisert helsepersonell."],
      },
      {
        title: "Oppbevaring og hengetid",
        lines: [
          "Uåpnet forpakning oppbevares svalt og tørt. Flasken ristes før bruk.",
          "Sammenkoblet med ernæringssett administreres sondenæringen innen 24 timer.",
          "Åpnet flaske, med korken på, oppbevares i kjøleskap og brukes innen 24 timer.",
        ],
      },
      {
        title: "Sammensetning",
        lines: [
          "Ingredienser fra råvarer: kylling, erter, bønner, fersken og appelsin.",
          "Fire fettkilder (raps-, solsikke-, MCT- og fiskolje), tre proteinkilder (melkeprotein, kylling og erter) og seks fiberkilder (ertefiber, fruktooligosakkarider, akasiegummi, inulin, erter og fersken).",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Glutenfri.", "Halal-sertifisert.", "Laktose: under 0,05 g per 100 ml."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Vann, maltodekstrin, rehydrert kyllingkjøtt (6,9 %), rehydrerte grønnsaker 4,3 % (erter 3,8 %, grønne bønner 0,54 %), vegetabilske oljer (raps, solsikke), melkeproteiner, ferskenpuré (1,4 %), appelsinjuice (1,2 %) fra konsentrat, fibre (ertefiber, akasiegummi, fruktooligosakkarider, inulin), emulgeringsmiddel (E472c, E471), middellange triglyserider (MCT), mineraler (kalium, kalsium, natrium, magnesium, jern, sink, kobber, mangan, fluorid, jod, molybden, krom, selen), fiskolje, kolin, vitaminer (C, niacin, E, pantotensyre, B6, riboflavin, tiamin, A, folsyre, K, biotin, D, B12), stabiliseringsmiddel (E407), taurin, L-karnitin, antioksidant (E304). UHT-behandlet. Pakket i beskyttet atmosfære.",
          "Kontroller alltid informasjonen på forpakningen før bruk.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Energi og næringsstoffer",
        columns: ["Per 100 ml", "Energi %"],
        rows: [
          { label: "Energi (kcal)", values: ["117", ""] },
          { label: "Energi (kJ)", values: ["492", ""] },
          { label: "Fett (g)", values: ["5,0", "39"] },
          { label: "hvorav mettet", values: ["1,6", ""], sub: true },
          { label: "hvorav MCT", values: ["0,70", ""], sub: true },
          { label: "hvorav enumettet", values: ["1,8", ""], sub: true },
          { label: "hvorav flerumettet", values: ["1,1", ""], sub: true },
          { label: "forhold n-6:n-3", values: ["3,9:1", ""], sub: true },
          { label: "Karbohydrat (g)", values: ["14", "47"] },
          { label: "hvorav sukkerarter", values: ["1,3", ""], sub: true },
          { label: "hvorav laktose", values: ["<0,05", ""], sub: true },
          { label: "Kostfiber (g)", values: ["1,0", "2"] },
          { label: "løselige", values: ["0,5", ""], sub: true },
          { label: "uløselige", values: ["0,5", ""], sub: true },
          { label: "Protein (g)", values: ["3,6", "12"] },
        ],
      },
      {
        title: "Mineraler",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Natrium (mg)", values: ["57"] },
          { label: "Kalium (mg)", values: ["150"] },
          { label: "Klorid (mg)", values: ["130"] },
          { label: "Kalsium (mg)", values: ["115"] },
          { label: "Fosfor (mg)", values: ["73"] },
          { label: "Magnesium (mg)", values: ["19"] },
          { label: "Jern (mg)", values: ["1,4"] },
          { label: "Sink (mg)", values: ["0,70"] },
          { label: "Kobber (mg)", values: ["0,08"] },
          { label: "Mangan (mg)", values: ["0,16"] },
          { label: "Fluorid (mg)", values: ["0,096"] },
          { label: "Selen (µg)", values: ["4,1"] },
          { label: "Krom (µg)", values: ["2,9"] },
          { label: "Molybden (µg)", values: ["6,5"] },
          { label: "Jod (µg)", values: ["12"] },
        ],
      },
      {
        title: "Vitaminer og øvrig",
        columns: ["Per 100 ml"],
        rows: [
          { label: "Vitamin A (µg RE)", values: ["60"] },
          { label: "Vitamin D (µg)", values: ["1,7"] },
          { label: "Vitamin E (mg)", values: ["1,4"] },
          { label: "Vitamin K (µg)", values: ["7,2"] },
          { label: "Vitamin C (mg)", values: ["5,2"] },
          { label: "Tiamin (mg)", values: ["0,10"] },
          { label: "Riboflavin (mg)", values: ["0,14"] },
          { label: "Niacin (mg NE)", values: ["1,8"] },
          { label: "Vitamin B6 (mg)", values: ["0,14"] },
          { label: "Folsyre (µg)", values: ["18"] },
          { label: "Vitamin B12 (µg)", values: ["0,24"] },
          { label: "Biotin (µg)", values: ["2,4"] },
          { label: "Pantotensyre (mg)", values: ["0,50"] },
          { label: "Taurin (mg)", values: ["9,6"] },
          { label: "L-karnitin (mg)", values: ["4,8"] },
          { label: "Kolin (mg)", values: ["36"] },
          { label: "Osmolaritet (mOsm/L)", values: ["280"] },
          { label: "Osmolalitet (mOsm/kg H₂O)", values: ["340"] },
          { label: "Vann (g)", values: ["80"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Compleat Paediatric Mix",
        url: "/dokumenter/N%C3%A6ringsmidler/Compleat%20Paediatric%20Mix.pdf",
        sizeLabel: "349 KB",
      },
    ],
  },

  // ─── ThickenUp (Nestlé Health Science) ───────────────────────────────────────
  // Kilde: produktark «ThickenUp» (NHS/Thicken Up MD008/2211 NO).
  {
    id: "thickenup",
    name: "ThickenUp",
    aliases: ["ThickenUp fortykningsmiddel"],
    category: "Fortykningsmiddel",
    summary: "Lettoppløselig, stivelsesbasert fortykningsmiddel i pulverform · endrer konsistensen uten å endre smaken · 227 g",
    properties: {
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      dysphagia: "caution",
    },
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
      "Kun til oralt bruk.",
      "Ikke egnet som eneste næringskilde.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål.",
          "Kostbehandling av pasienter med dysfagi, for barn over 3 år og voksne. For eksempel ved medfødte tygge- og svelgeproblemer, slag, nevrologiske lidelser som Parkinson, MS og ALS, kirurgiske inngrep i munn og svelg og ved dårlig tannstatus.",
        ],
      },
      {
        title: "Slik blander du",
        lines: [
          "Bruk et knivblad for strøken spiseskje. 1 strøken spiseskje = 4,5 g pulver.",
          "Tilsett ThickenUp langsomt under rask omrøring i varme eller kalde drikker, supper, sauser eller puréer. Visp eller rør til pulveret er helt oppløst og ønsket konsistens er oppnådd.",
          "Kan eventuelt blandes med mikser på lav hastighet i 5–10 sekunder.",
          "Vann med mye mineraler kan ta opptil 5 minutter å fortykke. Melk og melkelignende næringsdrikker kan ta opptil 20 minutter.",
        ],
      },
      {
        title: "Dosering med 200 ml væske (vann, juice, te, kaffe)",
        wide: true,
        lines: [
          "Nivå 1 – Minimalt tykk: 1,5 spiseskje. Tykkere enn vann. Renner gjennom sugerør, sprøyte og smokk.",
          "Nivå 2 – Litt tykk: 2 spiseskjeer. Renner raskt av fra en skje. Lett anstrengelse kreves for å drikke gjennom et sugerør (5,3 mm i diameter).",
          "Nivå 3 – Moderat tykk: 2,5 spiseskjeer. Kan drikkes fra et glass og spises med skje. Moderat anstrengelse med sugerør.",
          "Nivå 4 – Ekstremt tykk: 3 spiseskjeer. Spises vanligvis med gaffel eller skje. Kan ikke drikkes fra et glass, og fungerer ikke med sugerør. Krever ikke tygging.",
          "Fortykningsnivå kan variere med produsent og merke på væsken. Nivå 4 er basert på IDDSI Spoon Tilt Test. Den som administrerer ThickenUp må forsikre seg om at væsken blandes ut til passende konsistens. Ved matlaging tilsettes ThickenUp etter behov.",
        ],
      },
      {
        title: "Egenskaper",
        lines: [
          "Lett å blande, klumper ikke. Tykner raskt og gir ingen bismak.",
          "Kan fryses, tines og varmes opp uten å miste konsistensen.",
          "Kan blandes direkte i både varme og kalde drikker og puréer, og kan brukes til å gelépreparere for eksempel smørbrød eller kjeks.",
        ],
      },
      {
        title: "Oppbevaring",
        lines: [
          "Oppbevares tørt og svalt, ikke over normal romtemperatur.",
          "Åpnet forpakning lukkes godt og brukes innen 8 uker.",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Inneholder ikke melk.", "Glutenfri.", "Halal-sertifisert."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com. Spørsmål om bestilling: kundeservice@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
          "Minste bestillingsenhet: 1 × 227 g.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: ["Modifisert stivelse (mais).", "Kontroller alltid informasjonen på forpakningen før bruk."],
      },
    ],
    nutrition: [
      {
        title: "Næringsdeklarasjon",
        note: "1 spiseskje = 4,5 g pulver.",
        columns: ["Per 4,5 g", "Per 100 g"],
        rows: [
          { label: "Energi (kcal)", values: ["16,4", "364"] },
          { label: "Energi (kJ)", values: ["69,7", "1548"] },
          { label: "Fett (g)", values: ["–", "<0,15"] },
          { label: "hvorav mettet fett", values: ["–", "<0,10"], sub: true },
          { label: "Karbohydrater (g)", values: ["4,1", "90"] },
          { label: "hvorav sukkerarter", values: ["<0,090", "<1,9"], sub: true },
          { label: "Kostfiber (g)", values: ["–", "<1,0"] },
          { label: "Protein (g)", values: ["–", "<0,50"] },
          { label: "Salt (g)", values: ["<0,020", "<0,50"] },
          { label: "Natrium (mg)", values: ["<9,0", "<200"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark ThickenUp",
        url: "/dokumenter/N%C3%A6ringsmidler/ThickenUp.pdf",
        sizeLabel: "595 KB",
      },
    ],
  },

  // ─── ThickenUp Clear (Nestlé Health Science) ─────────────────────────────────
  // Kilde: produktark «ThickenUp Clear» (NHS/Thicken Up Clear/TD 507148/2211 NO).
  {
    id: "thickenup-clear",
    name: "ThickenUp Clear",
    category: "Fortykningsmiddel",
    summary: "Fortykningsmiddel i pulverform (xantangummi) · påvirker ikke smak, lukt eller farge · ettertykner ikke · 125 g",
    properties: {
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      dysphagia: "caution",
    },
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
      "Kun til oralt bruk.",
      "Ikke egnet som eneste næringskilde.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål.",
          "Kostbehandling av pasienter med dysfagi, for barn over 3 år og voksne. For eksempel ved medfødte tygge- og svelgeproblemer, slag, nevrologiske lidelser som Parkinson, MS og ALS, kirurgiske inngrep i munn og svelg og ved dårlig tannstatus.",
        ],
      },
      {
        title: "Egenskaper",
        lines: [
          "Virker umiddelbart og gir et klart resultat i væsker.",
          "Kan brukes sammen med varme, kalde eller kullsyreholdige drikker og med flytende kost.",
          "Fortykket væske kan fryses, tines og varmes opp uten at den mister konsistensen.",
          "Ettertykner ikke: en mugge med drikke kan blandes og stå i kjøleskapet i opptil 24 timer.",
          "Amylaseresistent: væsken beholder samme konsistens gjennom hele svelgeprosessen. Det gir økt sikkerhet ved dysfagi fordi risikoen for aspirasjon reduseres.",
        ],
      },
      {
        title: "Slik blander du",
        lines: [
          "Bruk måleskjeen som følger med i forpakningen og et knivblad for strøken måleskje. 1 strøken måleskje = 1,2 g pulver.",
          "Tilsett først ønsket mengde pulver i et rent og tørt glass, kopp eller beger. Tilsett deretter væske.",
          "Rør om med en gang, og rør til pulveret er helt oppløst. La det stå i minst 1 minutt før servering.",
          "Vann med mye mineraler kan ta opptil 5 minutter å fortykke. Melk og melkelignende næringsdrikker kan ta opptil 20 minutter.",
        ],
      },
      {
        title: "Dosering med 200 ml væske (vann, juice, te, kaffe)",
        wide: true,
        lines: [
          "Nivå 1 – Minimalt tykk: 1 måleskje. Tykkere enn vann. Renner gjennom sugerør, sprøyte og smokk.",
          "Nivå 2 – Litt tykk: 2 måleskjeer. Renner raskt av fra en skje. Lett anstrengelse kreves for å drikke gjennom et sugerør (5,3 mm i diameter).",
          "Nivå 3 – Moderat tykk: 4 måleskjeer. Kan drikkes fra et glass og spises med skje. Moderat anstrengelse med sugerør.",
          "Nivå 4 – Ekstremt tykk: 6 måleskjeer. Spises vanligvis med gaffel eller skje. Kan ikke drikkes fra et glass, og fungerer ikke med sugerør. Krever ikke tygging.",
          "Fortykningsnivå kan variere med produsent og merke på væsken. IDDSI nivå 4 er basert på Spoon Tilt Test. Den som administrerer ThickenUp Clear må sørge for at væsken blandes til riktig konsistens.",
        ],
      },
      {
        title: "Oppbevaring",
        lines: [
          "Oppbevares tørt og svalt, ikke over normal romtemperatur.",
          "Åpnet forpakning lukkes godt og brukes innen 8 uker.",
          "Tilberedt produkt oppbevares tildekket og brukes innen 4 timer i romtemperatur, eller innen 24 timer i kjøleskap.",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Inneholder ikke melk.", "Glutenfri.", "Halal-sertifisert.", "Kosher-sertifisert."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com. Spørsmål om bestilling: kundeservice@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
          "Minste bestillingsenhet: 1 × 125 g.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: ["Maltodekstrin, xantangummi, kaliumklorid.", "Kontroller alltid informasjonen på forpakningen før bruk."],
      },
    ],
    nutrition: [
      {
        title: "Næringsdeklarasjon",
        note: "1 måleskje = 1,2 g pulver.",
        columns: ["Per 1,2 g", "Per 100 g"],
        rows: [
          { label: "Energi (kcal)", values: ["3,7", "306"] },
          { label: "Energi (kJ)", values: ["15", "1287"] },
          { label: "Fett (g)", values: ["0", "0"] },
          { label: "hvorav mettet", values: ["0", "0"], sub: true },
          { label: "Karbohydrater (g)", values: ["0,74", "62"] },
          { label: "hvorav sukkerarter", values: ["0,022", "1,8"], sub: true },
          { label: "Kostfiber (g)", values: ["0,32", "27"] },
          { label: "Protein (g)", values: ["0,012", "1,0"] },
          { label: "Salt (g)", values: ["0,032", "2,7"] },
          { label: "Natrium (mg)", values: ["13", "1060"] },
          { label: "Kalium (mg)", values: ["4,8", "400"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark ThickenUp Clear",
        url: "/dokumenter/N%C3%A6ringsmidler/ThickenUp%20Clear.pdf",
        sizeLabel: "345 KB",
      },
    ],
  },

  // ─── Modulen IBD (Nestlé Health Science) ─────────────────────────────────────
  // Kilde: produktark «Modulen IBD» (NHS/MODULEN ACD013-1/2406 NO).
  {
    id: "modulen-ibd",
    name: "Modulen IBD",
    aliases: ["Modulen"],
    category: "Pulver og tilskudd",
    summary: "Ernæringsmessig fullverdig næringsmiddel i pulverform · 1,0 kcal/ml ved standard tilberedning · 400 g pulver",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from5Years: true },
    clinicalUse: {
      crohnsDisease: "caution",
    },
    warnings: [
      "Brukes i samråd med lege eller klinisk ernæringsfysiolog.",
      "Kun egnet fra 5 års alder.",
      "Ikke tilsett mat eller legemidler dersom produktet gis via sonde.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål, ernæringsmessig fullverdig.",
          "Kostbehandling ved Crohns sykdom. Kan også brukes som næringstilskudd ved andre tilstander.",
          "Kan brukes som eneste næringskilde ved Crohns sykdom, og passer som tillegg til «Crohn's Disease Exclusion Diet» (CDED). Både Modulen IBD og CDED inngår i kostholdsprogrammet ModuLife, som bør brukes i samråd med helsepersonell.",
          "For oral bruk eller sondeernæring.",
          "Kan foreskrives på blå resept.",
        ],
      },
      {
        title: "Dosering",
        lines: [
          "Se doseringstabell på emballasjen.",
          "Daglig nærings- og væskeinntak bør beregnes av lege eller klinisk ernæringsfysiolog.",
        ],
      },
      {
        title: "Tilberedning",
        lines: [
          "Blandes i vann og brukes som næringsdrikk, eller blandes i mat og drikke som berikning.",
          "For variasjon kan drikken smaksettes, for eksempel med honning, kakao eller frukt og bær.",
          "Kan serveres kald eller varm, men må ikke kokes. Kan også fryses og spises som is.",
        ],
      },
      {
        title: "Oppbevaring og hengetid",
        lines: [
          "Åpnet emballasje oppbevares med lokket på, på et tørt og kjølig sted, og må brukes innen fire uker.",
          "Ferdig blandet produkt oppbevares tildekket og brukes innen 6 timer i romtemperatur, eller innen 24 timer i kjøleskap.",
        ],
      },
      {
        title: "Sammensetning",
        lines: [
          "Ved standard tilberedning: 1,0 kcal/ml, 35 g protein/L, 26 % MCT-fett og 290 mOsm/L.",
          "Proteinkilden er kasein. Fett fra melkefett, MCT-fett, maisolje og soyalecitin. Karbohydrat fra glukosesirup og sukrose.",
        ],
      },
      {
        title: "Egnethet",
        lines: [
          "Glutenfri.",
          "Halal-sertifisert.",
          "Laktose: under 0,1 g per 100 ml. Inneholder melkeprotein og melkefett.",
        ],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com. Spørsmål om bestilling: kundeservice@no.nestle.com.",
          "Tlf. kundeservice: 800 31 425.",
          "Forpakning: 1 × 400 g pulver.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Glukosesirup, melkeproteiner, sukrose, melkefett, MCT-olje, mineraler (magnesiumklorid, kalsiumfosfat, natriumsitrat, kaliumsitrat, kaliumhydroksid, kalsiumkarbonat, kaliumklorid, mangansulfat, jernsulfat, sinksulfat, kobbersulfat, natriummolybdat, kromklorid, kaliumjodid, natriumselenat), maisolje, emulgator (soyalecitin), vitaminer (C, E, niacin, pantotensyre, B6, tiamin, A, riboflavin, folsyre, K, biotin, D, B12), kolinbitartrat.",
          "Kontroller alltid informasjonen på forpakningen før bruk.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Energi og næringsstoffer",
        note: "Tilberedt med 20 g pulver.",
        columns: ["Per 100 g pulver", "Per 100 ml tilberedt"],
        rows: [
          { label: "Energi (kcal)", values: ["493", "99"] },
          { label: "Energi (kJ)", values: ["2066", "413"] },
          { label: "Fett (g)", values: ["23", "4,6"] },
          { label: "hvorav mettet", values: ["13", "2,6"], sub: true },
          { label: "hvorav MCT", values: ["6,0", "1,2"], sub: true },
          { label: "hvorav enumettet", values: ["3,9", "0,8"], sub: true },
          { label: "hvorav flerumettet", values: ["2,5", "0,5"], sub: true },
          { label: "Karbohydrat (g)", values: ["54", "11"] },
          { label: "hvorav sukkerarter", values: ["21", "4,2"], sub: true },
          { label: "hvorav laktose", values: ["<0,50", "<0,1"], sub: true },
          { label: "Fiber (g)", values: ["0", "0"] },
          { label: "Protein (g)", values: ["17,5", "3,5"] },
        ],
      },
      {
        title: "Mineraler",
        columns: ["Per 100 g pulver", "Per 100 ml tilberedt"],
        rows: [
          { label: "Natrium (mg)", values: ["170", "34"] },
          { label: "Kalium (mg)", values: ["600", "120"] },
          { label: "Klorid (mg)", values: ["365", "73"] },
          { label: "Kalsium (mg)", values: ["445", "89"] },
          { label: "Fosfor (mg)", values: ["300", "60"] },
          { label: "Magnesium (mg)", values: ["100", "20"] },
          { label: "Jern (mg)", values: ["5,4", "1,1"] },
          { label: "Sink (mg)", values: ["4,7", "0,94"] },
          { label: "Kobber (mg)", values: ["0,49", "0,098"] },
          { label: "Mangan (mg)", values: ["0,98", "0,20"] },
          { label: "Fluorid (mg)", values: ["<0,1", "–"] },
          { label: "Selen (µg)", values: ["17", "3,4"] },
          { label: "Krom (µg)", values: ["25", "5,0"] },
          { label: "Molybden (µg)", values: ["37", "7,4"] },
          { label: "Jod (µg)", values: ["49", "9,8"] },
        ],
      },
      {
        title: "Vitaminer og øvrig",
        columns: ["Per 100 g pulver", "Per 100 ml tilberedt"],
        rows: [
          { label: "Vitamin A (µg)", values: ["410", "82"] },
          { label: "Vitamin D (µg)", values: ["4,9", "0,98"] },
          { label: "Vitamin E (mg)", values: ["6,5", "1,3"] },
          { label: "Vitamin K (µg)", values: ["27", "5,4"] },
          { label: "Vitamin C (mg)", values: ["47", "9,4"] },
          { label: "Tiamin (mg)", values: ["0,59", "0,12"] },
          { label: "Riboflavin (mg)", values: ["0,64", "0,13"] },
          { label: "Niacin (mg NE)", values: ["9,8", "2,0"] },
          { label: "Vitamin B6 (mg)", values: ["0,83", "0,17"] },
          { label: "Folsyre (µg)", values: ["120", "24"] },
          { label: "Vitamin B12 (µg)", values: ["1,6", "0,32"] },
          { label: "Biotin (µg)", values: ["16", "3,2"] },
          { label: "Pantotensyre (mg)", values: ["2,4", "0,48"] },
          { label: "Kolin (mg)", values: ["35", "7,0"] },
          { label: "Osmolaritet (mOsm/L)", values: ["290", "290"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Modulen IBD",
        url: "/dokumenter/N%C3%A6ringsmidler/Modulen%20IBD.pdf",
        sizeLabel: "295 KB",
      },
    ],
  },

  // ─── Isosource Energy / Energy Fibre (Nestlé Health Science) ─────────────────
  // Kilde: produktark «Isosource Energy/Energy Fibre» (NHS/Isos Energy/EnergyFibre/ACBL 330/335/2306 NO).
  // Arket oppgir verdier for begge utgavene (uten/med fiber); tabellene har én kolonne per utgave.
  {
    id: "isosource-energy",
    name: "Isosource Energy / Energy Fibre",
    aliases: ["Isosource energy"],
    category: "Sondeernæring",
    summary: "Energirik standardsondenæring med eller uten fiber · 1,6 kcal/ml · 12 × 500 ml",
    indication: "Pasienter med, eller i risiko for, underernæring som har stort energibehov og/eller væskerestriksjon",
    properties: {
      completeNutrition: true,
      glutenFree: true,
    },
    age: { from3Years: true },
    clinicalUse: {},
    warnings: [
      "Skal brukes under medisinsk tilsyn.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringsmiddel til spesielle medisinske formål, fullverdig.",
          "Ment for kostbehandling av pasienter med, eller i risiko for, underernæring som har et stort energibehov og/eller væskerestriksjon.",
          "Egnet som eneste næringskilde og kan brukes fra 3 års alder.",
          "Kan foreskrives på blå resept.",
        ],
      },
      {
        title: "Med eller uten fiber",
        lines: [
          "Isosource Energy er uten fiber. Isosource Energy Fibre inneholder fiber (7,5 g per 500 ml): fiberblandingen IS50 med 50 % løselige og 50 % uløselige fibre (ertefiber, akasiegummi, fruktooligosakkarider og inulin).",
          "Begge inneholder fiskeolje med de essensielle fettsyrene EPA og DHA. 20 % av fettet er MCT-fett.",
        ],
      },
      {
        title: "Dosering",
        lines: ["1000–1500 ml for fullverdig ernæring, eller i følge anbefaling fra lege/klinisk ernæringsfysiolog."],
      },
      {
        title: "Oppbevaring og hengetid",
        lines: [
          "Uåpnet forpakning oppbevares svalt og tørt. Flasken ristes før bruk.",
          "Sammenkoblet med ernæringssett administreres produktet innen 24 timer.",
          "Åpnet flaske med korken på kan oppbevares i kjøleskap og brukes innen 24 timer.",
        ],
      },
      {
        title: "Egnethet",
        lines: ["Glutenfri.", "Halal-sertifisert.", "Laktose: under 0,05 g per 100 ml."],
      },
      {
        title: "Bestilling",
        lines: [
          "Kan kjøpes via apotek, bandagist eller leverandør av medisinsk forbruksmateriell.",
          "Grossister bestiller hos Nestlé: orders@no.nestle.com.",
          "Produktinformasjon: nestlehealthscience@no.nestle.com, tlf. 800 31 425.",
          "Forpakning: 12 × 500 ml (Isosource Energy og Isosource Energy Fibre, nøytral).",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Vann, maltodekstrin, melkeproteiner, vegetabilske oljer (rapsolje, solsikkeolje), MCT-fett, mineraler (kaliumsitrat, natriumsitrat, kaliumfosfat, kaliumklorid, magnesiumsitrat, natriumklorid, jernlaktat, sinksulfat, kobberglukonat, mangansulfat, natriumfluorid, kromklorid, natriumselenitt, natriummolybdat, kaliumjodid), emulgeringsmiddel (E472c, E471), fiskeolje, kolinbitartrat, stabiliseringsmiddel (E466, E460, karragenan), vitaminer (C, E, niacin, pantotensyre, B6, B1, B2, A, betakaroten, folsyre, D, B12, K, biotin), antioksidasjonsmiddel (E304). Glutenfri. UHT-behandlet. Pakket i beskyttet atmosfære.",
          "Isosource Energy Fibre inneholder også fiber (ertefiber, akasiegummi, fruktooligosakkarider, inulin).",
          "Kontroller alltid informasjonen på forpakningen før bruk.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Energi og næringsstoffer",
        note: "Per 100 ml.",
        columns: ["Energy", "Energy Fibre"],
        rows: [
          { label: "Energi (kcal)", values: ["157", "160"] },
          { label: "Energi (kJ)", values: ["661", "673"] },
          { label: "Fett (g)", values: ["6,2", "6,2"] },
          { label: "hvorav mettet", values: ["2,0", "2,0"], sub: true },
          { label: "hvorav enumettet", values: ["2,8", "2,9"], sub: true },
          { label: "hvorav flerumettet", values: ["1,4", "1,3"], sub: true },
          { label: "Karbohydrat (g)", values: ["19,3", "19,3"] },
          { label: "hvorav sukkerarter", values: ["1,7", "1,9"], sub: true },
          { label: "hvorav laktose", values: ["<0,05", "<0,05"], sub: true },
          { label: "Kostfiber (g)", values: ["0", "1,5"] },
          { label: "Protein (g)", values: ["6,1", "6,1"] },
        ],
      },
      {
        title: "Mineraler",
        note: "Per 100 ml.",
        columns: ["Energy", "Energy Fibre"],
        rows: [
          { label: "Natrium (mg)", values: ["120", "120"] },
          { label: "Kalium (mg)", values: ["190", "190"] },
          { label: "Klorid (mg)", values: ["105", "100"] },
          { label: "Kalsium (mg)", values: ["110", "110"] },
          { label: "Fosfor (mg)", values: ["90", "80"] },
          { label: "Magnesium (mg)", values: ["18", "18"] },
          { label: "Jern (mg)", values: ["1,6", "1,6"] },
          { label: "Sink (mg)", values: ["1,5", "1,5"] },
          { label: "Kobber (mg)", values: ["0,24", "0,24"] },
          { label: "Mangan (mg)", values: ["0,36", "0,36"] },
          { label: "Fluorid (mg)", values: ["0,21", "0,21"] },
          { label: "Selen (µg)", values: ["10", "10"] },
          { label: "Krom (µg)", values: ["15", "15"] },
          { label: "Molybden (µg)", values: ["18", "18"] },
          { label: "Jod (µg)", values: ["23", "23"] },
        ],
      },
      {
        title: "Vitaminer og øvrig",
        note: "Per 100 ml.",
        columns: ["Energy", "Energy Fibre"],
        rows: [
          { label: "Vitamin A (µg)", values: ["170", "170"] },
          { label: "Vitamin D (µg)", values: ["2,2", "2,2"] },
          { label: "Vitamin E (mg)", values: ["2,6", "2,6"] },
          { label: "Vitamin K (µg)", values: ["12", "12"] },
          { label: "Vitamin C (mg)", values: ["16", "16"] },
          { label: "Tiamin (mg)", values: ["0,24", "0,24"] },
          { label: "Riboflavin (mg)", values: ["0,27", "0,27"] },
          { label: "Niacin (mg NE)", values: ["2,7", "2,7"] },
          { label: "Vitamin B6 (mg)", values: ["0,28", "0,28"] },
          { label: "Folsyre (µg)", values: ["45", "45"] },
          { label: "Vitamin B12 (µg)", values: ["0,58", "0,58"] },
          { label: "Biotin (µg)", values: ["7,0", "7,0"] },
          { label: "Pantotensyre (mg)", values: ["0,86", "0,90"] },
          { label: "MCT (g)", values: ["1,2", "1,2"] },
          { label: "Omega-3 (g)", values: ["0,29", "0,26"] },
          { label: "Kolin (mg)", values: ["60", "60"] },
          { label: "Osmolaritet (mOsm/L)", values: ["372", "411"] },
          { label: "Vann (g)", values: ["77", "76"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Isosource Energy / Energy Fibre",
        url: "/dokumenter/N%C3%A6ringsmidler/ISOSOURCE%20Energy+Fibre.pdf",
        sizeLabel: "393 KB",
      },
    ],
  },

  // ─── Scandishake Mix (Nutricia / Danone) ─────────────────────────────────────
  // Kilde: produktark «Scandishake Mix» (mai 2023).
  {
    id: "scandishake-mix",
    name: "Scandishake Mix",
    category: "Pulver og tilskudd",
    summary: "Energirikt pulvertilskudd til utblanding i melk eller juice · nesten 600 kcal og 12 g protein per pose (85 g) i 240 ml helmelk · fire smaker",
    properties: {
      glutenFree: true,
      vegetarian: true,
    },
    age: { from3Years: true },
    clinicalUse: {
      diseaseRelatedMalnutrition: "caution",
      malabsorption: "caution",
    },
    warnings: [
      "Ikke egnet som eneste ernæring. Skal brukes som tilskudd til det normale kostholdet.",
      "Kontraindisert ved: barn under 3 år, galaktosemi, laktoseintoleranse og intoleranse mot en eller flere av produktets ingredienser.",
      "Doseringen er individuell og skal gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
    ],
    sections: [
      {
        title: "Bruksområde",
        lines: [
          "Næringstilskudd til kostbehandling av sykdomsrelatert underernæring, malabsorpsjon og andre tilstander med behov for tilskudd av fett, karbohydrater og protein ved behov for økt energiinntak.",
          "Brukes i samråd med lege, klinisk ernæringsfysiolog eller annet helsepersonell.",
        ],
      },
      {
        title: "Dosering",
        lines: [
          "Anbefalt dosering per dag: 3–5 år: ½ pose + 240 ml helmelk. 5–10 år: 1 porsjon. Over 10 år: 1–2 porsjoner.",
          "1 porsjon er 1 pose (85 g pulver) blandet med 240 ml helmelk.",
          "Doseringen er individuell og skal gjøres i samråd med lege eller klinisk ernæringsfysiolog.",
        ],
      },
      {
        title: "Bruk",
        lines: [
          "Kan blandes i melk eller juice, og tilsettes både kalde og varme retter. Bør ikke kokes.",
          "Kan også brukes til berikning av yoghurt, juice og andre matretter.",
          "Kan blandes med kremfløte eller yoghurt og fryses til iskrem.",
        ],
      },
      {
        title: "Holdbarhet og oppbevaring",
        lines: [
          "24 måneder fra produksjonsdato. Holdbarhetsdato står på posen og ytre emballasje.",
          "En åpnet pose oppbevares tørt og bør brukes innen 2–3 dager. Lagres tørt og mellom 5 og 25 °C.",
        ],
      },
      {
        title: "Egnethet",
        lines: [
          "Melkebasert. Protein: 91 % kasein og 9 % myse.",
          "Kostfiber er ikke tilsatt (sjokolade: 2,9 g per 100 g pulver).",
          "Glutenfri. Halal-sertifisert.",
          "Passer ved lakto-ovo-vegetarkost.",
          "FODMAP: laktose 4,5 g per 100 ml.",
        ],
      },
      {
        title: "Bestilling",
        lines: [
          "Salgsenhet: 6 × 85 g poser.",
          "Bestillingsnr.: jordbær 159745, nøytral 159747, sjokolade 159743, vanilje 159749.",
          "Nutricia, c/o Danone AS: tlf. +47 23 00 21 00, nutricia.amnno@danone.com.",
        ],
      },
      {
        title: "Ingredienser",
        wide: true,
        lines: [
          "Maltodekstrin, vegetabilske oljer (soyaolje, palmeolje), glukosesirup, sukker (jordbær, sjokolade, vanilje), kakao (sjokolade), skummetmelk, kaliumkaseinat (fra kumelk), aroma (jordbær, sjokolade, vanilje), fargestoff (rødbetfarge, jordbær), emulgator (mono- og diglyserider av fettsyrer), stabilisator (dikaliumhydrogenfosfat), natriumklorid, magnesiumsitrat (jordbær, nøytral, vanilje), antioksidant (L-askorbylpalmitat).",
          "Kostfiberfri (jordbær, nøytral, vanilje). Glutenfri. Halal-sertifisert.",
        ],
      },
    ],
    nutrition: [
      {
        title: "Jordbær",
        note: "Porsjon = 1 pose (85 g pulver) blandet i 240 ml helmelk.",
        columns: ["Per 100 g pulver", "Per porsjon"],
        rows: [
          { label: "Energi (kcal)", values: ["506", "586"] },
          { label: "Energi (kJ)", values: ["2120", "2456"] },
          { label: "Fett (g)", values: ["24,2", "29,5"] },
          { label: "hvorav mettede fettsyrer", values: ["7,2", "12,1"], sub: true },
          { label: "Karbohydrat (g)", values: ["67,1", "68,4"] },
          { label: "hvorav sukkerarter", values: ["27,6", "34,9"], sub: true },
          { label: "hvorav laktose", values: ["3,20", "13,5"], sub: true },
          { label: "Kostfiber (g)", values: ["<0,5", "<0,43"] },
          { label: "Protein (g)", values: ["4,9", "12,6"] },
          { label: "Salt (g)", values: ["0,32", "0,6"] },
          { label: "Vitamin E (mg)", values: ["2,87", "2,59"] },
          { label: "Vitamin K (µg)", values: ["38,5", "34,3"] },
          { label: "Natrium (mg)", values: ["128", "213"] },
          { label: "Kalium (mg)", values: ["270", "618"] },
          { label: "Klorid (mg)", values: ["159", "355"] },
          { label: "Kalsium (mg)", values: ["85,6", "369"] },
          { label: "Fosfor (mg)", values: ["151", "365"] },
          { label: "Magnesium (mg)", values: ["30,5", "53,1"] },
          { label: "Jod (µg)", values: ["15,0", "89,3"] },
          { label: "Osmolaritet (mOsm/l)", values: ["–", "405"] },
        ],
      },
      {
        title: "Nøytral",
        note: "Porsjon = 1 pose (85 g pulver) blandet i 240 ml helmelk.",
        columns: ["Per 100 g pulver", "Per porsjon"],
        rows: [
          { label: "Energi (kcal)", values: ["504", "584"] },
          { label: "Energi (kJ)", values: ["2110", "2448"] },
          { label: "Fett (g)", values: ["24,3", "29,5"] },
          { label: "hvorav mettede fettsyrer", values: ["7,2", "12,1"], sub: true },
          { label: "Karbohydrat (g)", values: ["66,5", "67,9"] },
          { label: "hvorav sukkerarter", values: ["7,2", "19,5"], sub: true },
          { label: "hvorav laktose", values: ["3,19", "13,5"], sub: true },
          { label: "Kostfiber (g)", values: ["<0,5", "<0,43"] },
          { label: "Protein (g)", values: ["4,9", "12,5"] },
          { label: "Salt (g)", values: ["0,32", "0,53"] },
          { label: "Vitamin E (mg)", values: ["2,88", "2,59"] },
          { label: "Vitamin K (µg)", values: ["38,7", "34,4"] },
          { label: "Natrium (mg)", values: ["126", "211"] },
          { label: "Kalium (mg)", values: ["270", "618"] },
          { label: "Klorid (mg)", values: ["156", "353"] },
          { label: "Kalsium (mg)", values: ["85,3", "369"] },
          { label: "Fosfor (mg)", values: ["151", "365"] },
          { label: "Magnesium (mg)", values: ["29,7", "52,5"] },
          { label: "Jod (µg)", values: ["14,9", "89,3"] },
          { label: "Osmolaritet (mOsm/l)", values: ["–", "319"] },
        ],
      },
      {
        title: "Sjokolade",
        note: "Porsjon = 1 pose (85 g pulver) blandet i 240 ml helmelk.",
        columns: ["Per 100 g pulver", "Per porsjon"],
        rows: [
          { label: "Energi (kcal)", values: ["505", "585"] },
          { label: "Energi (kJ)", values: ["2113", "2450"] },
          { label: "Fett (g)", values: ["25,1", "30,2"] },
          { label: "hvorav mettede fettsyrer", values: ["7,7", "12,4"], sub: true },
          { label: "Karbohydrat (g)", values: ["61,6", "63,8"] },
          { label: "hvorav sukkerarter", values: ["22,5", "30,5"], sub: true },
          { label: "hvorav laktose", values: ["3,20", "13,5"], sub: true },
          { label: "Kostfiber (g)", values: ["2,9", "2,4"] },
          { label: "Protein (g)", values: ["6,8", "14,1"] },
          { label: "Salt (g)", values: ["0,31", "0,53"] },
          { label: "Vitamin E (mg)", values: ["2,92", "2,63"] },
          { label: "Vitamin K (µg)", values: ["38,6", "34,3"] },
          { label: "Riboflavin (mg)", values: ["0,13", "0,68"] },
          { label: "Natrium (mg)", values: ["125", "210"] },
          { label: "Kalium (mg)", values: ["438", "761"] },
          { label: "Klorid (mg)", values: ["155", "352"] },
          { label: "Kalsium (mg)", values: ["96,9", "379"] },
          { label: "Fosfor (mg)", values: ["201", "408"] },
          { label: "Magnesium (mg)", values: ["48,8", "68,6"] },
          { label: "Jern (mg)", values: ["2,95", "2,56"] },
          { label: "Kobber (mg)", values: ["0,35", "0,30"] },
          { label: "Mangan (mg)", values: ["0,39", "0,33"] },
          { label: "Molybden (µg)", values: ["5,87", "4,99"] },
          { label: "Krom (µg)", values: ["36,4", "30,9"] },
          { label: "Jod (µg)", values: ["15,2", "89,5"] },
          { label: "Osmolaritet (mOsm/l)", values: ["–", "413"] },
        ],
      },
      {
        title: "Vanilje",
        note: "Porsjon = 1 pose (85 g pulver) blandet i 240 ml helmelk.",
        columns: ["Per 100 g pulver", "Per porsjon"],
        rows: [
          { label: "Energi (kcal)", values: ["505", "585"] },
          { label: "Energi (kJ)", values: ["2117", "2454"] },
          { label: "Fett (g)", values: ["24,2", "29,5"] },
          { label: "hvorav mettede fettsyrer", values: ["7,2", "12,0"], sub: true },
          { label: "Karbohydrat (g)", values: ["67,0", "68,3"] },
          { label: "hvorav sukkerarter", values: ["22,3", "30,4"], sub: true },
          { label: "hvorav laktose", values: ["3,19", "13,5"], sub: true },
          { label: "Kostfiber (g)", values: ["<0,5", "<0,43"] },
          { label: "Protein (g)", values: ["4,9", "12,5"] },
          { label: "Salt (g)", values: ["0,32", "0,53"] },
          { label: "Vitamin E (mg)", values: ["2,87", "2,59"] },
          { label: "Vitamin K (µg)", values: ["38,7", "34,4"] },
          { label: "Natrium (mg)", values: ["126", "211"] },
          { label: "Kalium (mg)", values: ["270", "618"] },
          { label: "Klorid (mg)", values: ["156", "353"] },
          { label: "Kalsium (mg)", values: ["85,5", "369"] },
          { label: "Fosfor (mg)", values: ["151", "365"] },
          { label: "Magnesium (mg)", values: ["29,7", "52,5"] },
          { label: "Jod (µg)", values: ["14,9", "89,3"] },
          { label: "Osmolaritet (mOsm/l)", values: ["–", "840"] },
        ],
      },
    ],
    documents: [
      {
        title: "Produktark Scandishake Mix",
        url: "/dokumenter/N%C3%A6ringsmidler/Scandishake%20Mix.pdf",
        sizeLabel: "911 KB",
      },
    ],
  },
];

// ─── Fra produktkatalogen (PIM) ──────────────────────────────────────────────
// Produkter som finnes i katalogen med VNR, men som ikke er gjennomgått mot PDF-kildene ennå.
// Bare det som fremgår av navnet er fylt ut (kategori, fiber, proteinrik); alder og klinisk
// bruk er tomt til de er vurdert. `aliases` er katalogens egne forkortelser/stavemåter, slik at
// VNR-ene havner under riktig produkt. Kontroller mot produktblad før de brukes i rådgivning.

type CatalogEntryOptions = { aliases?: string[]; fiber?: boolean; proteinRich?: boolean };

const fromCatalog = (id: string, name: string, category: string, options: CatalogEntryOptions = {}): NutritionProduct => ({
  id,
  name,
  ...(options.aliases ? { aliases: options.aliases } : {}),
  category,
  properties: {
    ...(options.fiber ? { fiber: true } : {}),
    ...(options.proteinRich ? { proteinRich: true } : {}),
  },
  age: {},
  clinicalUse: {},
  unreviewed: true,
});

const DRINK = "Andre næringsdrikker";
const TUBE = "Sondeernæring";
const THICKENER = "Fortykningsmiddel";
const POWDER = "Pulver og tilskudd";

const catalogProducts: NutritionProduct[] = [
  // Næringsdrikker, kremer og supper
  fromCatalog("nutridrink-creme", "Nutridrink Creme", DRINK),
  fromCatalog("nutridrink-juicy", "Nutridrink Juicy", DRINK),
  fromCatalog("resource-2-5-compact", "Resource 2,5 Compact", DRINK, { aliases: ["Resource 2,5 comp", "Resource 2,5 fib comp"] }),
  fromCatalog("resource-senior-active", "Resource Senior Activ", DRINK, { aliases: ["Resource aktiva"] }),
  fromCatalog("resource-soup", "Resource Soup", DRINK, { aliases: ["Resource nypesuppe"] }),
  fromCatalog("resource-aqua", "Resource Aqua+", DRINK),
  fromCatalog("resource-addera", "Resource Addera", DRINK),
  fromCatalog("fresubin-creme", "Fresubin Creme", DRINK),
  fromCatalog("fresubin-soup", "Fresubin Soup", DRINK),
  fromCatalog("fresubin-pro-drink", "Fresubin Pro Drink", DRINK),
  fromCatalog("fresubin-pro-compact-drink", "Fresubin Pro Compact Drink", DRINK),
  fromCatalog("fresubin-3-2kcal-drink", "Fresubin 3,2kcal Drink", DRINK),
  fromCatalog("fresubin-pl-base-drink", "Fresubin PL Base Drink", DRINK),
  fromCatalog("fresubin-thickened-stage", "Fresubin Thickened (stage 1/2)", DRINK, { aliases: ["Fresubin thickened stag*"] }),
  fromCatalog("diben-2kcal-drink", "Diben 2kcal Drink", DRINK),

  // Sondeernæring
  fromCatalog("nutrison", "Nutrison", TUBE),
  fromCatalog("nutrison-advanced", "Nutrison Advanced", TUBE, { aliases: ["Nutrison diason", "Nutrison peptisorb"] }),
  fromCatalog("nutrison-plantbased", "Nutrison PlantBased", TUBE, { aliases: ["Nutrison plantba*"] }),
  fromCatalog("nutrini", "Nutrini", TUBE),
  fromCatalog("nutrinimax", "Nutrinimax", TUBE),
  fromCatalog("nutrinikid", "NutriniKid", TUBE),
  fromCatalog("fortini-mix", "Fortini Mix", TUBE),
  fromCatalog("fresubin-original-sonde", "Fresubin Original (sonde)", TUBE, { aliases: ["Fresubin original"] }),
  fromCatalog("fresubin-original-fiber-sonde", "Fresubin Original Fibre (sonde)", TUBE, { aliases: ["Fresubin original fibre"], fiber: true }),
  fromCatalog("fresubin-energy-sonde", "Fresubin Energy (sonde)", TUBE, { aliases: ["Fresubin energy"] }),
  fromCatalog("fresubin-energy-fiber-sonde", "Fresubin Energy Fibre (sonde)", TUBE, { aliases: ["Fresubin energy fibre"], fiber: true }),
  fromCatalog("fresubin-hp-energy-sonde", "Fresubin HP Energy (sonde)", TUBE, { aliases: ["Fresubin HP energy"], proteinRich: true }),
  fromCatalog("fresubin-hp-energy-fiber-sonde", "Fresubin HP Energy Fibre (sonde)", TUBE, { aliases: ["Fresubin HP energy fibre"], fiber: true, proteinRich: true }),
  fromCatalog("fresubin-soya-fiber-sonde", "Fresubin Soya Fibre (sonde)", TUBE, { aliases: ["Fresubin soya fibre"], fiber: true }),
  fromCatalog("fresubin-2kcal-hp-sonde", "Fresubin 2 kcal HP (sonde)", TUBE, { aliases: ["Fresubin 2kcal HP"], proteinRich: true }),
  fromCatalog("fresubin-2kcal-hp-fiber-sonde", "Fresubin 2 kcal HP Fibre (sonde)", TUBE, { aliases: ["Fresubin 2kcal HP fibre"], fiber: true, proteinRich: true }),
  fromCatalog("fresubin-complete-sonde", "Fresubin Complete (sonde)", TUBE, {
    aliases: ["Fresubin 1000", "Fresubin 1200", "Fresubin 1500", "Fresubin 1800", "Fresubin 2250"],
  }),
  fromCatalog("fresubin-intensive-sonde", "Fresubin Intensive (sonde)", TUBE, { aliases: ["Fresubin intensive"] }),
  fromCatalog("isosource-standard", "Isosource Standard", TUBE),
  fromCatalog("isosource-mix", "Isosource Mix", TUBE),
  fromCatalog("isosource-protein", "Isosource Protein", TUBE, { proteinRich: true }),
  fromCatalog("isosource-junior", "Isosource Junior", TUBE, { aliases: ["Isosource jr"] }),
  fromCatalog("peptamen", "Peptamen", TUBE),
  fromCatalog("peptamen-junior", "Peptamen Junior", TUBE),
  fromCatalog("diben-sonde", "Diben (sonde)", TUBE, { aliases: ["Diben"] }),
  fromCatalog("survimed-opd-sonde", "Survimed OPD (sonde)", TUBE, { aliases: ["Survimed opd"] }),
  fromCatalog("supportan-sonde", "Supportan (sonde)", TUBE, { aliases: ["Supportan"] }),
  fromCatalog("frebini-original-sonde", "Frebini Original (sonde)", TUBE, { aliases: ["Frebini original"] }),
  fromCatalog("frebini-energy-sonde", "Frebini Energy (sonde)", TUBE, { aliases: ["Frebini energy"] }),
  fromCatalog("novasource-gi", "Novasource GI", TUBE),
  fromCatalog("novasource-diabet", "Novasource Diabet Plus", TUBE, { aliases: ["Novasource diabet"] }),
  fromCatalog("impact-enteral", "Impact Enteral", TUBE),
  fromCatalog("infatrini", "Infatrini", TUBE),
  fromCatalog("infatrini-peptisorb", "Infatrini Peptisorb", TUBE),

  // Fortykningsmidler
  fromCatalog("thickenup-junior", "ThickenUp Junior", THICKENER, { aliases: ["ThickenUp jr"] }),
  fromCatalog("resource-thickenup", "Resource ThickenUp", THICKENER, { aliases: ["Resource thicken up", "Resource thickenup"] }),
  fromCatalog("thick-and-easy", "Thick&easy Clear", THICKENER, { aliases: ["Thick&easy"] }),
  fromCatalog("nutilis-powder", "Nutilis Powder", THICKENER),
  fromCatalog("fresubin-clear", "Fresubin Clear", THICKENER),

  // Pulver og tilskudd
  fromCatalog("maxijul", "Maxijul", POWDER),
  fromCatalog("duocal", "Duocal", POWDER),
  fromCatalog("fresubin-protein-powder", "Fresubin Protein Powder", POWDER, { aliases: ["Fresubin protein pulv"], proteinRich: true }),
  fromCatalog("resource-instant-protein", "Resource Instant Protein", POWDER, { proteinRich: true }),
  fromCatalog("resource-energi", "Resource Energi", POWDER),
  fromCatalog("resource-meritene", "Resource Meritene", POWDER, { aliases: ["Meritene"] }),
  fromCatalog("resource-complete", "Resource Complete", POWDER),
  fromCatalog("oral-impact", "Oral Impact", POWDER),
  fromCatalog("nutricia-mct", "Nutricia MCT olje", POWDER),
  fromCatalog("isosource-mct", "Isosource MCT", POWDER),
];

export const nutritionProducts: NutritionProduct[] = [...reviewedProducts, ...catalogProducts];
