

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
    const cached = readCachedItems();
    if (cached?.length) {
      setItems(cached);
      setSelectedId((prev) => {
        if (prev && cached.some((it) => it.id === prev)) return prev;
        return null;
      });
      setLoading(false);
      void reloadFromServer(false);
    } else {
      void reloadFromServer(true);
    }

    return () => {
      // Invalidate any in-flight reload
      runIdRef.current++;
    };
  }, [reloadFromServer]);

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
