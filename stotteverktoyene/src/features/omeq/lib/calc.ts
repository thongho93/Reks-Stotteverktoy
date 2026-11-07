// src/features/omeq/lib/calc.ts

import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";
import { isDropForm, parenteralDoseUnit } from "./doseUnit";

// Antall dråper per ml for morfindråper, slik de står i hjelpeteksten for oral morfin:
// Oramorph 1 ml = 16 dråper, Dropizol 1 ml = 20 dråper.
const DROPS_PER_ML: { match: string; dropsPerMl: number }[] = [
  { match: "oramorph", dropsPerMl: 16 },
  { match: "dropizol", dropsPerMl: 20 },
];

const dropsPerMlFor = (name: unknown): number | null => {
  const n = String(name ?? "").toLowerCase();
  return DROPS_PER_ML.find((d) => n.includes(d.match))?.dropsPerMl ?? null;
};

const inferRoute = (formRaw: unknown, mappedRoute: string | null | undefined) => {
  const form = String(formRaw ?? "")
    .trim()
    .toLowerCase();

  // Viktig: mikstur / orale løsninger kan ha styrker som "mg/ml", men administrasjonsvei er fortsatt oral.
  if (
    form.includes("mikstur") ||
    form.includes("dråpe") ||
    form.includes("dråper") ||
    form.includes("oral") ||
    form.includes("oppløsning") ||
    form.includes("løsning") ||
    form.includes("suspensjon")
  ) {
    return "oral";
  }

  // Injeksjon/infusjon skal være parenteral
  if (form.includes("injeks") || form.includes("infus")) {
    return "parenteral";
  }

  return mappedRoute ?? null;
};

interface CalcInput {
  product: any | null;
  dailyDose: number | null; // antall enheter per døgn
  strength: { value: number | string; unit: string; perHour?: boolean } | null; // fra parseMedicationInput
}

