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
