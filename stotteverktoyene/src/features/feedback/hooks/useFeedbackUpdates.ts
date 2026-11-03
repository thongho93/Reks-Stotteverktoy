import * as React from "react";

import { feedbackApi } from "../services/feedbackApi";
import type { Feedback } from "../types";

/** Har eier svart eller flyttet saken videre? (Brukeren kan ikke endre innspillet selv.) */
export function hasOwnerUpdate(item: Feedback): boolean {
  return item.ownerReply.trim() !== "" || item.status !== "ikke_behandlet";
}

/**
 * Oppdateringer fra eier på brukerens egne innspill (svar eller ny status) siden
 * brukeren sist åpnet innspillssiden. Brukes til merke på «Innspill»-fanen og til å
 * utheve det som er nytt på siden.
 */
export function useFeedbackUpdates(uid: string | null | undefined, enabled = true) {
  const [mine, setMine] = React.useState<Feedback[]>([]);
  // null = ikke lastet ennå. 0 = har aldri åpnet siden.
  const [seenAtMs, setSeenAtMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!uid || !enabled) return;
    const unsubMine = feedbackApi.subscribeMine(uid, setMine, () => setMine([]));
    const unsubSeen = feedbackApi.subscribeSeenAt(uid, setSeenAtMs, () => setSeenAtMs(0));
    return () => {
      unsubMine();
      unsubSeen();
    };
  }, [enabled, uid]);

  const unread = React.useMemo(
    () =>
      seenAtMs === null
        ? []
        : mine.filter((item) => hasOwnerUpdate(item) && item.updatedAtMs > seenAtMs),
    [mine, seenAtMs]
  );

  const markSeen = React.useCallback(() => {
    if (!uid) return;
    void feedbackApi.markSeen(uid).catch(() => undefined);
  }, [uid]);

  return { unread, seenAtMs, markSeen };
}
