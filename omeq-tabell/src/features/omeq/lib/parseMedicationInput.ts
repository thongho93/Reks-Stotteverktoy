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
  // 25 mcg/time, 25 mcg/h, 25 µg/time, 25 ug/time
  const transdermalMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(mcg|µg|ug)\s*(?:\/|per\s*)(?:h|time)\b/i
  );

  if (transdermalMatch) {
    const value = Number(transdermalMatch[1].replace(",", "."));
    if (!Number.isFinite(value)) return null;

    const rawUnit = transdermalMatch[2].toLowerCase();
    const unit: StrengthUnit = rawUnit === "µg" || rawUnit === "ug" ? "µg" : "mcg";

    return {
      value,
      unit,
      perHour: true,
    };
  }

  // Matches e.g.:
  // 200 mg, 200mg, 0,2 mg, 100 mcg, 100 ug
  const simpleMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\b/i);
  if (!simpleMatch) return null;

  const value = Number(simpleMatch[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  const rawUnit = simpleMatch[2].toLowerCase();
  const unit: StrengthUnit =
    rawUnit === "mg" ? "mg" : rawUnit === "µg" || rawUnit === "ug" ? "µg" : "mcg";

  return { value, unit };
};

type VariantHit = {
  product: ProductIndexItem;
  strengthText: string | null;
};

const extractProductNumber = (input: string): number | null => {
  // Accept 5–7 digits, but in practice varenummer is 6 digits (may have leading zeros in sources).
  const m = input.match(/\b\d{5,7}\b/);
  if (!m) return null;
  const n = Number(m[0].replace(/^0+/, ""));
  return Number.isFinite(n) ? n : null;
};

const parseStrengthString = (strengthText?: string | null): Strength | null => {
  if (!strengthText) return null;
  return extractStrength(strengthText);
};

const findByProductNumber = (input: string): VariantHit | null => {
  const pn = extractProductNumber(input);
  if (pn == null) return null;

  // Search in the source dataset (ATC_PRODUCTS) where variants/productNumbers live
  for (const [atcCode, products] of Object.entries(ATC_PRODUCTS)) {
    for (const p of products ?? []) {
      for (const v of p.variants ?? []) {
        const nums = v.productNumbers ?? [];
        if (nums.includes(pn)) {
          return {
            product: {
              name: p.name,
              atcCode: atcCode as ATCcode,
              form: p.form,
            },
            strengthText: v.strength ?? null,
          };
        }
      }
    }
  }

  return null;
};

const extractCodeineStrengthFromCombo = (text: string): Strength | null => {
  const m = text.match(/\/\s*(\d+(?:[.,]\d+)?)\s*mg\b/i);
  if (!m) return null;

  const value = Number(m[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  return { value, unit: "mg" };
};

const extractOxycodoneStrengthFromCombo = (text: string): Strength | null => {
  // For combo strengths like "5 mg/2,5 mg" (oxycodone/naloxone): use the first mg value (oxycodone)
  const m = text.match(/\b(\d+(?:[.,]\d+)?)\s*mg\s*\//i);
  if (!m) return null;

  const value = Number(m[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  return { value, unit: "mg" };
};

export const parseMedicationInput = (
  input: string,
  products: ProductIndexItem[]
): ParsedMedicationInput => {
  // 1) Prefer exact varenummer match (ensures correct form when names collide)
  const varenummerHit = findByProductNumber(input);

  // 2) Fallback: name match from the provided index
  const nameHit = findProductInText(input, products);

  const product = varenummerHit?.product ?? nameHit;

  // Strength precedence:
  // - If user typed a strength in the input, use that
  // - else, if varenummer matched, use the strength from that variant
  // - else null
  const typedStrength = extractStrength(input);
  let strength = typedStrength ?? parseStrengthString(varenummerHit?.strengthText);

  // Special case: N02AJ06 is a combination product (paracetamol/kodein).
  // Use ONLY kodein strength (mg after "/") for OMEQ calculation.
  if (product?.atcCode === "N02AJ06") {
    strength =
      extractCodeineStrengthFromCombo(input) ??
      extractCodeineStrengthFromCombo(varenummerHit?.strengthText ?? "") ??
      strength;
  }

  // Special case: N02AA05/N02AA55 (oxycodone +/- naloxone). If strength is "X mg/Y mg",
  // use ONLY the first mg value (oxycodone) for OMEQ calculation.
  if (product?.atcCode === "N02AA05" || product?.atcCode === "N02AA55") {
    strength =
      extractOxycodoneStrengthFromCombo(input) ??
      extractOxycodoneStrengthFromCombo(varenummerHit?.strengthText ?? "") ??
      strength;
  }

  return {
    product,
    strength,
  };
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
