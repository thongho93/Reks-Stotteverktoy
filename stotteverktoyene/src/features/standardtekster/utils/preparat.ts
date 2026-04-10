import { useCallback, useState } from "react";
import type { PreparatRow } from "../types";

const MANUFACTURER_TOKENS = new Set(
  [
    // Common Norwegian market / generic manufacturers & labelers
    "hexal",
    "orion",
    "pensa",
    "sandoz",
    "teva",
    "accord",
    "zentiva",
    "krka",
    "stada",
    "actavis",
    "mylan",
    "viatris",
    "xiromed",
    "bluefish",
    "orifarm",
    "glenmark",
    "sun",
    "apotek",
    "apofri",
    "medical",
    "valley",
    "emerald",
    "abacus",

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
  ].map((s) => s.toLowerCase()),
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
  ].map((s) => s.toLowerCase()),
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
    "retardtab",
    "retardtablett",
    "smeltetab",
    "smeltetablett",
    "depot",
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
    "supp",
    "depotkaps",
    "enterodepottab",
    "enterokaps",
    "spr",
  ].map((s) => s.toLowerCase()),
);

function stripDosageFormFromName(name: string): string {
  const tokens = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

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
  const tokens = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

  if (tokens.length <= 1) return name.trim();

  const producerTokens = new Set(
    (producer ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((t) => t.replace(/[()\[\]{},.;:&]+/g, "").toLowerCase())
      .filter(Boolean),
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

export function formatPreparatRowText(
  row: {
    baseText: string | null;
    fullName: string | null;
    manufacturer: string | null;
    packSize: string | null;
  },
  opts: { includeManufacturer: boolean; includePackSize: boolean },
): string {
  const baseText = (row.baseText ?? "").trim();
  if (!baseText) return "";

  const manufacturer = (row.manufacturer ?? "").trim();
  const fullName = (row.fullName ?? "").trim();
  const packSize = (row.packSize ?? "").trim();

  let out = baseText;

  // Manufacturer toggle (independent)
  if (opts.includeManufacturer) {
    if (manufacturer) {
      const baseLower = baseText.toLowerCase();
      const mLower = manufacturer.toLowerCase();
      if (!baseLower.includes(mLower)) out = `${out} ${manufacturer}`.trim();
    } else if (fullName) {
      // Some sources only expose manufacturer inside the full name.
      out = fullName;
    }
  }

  // Pack size toggle (independent)
  if (opts.includePackSize && packSize) {
    if (!new RegExp(`\\s${packSize}\\s*$`).test(out)) {
      out = `${out} ${packSize}`.trim();
    }
  }

  // If pack size is OFF and we ended up using fullName, strip trailing pack size
  if (!opts.includePackSize && fullName && out === fullName) {
    out = out.replace(/\s+\d+\s*$/g, "").trim();
  }

  return out;
}

export function formatPreparatForTemplate(med: {
  varenavn: string | null;
  // Sources differ; support both spellings.
  navnForStyrke?: string | null;
  navnFormStyrke?: string | null;
  produsent?: string | null;
}): string {
  const normalizeStrengthComparable = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e)\b/g, "")
      .replace(/\s+/g, "")
      .replace(/\s*\/\s*/g, "/")
      .trim();

  const nfsRaw = (med.navnForStyrke ?? med.navnFormStyrke ?? "").trim();
  const nfs = nfsRaw.replace(/\s+/g, " ").trim();

  // Try to extract the first strength-like fragment.
  // Supports:
  //  - "0,1 mg/dose"
  //  - "40 mg"
  //  - "50 mikrog/500 mikrog"
  //  - "1,25 mg/2,5 ml"
  //  - "80/4,5mcg"  (ratio where the unit comes after the second number)
  // We stop at comma+space (", ") which is used as field separators in many FEST strings.
  // Include insulin-style units like "E/ml" (Norwegian "enheter per ml") by supporting "e" as a unit token.
  const unit = "mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\\.e\\.|mmol|ml|e";

  // 1) Ratio strength where unit comes after the second number, e.g. "80/4,5mcg"
  const ratioTrailingUnit = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*\\/\\s*\\d+[.,]?\\d*\\s*(?:${unit}))(?:\\b)?(?=,\\s|$)`, "i"),
  );

  // 2) Regular pattern where the first number has a unit, optionally followed by "/..."
  const regular = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*(?:${unit})(?:\\s*\\/\\s*[^;\\)\\n]+?)?)(?=,\\s|$)`, "i"),
  );

  // 0) Percentage strengths like "40 % w/v" / "40% w/v" / "5 % v/v"
  const percentStrength = nfs.match(/(\d+(?:[.,]\d+)?\s*%\s*(?:w\/v|v\/v)?)(?=,\s|$)/i);

  const picked = percentStrength?.[1] || ratioTrailingUnit?.[1] || regular?.[1] || "";

  const strength = picked
    ? picked
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s*%\s*/g, " % ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  // Only treat comma as a field separator when it is followed by whitespace (", ").
  // This avoids cutting decimal commas like "0,1mg/ml" or "2,5".
  const head = nfs.replace(/,\s+.*$/, "").trim();

  // 2) take everything before a common dosage-form keyword
  const formWords = [
    "tab",
    "tablett",
    "tabl",
    "enterotab",
    "enterotablett",
    "depottab",
    "smeltetab",
    "smeltetablett",
    "kaps",
    "kapsel",
    "inj",
    "mikst",
    "inh",
    "aerosol",
    "pulv",
    "plaster",
    "spray",
    "oppl",
    "susp",
    "granulat",
    "drasj",
    "supp",
    "mikrog",
    "mikrogram",
  ].join("|");

  const beforeForm = head.split(new RegExp(`\\b(?:${formWords})\\b`, "i"))[0]?.trim() ?? "";
  const nameFromNfs = beforeForm.replace(/\s+/g, " ").trim();

  const fallbackName = (med.varenavn ?? "").trim();
  let rawName = nameFromNfs || fallbackName;

  // Remove the extracted strength from the name if it already contains it (prevents duplicates like "0,75 % 0,75 %").
  // NOTE: We must NOT use word-boundaries here because strengths often contain non-word chars like "%", "/", ",".
  if (strength) {
    const esc = strength.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Remove strength occurrences with flexible whitespace around separators.
    const flex = esc
      .replace(/\\\s\+/g, "\\s+") // keep any existing whitespace escapes (defensive)
      .replace(/\\s\+%\\s\+/g, "\\s*%\\s*")
      .replace(/%/g, "%")
      .replace(/\\\//g, "\\s*\\/\\s*"); // allow spaces around "/"
    rawName = rawName.replace(new RegExp(`\\s*${flex}\\s*`, "i"), " ");
  }

  // Drop trailing pack-size tokens that often appear at the end of PIM names, e.g. "... 2,5" or "... 120".
  // Keep strengths intact (we already extracted `strength` separately).
  rawName = rawName
    .replace(/\s+\d+(?:[.,]\d+)?\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip manufacturer/company tokens and dosage-form tokens (enterotab/depottab/smeltetab etc.)
  const withoutManufacturer = rawName ? stripManufacturerFromName(rawName, med.produsent) : "";
  const name = withoutManufacturer ? stripDosageFormFromName(withoutManufacturer) : "";

  if (name && strength) {
    const esc = strength.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hasEquivalentStrengthInName =
      normalizeStrengthComparable(name).endsWith(normalizeStrengthComparable(strength));

    let result = (hasEquivalentStrengthInName
      ? `${name.replace(/\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+\s*$/i, "").trim()} ${strength}`
      : `${name} ${strength}`)
      .replace(/\s+/g, " ")
      .trim();

    // Deduplicate identical strengths if they still end up adjacent (e.g. "0,75 % 0,75 %")
    result = result.replace(new RegExp(`${esc}\\s+${esc}`, "i"), strength);

    // Fix a common artifact where "0,1mg/ml" becomes "0 0,1mg/ml"
    result = result.replace(/\b0\s+0([.,]\d)/g, "0$1").replace(/\b0\s+0,/g, "0,");

    return result.replace(/\s+/g, " ").trim();
  }

  if (name) return name;
  return nfs || "";
}

export function replaceNextPreparatToken(text: string, value: string) {
  if (!text) return text;

  // Deterministic rule:
  // - Only replace the generic PREPARAT token
  // - Never touch PREPARAT1 or PREPARAT2
  // This guarantees PREPARAT1 can never end up inside PREPARAT2
  // when only one preparat is selected.
  return text.replace(/\{\{\s*PREPARAT\s*\}\}|\bPREPARAT\b/i, value);
}

export const replaceVareTokenByCount = (text: string, count: number): string => {
  if (!text) return text;

  const replacement = count <= 1 ? "varen" : "varene";

  return (
    text
      // Ny anbefalt syntaks
      .replace(
        /(^|[^A-Z0-9_])VAREN\(E\)(?=[^A-Z0-9_]|$)/gi,
        (_m, p1: string) => `${p1}${replacement}`,
      )
      .replace(/\{\{\s*VAREN\(E\)\s*\}\}/gi, replacement)

      // Bakoverkompatibilitet
      .replace(/\{\{\s*VAREN\s*\}\}/gi, replacement)
      .replace(/\{\{\s*VARENE\s*\}\}/gi, replacement)
      .replace(/\{\{\s*VARE\(N?E?\)\s*\}\}/gi, replacement)
  );
};

export function replaceNextTallToken(text: string, value: string) {
  // Replace ONLY the next (first) occurrence.
  // Supports {{TALL}}, {{TALL1}}, TALL, TALL1
  return text.replace(/\{\{\s*TALL\d*\s*\}\}|\bTALL\d*\b/i, value);
}

export function replaceTallTokens(text: string, value: string) {
  // Replace ALL occurrences.
  // Supports {{TALL}}, {{TALL1}}, TALL, TALL1
  return text.replace(/\{\{\s*TALL\d*\s*\}\}|\bTALL\d*\b/gi, value);
}

export function templateHasTallToken(text: string): boolean {
  return /\{\{\s*TALL\d*\s*\}\}|\bTALL\d*\b/i.test(text);
}

export function getTallTokenIndices(text: string): number[] {
  const indices = new Set<number>();

  const re = /\{\{\s*TALL(\d*)\s*\}\}|\bTALL(\d*)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw) {
      indices.add(0);
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) indices.add(n);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export function replaceTallTokenByIndex(text: string, index: number, value: string): string {
  if (!text) return text;
  const safeValue = value ?? "";

  if (index === 0) {
    return text.replace(/\{\{\s*TALL\s*\}\}|\bTALL\b/gi, safeValue);
  }

  const re = new RegExp(`\\{\\{\\s*TALL${index}\\s*\\}\\}|\\bTALL${index}\\b`, "gi");

  return text.replace(re, safeValue);
}

// New helpers for DATO tokens
export function replaceNextDatoToken(text: string, value: string) {
  // Replace ONLY the next (first) occurrence.
  // Supports {{DATO}} and DATO
  return text.replace(/\{\{\s*DATO\s*\}\}|\bDATO\b/i, value);
}

export function replaceDatoTokens(text: string, value: string) {
  // Replace ALL occurrences.
  // Supports {{DATO}} and DATO
  return text.replace(/\{\{\s*DATO\s*\}\}|\bDATO\b/gi, value);
}

export function templateHasDatoToken(text: string): boolean {
  return /\{\{\s*DATO\s*\}\}|\bDATO\b/i.test(text);
}

export function templateHasDatoMndToken(text: string): boolean {
  return /\{\{\s*DATO_MND\s*\}\}|\bDATO_MND\b/i.test(text ?? "");
}

export function getFormuleringTokenIndices(text: string): number[] {
  const indices = new Set<number>();

  const re = /\{\{\s*FORMULERING(\d*)\s*\}\}|\bFORMULERING(\d*)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw) indices.add(0);
    else {
      const n = Number(raw);
      if (Number.isFinite(n)) indices.add(n);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export function replaceFormuleringTokenByIndex(text: string, index: number, value: string): string {
  if (!text) return text;
  const safeValue = value ?? "";

  if (index === 0) {
    return text.replace(/\{\{\s*FORMULERING\s*\}\}|\bFORMULERING\b/gi, safeValue);
  }

  const re = new RegExp(`\\{\\{\\s*FORMULERING${index}\\s*\\}\\}|\\bFORMULERING${index}\\b`, "gi");
  return text.replace(re, safeValue);
}

export function replaceDatoMndTokens(text: string, value: string) {
  if (!text) return text;
  return text.replace(/\{\{\s*DATO_MND\s*\}\}|\bDATO_MND\b/gi, value);
}

export function replaceNextDatoMndToken(text: string, value: string) {
  if (!text) return text;
  return text.replace(/\{\{\s*DATO_MND\s*\}\}|\bDATO_MND\b/i, value);
}

export function usePreparatRows() {
  const [preparatRows, setPreparatRows] = useState<PreparatRow[]>([
    { id: 0, picked: null, pickedKey: null },
  ]);

  const addPreparatRow = useCallback(() => {
    setPreparatRows((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      return [...prev, { id: nextId, picked: null, pickedKey: null }];
    });
  }, []);

  const removePreparatRow = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [{ id: 0, picked: null, pickedKey: null }];
    });
  }, []);

  const setPickedForRow = useCallback(
    (id: number, picked: string | null, pickedKey?: string | null) => {
      setPreparatRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                picked,
                pickedKey: picked ? (pickedKey ?? r.pickedKey ?? picked) : null,
              }
            : r,
        ),
      );
    },
    [],
  );

  const resetPreparatRows = useCallback(() => {
    setPreparatRows([{ id: 0, picked: null, pickedKey: null }]);
  }, []);

  const clearPreparats = useCallback(() => {
    setPreparatRows([{ id: 0, picked: null, pickedKey: null }]);
  }, []);

  const addPickedPreparat = useCallback((picked: string, pickedKey?: string | null) => {
    setPreparatRows((prev) => {
      const key = String((pickedKey ?? picked).trim());

      const alreadyPicked = prev
        .map((r) => r.pickedKey ?? r.picked)
        .filter(Boolean)
        .includes(key);

      if (alreadyPicked) return prev;

      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      const kept = prev.filter((r) => r.picked);
      return [...kept, { id: nextId, picked, pickedKey: key }];
    });
  }, []);

  const removePreparatById = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      return remaining.length > 0 ? remaining : [{ id: 0, picked: null, pickedKey: null }];
    });
  }, []);

  return {
    preparatRows,
    addPreparatRow,
    removePreparatRow,
    setPickedForRow,
    resetPreparatRows,
    clearPreparats,
    addPickedPreparat,
    removePreparatById,
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
  if (!text) return text;

  // Only replace generic PREPARAT tokens.
  // IMPORTANT: do NOT touch PREPARAT1 / PREPARAT2 here, otherwise
  // PREPARAT2 may accidentally become PREPARAT1 when only one
  // preparat is present (the issue seen when pasting text back
  // into the editor).
  return text.replace(/\{\{\s*PREPARAT\s*\}\}|\bPREPARAT\b/g, listValue);
}

