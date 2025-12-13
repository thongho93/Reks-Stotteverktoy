import type { ATCcode } from "../data/opioids";
import { ATC_PRODUCTS } from "../data/atcProducts";
import type { ProductForm } from "../data/atcProducts";

export interface ProductIndexItem {
  name: string; // visningsnavn (matcher input)
  atcCode: ATCcode;
  form?: ProductForm;
}

export type StrengthUnit = "mg" | "mcg" | "µg";

export interface Strength {
  value: number;
  unit: StrengthUnit; // mg | mcg | µg
  perHour?: boolean; // true for mcg/time or mcg/h (transdermal plaster)
}

export interface ParsedMedicationInput {
  product: ProductIndexItem | null;
  strength: Strength | null;
}

export const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();

export const buildProductIndex = (): ProductIndexItem[] =>
  Object.entries(ATC_PRODUCTS).flatMap(([atcCode, products]) =>
    (products ?? []).map((p) => ({
      name: p.name,
      atcCode: atcCode as ATCcode,
      form: p.form,
    }))
  );

export const findProductInText = (
  input: string,
  products: ProductIndexItem[]
): ProductIndexItem | null => {
  const text = normalizeText(input);

  // Lengste navn først for å unngå at korte navn “stjeler” treff.
  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);

  for (const p of sorted) {
    const name = normalizeText(p.name);

    // Krev “ordgrense-ish” på begge sider der det gir mening
    // (hindrer litt feiltreff, men fortsatt robust)
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(name)}(\\s|$)`, "i");
    if (pattern.test(text)) return p;

    // Fallback: inkluderende match (hjelper når input har ekstra ord som “depottabletter”)
    if (text.includes(name)) return p;
  }

  return null;
};

// Støtter:
// "200 mg", "200mg", "0,2 mg"
// "100 mcg", "100 mcg/time", "100 mcg/h", "100 µg/time"
export const extractStrength = (input: string): Strength | null => {
  const text = input.toLowerCase();

  // Matches e.g.:
  // 25 mcg/time, 25 mcg/h, 25 µg/time
  const transdermalMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mcg|µg)\s*(?:\/|per\s*)(?:h|time)\b/i);

  if (transdermalMatch) {
    const value = Number(transdermalMatch[1].replace(",", "."));
    if (!Number.isFinite(value)) return null;

    const rawUnit = transdermalMatch[2].toLowerCase();
    const unit: StrengthUnit = rawUnit === "µg" ? "µg" : "mcg";

    return {
      value,
      unit,
      perHour: true,
    };
  }

  // Matches e.g.:
  // 200 mg, 200mg, 0,2 mg, 100 mcg
  const simpleMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg)\b/i);
  if (!simpleMatch) return null;

  const value = Number(simpleMatch[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  const rawUnit = simpleMatch[2].toLowerCase();
  const unit: StrengthUnit = rawUnit === "mg" ? "mg" : rawUnit === "µg" ? "µg" : "mcg";

  return { value, unit };
};

export const parseMedicationInput = (
  input: string,
  products: ProductIndexItem[]
): ParsedMedicationInput => {
  const product = findProductInText(input, products);
  const strength = extractStrength(input);

  return {
    product,
    strength,
  };
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
