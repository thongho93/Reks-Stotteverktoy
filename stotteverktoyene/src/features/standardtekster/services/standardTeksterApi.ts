import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import type { StandardTekst, UpdateStandardTekstDto } from "../types";
import { mapDocToStandardTekst } from "../mappers/standardTekstMapper";

const COL_NAME = "Standardtekster";

type StandardTekstActor = {
  uid?: string | null;
  name?: string | null;
};

export const standardTeksterApi = {
  async fetchAll(): Promise<StandardTekst[]> {
    const q = query(collection(db, COL_NAME));
    const snap = await getDocs(q);

    return snap.docs
      .map((d) => mapDocToStandardTekst(d.id, d.data()))
      .sort((a, b) => a.title.localeCompare(b.title, "nb"));
  },

  async update(id: string, patch: UpdateStandardTekstDto, actor?: StandardTekstActor): Promise<void> {
    const ref = doc(db, COL_NAME, id);

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (actor?.uid) payload.updatedByUid = actor.uid;
    if (actor?.name) payload.updatedByName = actor.name;

    if (typeof patch.title === "string") payload.title = patch.title;
    if (typeof patch.category === "string") payload.category = patch.category;
    if (typeof patch.content === "string") payload.content = patch.content;
    if (patch.followUps !== undefined) payload.followUps = patch.followUps;
    if (typeof patch.isActive === "boolean") payload.isActive = patch.isActive;

    await updateDoc(ref, payload);
  },

  async createEmpty(actor?: StandardTekstActor): Promise<StandardTekst> {
    const colRef = collection(db, COL_NAME);
    const now = serverTimestamp();

    const newDoc = {
      title: "Ny standardtekst",
      category: "",
      content: "",
      followUps: [] as const,
      isActive: true,
      updatedAt: now,
      createdAt: now,
      createdByUid: actor?.uid ?? null,
      createdByName: actor?.name ?? null,
      updatedByUid: actor?.uid ?? null,
      updatedByName: actor?.name ?? null,
    } as const;

    const docRef = await addDoc(colRef, newDoc);

    return {
      id: docRef.id,
      title: newDoc.title,
      category: undefined,
      content: newDoc.content,
      followUps: [],
      isActive: true,
      createdByName: actor?.name ?? undefined,
      updatedByName: actor?.name ?? undefined,
      updatedAt: new Date(),
    };
  },

  async remove(id: string): Promise<void> {
    const ref = doc(db, COL_NAME, id);
    await deleteDoc(ref);
  },

  async trackUsage(params: {
    uid: string;
    standardtekstId: string;
  }): Promise<void> {
    const { uid, standardtekstId } = params;

    const ref = doc(
      db,
      "users",
      uid,
      "standardtekstUsage",
      standardtekstId
    );

    await setDoc(
      ref,
      {
        clicks: increment(1),
        lastUsedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },
};

export async function createStandardtekstForInteraction(params: {
  title: string;
  category?: string;
  content: string;
  interactionId: string;
  followUps: any[];
  actor?: StandardTekstActor;
}) {
  const colRef = collection(db, "Standardtekster");

  const newDoc: any = {
    title: params.title,
    category: params.category || undefined,
    content: params.content,
    followUps: params.followUps as any,
    isActive: true,
    interactionIds: [params.interactionId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByUid: params.actor?.uid ?? null,
    createdByName: params.actor?.name ?? null,
    updatedByUid: params.actor?.uid ?? null,
    updatedByName: params.actor?.name ?? null,
  };

  const docRef = await addDoc(colRef, newDoc);
  return docRef.id;
}

export async function updateStandardtekst(params: {
  standardtekstId: string;
  title: string;
  category?: string;
  content: string;
  followUps: any[];
  actor?: StandardTekstActor;
}) {
  await standardTeksterApi.update(params.standardtekstId, {
    title: params.title,
    category: params.category,
    content: params.content,
    followUps: params.followUps,
  }, params.actor);
}
