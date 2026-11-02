

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StandardTekst } from "../types";
import { standardTeksterApi } from "../services/standardTeksterApi";

type UseStandardTeksterResult = {
  items: StandardTekst[];
  setItems: React.Dispatch<React.SetStateAction<StandardTekst[]>>;

  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;

  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;

  loading: boolean;
  error: string | null;

  filtered: StandardTekst[];
  selected: StandardTekst | null;

  reload: () => Promise<void>;
};

const STANDARDTEKSTER_CACHE_KEY = "standardtekster.sidebar.cache.v1";
const STANDARDTEKSTER_CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache:
  | {
      items: StandardTekst[];
      ts: number;
    }
  | null = null;

// Sammenligner to tekster på de feltene som faktisk vises/redigeres. updatedAt
// utelates med vilje: den endres bare sammen med et annet felt (all lagring
// setter både updatedAt OG innhold/tittel/kategori/isActive), og å ta den med
// ville brutt referanse-gjenbruken for et ferskt, ulagret utkast der bare
// server-tidsstemplet skiller den optimistiske og den realtime-versjonen.
const sameStandardTekst = (a: StandardTekst, b: StandardTekst): boolean =>
  a.title === b.title &&
  a.content === b.content &&
  (a.category ?? "") === (b.category ?? "") &&
  a.isActive === b.isActive &&
  (a.updatedByName ?? "") === (b.updatedByName ?? "") &&
  JSON.stringify(a.followUps ?? null) === JSON.stringify(b.followUps ?? null);

// Behold objekt-referansen for uendrede tekster på tvers av realtime-oppdateringer.
// Da bytter `selected` kun identitet når nettopp DEN teksten endres – ellers ville
// et innkommende snapshot (utløst av at en annen tekst ble endret) nullstilt
// skjemaet (preparat/tall/formulering) hos en bruker midt i utfylling.
const reconcileItems = (
  prev: StandardTekst[],
  next: StandardTekst[],
): StandardTekst[] => {
  const prevById = new Map(prev.map((it) => [it.id, it]));
  let changed = prev.length !== next.length;

  const result = next.map((n) => {
    const p = prevById.get(n.id);
    if (p && sameStandardTekst(p, n)) return p;
    changed = true;
    return n;
  });

  if (!changed && result.every((it, i) => it === prev[i])) return prev;
  return result;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeCachedItems = (items: StandardTekst[]): StandardTekst[] =>
  items.map((it) => ({
    ...it,
    updatedAt: toDateOrNull((it as any).updatedAt),
  }));

const readCachedItems = (): StandardTekst[] | null => {
  const now = Date.now();

  if (memoryCache && now - memoryCache.ts < STANDARDTEKSTER_CACHE_TTL_MS) {
    return normalizeCachedItems(memoryCache.items);
  }

  try {
    const raw = sessionStorage.getItem(STANDARDTEKSTER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; items?: StandardTekst[] };
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.ts !== "number") return null;
    if (now - parsed.ts >= STANDARDTEKSTER_CACHE_TTL_MS) return null;

    const normalizedItems = normalizeCachedItems(parsed.items);
    memoryCache = { items: normalizedItems, ts: parsed.ts };
    return normalizedItems;
  } catch {
    return null;
  }
};

const writeCachedItems = (items: StandardTekst[]) => {
  const payload = { ts: Date.now(), items };
  memoryCache = payload;

  try {
    sessionStorage.setItem(STANDARDTEKSTER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache-write errors
  }
};

export async function readCachedOrFetchStandardTekster(): Promise<StandardTekst[]> {
  const now = Date.now();

  if (memoryCache && now - memoryCache.ts < STANDARDTEKSTER_CACHE_TTL_MS) {
    return normalizeCachedItems(memoryCache.items);
  }

  try {
    const raw = sessionStorage.getItem(STANDARDTEKSTER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { ts?: number; items?: StandardTekst[] };
      if (
        parsed &&
        Array.isArray(parsed.items) &&
        typeof parsed.ts === "number" &&
        now - parsed.ts < STANDARDTEKSTER_CACHE_TTL_MS
      ) {
        const normalized = normalizeCachedItems(parsed.items);
        memoryCache = { items: normalized, ts: parsed.ts };
        return normalized;
      }
    }
  } catch {
    // ignore cache read errors
  }

  const items = await standardTeksterApi.fetchAll();
  writeCachedItems(items);
  return items;
}

export function useStandardTekster(): UseStandardTeksterResult {
  const [items, setItems] = useState<StandardTekst[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent state updates after unmount / stale reloads
  const runIdRef = useRef(0);

  const reloadFromServer = useCallback(async (showLoading: boolean) => {
    const runId = ++runIdRef.current;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const mapped = await standardTeksterApi.fetchAll();
      if (runId !== runIdRef.current) return;

      setItems(mapped);
      writeCachedItems(mapped);
      setSelectedId((prev) => {
        if (prev && mapped.some((it) => it.id === prev)) return prev;
        return null;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved henting fra Firebase";
      if (runId !== runIdRef.current) return;
      setError(message);
    } finally {
      if (runId !== runIdRef.current) return;
      if (showLoading) setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await reloadFromServer(true);
  }, [reloadFromServer]);

  useEffect(() => {
    // Umiddelbar first paint fra cache mens realtime-abonnementet kobles opp.
    const cached = readCachedItems();
    if (cached?.length) {
      setItems(cached);
      setSelectedId((prev) => {
        if (prev && cached.some((it) => it.id === prev)) return prev;
        return null;
      });
      setLoading(false);
    }

    // Realtime: alle brukere ser nye/endrede/slettede tekster uten å laste siden
    // på nytt. reconcileItems beholder referanser for uendrede tekster.
    const unsubscribe = standardTeksterApi.subscribeAll(
      (mapped) => {
        setItems((prev) => reconcileItems(prev, mapped));
        writeCachedItems(mapped);
        // Nullstill valget kun hvis den valgte teksten faktisk er slettet.
        setSelectedId((prev) => (prev && !mapped.some((it) => it.id === prev) ? null : prev));
        setError(null);
        setLoading(false);
      },
      (e) => {
        const message = e instanceof Error ? e.message : "Ukjent feil ved henting fra Firebase";
        setError(message);
        setLoading(false);
      },
    );

    return () => {
      // Invalidate any in-flight reload og koble fra realtime-abonnementet.
      runIdRef.current++;
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) => {
      const category = (it.category ?? "").toLowerCase();
      const title = it.title.toLowerCase();
      const content = it.content.toLowerCase();
      const isInteraksjon = category === "interaksjon";

      if (isInteraksjon) {
        return title.includes(s);
      }

      return category.includes(s) || title.includes(s) || content.includes(s);
    });
  }, [items, search]);

  const selected = useMemo(() => {
    return items.find((it) => it.id === selectedId) ?? null;
  }, [items, selectedId]);

  return {
    items,
    setItems,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    loading,
    error,
    filtered,
    selected,
    reload,
  };
}
