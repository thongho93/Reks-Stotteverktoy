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
  const splitNameAndTrailingStrength = (value: string): { name: string; strength: string } | null => {
    const text = value.replace(/\s+/g, " ").trim();
    if (!text) return null;

    const strengthPatterns = [
      // "40 % w/v"
      /(.*?)(\s+\d+(?:[.,]\d+)?\s*%\s*(?:w\/v|v\/v)?)$/i,
      // "80/4,5mcg" or "400/30 mg"
      /(.*?)(\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+(?:\s*(?:mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e))?)$/i,
      // "18 mg", "0,2 mg/dose", "100 mcg/24t"
      /(.*?)(\s+\d+(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e|t(?:imer)?|dose))?)$/i,
    ];

    for (const pattern of strengthPatterns) {
      const match = text.match(pattern);
      if (!match) continue;

      const name = (match[1] ?? "").trim();
      const strength = (match[2] ?? "").trim();
      if (!name || !strength) continue;

      return { name, strength };
    }

    return null;
  };

  const baseText = (row.baseText ?? "").trim();
  if (!baseText) return "";

  const manufacturer = (row.manufacturer ?? "").trim();
  const manufacturerDisplay = manufacturer.toLowerCase();
  const fullName = (row.fullName ?? "").trim();
  const packSize = (row.packSize ?? "").trim();

  let out = baseText;

  // Manufacturer toggle (independent)
  if (opts.includeManufacturer) {
    if (manufacturer) {
      const baseLower = baseText.toLowerCase();
      const mLower = manufacturerDisplay;
      if (!baseLower.includes(mLower)) {
        const split = splitNameAndTrailingStrength(baseText);
        if (split) {
          out = `${split.name} ${manufacturerDisplay} ${split.strength}`.replace(/\s+/g, " ").trim();
        } else {
          out = `${out} ${manufacturerDisplay}`.trim();
        }
      }
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
  // Use a specific denominator pattern to avoid greedily capturing pack-size and dosage-form tokens
  // (e.g. "100mcg/24t 24 24 stk. Plaster" should yield "100mcg/24t", not the full trailing string).
  const denomUnit = `${unit}|t(?:imer)?\\b|dose\\b`;
  const regular = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*(?:${unit})(?:\\s*\\/\\s*\\d*[.,]?\\d*\\s*(?:${denomUnit}))?)`, "i"),
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

  // Drop trailing pack-size tokens that often appear at the end of PIM/HV names.
  // Handles "... 24 24 stk." (Norwegian pack-size format) and plain trailing numbers like "... 120".
  // Keep strengths intact (we already extracted `strength` separately).
  rawName = rawName
    .replace(/\s+\d+\s*x\s*\d+\s*(?:doser?|stk\.?)\s*$/gi, " ") // "3x56 doser", "3 x 56 stk."
    .replace(/\s+\d+\s*(?:doser?|stk\.?)\s*$/gi, " ")            // "120 doser", "60 stk"
    .replace(/(?:\s+\d+)+\s*stk\.?\s*$/gi, " ")  // "24 24 stk." / "24stk"
    .replace(/(?:\s+\d+){2,}\s*$/g, " ")           // "24 24" (two+ consecutive pack-count numbers)
    .replace(/\s+\d+(?:[.,]\d+)?\s*$/g, " ")       // single trailing number or decimal
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
  return text.replace(tokenRegex("PREPARAT"), value);
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

export const replaceDenDeTokenByCount = (text: string, count: number): string => {
  if (!text) return text;

  const replacement = count <= 1 ? "den" : "de";

  return (
    text
      // Ny anbefalt syntaks
      .replace(
        /(^|[^A-Z0-9_])DEN_DE(?=[^A-Z0-9_]|$)/gi,
        (_m, p1: string) => `${p1}${replacement}`,
      )
      .replace(/\{\{\s*DEN_DE\s*\}\}/gi, replacement)

      // Bakoverkompatibilitet for ev. tidlige varianter
      .replace(/\{\{\s*DEN\/DE\s*\}\}/gi, replacement)
      .replace(/\{\{\s*DEN_DE\b[^}]*\}\}/gi, replacement)
  );
};

export const replaceMedisineneTokenByCount = (text: string, count: number): string => {
  if (!text) return text;

  const replacement = count <= 1 ? "medisinen" : "medisinene";

  return (
    text
      // Ny anbefalt syntaks
      .replace(
        /(^|[^A-Z0-9_])MEDISIN\(ENE\)(?=[^A-Z0-9_]|$)/gi,
        (_m, p1: string) => `${p1}${replacement}`,
      )
      .replace(/\{\{\s*MEDISIN\(ENE\)\s*\}\}/gi, replacement)

      // Bakoverkompatibilitet / aliaser
      .replace(/(^|[^A-Z0-9_])MEDISINENE(?=[^A-Z0-9_]|$)/gi, (_m, p1: string) => `${p1}${replacement}`)
      .replace(/\{\{\s*MEDISINENE\s*\}\}/gi, replacement)
  );
};

// Token-matching skal speile visningen i render.tsx: et token UTEN {{ }} må stå i
// VERSALER for å telle. Ellers blir vanlige ord i brødteksten – «dosering»,
// «dato», «pakke», «preparat» – tolket som tokens, og kopieringen krever
// utfylling av felter som aldri vises i teksten. Inne i {{ }} godtas alle
// skrivemåter, slik render.tsx også gjør (se isReservedBraceToken).
// Samme resonnement som for PAKKE i replacePakkeTokens.
const anyCaseSource = (word: string) =>
  word.replace(/[A-Z]/g, (c) => `[${c}${c.toLowerCase()}]`);

/**
 * Regex-kilde for et token. `indexPattern` er det som følger navnet – f.eks.
 * `"\\d*"`, `"(\\d*)"` for en capture-gruppe, eller et konkret tall.
 * Merk: med capture-gruppe gir mønsteret to grupper (én for {{ }}-varianten og
 * én for den bare) – bruk `m[1] ?? m[2]`.
 */
export function tokenRegexSource(name: string, indexPattern = ""): string {
  return `\\{\\{\\s*${anyCaseSource(name)}${indexPattern}\\s*\\}\\}|\\b${name}${indexPattern}\\b`;
}

export function tokenRegex(name: string, indexPattern = "", flags = ""): RegExp {
  return new RegExp(tokenRegexSource(name, indexPattern), flags);
}

export function replaceNextTallToken(text: string, value: string) {
  // Replace ONLY the next (first) occurrence.
  // Supports {{TALL}}, {{TALL1}}, TALL, TALL1
  return text.replace(tokenRegex("TALL", "\\d*"), value);
}

export function replaceTallTokens(text: string, value: string) {
  // Replace ALL occurrences.
  // Supports {{TALL}}, {{TALL1}}, TALL, TALL1
  return text.replace(tokenRegex("TALL", "\\d*", "g"), value);
}

export function templateHasTallToken(text: string): boolean {
  return tokenRegex("TALL", "\\d*").test(text);
}

export function getTallTokenIndices(text: string): number[] {
  const indices = new Set<number>();

  const re = tokenRegex("TALL", "(\\d*)", "g");
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
    return text.replace(tokenRegex("TALL", "", "g"), safeValue);
  }

  const re = tokenRegex("TALL", String(index), "g");

  return text.replace(re, safeValue);
}

// DOSERING er fritekst, i motsetning til TALL som valideres som et tall og styrer
// entall/flertall for PAKKE og FORMULERING. Doseringer lar seg ofte ikke uttrykke
// som ett tall – «2-3 doser inntil 4 ganger daglig» for inhalasjonsmedisiner er et
// typisk eksempel – og med nummererte tokens (DOSERING1/DOSERING2) kan én mal gi
// ulik dosering per preparat.
export function templateHasDoseringToken(text: string): boolean {
  return tokenRegex("DOSERING", "\\d*").test(text ?? "");
}

export function getDoseringTokenIndices(text: string): number[] {
  const indices = new Set<number>();

  const re = tokenRegex("DOSERING", "(\\d*)", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? ""))) {
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

export function replaceDoseringTokenByIndex(text: string, index: number, value: string): string {
  if (!text) return text;
  const safeValue = value ?? "";

  if (index === 0) {
    return text.replace(tokenRegex("DOSERING", "", "g"), safeValue);
  }

  const re = tokenRegex("DOSERING", String(index), "g");

  return text.replace(re, safeValue);
}

export function templateHasPakkeToken(text: string): boolean {
  // Case-sensitivt: kun store bokstaver PAKKE er et token. Det vanlige norske
  // ordet «pakke»/«pakker» i vanlig brødtekst skal IKKE tolkes som token –
  // samme regel som visningen (render.tsx) og øvrige tokens (DATO m.fl.).
  return /\{\{\s*PAKKE\s*\}\}|\bPAKKE\b/.test(text ?? "");
}

// "pakke" ved nøyaktig 1, ellers "pakker" (også ved tomt/ugyldig tall).
export function pakkeWordForValue(value: string): string {
  const n = Number((value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n === 1 ? "pakke" : "pakker";
}

// Erstatt PAKKE-tokens med "pakke"/"pakker" ut fra NÆRMESTE foranstående TALL-token.
// Må kjøres FØR TALL-tokenene selv erstattes med tall (den leser token-posisjonene).
export function replacePakkeTokens(
  text: string,
  getTallValue: (index: number) => string,
): string {
  if (!text) return text;
  // Case-sensitivt (ingen /i): kun store bokstaver TALL/PAKKE er tokens. Ellers
  // ville det vanlige ordet «pakke» i brødteksten blitt tolket som et PAKKE-token
  // og pluralisert til «pakker» ved kopiering – i strid med visningen (render.tsx
  // splitter også case-sensitivt) og øvrige tokens (DATO erstattes med \bDATO\b/g).
  const re = /\{\{\s*TALL(\d*)\s*\}\}|\bTALL(\d*)\b|\{\{\s*PAKKE\s*\}\}|\bPAKKE\b/g;
  let lastTallIdx: number | null = null;
  return text.replace(re, (match, braceIdx, plainIdx) => {
    if (/PAKKE/i.test(match)) {
      const val = lastTallIdx != null ? getTallValue(lastTallIdx) : "";
      return pakkeWordForValue(val);
    }
    const raw = (braceIdx ?? plainIdx ?? "").trim();
    lastTallIdx = raw ? Number(raw) : 0;
    return match; // behold TALL-tokenet – det erstattes i eget steg
  });
}

// Alternativ-gruppe: {{alternativ 1 / alternativ 2 / alternativ 3}}. Kun tekst som
// eksplisitt er pakket inn i {{ }} og inneholder "/" telles – vanlig "/" ellers i
// malen (f.eks. "og/eller") berøres ikke.
const ALT_GROUP_RE = () => /\{\{([^{}]*\/[^{}]*)\}\}/g;

const splitAltSegments = (inner: string): string[] =>
  inner
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

export function templateHasAltToken(text: string): boolean {
  if (!text) return false;
  const re = ALT_GROUP_RE();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (splitAltSegments(m[1]).length >= 2) return true;
  }
  return false;
}

/** Antall alternativ-grupper i malen, i rekkefølgen de forekommer. */
export function getAltGroupCount(text: string): number {
  if (!text) return 0;
  const re = ALT_GROUP_RE();
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (splitAltSegments(m[1]).length >= 2) count += 1;
  }
  return count;
}

/**
 * Erstatt hver alternativ-gruppe med det valgte alternativet (rå tekst, kan
 * fortsatt inneholde andre tokens som DATO/PREPARAT1 – de resolves i egne steg).
 * `getSelected(occurrenceIndex)` returnerer valgt segment-indeks, eller null hvis
 * ikke valgt ennå (da beholdes gruppen uendret – kopiering skal være blokkert før
 * dette kan skje).
 */
export function replaceAltGroups(
  text: string,
  getSelected: (occurrenceIndex: number) => number | null,
): string {
  if (!text) return text;
  const re = ALT_GROUP_RE();
  let occurrence = -1;
  return text.replace(re, (match, inner: string) => {
    const segments = splitAltSegments(inner);
    if (segments.length < 2) return match;
    occurrence += 1;
    const selected = getSelected(occurrence);
    if (selected == null || !segments[selected]) return match;
    return segments[selected];
  });
}

// Reserverte token-navn som også kan stå i {{ }} (f.eks. {{TALL}}). Disse skal
// IKKE tolkes som valgfri setning eller alternativ-gruppe.
const RESERVED_BRACE_TOKEN_RE =
  /^(?:TALL\d*|PAKKE|KLOKKESLETT_DAG|DATO_MND|DATO|VIRKESTOFF|FORMULERING\d*|DOSERING\d*|PREPARAT\d*|DEN_DE|VAREN\(E\)|MEDISIN\(ENE\)|XX)$/i;

export function isReservedBraceToken(inner: string): boolean {
  return RESERVED_BRACE_TOKEN_RE.test((inner ?? "").trim());
}

// Valgfri setning: {{setning uten skråstrek}}. Tas med som standard, men kan
// velges bort i forhåndsvisningen før kopiering. Grupper MED "/" er
// alternativ-grupper (se over), og kjente tokens i {{ }} er heller ikke valgfrie.
const OPTIONAL_GROUP_RE = () => /\{\{([^{}/]+)\}\}/g;

/** Antall valgfrie setninger i malen, i rekkefølgen de forekommer. */
export function getOptionalGroupCount(text: string): number {
  if (!text) return 0;
  const re = OPTIONAL_GROUP_RE();
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!isReservedBraceToken(m[1]) && m[1].trim()) count += 1;
  }
  return count;
}

/**
 * Fjern bortvalgte valgfrie setninger og pakk ut resten (uten {{ }}). Rydder
 * opp doble mellomrom som oppstår der en setning ble fjernet midt i en linje,
 * og mellomrom som blir stående foran tegnsetting når setningen sto rett foran
 * den ("... legen har skrevet {{(...)}}." ga tidligere "... skrevet .").
 */
export function replaceOptionalGroups(
  text: string,
  isRemoved: (occurrenceIndex: number) => boolean,
): string {
  if (!text) return text;
  let occurrence = -1;
  let removedAny = false;
  let result = text.replace(/\{\{([^{}/]+)\}\}( ?)/g, (match, inner: string, trailing: string) => {
    if (isReservedBraceToken(inner) || !inner.trim()) return match;
    occurrence += 1;
    if (isRemoved(occurrence)) {
      removedAny = true;
      return "";
    }
    return inner.trim() + trailing;
  });
  if (removedAny) {
    result = result
      .replace(/ {2,}/g, " ")
      .replace(/ +([.,;:!?])/g, "$1")
      .replace(/ +$/gm, "");
  }
  return result;
}

export function templateHasKlokkeslettDagToken(text: string): boolean {
  return /\{\{\s*KLOKKESLETT_DAG\s*\}\}|\bKLOKKESLETT_DAG\b/i.test(text ?? "");
}

// For forhåndsvisning i frasemodus ("i løpet av dagen"): fjern «(innen) klokken/kl.»
// rett foran tokenet, men BEHOLD selve tokenet så det fortsatt vises som chip.
// Speiler prefiks-fjerningen i replaceKlokkeslettDagTokens slik at preview og
// kopiert tekst blir like.
export function stripKlokkenPrefixBeforeToken(text: string): string {
  if (!text) return text;
  return text.replace(
    /\b(?:innen\s+)?(?:klokken|klokka|kl\.?)\s+(\{\{\s*KLOKKESLETT_DAG\s*\}\}|\bKLOKKESLETT_DAG\b)/gi,
    "$1",
  );
}

export function replaceKlokkeslettDagTokens(text: string, value: string): string {
  if (!text) return text;
  const v = value ?? "";
  const tokenRe = /\{\{\s*KLOKKESLETT_DAG\s*\}\}|\bKLOKKESLETT_DAG\b/gi;

  // Frasemodus (verdien starter ikke med et siffer, f.eks. "i løpet av dagen"):
  // fjern «(innen) klokken/kl.» rett foran tokenet så setningen leser naturlig
  // («... ber vi om tilbakemelding i løpet av dagen.»). Vanlige klokkeslett
  // ("14 i dag") starter med siffer og beholder «innen klokken» uendret.
  const isPhrase = v.trim().length > 0 && !/^\d/.test(v.trim());
  if (isPhrase) {
    const withPrefix =
      /\b(?:innen\s+)?(?:klokken|klokka|kl\.?)\s+(?:\{\{\s*KLOKKESLETT_DAG\s*\}\}|\bKLOKKESLETT_DAG\b)/gi;
    return text.replace(withPrefix, v).replace(tokenRe, v);
  }

  return text.replace(tokenRe, v);
}

export function migrateLegacyClockTallTokens(text: string): string {
  if (!text) return text;
  // Migrate legacy templates like "klokken TALL" / "kl TALL1" to the explicit clock token.
  return text.replace(
    /\b(klokken|kl)\.?\s+(?:\{\{\s*TALL\d*\s*\}\}|\bTALL\d*\b)/gi,
    (_m, prefix: string) => `${prefix} KLOKKESLETT_DAG`,
  );
}

// New helpers for DATO tokens
export function replaceNextDatoToken(text: string, value: string) {
  // Replace ONLY the next (first) occurrence.
  // Supports {{DATO}} and DATO
  return text.replace(tokenRegex("DATO"), value);
}

export function replaceDatoTokens(text: string, value: string) {
  // Replace ALL occurrences.
  // Supports {{DATO}} and DATO
  return text.replace(tokenRegex("DATO", "", "g"), value);
}

export function templateHasDatoToken(text: string): boolean {
  return tokenRegex("DATO").test(text);
}

export function templateHasDatoMndToken(text: string): boolean {
  return tokenRegex("DATO_MND").test(text ?? "");
}

export function getFormuleringTokenIndices(text: string): number[] {
  const indices = new Set<number>();

  const re = tokenRegex("FORMULERING", "(\\d*)", "g");
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
    return text.replace(tokenRegex("FORMULERING", "", "g"), safeValue);
  }

  const re = tokenRegex("FORMULERING", String(index), "g");
  return text.replace(re, safeValue);
}

export function replaceDatoMndTokens(text: string, value: string) {
  if (!text) return text;
  return text.replace(tokenRegex("DATO_MND", "", "g"), value);
}

export function replaceNextDatoMndToken(text: string, value: string) {
  if (!text) return text;
  return text.replace(tokenRegex("DATO_MND"), value);
}

export function usePreparatRows() {
  const [preparatRows, setPreparatRows] = useState<PreparatRow[]>([
    {
      id: 0,
      picked: null,
      pickedKey: null,
      baseText: null,
      fullName: null,
      manufacturer: null,
      packSize: null,
    },
  ]);

  const addPreparatRow = useCallback(() => {
    setPreparatRows((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          picked: null,
          pickedKey: null,
          baseText: null,
          fullName: null,
          manufacturer: null,
          packSize: null,
        },
      ];
    });
  }, []);

  const removePreparatRow = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length
        ? next
        : [
            {
              id: 0,
              picked: null,
              pickedKey: null,
              baseText: null,
              fullName: null,
              manufacturer: null,
              packSize: null,
            },
          ];
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
              baseText: picked ? r.baseText : null,
              fullName: picked ? r.fullName : null,
              manufacturer: picked ? r.manufacturer : null,
              packSize: picked ? r.packSize : null,
            }
          : r,
        ),
      );
    },
    [],
  );

  const resetPreparatRows = useCallback(() => {
    setPreparatRows([
      {
        id: 0,
        picked: null,
        pickedKey: null,
        baseText: null,
        fullName: null,
        manufacturer: null,
        packSize: null,
      },
    ]);
  }, []);

  const clearPreparats = useCallback(() => {
    setPreparatRows([
      {
        id: 0,
        picked: null,
        pickedKey: null,
        baseText: null,
        fullName: null,
        manufacturer: null,
        packSize: null,
      },
    ]);
  }, []);

  const addPickedPreparat = useCallback(
    (
      picked: string,
      pickedKey?: string | null,
      meta?: {
        baseText?: string | null;
        fullName?: string | null;
        manufacturer?: string | null;
        packSize?: string | null;
      },
    ) => {
      setPreparatRows((prev) => {
        const key = String((pickedKey ?? picked).trim());

        const alreadyPicked = prev
          .map((r) => r.pickedKey ?? r.picked)
          .filter(Boolean)
          .includes(key);

        if (alreadyPicked) return prev;

        const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
        const kept = prev.filter((r) => r.picked);
        return [
          ...kept,
          {
            id: nextId,
            picked,
            pickedKey: key,
            baseText: meta?.baseText ?? null,
            fullName: meta?.fullName ?? null,
            manufacturer: meta?.manufacturer ?? null,
            packSize: meta?.packSize ?? null,
          },
        ];
      });
    },
    [],
  );

  const removePreparatById = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      return remaining.length > 0
        ? remaining
        : [
            {
              id: 0,
              picked: null,
              pickedKey: null,
              baseText: null,
              fullName: null,
              manufacturer: null,
              packSize: null,
            },
          ];
    });
  }, []);

  const reformatPickedPreparats = useCallback(
    (
      formatter: (row: Pick<PreparatRow, "picked" | "baseText" | "fullName" | "manufacturer" | "packSize">) =>
        | string
        | null,
    ) => {
      setPreparatRows((prev) =>
        prev.map((row) => {
          if (!row.picked) return row;
          const nextPicked = formatter(row);
          return { ...row, picked: (nextPicked ?? row.picked).trim() };
        }),
      );
    },
    [],
  );

  return {
    preparatRows,
    addPreparatRow,
    removePreparatRow,
    setPickedForRow,
    resetPreparatRows,
    clearPreparats,
    addPickedPreparat,
    removePreparatById,
    reformatPickedPreparats,
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
  { label: "DEN_DE", insert: "DEN_DE", help: "Setter inn den (1 preparat) eller de (flere preparater)", group: "PREPARAT" },
  { label: "DOSERING", insert: "DOSERING", help: "Fri tekst for dosering (f.eks. «2 tabletter daglig» eller «2-3 doser inntil 4 ganger daglig»)", group: "ANNET" },
  { label: "DOSERING1", insert: "DOSERING1", help: "Dosering for preparat 1", group: "ANNET" },
  { label: "DOSERING2", insert: "DOSERING2", help: "Dosering for preparat 2", group: "ANNET" },
  { label: "FORMULERING", insert: "FORMULERING", help: "Fri tekst (f.eks. tablett/kapsel/nesespray)", group: "ANNET" },
  { label: "FORMULERING1", insert: "FORMULERING1", help: "Formulering for preparat 1", group: "ANNET" },
  { label: "FORMULERING2", insert: "FORMULERING2", help: "Formulering for preparat 2", group: "ANNET" },
  { label: "KLOKKESLETT_DAG", insert: "KLOKKESLETT_DAG", help: "Klokkeslett med dag (f.eks. 11 i dag)", group: "ANNET" },

  { label: "TALL", insert: "TALL", help: "Første tall", group: "TALL" },
  { label: "TALL1", insert: "TALL1", help: "Andre tall", group: "TALL" },
  { label: "PAKKE", insert: "PAKKE", help: "Skriver «pakke»/«pakker» ut fra tallet foran", group: "TALL" },
  {
    label: "VALGFRI SETNING",
    insert: "{{Denne setningen kan velges bort.}}",
    help: "Setning i {{ }} kan velges bort før kopiering",
    group: "ANNET",
  },

  { label: "VAREN(E)", insert: "VAREN(E)", group: "VARE" },
  { label: "MEDISIN(ENE)", insert: "MEDISIN(ENE)", help: "Setter inn medisinen (1 preparat) eller medisinene (flere preparater)", group: "VARE" },

  { label: "DATO", insert: "DATO", help: "Dato (DD.MM.YYYY)", group: "ANNET" },
  { label: "DATO_MND", insert: "DATO_MND", help: "Måned/år (MM.YYYY)", group: "ANNET" },
];
