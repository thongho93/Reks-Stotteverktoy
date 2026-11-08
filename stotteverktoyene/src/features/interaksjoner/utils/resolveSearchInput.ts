// Ett felt for alt: tolker tekst som er limt inn (eller skrevet + Enter) til
// søkbare entiteter, uansett om det er legemiddelnavn, virkestoff, ATC-kode,
// varenummer, en liste av disse, eller en hel interaksjonslinje fra FEST.
import {
  normalizeAtc,
  normalizeText,
  type InteractionEntity,
  type InteractionIndex,
} from "../../fest/mappers/interactionsToIndex";
import { parseInteractionPaste } from "./parsePaste";

export type ResolveResult = {
  entities: InteractionEntity[];
  /** Deler av teksten vi ikke klarte å koble til noe i interaksjonsdata. */
  unmatched: string[];
};

export const PRODUCT_SUFFIX_RE = /\s*\(preparatnavn\)\s*$/i;

export function getEntityId(entity: InteractionEntity): string {
  return entity.id ?? (entity.atc ? `atc:${entity.atc}` : `name:${entity.key}`);
}

// Ord som ikke er navn: bindeord og doseringsstøy («500 mg», «tabletter» …).
const STOPWORDS = new Set([
  "og", "med", "mot", "eller", "samt", "pluss", "for", "ved", "til", "fra",
]);
const NOISE_RE =
  /^(?:\d+(?:[.,]\d+)?|mg|g|mcg|µg|ug|mikrog|ml|iu|ie|stk|mg\/ml|tab|tabl|tabletter|tablett|kapsler|kapsel|kaps|depottabletter|mixtur|mikstur|injeksjon|inj|dråper|stikkpille|stikkpiller|plaster|oral|opløsning|oppløsning)$/i;
const SEVERITY_WORDS = new Set(["bør", "unngås", "forholdsregler", "tas", "ingen", "tiltak", "kan", "brukes"]);
const ATC_PREFIX_RE = /^[A-Z]\d{2}[A-Z0-9]{0,4}$/;

type Lookup = {
  byName: Map<string, InteractionEntity>;
  byAtc: Map<string, InteractionEntity>;
  names: Array<{ norm: string; entity: InteractionEntity }>;
};

const lookupCache = new WeakMap<object, Lookup>();

function getLookup(index: InteractionIndex): Lookup {
  const cached = lookupCache.get(index);
  if (cached) return cached;

  const byName = new Map<string, InteractionEntity>();
  const byAtc = new Map<string, InteractionEntity>();
  const names: Lookup["names"] = [];

  // Virkestoff først, slik at «Paracetamol» gir virkestoffet og ikke et preparat.
  const ordered = [
    ...index.entities.filter((e) => e.kind !== "product"),
    ...index.entities.filter((e) => e.kind === "product"),
  ];
  for (const e of ordered) {
    const norm = normalizeText(e.label.replace(PRODUCT_SUFFIX_RE, ""));
    if (!norm) continue;
    if (!byName.has(norm)) {
      byName.set(norm, e);
      names.push({ norm, entity: e });
    }
    if (e.kind !== "product" && e.atc && !byAtc.has(e.atc.toUpperCase())) {
      byAtc.set(e.atc.toUpperCase(), e);
    }
  }

  const built = { byName, byAtc, names };
  lookupCache.set(index, built);
  return built;
}

function nameOnlyEntity(label: string, index: InteractionIndex): InteractionEntity {
  const key = normalizeText(label);
  const found = index.entities.find((e) => e.kind !== "product" && e.key === key);
  return found ?? { id: `name:${key}`, label: label.trim(), key, kind: "substance" };
}

function atcEntity(atc: string, label: string, index: InteractionIndex): InteractionEntity {
  const lookup = getLookup(index);
  return (
    lookup.byAtc.get(atc) ?? {
      id: `atc:${atc}`,
      label: (label || atc).trim(),
      key: normalizeText(label || atc),
      atc,
      kind: "substance",
    }
  );
}

/** Slår opp en ordfrase: kjent entitet (virkestoff/preparat) eller gruppenavn i indeksen. */
function resolvePhrase(phrase: string, index: InteractionIndex): InteractionEntity | null {
  const norm = normalizeText(phrase.replace(PRODUCT_SUFFIX_RE, ""));
  if (!norm) return null;
  const hit = getLookup(index).byName.get(norm);
  if (hit) return hit;
  if (index.termIndex.has(norm)) return nameOnlyEntity(phrase, index);
  return null;
}

