export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Søketermer uten #tag-termer. */
export function getHighlightTerms(query: string): string[] {
  return query
    .toLocaleLowerCase("nb-NO")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !t.startsWith("#"));
}

/** Utdrag rundt første treff, slik at treff dypt i lang tekst også vises i kortet. */
export function snippetAround(text: string, terms: string[], maxLength = 220): string {
  if (terms.length === 0 || text.length <= maxLength) return text;
  const lower = text.toLocaleLowerCase("nb-NO");
  const positions = terms.map((t) => lower.indexOf(t)).filter((p) => p >= 0);
  if (positions.length === 0) return text;
  const first = Math.min(...positions);
  if (first < maxLength - 60) return text;
  const start = Math.max(0, first - 60);
  return `…${text.slice(start, start + maxLength)}`;
}
