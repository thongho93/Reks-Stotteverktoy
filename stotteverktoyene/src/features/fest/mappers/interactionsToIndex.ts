// Builds a fast lookup index for FEST interaction data (interactions.json)
// Goal: autocomplete + quick matching without scanning the whole JSON each time.

export type InteractionIndex = ReturnType<typeof buildInteractionsIndex>;

export type InteractionJson = {
  oppfId?: string | null;
  tidspunkt?: string | null;
  status?: { v?: string | null; dn?: string | null } | null;
  interaksjonId?: string | null;
  relevans?: { v?: string | null; dn?: string | null } | null;
  kliniskKonsekvens?: string | null;
  interaksjonsmekanisme?: string | null;
  kildegrunnlag?: { v?: string | null; dn?: string | null } | null;
  handtering?: string | null;
  visningsregler?: Array<{ v?: string | null; dn?: string | null; s?: string | null }>;
  referanser?: Array<{ kilde?: string | null; lenke?: string | null }>;
  substansgrupper?: Array<{
    navn?: string | null;
    substanser?: Array<{
      substans?: string | null;
      atc?: { v?: string | null; dn?: string | null; s?: string | null } | null;
    }>;
  }>;
};

export type InteractionEntity = {
  // What we show in the autocomplete list
  label: string;
  // Normalized key used for matching on name
  key: string;
  // Optional ATC code (normalized to upper-case, no spaces)
  atc?: string;
};

export type InteractionOccurrence = {
  interactionIndex: number;
  groupIndex: number;
  // normalized name key
  key: string;
  // optional atc
  atc?: string;
  // original label (best effort)
  label: string;
};

export type BuiltInteraction = {
  // keep original fields you need for UI
  interaksjonId: string | null;
  relevansDn: string | null;
  relevansV: string | null;
  kliniskKonsekvens: string | null;
  interaksjonsmekanisme: string | null;
  handtering: string | null;
  // for mapping back to pair display
  substansgrupper: Array<{
    navn: string | null;
    substanser: Array<{ substans: string | null; atc: string | null }>;
  }>;
};

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\u00b5/g, "u"); // µ -> u (rare here, but keeps it robust)
}

export function normalizeAtc(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "").trim();
}

function uniqPush<T>(arr: T[], seen: Set<string>, key: string, value: T) {
  if (seen.has(key)) return;
  seen.add(key);
  arr.push(value);
}

export function buildInteractionsIndex(interactions: InteractionJson[]) {
  // termIndex maps BOTH name keys and ATC codes to occurrences.
  // - name key: normalizeText(substans)
  // - atc key:  normalizeAtc(code)
  const termIndex = new Map<string, InteractionOccurrence[]>();

  // Entities shown in autocomplete (deduped)
  const entities: InteractionEntity[] = [];
  const entitySeen = new Set<string>();

  // Keep a UI-friendly interaction list
  const interactionList: BuiltInteraction[] = [];

  const addOcc = (term: string, occ: InteractionOccurrence) => {
    const list = termIndex.get(term);
    if (list) list.push(occ);
    else termIndex.set(term, [occ]);
  };

  const addAtcPrefixes = (atc: string, occ: InteractionOccurrence) => {
    const code = normalizeAtc(atc);

    // Index full ATC plus all prefixes so class codes match children.
    // Example: N02AA01 -> N, N0, N02, N02A, N02AA, N02AA0, N02AA01
    for (let i = 1; i <= code.length; i++) {
      addOcc(code.slice(0, i), occ);
    }
  };

  interactions.forEach((raw, interactionIndex) => {
    const substansgrupper = (raw.substansgrupper ?? []).map((g) => ({
      navn: g?.navn ?? null,
      substanser: (g?.substanser ?? []).map((s) => ({
        substans: s?.substans ?? null,
        atc: s?.atc?.v ? normalizeAtc(s.atc.v) : null,
      })),
    }));

    interactionList.push({
      interaksjonId: raw.interaksjonId ?? null,
      relevansDn: raw.relevans?.dn ?? null,
      relevansV: raw.relevans?.v ?? null,
      kliniskKonsekvens: raw.kliniskKonsekvens ?? null,
      interaksjonsmekanisme: raw.interaksjonsmekanisme ?? null,
      handtering: raw.handtering ?? null,
      substansgrupper,
    });

    substansgrupper.forEach((group, groupIndex) => {
      group.substanser.forEach((s) => {
        const label = (s.substans ?? "").toString().trim();
        if (!label) return;

        const key = normalizeText(label);
        const atc = s.atc ?? undefined;

        // 1) Autocomplete entity (dedupe by ATC if present else by key)
        const entityUniqKey = atc ? `atc:${atc}` : `name:${key}`;
        uniqPush(entities, entitySeen, entityUniqKey, {
          label,
          key,
          atc,
        });

        // 2) Occurrence for lookup
        const occ: InteractionOccurrence = {
          interactionIndex,
          groupIndex,
          key,
          atc,
          label,
        };

        // index by name key
        addOcc(key, occ);

        // index by ATC, including prefixes (N, N0, N02, N02A, ...)
        if (atc) addAtcPrefixes(atc, occ);
      });
    });
  });

  // Sort entities so the list feels stable (name asc). ATC-only entries still have label.
  entities.sort((a, b) => a.label.localeCompare(b.label, "nb"));

  return {
    entities,
    termIndex,
    interactions: interactionList,
  };
}

