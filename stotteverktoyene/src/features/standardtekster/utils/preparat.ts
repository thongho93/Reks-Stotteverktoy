import { useCallback, useState } from "react";
import type { PreparatRow } from "../types";

const MANUFACTURER_TOKENS = new Set(
  [
    // Common Norwegian market / generic manufacturers & labelers
    "hexal",
    "orion",
    "sandoz",
    "teva",
    "accord",
    "zentiva",
    "krka",
    "stada",
    "actavis",
    "mylan",
    "viatris",
    "bluefish",
    "orifarm",
    "glenmark",
    "sun",
    "apotek",
    "apofri",
    "medical",
    "valley",
    // Some frequent brand owners (kept here only when they appear as trailing company token)
    "pfizer",
    "bayer",
    "novartis",
    "sanofi",
    "roche",
    "astrazeneca",
    "msd",
    "organon",
    "lilly",
    "takeda",
    "amgen",
    "gsk",
    "abbvie",
    "bms",
    "boehringer",
  ].map((s) => s.toLowerCase())
);

const COMPANY_SUFFIX_TOKENS = new Set(
  [
    "pharma",
    "pharmaceutical",
    "pharmaceuticals",
    "healthcare",
    "health",
    "labs",
    "laboratories",
    "ab",
    "as",
    "asa",
    "aps",
    "oy",
    "ltd",
    "limited",
    "inc",
    "gmbh",
    "ag",
  ].map((s) => s.toLowerCase())
);

const DOSAGE_FORM_TOKENS = new Set(
  [
    // common Norwegian dosage form tokens that often appear in FEST strings
    "tab",
    "tablett",
    "tabl",
    "enterotab",
    "enterotablett",
    "depottab",
    "depottablett",
    "retardtab",
    "retardtablett",
    "smeltetab",
    "smeltetablett",
    "depot",
    "retard",
    "mikstur",
    "susp",
    "inj",
    "inf",
    "oppl",
    "pulv",
    "pulver",
    "aerosol",
    "inh",
    "spray",
    "dråper",
    "dr",
    "kaps",
    "kapsel",
    "stikkpille",
    "supp",
  ].map((s) => s.toLowerCase())
);

function stripDosageFormFromName(name: string): string {
  const tokens = name
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (tokens.length === 0) return "";

  const kept = tokens.filter((t) => {
    const key = t.replace(/[()\[\]{},.;:&]+/g, "").toLowerCase();
    return !DOSAGE_FORM_TOKENS.has(key);
  });

  return kept.join(" ").replace(/\s+/g, " ").trim() || name.trim();
}