const toNumber = (v: number | string) => {
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const strengthToMg = (
  strength: { value: number | string; unit: string; perHour?: boolean } | null
) => {
  if (!strength) return null;
  const value = toNumber(strength.value);
  if (value == null) return null;

  const unit = String(strength.unit).trim().toLowerCase();

  // Støtter kun enkle former foreløpig (inkl. varianter som "µg/dose")
  const isMg = unit === "mg" || unit.includes("mg");
  const isG =
    unit === "g" ||
    (unit.includes("g") &&
      !unit.includes("mg") &&
      !unit.includes("µg") &&
      !unit.includes("ug") &&
      !unit.includes("mcg"));
  const isMcg = unit.includes("µg") || unit.includes("ug") || unit.includes("mcg");

  // Unngå å feiltolke plasterstyrke (µg/time) som mg-dosering
  const isPerHour = unit.includes("/time") || unit.includes("/t") || unit.includes("time");

  if (isMg) return value;
  if (isG) return value * 1000;
  if (isMcg && !isPerHour) return value / 1000;

  // Konsentrasjoner (typisk mikstur/oral løsning): vi antar at dailyDose er angitt i ml per døgn
  // slik at "1 mg/ml" betyr 1 mg per ml.
  const isMgPerMl =
    unit.includes("mg/ml") ||
    unit.includes("mg/ml.") ||
    unit.includes("mg per ml") ||
    unit.includes("mg/ml ") ||
    unit.includes("mg/ml,");
  const isGPerMl = unit.includes("g/ml") || unit.includes("g per ml");
  const isMcgPerMl =
    unit.includes("µg/ml") ||
    unit.includes("ug/ml") ||
    unit.includes("mcg/ml") ||
    unit.includes("µg per ml") ||
    unit.includes("ug per ml") ||
    unit.includes("mcg per ml");

  if (isMgPerMl) return value; // mg per ml
  if (isGPerMl) return value * 1000; // g per ml -> mg per ml
  if (isMcgPerMl) return value / 1000; // µg per ml -> mg per ml

  return null;
};

const strengthToMcgPerHour = (
  strength: { value: number | string; unit: string; perHour?: boolean } | null
) => {
  if (!strength) return null;
  const value = toNumber(strength.value);
  if (value == null) return null;

  const unit = String(strength.unit).trim().toLowerCase();

  // Vi støtter plasterstyrke i µg/time.
  // parseMedicationInput kan gi unit="µg" og perHour=true, eller unit som inneholder "µg/time".
  const looksLikeMcg = unit.includes("µg") || unit.includes("ug") || unit.includes("mcg");
  const looksLikePerHour =
    strength.perHour === true ||
    unit.includes("time") ||
    unit.includes("/time") ||
    unit.includes("/t");

  if (!looksLikeMcg || !looksLikePerHour) return null;

  // Verdien antas å være µg per time
  return value;
};

export function calculateOMEQ({ product, dailyDose, strength }: CalcInput) {
  if (!product) {
    return { omeq: null, reason: "missing-input" };
  }

  const route = inferRoute(
    product.form,
    formToRoute(product.form) as unknown as string | undefined
  );
  if (!route) {
    return { omeq: null, reason: "no-route" };
  }

  // Hydromorfon parenteral (N02AA03) har annen beregningslogikk – støttes ikke i enkel beregning ennå.
  if (String(product.atcCode) === "N02AA03" && route === "parenteral") {
    return { omeq: null, reason: "unsupported-hydromorphone-parenteral" } as const;
  }

  // Ketobemidon (N02AB01 og N02AG02) støttes ikke i enkel beregning ennå.
  if (String(product.atcCode) === "N02AB01" || String(product.atcCode) === "N02AG02") {
    return { omeq: null, reason: "unsupported-ketobemidone" } as const;
  }

  // Morfin (N02AA01) parenteral har egen logikk – støttes ikke i enkel beregning ennå.
  if (String(product.atcCode) === "N02AA01" && route === "parenteral") {
    return { omeq: null, reason: "unsupported-morphine-drops-or-parenteral" } as const;
  }

  // Morfin-dråper: døgndosen er antall dråper. mg per dråpe = styrke (mg/ml) / dråper per ml.
  // Ukjent dråpetetthet gir ingen beregning i stedet for et gjetningstall.
  const isMorphineDrops = String(product.atcCode) === "N02AA01" && isDropForm(product.form);
  const dropsPerMl = isMorphineDrops ? dropsPerMlFor(product.name) : null;
  if (isMorphineDrops && dropsPerMl == null) {
    return { omeq: null, reason: "unsupported-morphine-drops-or-parenteral" } as const;
  }

  const form = String(product.form).toLowerCase();

  // Metadon (oral, inkl. mikstur og tabletter):
  // OMEQ = døgndose * styrke (mg) * omeqFactor (6)

  // Ikke støttet ennå (depotplaster håndteres separat lenger ned)
  // Sublingvaltablett (f.eks. Abstral/Temgesic) beregnes som vanlig.
  if (form === "sublingvalfilm") {
    return { omeq: null, reason: "unsupported-form" } as const;
  }

  const opioid = OPIOIDS.find(
    (o) =>
      o.atcCode.includes(product.atcCode as any) && (o.route as unknown as string[]).includes(route)
  );

  if (!opioid) {
    return { omeq: null, reason: "no-omeq-factor" } as const;
  }

  // Depotplaster: OMEQ = plasterstyrke (µg/time) * OMEQ-faktor
  if (form === "depotplaster") {
    const mcgPerHour = strengthToMcgPerHour(strength);
    if (mcgPerHour == null) {
      return { omeq: null, reason: "missing-strength" } as const;
    }

    return {
      omeq: mcgPerHour * opioid.omeqFactor,
      reason: "ok",
    } as const;
  }

  // Injeksjon/infusjon (parenteral): dosen er legens dosering per døgn i µg eller mg
  // (enheten følger styrken). Den regnes om til mg og ganges med OMEQ-faktoren;
  // styrken (per ml) brukes ikke.
  if (route === "parenteral") {
    if (!strength) {
      return { omeq: null, reason: "missing-strength" } as const;
    }
    if (!dailyDose) {
      return { omeq: null, reason: "missing-input" } as const;
    }

    const doseMg = parenteralDoseUnit(strength) === "µg" ? dailyDose / 1000 : dailyDose;
    return {
      omeq: doseMg * opioid.omeqFactor,
      reason: "ok",
    } as const;
  }

  // Øvrige (enkle) former: OMEQ = døgndose (antall enheter) * styrke (mg) * OMEQ-faktor
  const strengthMg = strengthToMg(strength);
  if (strengthMg == null) {
    return { omeq: null, reason: "missing-strength" } as const;
  }

  if (!dailyDose) {
    return { omeq: null, reason: "missing-input" } as const;
  }

  const mgPerUnit = dropsPerMl != null ? strengthMg / dropsPerMl : strengthMg;

  return {
    omeq: dailyDose * mgPerUnit * opioid.omeqFactor,
    reason: "ok",
  } as const;
}
