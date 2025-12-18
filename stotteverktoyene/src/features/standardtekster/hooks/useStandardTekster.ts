

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

export function useStandardTekster(): UseStandardTeksterResult {
  const [items, setItems] = useState<StandardTekst[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent state updates after unmount / stale reloads
  const runIdRef = useRef(0);

  const reload = useCallback(async () => {
    const runId = ++runIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const mapped = await standardTeksterApi.fetchAll();
      if (runId !== runIdRef.current) return;

      setItems(mapped);
      setSelectedId((prev) => prev ?? mapped[0]?.id ?? null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved henting fra Firebase";
      if (runId !== runIdRef.current) return;
      setError(message);
    } finally {
      if (runId !== runIdRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    return () => {
      // Invalidate any in-flight reload
      runIdRef.current++;
    };
  }, [reload]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) => {
      const haystack = `${it.title} ${it.category ?? ""} ${it.content}`.toLowerCase();
      return haystack.includes(s);
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