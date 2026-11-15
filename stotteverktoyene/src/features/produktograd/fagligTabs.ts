import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { MELKE_TAB_ID, NUTRITION_TAB_ID } from "./queryKeys";

// Faste faner i Produkt og råd (ikke lagret i Firestore).
export const MIGRENE_TAB_ID = "__migrene__";

export const VIRTUAL_SIDEBAR_IDS = [NUTRITION_TAB_ID, MELKE_TAB_ID, "__tryggmamma__", "__knuse__", MIGRENE_TAB_ID] as const;

export const VIRTUAL_TAB_LABELS: Record<string, string> = {
  [NUTRITION_TAB_ID]: "Næringsmidler",
  [MELKE_TAB_ID]: "Melkeerstatning",
  __tryggmamma__: "Tryggmamma",
  __knuse__: "Knuse-/delelisten",
  [MIGRENE_TAB_ID]: "Migrene",
};

export const FAGLIG_SIDEBAR_ORDER_KEY = "faglig-sidebar-order";

export function isVirtualTabId(id: string | null | undefined): boolean {
  return (VIRTUAL_SIDEBAR_IDS as readonly string[]).includes(id ?? "");
}

/**
 * Rekkefølgen på alle dokumentfaner (faste og egne). Faste faner som mangler i en gammel lagret
 * rekkefølge settes først, nye dokumenter sist.
 */
export function orderTabIds(docIds: string[], saved: string[]): string[] {
  const allIds: string[] = [...VIRTUAL_SIDEBAR_IDS, ...docIds];
  const kept = saved.filter((id) => allIds.includes(id));
  const missingBuiltIn = VIRTUAL_SIDEBAR_IDS.filter((id) => !kept.includes(id));
  const missingDocs = allIds.filter((id) => !kept.includes(id) && !(missingBuiltIn as string[]).includes(id));
  return [...missingBuiltIn, ...kept, ...missingDocs];
}

export function readSavedTabOrder(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAGLIG_SIDEBAR_ORDER_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export type FagligDocTitle = { id: string; title: string };

/** Egne dokumentfaner (tittel og id) – brukes av sidemenyen. */
export function useFagligDocTitles(uid: string | undefined): FagligDocTitle[] {
  const [docs, setDocs] = useState<FagligDocTitle[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "fagligDocuments"), orderBy("updatedAtMs", "desc")),
      (snapshot) =>
        setDocs(
          snapshot.docs.map((snap) => ({
            id: snap.id,
            title: String(snap.data().title ?? "Nytt dokument").trim() || "Nytt dokument",
          }))
        ),
      () => setDocs([])
    );
    return () => unsub();
  }, [uid]);

  return uid ? docs : [];
}
