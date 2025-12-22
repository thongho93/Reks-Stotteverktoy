import { arrayUnion, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { normalizeStandardtekstTitle, type StandardtekstDoc } from "../utils/standardtekster";

export async function fetchStandardtekster(): Promise<StandardtekstDoc[]> {
  const snap = await getDocs(collection(db, "Standardtekster"));
  const rows: StandardtekstDoc[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  rows.sort((a, b) =>
    normalizeStandardtekstTitle(a).localeCompare(normalizeStandardtekstTitle(b), "no")
  );

  return rows;
}

export async function linkInteractionToStandardtekst(params: {
  standardtekstId: string;
  interactionId: string;
}) {
  const ref = doc(db, "Standardtekster", params.standardtekstId);
  await updateDoc(ref, {
    interactionIds: arrayUnion(params.interactionId),
  });
}