/** Entydig prefiks-treff («Escital» → Escitalopram) – kun når det finnes nøyaktig ett. */
function uniquePrefixMatch(word: string, index: InteractionIndex): InteractionEntity | null {
  const norm = normalizeText(word);
  if (norm.length < 5) return null;
  const matches = getLookup(index).names.filter((n) => n.norm.startsWith(norm));
  return matches.length === 1 ? matches[0].entity : null;
}

function resolveWords(
  words: string[],
  index: InteractionIndex,
  entities: InteractionEntity[],
  unmatched: string[],
  allowPrefix: boolean,
) {
  let q = 0;
  let pending: string[] = [];
  const flushPending = () => {
    const text = pending.join(" ").trim();
    pending = [];
    if (text) unmatched.push(text);
  };

  while (q < words.length) {
    // Lengste frase først, slik at «Kodein og paracetamol» vinner over «Kodein».
    let hit: InteractionEntity | null = null;
    let end = q;
    for (let j = Math.min(words.length, q + 6); j > q; j--) {
      const found = resolvePhrase(words.slice(q, j).join(" "), index);
      if (found) {
        hit = found;
        end = j;
        break;
      }
    }

    if (hit) {
      flushPending();
      entities.push(hit);
      q = end;
      continue;
    }

    const word = words[q];
    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower) || NOISE_RE.test(lower) || SEVERITY_WORDS.has(lower)) {
      q++;
      continue;
    }

    const prefix = allowPrefix ? uniquePrefixMatch(word, index) : null;
    if (prefix) {
      flushPending();
      entities.push(prefix);
    } else {
      pending.push(word);
    }
    q++;
  }
  flushPending();
}

/**
 * Tolker fritekst. Støtter:
 *  - varenummer (4–7 siffer)
 *  - ATC-kode eller -prefiks, også splittet med mellomrom («N06A B10»)
 *  - virkestoff-, gruppe- og preparatnavn (også med dose-støy, f.eks. «Paracet 500 mg»)
 *  - lister (linjeskift, komma, semikolon, pluss)
 *  - hele interaksjonslinjer fra FEST («Bør unngås Escitalopram N06A B10 …»)
 */
export function resolveSearchInput(
  text: string,
  index: InteractionIndex,
  resolveVnr: (digits: string) => InteractionEntity | null,
  opts: { allowPrefix?: boolean } = {},
): ResolveResult {
  const allowPrefix = opts.allowPrefix ?? true;
  const entities: InteractionEntity[] = [];
  const unmatched: string[] = [];

  const segments = String(text ?? "")
    .split(/[\n\r\t;,+]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const compact = segment.replace(/\s+/g, "");

    // 1) Varenummer
    if (/^\d{4,7}$/.test(compact)) {
      const e = resolveVnr(compact);
      if (e) entities.push(e);
      else unmatched.push(segment);
      continue;
    }

    // 2) Eksakt navn (virkestoff eller preparat)
    const exact = resolvePhrase(segment, index);
    if (exact) {
      entities.push(exact);
      continue;
    }

    // 3) Ren ATC-kode/-prefiks (også «C03A A»)
    const atcCandidate = normalizeAtc(segment);
    if (ATC_PREFIX_RE.test(atcCandidate)) {
      if (index.termIndex.has(atcCandidate)) {
        entities.push(atcEntity(atcCandidate, "", index));
      } else {
        unmatched.push(segment);
      }
      continue;
    }

    // 4) Resten: ATC-fragmenter + navn i samme tekst (typisk en FEST-linje).
    for (const p of parseInteractionPaste(segment)) {
      const words = (p.name ?? "").split(/\s+/).filter(Boolean);
      const found: InteractionEntity[] = [];
      resolveWords(words, index, found, unmatched, allowPrefix);

      if (p.atc) {
        // Alle navn foran ATC-en er egne virkestoffer; det siste hører til koden.
        const label = found.length ? found[found.length - 1].label.replace(PRODUCT_SUFFIX_RE, "") : "";
        for (const e of found.slice(0, -1)) entities.push(e);
        if (index.termIndex.has(p.atc)) entities.push(atcEntity(p.atc, label, index));
        else unmatched.push(p.atc);
      } else {
        entities.push(...found);
      }
    }
  }

  // Fjern duplikater, behold rekkefølgen.
  const seen = new Set<string>();
  const unique = entities.filter((e) => {
    const id = getEntityId(e);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { entities: unique, unmatched: Array.from(new Set(unmatched)) };
}
