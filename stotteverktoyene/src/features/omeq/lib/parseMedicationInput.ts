import type { ATCcode } from "../data/opioids";
import { ATC_PRODUCTS } from "../data/atcProducts";
import type { ProductForm } from "../data/atcProducts";

export interface ProductIndexItem {
  name: string; // visningsnavn (matcher input)
  manufacturer?: string;
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

let cachedProductIndex: ProductIndexItem[] | null = null;

export const buildProductIndex = (): ProductIndexItem[] => {
  if (cachedProductIndex) return cachedProductIndex;

  cachedProductIndex = Object.entries(ATC_PRODUCTS)
    .flatMap(([atcCode, products]) =>
      (products ?? []).map((p) => ({
        name: p.name,
        manufacturer: p.manufacturer,
        atcCode: atcCode as ATCcode,
        form: p.form,
      }))
    )
    .sort((a, b) => b.name.length - a.name.length);

  return cachedProductIndex;
};

// Ord i inputen som peker på en formulering. Brukes bare til å skille mellom
// produkter som deler handelsnavn – f.eks. OxyNorm, som finnes som mikstur,
// kapsel og injeksjonsvæske. Uten dette avgjorde rekkefølgen i datasettet, slik
// at mikstur og kapsel arvet injeksjonsvæskens parenterale vei og faktor 3.
const FORM_HINTS: Record<ProductForm, string[]> = {
  mikstur: ["mikstur", "oral væske", "oral løsning", "oral oppløsning"],
  dråper: ["dråpe"],
  kapsel: ["kapsel", "kapsler"],
  tablett: ["tablett"],
  brusetablett: ["brusetablett"],
  depottablett: ["depottablett"],
  depotplaster: ["depotplaster", "plaster"],
  stikkpille: ["stikkpille", "suppositor"],
  nesespray: ["nesespray"],
  sublingvaltablett: ["sublingvaltablett", "resoriblett"],
  sublingvalfilm: ["sublingvalfilm"],
  lyofilisattablett: ["lyofilisat"],
  injeksjon: ["injeksjon"],
  "infusjons-/injeksjonsvæske": ["injeksjonsvæske", "infusjon", "injeksjon"],
  depotinjeksjonsvæske: ["depotinjeksjon"],
  annet: [],
};

// Lengste treff vinner, slik at «depottablett» ikke også regnes som «tablett».
const formHintScore = (text: string, form?: ProductForm): number => {
  if (!form) return 0;

  return (FORM_HINTS[form] ?? []).reduce(
    (best, hint) => (text.includes(hint) ? Math.max(best, hint.length) : best),
    0
  );
};

const nameMatchesText = (text: string, name: string): boolean => {
  // Krev “ordgrense-ish” på begge sider der det gir mening
  // (hindrer litt feiltreff, men fortsatt robust)
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(name)}(\\s|$)`, "i");
  if (pattern.test(text)) return true;

  // Fallback: inkluderende match (hjelper når input har ekstra ord som “depottabletter”)
  return text.includes(name);
};

export const findProductInText = (
  input: string,
  products: ProductIndexItem[]
): ProductIndexItem | null => {
  const text = normalizeText(input);

  // products er sortert med lengste navn først, så det mest spesifikke
  // handelsnavnet vinner («Reltebon Depot» foran «Reltebon»).
  const matches = products.filter((p) => nameMatchesText(text, normalizeText(p.name)));
  if (matches.length === 0) return null;

  const best = matches[0];
  const bestName = normalizeText(best.name);
  const sameName = matches.filter((p) => normalizeText(p.name) === bestName);
  if (sameName.length === 1) return best;

  // Samme handelsnavn i flere formuleringer: la ordet i teksten avgjøre.
  // Uten treff faller vi tilbake til datarekkefølgen, som før.
  return sameName.reduce((chosen, candidate) =>
    formHintScore(text, candidate.form) > formHintScore(text, chosen.form) ? candidate : chosen
  );
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

// Varenummer er 6 siffer, men kildedata har strippet ledende nuller, så flere
// ligger inne med 4–5 siffer (OxyNorm mikstur er 9587). Kravet om minst 5 siffer
// gjorde at de aldri traff, og da falt oppslaget tilbake på navnesøket.
//
// Appen skriver selv varenummeret i parentes ("… (9587)"), så det er den sikreste
// kandidaten. Tall som følges av en enhet er en styrke og hoppes over.
const extractProductNumberCandidates = (input: string): number[] => {
  const candidates: number[] = [];

  const add = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n) && !candidates.includes(n)) candidates.push(n);
  };

  for (const m of input.matchAll(/\((\d{4,7})\)/g)) add(m[1]);
  for (const m of input.matchAll(/\b(\d{4,7})\b(?!\s*(?:mg|mcg|µg|ug|ml|g)\b)/gi)) add(m[1]);

  return candidates;
};

const parseStrengthString = (strengthText?: string | null): Strength | null => {
  if (!strengthText) return null;
  return extractStrength(strengthText);
};

const findByProductNumber = (input: string): VariantHit | null => {
  // Kandidatene prøves i prioritert rekkefølge mot datasettet. Et tall som ikke
  // er et kjent varenummer gir ingen treff, og vi går videre til neste.
  for (const pn of extractProductNumberCandidates(input)) {
    // Search in the source dataset (ATC_PRODUCTS) where variants/productNumbers live
    for (const [atcCode, products] of Object.entries(ATC_PRODUCTS)) {
      for (const p of products ?? []) {
        for (const v of p.variants ?? []) {
          const nums = v.productNumbers ?? [];
          if (nums.includes(pn)) {
            return {
              product: {
                name: p.name,
                manufacturer: p.manufacturer,
                atcCode: atcCode as ATCcode,
                form: p.form,
              },
              strengthText: v.strength ?? null,
            };
          }
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
