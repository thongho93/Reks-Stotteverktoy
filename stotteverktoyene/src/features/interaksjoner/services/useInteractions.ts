

import * as React from "react";

import {
  buildInteractionsIndex,
  type InteractionIndex,
  type InteractionJson,
} from "../../fest/mappers/interactionsToIndex";

type State = {
  index: InteractionIndex | null;
  loading: boolean;
  error: string | null;
};

// Fetches interactions.json (recommended to place it in /public as /interactions.json)
// and builds a fast in-memory index for the interaction search UI.
export function useInteractions() {
  const [state, setState] = React.useState<State>({
    index: null,
    loading: true,
    error: null,
  });

  const reload = React.useCallback(() => {
    let isMounted = true;
    const controller = new AbortController();

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch("/interactions.json", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(
            `Klarte ikke å hente /interactions.json (HTTP ${res.status}). Legg filen i public/ eller sjekk path.`
          );
        }

        const data = (await res.json()) as InteractionJson[];
        const index = buildInteractionsIndex(data);

        if (!isMounted) return;
        setState({ index, loading: false, error: null });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        const msg =
          typeof e?.message === "string"
            ? e.message
            : "Ukjent feil ved lasting av interaksjonsdata.";

        if (!isMounted) return;
        setState({ index: null, loading: false, error: msg });
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Run once on mount
  React.useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return {
    index: state.index,
    loading: state.loading,
    error: state.error,
    reload,
  };
}