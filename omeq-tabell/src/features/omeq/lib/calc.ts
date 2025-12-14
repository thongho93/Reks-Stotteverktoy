// src/features/omeq/lib/calc.ts

import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";

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

  // Støtter kun enkle former foreløpig
  if (unit === "mg") return value;
  if (unit === "g") return value * 1000;
  if (unit === "µg" || unit === "ug") return value / 1000;

  // mg/ml og andre kombinasjoner håndteres senere
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

  const route = formToRoute(product.form);
  if (!route) {
    return { omeq: null, reason: "no-route" };
  }

  const atc = String(product.atcCode);
  const form = String(product.form).toLowerCase();
  const routeLower = route.toLowerCase();

  // Ikke støttet ennå (depotplaster håndteres separat lenger ned)
  if (form === "sublingvalfilm" || form === "sublingvaltablett") {
    return { omeq: null, reason: "unsupported-form" } as const;
  }

  if (atc === "N07BC02" && routeLower.includes("oral")) {
    return { omeq: null, reason: "unsupported-methadone" };
  }

  const opioid = OPIOIDS.find(
    (o) => o.atcCode.includes(product.atcCode as any) && o.route.includes(route)
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

  // Øvrige (enkle) former: OMEQ = døgndose (antall enheter) * styrke (mg) * OMEQ-faktor
  const strengthMg = strengthToMg(strength);
  if (strengthMg == null) {
    return { omeq: null, reason: "missing-strength" } as const;
  }

  if (!dailyDose) {
    return { omeq: null, reason: "missing-input" } as const;
  }

  return {
    omeq: dailyDose * strengthMg * opioid.omeqFactor,
    reason: "ok",
  } as const;
}
