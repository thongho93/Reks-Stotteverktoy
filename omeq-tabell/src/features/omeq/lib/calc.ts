// src/features/omeq/lib/calc.ts

import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";

interface CalcInput {
  product: any | null;
  dailyDose: number | null; // antall enheter per døgn
  strength: { value: number | string; unit: string } | null; // fra parseMedicationInput
}

const toNumber = (v: number | string) => {
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const strengthToMg = (strength: { value: number | string; unit: string } | null) => {
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

export function calculateOMEQ({ product, dailyDose, strength }: CalcInput) {
  if (!product || !dailyDose) {
    return { omeq: null, reason: "missing-input" };
  }

  const strengthMg = strengthToMg(strength);
  if (strengthMg == null) {
    return { omeq: null, reason: "missing-strength" };
  }

  const route = formToRoute(product.form);
  if (!route) {
    return { omeq: null, reason: "no-route" };
  }

  const atc = String(product.atcCode);
  const form = String(product.form).toLowerCase();
  const routeLower = route.toLowerCase();

  // Ikke støttet ennå
  if (form === "depotplaster" || form === "sublingvalfilm" || form === "sublingvaltablett") {
    return { omeq: null, reason: "unsupported-form" };
  }

  if (
    (atc === "N02AJ06" || atc === "R05DA04") &&
    (routeLower.includes("oral") || routeLower.includes("rekt"))
  ) {
    return { omeq: null, reason: "unsupported-codeine" };
  }

  if (atc === "N07BC02" && routeLower.includes("oral")) {
    return { omeq: null, reason: "unsupported-methadone" };
  }

  if ((atc === "N02AA05" || atc === "N02AA55") && routeLower.includes("oral")) {
    return { omeq: null, reason: "unsupported-oxycodone" };
  }

  const opioid = OPIOIDS.find(
    (o) => o.atcCode.includes(product.atcCode as any) && o.route.includes(route)
  );

  if (!opioid) {
    return { omeq: null, reason: "no-omeq-factor" };
  }

  return {
    omeq: dailyDose * strengthMg * opioid.omeqFactor,
    reason: "ok",
  };
}
