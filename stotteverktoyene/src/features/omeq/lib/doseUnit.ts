// Hjelpefunksjoner for doseenhet i OMEQ-beregningen.

// Injeksjoner og infusjoner (parenteral). Her skriver brukeren inn doseringen legen har
// angitt direkte (i µg eller mg), ikke antall enheter.
export const isParenteralForm = (form?: string | null): boolean =>
  /injeks|infus/i.test(String(form ?? ""));

// Enheten for doseringen på parenterale preparater følger styrken:
// står styrken i µg/mcg (f.eks. Fentanyl 50 µg/ml) skrives dosen i µg, ellers i mg.
export const parenteralDoseUnit = (strength?: { unit: string } | null): "mg" | "µg" => {
  const unit = String(strength?.unit ?? "").trim().toLowerCase();
  if (unit.includes("mg")) return "mg";
  return unit.includes("µg") || unit.includes("ug") || unit.includes("mcg") ? "µg" : "mg";
};

// Døgndose kan skrives som et tall («8») eller et produkt («2x4» = 2 tbl × 4 ganger daglig).
// Støtter x, × og * som gangetegn, og komma eller punktum som desimaltegn.
const DOSE_EXPRESSION = /^(?:\d+\.?\d*|\.\d+)(?:[x×*](?:\d+\.?\d*|\.\d+))*$/i;

export const parseDoseInput = (raw: string): number | null => {
  const text = String(raw ?? "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
  if (!text || !DOSE_EXPRESSION.test(text)) return null;

  const product = text.split(/[x×*]/i).reduce((acc, part) => acc * Number(part), 1);
  if (!Number.isFinite(product)) return null;

  // Unngå flyttallsstøy som 0,1 × 3 = 0,30000000000000004
  return Math.round(product * 1e6) / 1e6;
};

// Er dosen skrevet som et produkt (f.eks. «2x4»)?
export const isDoseProduct = (raw: string): boolean => /[x×*]/i.test(String(raw ?? ""));
