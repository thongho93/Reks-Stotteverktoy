import * as React from "react";
import type { StandardtekstDoc } from "../utils/standardtekster";
import { fetchStandardtekster } from "../services/standardtekster";

type UseStandardteksterResult = {
  standardtekster: StandardtekstDoc[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useStandardtekster(): UseStandardteksterResult {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [standardtekster, setStandardtekster] = React.useState<StandardtekstDoc[]>([]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStandardtekster();
      setStandardtekster(rows);
    } catch (e: any) {
      setError(e?.message ?? "Kunne ikke hente standardtekster.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return {
    standardtekster,
    loading,
    error,
    reload,
  };
}
