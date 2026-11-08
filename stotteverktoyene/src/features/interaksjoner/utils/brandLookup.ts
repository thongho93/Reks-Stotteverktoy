// Slår opp preparatnavn (f.eks. «Cipralex») til virkestoff og ATC, slik at en tekst som
// nevner Cipralex også regnes som treff når man har søkt på escitalopram.
//
// Kilden er preparat-entitetene i interaksjonsindeksen (bygget fra meds.json): hvert
// preparat har virkestoffet som `key` og ATC-koden som `atc`.
import { normalizeText, type InteractionIndex } from "../../fest/mappers/interactionsToIndex";

export type BrandInfo = {
  /** Normalisert virkestoffnavn (kan bestå av flere ord, f.eks. «kodein og paracetamol»). */
  key: string;
  atc?: string;
};

type BrandIndex = Map<string, BrandInfo[]>;

const PRODUCT_SUFFIX_RE = /\s*\(preparatnavn\)\s*$/i;
const cache = new WeakMap<object, BrandIndex>();

function getBrandIndex(index: InteractionIndex): BrandIndex {
  const cached = cache.get(index);
  if (cached) return cached;

  const map: BrandIndex = new Map();
  const add = (name: string, info: BrandInfo) => {
    const list = map.get(name);
    if (list) {
      if (!list.some((b) => b.key === info.key && b.atc === info.atc)) list.push(info);
    } else {
      map.set(name, [info]);
    }
  };

  for (const e of index.entities) {
    if (e.kind !== "product") continue;
    const name = normalizeText(e.label.replace(PRODUCT_SUFFIX_RE, ""));
    if (!name) continue;
    const info: BrandInfo = { key: e.key, atc: e.atc };
    add(name, info);

    // «Escitalopram Actavis» og «Cipralex Meltz» finnes også under første ord.
    const first = name.split(/[\s-]+/)[0];
    if (first && first !== name && first.length >= 4) add(first, info);
  }

  cache.set(index, map);
  return map;
}

/** Preparater (og deres virkestoff/ATC) som heter `word`. Tom liste hvis ukjent. */
export function lookupBrand(index: InteractionIndex, word: string): BrandInfo[] {
  return getBrandIndex(index).get(normalizeText(word)) ?? [];
}
