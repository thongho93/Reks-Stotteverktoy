import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase/firebase";
import type { Feedback, FeedbackStatus, NewFeedbackInput } from "../types";
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "../types";

export const FEEDBACKS_COLLECTION = "feedbacks";

/** Firestore-grensen ligger langt høyere, men lange innspill blir uleselige i lista. */
export const FEEDBACK_MAX_LENGTH = 2000;
export const FEEDBACK_REPLY_MAX_LENGTH = 2000;

type Author = {
  uid: string;
  name: string;
  email: string;
};

function toMillis(value: unknown): number {
  const candidate = value as { toMillis?: () => number; seconds?: number } | null;
  if (candidate && typeof candidate.toMillis === "function") return candidate.toMillis();
  if (candidate && typeof candidate.seconds === "number") return candidate.seconds * 1000;
  return 0;
}

function asCategory(value: unknown): Feedback["category"] {
  const match = FEEDBACK_CATEGORIES.find((c) => c.value === value);
  return match ? match.value : "feature";
}

function asStatus(value: unknown): FeedbackStatus {
  const match = FEEDBACK_STATUSES.find((s) => s.value === value);
  return match ? match.value : "ikke_behandlet";
}

function mapFeedback(id: string, data: Record<string, unknown>): Feedback {
  // createdAt er null i det lokale snapshotet rett etter skriving (serverTimestamp
  // er ikke bekreftet ennå). Vi faller da tilbake til updatedAt, ellers 0.
  const createdAtMs = toMillis(data.createdAt) || toMillis(data.updatedAt);

  return {
    id,
    message: String(data.message ?? ""),
    category: asCategory(data.category),
    pagePath: String(data.pagePath ?? ""),
    status: asStatus(data.status),
    ownerReply: String(data.ownerReply ?? ""),
    createdByUid: String(data.createdByUid ?? ""),
    createdByName: String(data.createdByName ?? ""),
    createdByEmail: String(data.createdByEmail ?? ""),
    createdAtMs,
    updatedAtMs: toMillis(data.updatedAt) || createdAtMs,
  };
}

export const feedbackApi = {
  async submit(input: NewFeedbackInput, author: Author): Promise<void> {
    await addDoc(collection(db, FEEDBACKS_COLLECTION), {
      message: input.message.trim().slice(0, FEEDBACK_MAX_LENGTH),
      category: input.category,
      pagePath: input.pagePath,
      status: "ikke_behandlet",
      ownerReply: "",
      createdByUid: author.uid,
      createdByName: author.name,
      createdByEmail: author.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /** Alle innspill, nyeste først. Alle aktive medlemmer har leserett. */
  subscribeAll(
    onData: (items: Feedback[]) => void,
    onError: (error: unknown) => void
  ): () => void {
    return onSnapshot(
      query(collection(db, FEEDBACKS_COLLECTION), orderBy("createdAt", "desc")),
      (snap) => onData(snap.docs.map((d) => mapFeedback(d.id, d.data() as Record<string, unknown>))),
      onError
    );
  },

  async setStatus(id: string, status: FeedbackStatus): Promise<void> {
    await updateDoc(doc(db, FEEDBACKS_COLLECTION, id), { status, updatedAt: serverTimestamp() });
  },

  async setOwnerReply(id: string, ownerReply: string): Promise<void> {
    await updateDoc(doc(db, FEEDBACKS_COLLECTION, id), {
      ownerReply: ownerReply.slice(0, FEEDBACK_REPLY_MAX_LENGTH),
      updatedAt: serverTimestamp(),
    });
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, FEEDBACKS_COLLECTION, id));
  },
};