export type MatchResult = {
  interactionIndex: number;
  matchedGroups: number[]; // unique group indices matched
  // map groupIndex -> selected terms that hit that group (useful for displaying "(søkeinput ...)" )
  groupToSelectedTerms: Record<number, string[]>;
};

// Returns interactions that have matches in at least 2 distinct substansgrupper.
export function matchInteractionsBySelectedTerms(
  index: InteractionIndex,
  selectedTerms: string[]
): MatchResult[] {
  const looksLikeAtc = (t: string) => /^[A-Za-z]\d{2}[A-Za-z0-9]*$/.test(t.trim());

  const selected = selectedTerms
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (looksLikeAtc(t) ? normalizeAtc(t) : normalizeText(t)));

  const perInteraction = new Map<number, { groups: Set<number>; groupToTerms: Map<number, Set<string>> }>();

  const getOccurrences = (term: string): InteractionOccurrence[] => {
    const direct = index.termIndex.get(term);
    if (direct && direct.length > 0) return direct;

    // Fallback: ATC group expansion (N02A -> N02A*).
    // Note: you already index ATC prefixes in buildInteractionsIndex, so this is
    // mostly a safety net if the prefix key is missing for any reason.
    if (/^[A-Z]\d{2}[A-Z0-9]*$/.test(term)) {
      const out: InteractionOccurrence[] = [];
      for (const [key, list] of index.termIndex.entries()) {
        if (!/^[A-Z]\d{2}[A-Z0-9]*$/.test(key)) continue;
        if (!key.startsWith(term)) continue;
        if (list?.length) out.push(...list);
      }
      return out;
    }

    return [];
  };

  for (const term of selected) {
    const occs = getOccurrences(term);
    if (!occs || occs.length === 0) continue;

    for (const occ of occs) {
      let entry = perInteraction.get(occ.interactionIndex);
      if (!entry) {
        entry = { groups: new Set<number>(), groupToTerms: new Map<number, Set<string>>() };
        perInteraction.set(occ.interactionIndex, entry);
      }

      entry.groups.add(occ.groupIndex);
      const set = entry.groupToTerms.get(occ.groupIndex) ?? new Set<string>();
      set.add(term);
      entry.groupToTerms.set(occ.groupIndex, set);
    }
  }

  const results: MatchResult[] = [];

  for (const [interactionIndex, entry] of perInteraction.entries()) {
    if (entry.groups.size < 2) continue;

    const matchedGroups = Array.from(entry.groups).sort((a, b) => a - b);
    const groupToSelectedTerms: Record<number, string[]> = {};

    for (const gi of matchedGroups) {
      groupToSelectedTerms[gi] = Array.from(entry.groupToTerms.get(gi) ?? []).sort();
    }

    results.push({
      interactionIndex,
      matchedGroups,
      groupToSelectedTerms,
    });
  }

  // Most relevant first: optionally sort by relevansV (lower seems more severe? depends on FEST);
  // For now, stable by interactionIndex.
  results.sort((a, b) => a.interactionIndex - b.interactionIndex);

  return results;
}