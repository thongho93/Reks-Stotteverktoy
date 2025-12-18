import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import type { StandardTekst } from "../types";
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

  async update(id: string, patch: { title: string; content: string }): Promise<void> {
    const ref = doc(db, COL_NAME, id);
    await updateDoc(ref, {
      title: patch.title,
      content: patch.content,
      updatedAt: serverTimestamp(),
    });
  },

  async createEmpty(): Promise<StandardTekst> {
    const colRef = collection(db, COL_NAME);
    const now = serverTimestamp();

    const newDoc = {
      title: "Ny standardtekst",
      category: "",
      content: "",
      updatedAt: now,
      createdAt: now,
    } as const;

    const docRef = await addDoc(colRef, newDoc);

    return {
      id: docRef.id,
      title: newDoc.title,
      category: undefined,
      content: newDoc.content,
      updatedAt: new Date(),
    };
  },
};