export function replacePreparatTokensPrimarySecondary(
  text: string,
  primary: string | null | undefined,
  secondary: string | null | undefined,
) {
  let out = text;

  const p = (primary ?? "").trim();
  let s = (secondary ?? "").trim();

  // If only one preparat is selected some pipelines accidentally
  // pass the same value twice. In that case we MUST treat secondary
  // as missing so PREPARAT2 remains visible in the template.
  if (p && s && p === s) {
    s = "";
  }

  if (p) {
    out = out.replace(/\{\{\s*PREPARAT1\s*\}\}|\bPREPARAT1\b/g, p);
  }

  if (s) {
    out = out.replace(/\{\{\s*PREPARAT2\s*\}\}|\bPREPARAT2\b/g, s);
  }

  return out;
}

export type StandardTekstTokenGroup = "PREPARAT" | "TALL" | "VARE" | "ANNET";

export type StandardTekstTokenDef = {
  label: string;
  insert: string;
  help?: string;
  group?: StandardTekstTokenGroup;
};

export const STANDARDTEKST_TOKEN_DEFS: StandardTekstTokenDef[] = [
  { label: "PREPARAT1", insert: "PREPARAT1", help: "Første preparat", group: "PREPARAT" },
  { label: "PREPARAT2", insert: "PREPARAT2", help: "Andre preparat", group: "PREPARAT" },
  { label: "VIRKESTOFF", insert: "VIRKESTOFF", help: "Virkestoff fra valgt preparat", group: "PREPARAT" },
  { label: "FORMULERING", insert: "FORMULERING", help: "Fri tekst (f.eks. tablett/kapsel/nesespray)", group: "ANNET" },

  { label: "TALL", insert: "TALL", help: "Første tall", group: "TALL" },
  { label: "TALL1", insert: "TALL1", help: "Andre tall", group: "TALL" },

  { label: "VAREN(E)", insert: "VAREN(E)", group: "VARE" },

  { label: "DATO", insert: "DATO", help: "Dato (DD.MM.YYYY)", group: "ANNET" },
  { label: "DATO_MND", insert: "DATO_MND", help: "Måned/år (MM.YYYY)", group: "ANNET" },
];
