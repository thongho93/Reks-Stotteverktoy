

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

let cachedIndexPromise: Promise<InteractionIndex> | null = null;

// Single shared loader for interactions.json (~35 MB). The parsed index is cached in
// memory so the file is fetched, parsed and indexed at most once per session — shared
// across the Interaksjonssøk page (useInteractions) and global search (loadInteractionsIndex).
export function loadInteractionsIndex(forceReload = false): Promise<InteractionIndex> {
  if (forceReload) cachedIndexPromise = null;
  if (!cachedIndexPromise) {
    cachedIndexPromise = fetch("/interactions.json", {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Klarte ikke å hente /interactions.json (HTTP ${res.status}). Legg filen i public/ eller sjekk path.`
          );
        }
        return res.json() as Promise<InteractionJson[]>;
      })
      .then((data) => buildInteractionsIndex(data))
      .catch((e) => {
        cachedIndexPromise = null;
        throw e;
      });
  }
  return cachedIndexPromise;
}

// Builds a fast in-memory index for the interaction search UI, reusing the shared
// cached index so the monolith is never parsed twice.
export function useInteractions() {
  const [state, setState] = React.useState<State>({
    index: null,
    loading: true,
    error: null,
  });

  const load = React.useCallback((forceReload: boolean) => {
    let isMounted = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    loadInteractionsIndex(forceReload)
      .then((index) => {
        if (isMounted) setState({ index, loading: false, error: null });
      })
      .catch((e: any) => {
        const msg =
          typeof e?.message === "string"
            ? e.message
            : "Ukjent feil ved lasting av interaksjonsdata.";
        if (isMounted) setState({ index: null, loading: false, error: msg });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reload = React.useCallback(() => load(true), [load]);

  // Run once on mount
  React.useEffect(() => {
    const cleanup = load(false);
    return cleanup;
  }, [load]);

  return {
    index: state.index,
    loading: state.loading,
    error: state.error,
    reload,
  };
}