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
};

// All clinical use entries marked as "caution" = require agreement with doctor or clinical nutritionist (KEF).
// Source: "Ernæring alder og sykdom.pdf" (PDF2) + "ernæring innhold.pdf" (PDF1)

export const nutritionProducts: NutritionProduct[] = [
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