function stripManufacturerFromName(name: string, producer?: string | null): string {
  // Keep the original spacing but remove obvious manufacturer/company tokens.
  // This is heuristic by design and meant to handle e.g. "Atorvastatin Hexal" -> "Atorvastatin".
  const tokens = name
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (tokens.length <= 1) return name.trim();

  const producerTokens = new Set(
    (producer ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((t) => t.replace(/[()\[\]{},.;:&]+/g, "").toLowerCase())
      .filter(Boolean)
  );

  const isProducerToken = (key: string) => producerTokens.has(key);

  const kept: string[] = [];
  let lastWasRemovedManufacturer = false;

  for (const t of tokens) {
    const cleaned = t.replace(/[()\[\]{},.;:]+/g, "");
    const key = cleaned.toLowerCase();

    const isManufacturer = MANUFACTURER_TOKENS.has(key) || isProducerToken(key);
    const isCompanySuffix = COMPANY_SUFFIX_TOKENS.has(key);

    // If we removed a manufacturer token, also drop immediate suffix tokens (e.g. "Orifarm Healthcare").
    if (isManufacturer) {
      lastWasRemovedManufacturer = true;
      continue;
    }

    if (lastWasRemovedManufacturer && isCompanySuffix) {
      continue;
    }

    lastWasRemovedManufacturer = false;
    kept.push(t);
  }

  const result = kept.join(" ").replace(/\s+/g, " ").trim();
  return result || name.trim();
}

export function formatPreparatForTemplate(med: {
  varenavn: string | null;
  navnFormStyrke: string | null;
  produsent?: string | null;
}): string {
  const nfsRaw = (med.navnFormStyrke ?? "").trim();
  const nfs = nfsRaw.replace(/\s+/g, " ").trim();

  // Try to extract the first strength-like fragment.
  // Supports: "0,1 mg/dose", "40 mg", "50 mikrog/500 mikrog", "1,25 mg/2,5 ml"
  // We stop at comma+space (", ") which is used as field separators in many FEST strings.
  const unit = "mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\\.e\\.|mmol|ml";
  const m = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*(?:${unit})(?:\\s*\\/\\s*[^;\\)\\n]+?)?)(?=,\\s|$)`, "i")
  );

  const strength = m?.[1]
    ? m[1]
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  // Prefer name extracted from navnFormStyrke (this typically avoids manufacturer tokens like “Viatris/xiromed”).
  // 1) remove trailing metadata after comma (often pack info)
  const head = nfs.replace(/,.*$/, "").trim();

  // 2) take everything before a common dosage-form keyword
  const formWords = [
    "tab",
    "tablett",
    "tabl",
    "enterotab",
    "enterotablett",
    "depottab",
    "depottablett",
    "smeltetab",
    "smeltetablett",
    "kaps",
    "kapsel",
    "inj",
    "mikst",
    "mikstur",
    "inh",
    "aerosol",
    "pulv",
    "plaster",
    "spray",
    "oppl",
    "susp",
    "granulat",
    "krem",
    "salve",
    "gel",
    "liniment",
    "drasj",
    "supp",
    "stikkpille",
    "mikrog",
    "mikrogram",
  ].join("|");

  const beforeForm = head.split(new RegExp(`\\b(?:${formWords})\\b`, "i"))[0]?.trim() ?? "";
  const nameFromNfs = beforeForm.replace(/\s+/g, " ").trim();

  const fallbackName = (med.varenavn ?? "").trim();
  let rawName = nameFromNfs || fallbackName;

  // Remove the extracted strength from the name if it already contains it (prevents "75 mg 75 mg")
  if (strength) {
    const esc = strength.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rawName = rawName.replace(new RegExp(`\\b${esc}\\b`, "i"), " ");
  }

  // Strip manufacturer/company tokens and dosage-form tokens (enterotab/depottab/smeltetab etc.)
  const withoutManufacturer = rawName ? stripManufacturerFromName(rawName, med.produsent) : "";
  const name = withoutManufacturer ? stripDosageFormFromName(withoutManufacturer) : "";

  if (name && strength) return `${name} ${strength}`.replace(/\s+/g, " ").trim();
  if (name) return name;
  return nfs || "";
}


export function replaceNextPreparatToken(text: string, value: string) {
  // Replace ONLY the next (first) placeholder occurrence
  return text.replace(/\{\{\s*PREPARAT\s*\}\}/, value);
}

export function usePreparatRows() {
  const [preparatRows, setPreparatRows] = useState<PreparatRow[]>([{ id: 0, picked: null }]);

  const addPreparatRow = useCallback(() => {
    setPreparatRows((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      return [...prev, { id: nextId, picked: null }];
    });
  }, []);

  const removePreparatRow = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [{ id: 0, picked: null }];
    });
  }, []);

  const setPickedForRow = useCallback((id: number, picked: string | null) => {
    setPreparatRows((prev) => prev.map((r) => (r.id === id ? { ...r, picked } : r)));
  }, []);

  const resetPreparatRows = useCallback(() => {
    setPreparatRows([{ id: 0, picked: null }]);
  }, []);

  return {
    preparatRows,
    addPreparatRow,
    removePreparatRow,
    setPickedForRow,
    resetPreparatRows,
  };
}

export function formatPreparatList(values: Array<string | null | undefined>): string {
  const items = values.map((v) => (v ?? "").trim()).filter(Boolean);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} og ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} og ${items[items.length - 1]}`;
}

export function replacePreparatTokenWithList(text: string, listValue: string) {
  return text.replace(/\{\{\s*PREPARAT\s*\}\}/g, listValue);
}