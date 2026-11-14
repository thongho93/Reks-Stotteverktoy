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
    over6Years?: boolean;
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
  };
  notes?: string[];
  /** Andre navn i produktkatalogen (forkortelser, annen stavemåte) – brukes til å finne VNR-varianter. */
  aliases?: string[];
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
];

// ─── Fra produktkatalogen (PIM) ──────────────────────────────────────────────
// Produkter som finnes i katalogen med VNR, men som ikke er gjennomgått mot PDF-kildene ennå.
// Bare det som fremgår av navnet er fylt ut (kategori, fiber, proteinrik); alder og klinisk
// bruk er tomt til de er vurdert. `aliases` er katalogens egne forkortelser/stavemåter, slik at
// VNR-ene havner under riktig produkt. Kontroller mot produktblad før de brukes i rådgivning.
const CATALOG_NOTE = "Lagt inn fra produktkatalogen – kliniske data er ikke gjennomgått.";

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
  notes: [CATALOG_NOTE],
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
  fromCatalog("isosource-energy", "Isosource Energy", TUBE),
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
  fromCatalog("compleat-mix", "Compleat Mix", TUBE),
  fromCatalog("compleat-paediatric-mix", "Compleat Paediatric Mix", TUBE),

  // Fortykningsmidler
  fromCatalog("thickenup-clear", "ThickenUp Clear", THICKENER),
  fromCatalog("thickenup-junior", "ThickenUp Junior", THICKENER, { aliases: ["ThickenUp jr"] }),
  fromCatalog("thickenup", "ThickenUp", THICKENER, { aliases: ["ThickenUp fortykningsmiddel"] }),
  fromCatalog("resource-thickenup", "Resource ThickenUp", THICKENER, { aliases: ["Resource thicken up", "Resource thickenup"] }),
  fromCatalog("thick-and-easy", "Thick&easy Clear", THICKENER, { aliases: ["Thick&easy"] }),
  fromCatalog("nutilis-powder", "Nutilis Powder", THICKENER),
  fromCatalog("fresubin-clear", "Fresubin Clear", THICKENER),

  // Pulver og tilskudd
  fromCatalog("scandishake-mix", "Scandishake Mix", POWDER),
  fromCatalog("calshake", "Calshake", POWDER),
  fromCatalog("maxijul", "Maxijul", POWDER),
  fromCatalog("duocal", "Duocal", POWDER),
  fromCatalog("fresubin-protein-powder", "Fresubin Protein Powder", POWDER, { aliases: ["Fresubin protein pulv"], proteinRich: true }),
  fromCatalog("resource-instant-protein", "Resource Instant Protein", POWDER, { proteinRich: true }),
  fromCatalog("resource-energi", "Resource Energi", POWDER),
  fromCatalog("resource-meritene", "Resource Meritene", POWDER, { aliases: ["Meritene"] }),
  fromCatalog("resource-complete", "Resource Complete", POWDER),
  fromCatalog("oral-impact", "Oral Impact", POWDER),
  fromCatalog("modulen-ibd", "Modulen IBD", POWDER, { aliases: ["Modulen"] }),
  fromCatalog("nutricia-mct", "Nutricia MCT olje", POWDER),
  fromCatalog("isosource-mct", "Isosource MCT", POWDER),
];

export const nutritionProducts: NutritionProduct[] = [...reviewedProducts, ...catalogProducts];
