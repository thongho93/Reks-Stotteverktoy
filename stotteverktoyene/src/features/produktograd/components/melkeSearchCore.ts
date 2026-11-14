// ─── Søkemotor for Melkeerstatning (ren logikk, uten visning) ────────────────
// Ett eller flere ord søkes i alle tekstene som vises for et produkt. Et ord treffer når det
// står i begynnelsen av et ord i teksten («sonde» treffer «sondeernæring»), uavhengig av store
// bokstaver og aksenter.

export type SearchMode = "all" | "any";

/** Ett stykke tekst som er synlig i produktvisningen. `tab` er undertabben (0–4), eller -1 for produkthodet. */
export type SearchField = { tab: number; label: string; text: string };

export const HIT_BG = "#FFEFA8";
export const HIT_NOW_BG = "#FFD84D";
export const HIT_NOW_SHADOW = "0 0 0 2px #A81F66";

/** Små bokstaver uten aksenter, med samme lengde som teksten (så posisjonene kan brukes i originalen). */
export const normalizeText = (value: string): string =>
  Array.from(value)
    .map((ch) => {
      const n = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
      return n.length === ch.length ? n : ch.toLowerCase();
    })
    .join("");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const IS_WORD_CHAR = /[\p{L}\p{N}]/u;

/** Områdene i `text` som treffer ett av ordene. Treffet utvides til slutten av ordet. */
export function findRanges(text: string, terms: string[]): [number, number][] {
  const normalized = normalizeText(text);
  const ranges: [number, number][] = [];
  for (const term of terms) {
    const needle = normalizeText(term.trim());
    if (!needle) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}`, "gu");
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized))) {
      let end = match.index + match[0].length;
      while (end < normalized.length && IS_WORD_CHAR.test(normalized[end])) end += 1;
      ranges.push([match.index, end]);
      if (match[0].length === 0) re.lastIndex += 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

export const countHits = (text: string, terms: string[]): number => (terms.length ? findRanges(text, terms).length : 0);

/** Deler en skrevet tekst i søkeord. Ord i «anførselstegn» holdes sammen som én frase. */
export function parseTokens(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    const token = (match[1] ?? match[2] ?? "").replace(/"/g, "").trim();
    if (token) out.push(token);
  }
  return out;
}

export type SearchableProduct = { id: string; fields: SearchField[] };

export type TermSnippet = { term: string; label: string; text: string; negated: boolean };

export type ProductMatch = {
  id: string;
  matched: string[];
  missing: string[];
  total: number;
  snippets: TermSnippet[];
};

function makeSnippet(text: string, term: string): { text: string; negated: boolean } {
  const range = findRanges(text, [term])[0];
  if (!range) return { text, negated: false };
  const WINDOW = 70;
  let start = Math.max(0, range[0] - WINDOW);
  let end = Math.min(text.length, range[1] + WINDOW);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < range[0]) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > range[1]) end = space;
  }
  const slice = text.slice(start, end);
  const negated = /\bikke\b|\buten\b/.test(normalizeText(text.slice(Math.max(0, range[0] - 30), range[1] + 10)));
  return { text: `${start > 0 ? "… " : ""}${slice}${end < text.length ? " …" : ""}`, negated };
}

export function rankProducts(items: SearchableProduct[], terms: string[]): ProductMatch[] {
  if (terms.length === 0) return [];
  const results: ProductMatch[] = [];
  for (const item of items) {
    const matched: string[] = [];
    const missing: string[] = [];
    const snippets: TermSnippet[] = [];
    for (const term of terms) {
      const field = item.fields.find((f) => countHits(f.text, [term]) > 0);
      if (field) {
        matched.push(term);
        const snippet = makeSnippet(field.text, term);
        snippets.push({ term, label: field.label, text: snippet.text, negated: snippet.negated });
      } else {
        missing.push(term);
      }
    }
    if (matched.length === 0) continue;
    const total = item.fields.reduce((sum, f) => sum + countHits(f.text, terms), 0);
    results.push({ id: item.id, matched, missing, total, snippets });
  }
  return results.sort((a, b) => b.matched.length - a.matched.length || b.total - a.total);
}

export type SearchProductInfo = { id: string; name: string; meta: string; image?: string };

export const SUGGESTION_GROUPS: { label: string; words: string[] }[] = [
  { label: "Egenskap", words: ["Laktosefri", "Glutenfri", "Hydrolysert", "Aminosyrebasert", "Halal", "Kosher", "GOS/FOS", "DHA", "Nukleotider", "HMO"] },
  { label: "Produsent", words: ["Nutricia", "Nestlé"] },
  { label: "Alder", words: ["0–6 måneder", "fra 6 måneder", "0–12 måneder", "0–1 år", "fra 1 år", "fast føde"] },
  { label: "Bruk", words: ["Sondeernæring", "Matlaging", "Eneste næringskilde", "Tilskudd", "Tåteflaske"] },
  { label: "Tilstand", words: ["Kumelkallergi", "Multimatvareallergi", "Refluks", "Tarm", "Malabsorpsjon", "Parenteral"] },
];

export const SUGGESTION_EXAMPLES = ["laktosefri sonde", "hydrolysert glutenfri", "refluks", "halal", "840659"];

