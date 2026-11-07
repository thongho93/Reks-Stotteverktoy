import * as React from "react";
import { collection, deleteDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { TRASH_RETENTION_MS, toLocalDateString } from "../utils/noteUtils";

const CHECK_INTERVAL_MS = 10 * 60_000;

/**
 * Vedlikehold av notater mens appen er åpen, uavhengig av hvilken side du står på:
 * 1) utløpt «slett automatisk»-dato (midnatt etter datoen) → flyttes til «Slettede notater»
 * 2) notater som har ligget 15 dager i «Slettede notater» → slettes for godt
 */
export function useAutoDeleteExpiredNotes(uid: string | null | undefined) {
  React.useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    const sweep = async () => {
      try {
        const notesCol = collection(db, "users", uid, "privateNotes");
        const now = Date.now();

        const expired = await getDocs(query(notesCol, where("deleteOn", "<", toLocalDateString(now))));
        if (cancelled) return;
        await Promise.all(
          expired.docs
            .filter((d) => typeof (d.data() as Record<string, unknown>).deletedAt !== "number")
            .map((d) => setDoc(d.ref, { deletedAt: now, deleteOn: null }, { merge: true }).catch(() => undefined)),
        );

        const old = await getDocs(query(notesCol, where("deletedAt", "<", now - TRASH_RETENTION_MS)));
        if (cancelled) return;
        await Promise.all(old.docs.map((d) => deleteDoc(d.ref).catch(() => undefined)));
      } catch {
        /* uten tilgang/nett prøver vi igjen senere */
      }
    };

    void sweep();
    const timer = window.setInterval(() => void sweep(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sweep();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uid]);
}
