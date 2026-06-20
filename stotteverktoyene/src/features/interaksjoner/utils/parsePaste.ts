// Steg 1 (prototype): tolk en innlimt interaksjonslinje til søkbare termer.
//
// Eksempel på input som limes inn (f.eks. fra ekspedisjonssystem/FEST):
//   "Bør unngås Escitalopram N06A B10 Ikke-selektive monoaminreopptakshemmere N06A A"
//
// Vi plukker ut ATC-koder (også når de er splittet med mellomrom, som "N06A B10")
// og virkestoff-/gruppenavn, og mater dem inn i den eksisterende FEST-matcheren.
import {
  normalizeAtc,
  normalizeText,
  type InteractionEntity,
  type InteractionIndex,
} from "../../fest/mappers/interactionsToIndex";

export type ParsedSubstance = { name?: string; atc?: string };

// Ledende alvorlighetsgrad strippes bort før navne-tolking.
const SEVERITY_PREFIXES = [
  "bør unngås",
  "forholdsregler bør tas",
  "forholdsregler",
  "ingen tiltak",
  "kan brukes",
];

// Et token som kan STARTE en ATC-kode: bokstav + 2 sifre + (valgfritt) bokstaver/sifre.
const ATC_START_RE = /^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/;
// Et fortsettelses-fragment når ATC er splittet av mellomrom: "B10", "AA", "A", "10".
const ATC_CONT_RE = /^(?:[A-Z]{1,2}\d{0,2}|\d{2})$/;
// Gyldig (del)ATC etter sammenslåing.
const ATC_SHAPE_RE = /^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/;

// ATC-nivåene vi godtar: 3 (gruppe), 4 (farmakologisk), 5 (kjemisk undergruppe), 7 (substans).
// Lengde 1 (anatomisk hovedgruppe) er for bred til å være nyttig her.
function isAtcComplete(code: string): boolean {
  return [3, 4, 5, 7].includes(code.length) && ATC_SHAPE_RE.test(code);
}

export function parseInteractionPaste(input: string): ParsedSubstance[] {
  const raw = String(input ?? "").trim();
  if (!raw) return [];

  let text = raw.replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  for (const sev of SEVERITY_PREFIXES) {
    if (lower.startsWith(sev)) {
      text = text.slice(sev.length).trim();
      break;
    }
  }

  const tokens = text.split(/\s+/).filter(Boolean);

  const out: ParsedSubstance[] = [];
  let pendingName: string[] = [];

  const flushNameTo = (atc?: string) => {
    const name = pendingName.join(" ").trim() || undefined;
    pendingName = [];
    if (name || atc) out.push({ name, atc });
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].toUpperCase();

    if (ATC_START_RE.test(tok)) {
      // Slå sammen påfølgende fragmenter så lenge resultatet fortsatt er en gyldig ATC-form.
      let code = tok;
      let j = i + 1;
      while (j < tokens.length) {
        const next = tokens[j].toUpperCase();
        if (!ATC_CONT_RE.test(next)) break;
        const merged = code + next;
        if (merged.length > 7 || !ATC_SHAPE_RE.test(merged)) break;
        code = merged;
        j++;
      }

      if (isAtcComplete(code)) {
        flushNameTo(normalizeAtc(code));
        i = j - 1;
        continue;
      }

      // Lignet på en ATC, men var det ikke – behandle som et navne-ord.
      pendingName.push(tokens[i]);
      continue;
    }

    pendingName.push(tokens[i]);
  }

  // Etterslepende navn uten ATC (f.eks. når bruker limte inn bare virkestoffnavn).
  if (pendingName.length) flushNameTo(undefined);

  return out.filter((p) => p.name || p.atc);
}

// Greedy: trekk ut kjente substanser/gruppenavn fra en ordrekke (lengste treff først).
function greedyResolveNames(words: string[], index: InteractionIndex): string[] {
  const resolved: string[] = [];
  let q = 0;
  while (q < words.length) {
    let hit = false;
    for (let j = words.length; j > q; j--) {
      const phrase = words.slice(q, j).join(" ");
      if (index.termIndex.has(normalizeText(phrase))) {
        resolved.push(phrase);
        q = j;
        hit = true;
        break;
      }
    }
    if (!hit) q++;
  }
  return resolved;
}

// Gjør tolkede substanser om til entiteter som søke-UI-et bruker.
// Et navnefelt kan inneholde FLERE virkestoffer (uten ATC), f.eks.
// «Glyseroltrinitrat Sildenafil G04BE03» – da splittes de til egne termer.
// Vi foretrekker en ekte indeksert entitet (kanonisk label), ellers syntetiserer vi.
export function parsedToEntities(
  parsed: ParsedSubstance[],
  index: InteractionIndex
): InteractionEntity[] {
  const result: InteractionEntity[] = [];
  const seen = new Set<string>();

  const entityId = (e: InteractionEntity) =>
    e.id ?? (e.atc ? `atc:${e.atc}` : `name:${e.key}`);

  const addEntity = (e: InteractionEntity) => {
    const id = entityId(e);
    if (seen.has(id)) return;
    seen.add(id);
    result.push(e);
  };

  const nameOnlyEntity = (phrase: string): InteractionEntity => {
    const key = normalizeText(phrase);
    const found = index.entities.find((e) => e.kind !== "product" && e.key === key);
    return found ?? { id: `name:${key}`, label: phrase.trim(), key, kind: "substance" };
  };

  const atcEntity = (atc: string, label: string): InteractionEntity => {
    const found = index.entities.find(
      (e) => e.kind !== "product" && (e.atc ?? "").toUpperCase() === atc
    );
    return (
      found ?? {
        id: `atc:${atc}`,
        label: (label || atc).trim(),
        key: normalizeText(label || atc),
        atc,
        kind: "substance",
      }
    );
  };

  for (const p of parsed) {
    const atc = p.atc ? normalizeAtc(p.atc) : undefined;
    const nameWords = (p.name ?? "").split(/\s+/).filter(Boolean);
    const resolved = greedyResolveNames(nameWords, index);

    if (atc) {
      // Ledende navn (alle unntatt det siste) er egne virkestoffer uten ATC.
      const leading = resolved.length >= 2 ? resolved.slice(0, -1) : [];
      for (const ph of leading) addEntity(nameOnlyEntity(ph));
      const atcLabel = resolved.length ? resolved[resolved.length - 1] : (p.name ?? "").trim();
      addEntity(atcEntity(atc, atcLabel));
    } else if (resolved.length) {
      for (const ph of resolved) addEntity(nameOnlyEntity(ph));
    } else if ((p.name ?? "").trim()) {
      addEntity(nameOnlyEntity((p.name ?? "").trim()));
    }
  }

  return result;
}
