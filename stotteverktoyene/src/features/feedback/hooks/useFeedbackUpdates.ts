import * as React from "react";

import { feedbackApi } from "../services/feedbackApi";
import type { Feedback } from "../types";

/** Har eier svart eller flyttet saken videre? (Brukeren kan ikke endre innspillet selv.) */
export function hasOwnerUpdate(item: Feedback): boolean {
  return (
    item.ownerReply.trim() !== "" ||
    item.status !== "ikke_behandlet" ||
    // updatedAt flyttes bare av eier (svar, status eller kommentar), og er lik createdAt
    // til noe har skjedd.
    item.updatedAtMs > item.createdAtMs + 1000
  );
}

/** Noe nytt på et innspill avsenderen har sendt inn: svar fra eier, ny status eller en kommentar. */
export function hasNewForAuthor(item: Feedback, uid: string, since: number): boolean {
  if (item.createdByUid !== uid) return false;
  const ownerActivity = hasOwnerUpdate(item) && item.updatedAtMs > since;
  const otherComment =
    item.lastCommentAtMs > since && item.lastCommentByUid !== "" && item.lastCommentByUid !== uid;
  return ownerActivity || otherComment;
}

/** Noe nytt for eier: et nytt innspill, eller en kommentar fra en annen enn eier. */
export function hasNewForOwner(item: Feedback, uid: string, since: number): boolean {
  if (item.createdByUid === uid) return false;
  return item.createdAtMs > since || (item.lastCommentAtMs > since && item.lastCommentByUid !== uid);
}

/**
 * Oppdateringer på brukerens egne innspill siden brukeren sist åpnet innspillssiden.
 * Brukes til merke på «Innspill»-fanen og til å utheve det som er nytt på siden.
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
      !uid || seenAtMs === null ? [] : mine.filter((item) => hasNewForAuthor(item, uid, seenAtMs)),
    [mine, seenAtMs, uid]
  );

  const markSeen = React.useCallback(() => {
    if (!uid) return;
    void feedbackApi.markSeen(uid).catch(() => undefined);
  }, [uid]);

  return { unread, seenAtMs, markSeen };
}

/**
 * Det eier ikke har sett ennå: nye innspill og kommentarer fra andre siden eier sist åpnet
 * eiersiden. Går bare mot databasen når `enabled` er sann (kun for eier).
 */
export function useOwnerFeedbackAlerts(uid: string | null | undefined, enabled: boolean) {
  const [all, setAll] = React.useState<Feedback[]>([]);
  const [seenAtMs, setSeenAtMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!uid || !enabled) return;
    const unsubAll = feedbackApi.subscribeAll(setAll, () => setAll([]));
    const unsubSeen = feedbackApi.subscribeSeenAt(uid, setSeenAtMs, () => setSeenAtMs(0), "feedbackOwnerSeen");
    return () => {
      unsubAll();
      unsubSeen();
    };
  }, [enabled, uid]);

  const unread = React.useMemo(
    () =>
      !uid || seenAtMs === null
        ? []
        : all
            .filter((item) => hasNewForOwner(item, uid, seenAtMs))
            .sort(
              (a, b) =>
                Math.max(b.createdAtMs, b.lastCommentAtMs) - Math.max(a.createdAtMs, a.lastCommentAtMs)
            ),
    [all, seenAtMs, uid]
  );

  const markSeen = React.useCallback(() => {
    if (!uid) return;
    void feedbackApi.markSeen(uid, "feedbackOwnerSeen").catch(() => undefined);
  }, [uid]);

  return { unread, seenAtMs, markSeen };
}
