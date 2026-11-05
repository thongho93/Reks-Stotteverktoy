import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "../../../firebase/firebase";
import { compressImage, FEEDBACK_MAX_IMAGES } from "../utils/image";
import type {
  Feedback,
  FeedbackAttachment,
  FeedbackComment,
  FeedbackStatus,
  NewFeedbackInput,
} from "../types";
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

function asAttachments(value: unknown): FeedbackAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = entry as { url?: unknown; path?: unknown } | null;
    return candidate && typeof candidate.url === "string" && typeof candidate.path === "string"
      ? [{ url: candidate.url, path: candidate.path }]
      : [];
  });
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
    attachments: asAttachments(data.attachments),
    createdAtMs,
    updatedAtMs: toMillis(data.updatedAt) || createdAtMs,
    editedAtMs: toMillis(data.editedAt) || null,
  };
}

function mapComment(id: string, data: Record<string, unknown>): FeedbackComment {
  return {
    id,
    message: String(data.message ?? ""),
    createdByUid: String(data.createdByUid ?? ""),
    createdByName: String(data.createdByName ?? ""),
    isOwner: data.isOwner === true,
    createdAtMs: toMillis(data.createdAt),
  };
}

export const FEEDBACK_COMMENT_MAX_LENGTH = 1000;

/**
 * Rekkefølge i lista: ikke behandlet øverst, så under behandling, og ferdig
 * behandlet nederst. Innenfor hver gruppe kommer nyeste innspill først.
 */
const STATUS_RANK: Record<FeedbackStatus, number> = {
  ikke_behandlet: 0,
  under_behandling: 1,
  ferdig_behandlet: 2,
};

export function sortFeedbacks(items: Feedback[]): Feedback[] {
  return [...items].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAtMs - a.createdAtMs
  );
}

export const feedbackApi = {
  async submit(input: NewFeedbackInput, author: Author): Promise<void> {
    // Bildene lastes opp først (komprimert), og lenkene lagres sammen med innspillet.
    // Feiler lagringen av innspillet, ryddes de opplastede bildene bort igjen.
    const attachments: FeedbackAttachment[] = [];
    try {
      const images = (input.images ?? []).slice(0, FEEDBACK_MAX_IMAGES);
      for (const [index, file] of images.entries()) {
        const blob = await compressImage(file);
        const random = Math.random().toString(36).slice(2, 10);
        const path = `feedback/${author.uid}/${Date.now()}-${index}-${random}.jpg`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
        attachments.push({ url: await getDownloadURL(fileRef), path });
      }

      await addDoc(collection(db, FEEDBACKS_COLLECTION), {
        message: input.message.trim().slice(0, FEEDBACK_MAX_LENGTH),
        category: input.category,
        pagePath: input.pagePath,
        status: "ikke_behandlet",
        ownerReply: "",
        createdByUid: author.uid,
        createdByName: author.name,
        createdByEmail: author.email,
        attachments,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      await Promise.all(
        attachments.map((att) => deleteObject(ref(storage, att.path)).catch(() => undefined))
      );
      throw error;
    }
  },

  /** Alle innspill, nyeste først. Alle aktive medlemmer har leserett. */
  subscribeAll(
    onData: (items: Feedback[]) => void,
    onError: (error: unknown) => void
  ): () => void {
    return onSnapshot(
      query(collection(db, FEEDBACKS_COLLECTION), orderBy("createdAt", "desc")),
      (snap) =>
        onData(
          sortFeedbacks(snap.docs.map((d) => mapFeedback(d.id, d.data() as Record<string, unknown>)))
        ),
      onError
    );
  },

  /** Brukerens egne innspill. Brukes til å varsle om svar og statusendringer fra eier. */
  subscribeMine(
    uid: string,
    onData: (items: Feedback[]) => void,
    onError: (error: unknown) => void
  ): () => void {
    return onSnapshot(
      query(collection(db, FEEDBACKS_COLLECTION), where("createdByUid", "==", uid)),
      (snap) =>
        onData(snap.docs.map((d) => mapFeedback(d.id, d.data() as Record<string, unknown>))),
      onError
    );
  },

  /** Tidspunktet brukeren sist så innspillsiden – lagres i brukerens egne innstillinger. */
  subscribeSeenAt(
    uid: string,
    onData: (seenAtMs: number) => void,
    onError: (error: unknown) => void
  ): () => void {
    return onSnapshot(
      doc(db, "users", uid, "preferences", "feedbackSeen"),
      (snap) => onData(toMillis(snap.data()?.seenAt)),
      onError
    );
  },

  async markSeen(uid: string): Promise<void> {
    await setDoc(
      doc(db, "users", uid, "preferences", "feedbackSeen"),
      { seenAt: serverTimestamp() },
      { merge: true }
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

  /** Avsenderen retter teksten i sitt eget innspill. */
  async updateMessage(id: string, message: string): Promise<void> {
    await updateDoc(doc(db, FEEDBACKS_COLLECTION, id), {
      message: message.trim().slice(0, FEEDBACK_MAX_LENGTH),
      editedAt: serverTimestamp(),
    });
  },

  /** Kommentarene under et innspill, eldste først. */
  subscribeComments(
    feedbackId: string,
    onData: (items: FeedbackComment[]) => void,
    onError: (error: unknown) => void
  ): () => void {
    return onSnapshot(
      query(
        collection(db, FEEDBACKS_COLLECTION, feedbackId, "comments"),
        orderBy("createdAt", "asc")
      ),
      (snap) =>
        onData(snap.docs.map((d) => mapComment(d.id, d.data() as Record<string, unknown>))),
      onError
    );
  },

  /**
   * Legger til en kommentar. Når eier kommenterer, oppdateres innspillets updatedAt, så
   * avsenderen får varsel om at det har skjedd noe.
   */
  async addComment(
    feedbackId: string,
    message: string,
    author: { uid: string; name: string },
    asOwner: boolean
  ): Promise<void> {
    await addDoc(collection(db, FEEDBACKS_COLLECTION, feedbackId, "comments"), {
      message: message.trim().slice(0, FEEDBACK_COMMENT_MAX_LENGTH),
      createdByUid: author.uid,
      createdByName: author.name,
      isOwner: asOwner,
      createdAt: serverTimestamp(),
    });
    if (asOwner) {
      await updateDoc(doc(db, FEEDBACKS_COLLECTION, feedbackId), { updatedAt: serverTimestamp() });
    }
  },

  async removeComment(feedbackId: string, commentId: string): Promise<void> {
    await deleteDoc(doc(db, FEEDBACKS_COLLECTION, feedbackId, "comments", commentId));
  },

  /** Sletter innspillet, kommentarene og de vedlagte bildene (bildene på beste forsøk). */
  async remove(id: string, attachments: FeedbackAttachment[] = []): Promise<void> {
    const comments = await getDocs(collection(db, FEEDBACKS_COLLECTION, id, "comments"));
    await Promise.all(comments.docs.map((c) => deleteDoc(c.ref)));
    await deleteDoc(doc(db, FEEDBACKS_COLLECTION, id));
    await Promise.all(
      attachments.map((att) => deleteObject(ref(storage, att.path)).catch(() => undefined))
    );
  },
};
