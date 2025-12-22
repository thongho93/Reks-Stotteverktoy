export type StandardtekstDoc = {
  id: string;
  title?: string;
  tittel?: string;
  navn?: string;
  updatedAt?: unknown;
  interactionIds?: string[];
};

export function normalizeStandardtekstTitle(s: StandardtekstDoc) {
  return s.title?.trim() || s.tittel?.trim() || s.navn?.trim() || s.id;
}