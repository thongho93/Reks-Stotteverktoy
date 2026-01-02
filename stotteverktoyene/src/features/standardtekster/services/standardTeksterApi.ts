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

export const standardTeksterApi = {
  async fetchAll(): Promise<StandardTekst[]> {
    const q = query(collection(db, COL_NAME));
    const snap = await getDocs(q);

    return snap.docs
      .map((d) => mapDocToStandardTekst(d.id, d.data()))
      .sort((a, b) => a.title.localeCompare(b.title, "nb"));
  },

  async update(id: string, patch: UpdateStandardTekstDto): Promise<void> {
    const ref = doc(db, COL_NAME, id);

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof patch.title === "string") payload.title = patch.title;
    if (typeof patch.category === "string") payload.category = patch.category;
    if (typeof patch.content === "string") payload.content = patch.content;
    if (patch.followUps !== undefined) payload.followUps = patch.followUps;

    await updateDoc(ref, payload);
  },

  async createEmpty(): Promise<StandardTekst> {
    const colRef = collection(db, COL_NAME);
    const now = serverTimestamp();

    const newDoc = {
      title: "Ny standardtekst",
      category: "",
      content: "",
      followUps: [] as const,
      updatedAt: now,
      createdAt: now,
    } as const;

    const docRef = await addDoc(colRef, newDoc);

    return {
      id: docRef.id,
      title: newDoc.title,
      category: undefined,
      content: newDoc.content,
      followUps: [],
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
}) {
  const colRef = collection(db, "Standardtekster");

  const newDoc: any = {
    title: params.title,
    category: params.category || undefined,
    content: params.content,
    followUps: params.followUps as any,
    interactionIds: [params.interactionId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
}) {
  await standardTeksterApi.update(params.standardtekstId, {
    title: params.title,
    category: params.category,
    content: params.content,
    followUps: params.followUps,
  });
}
