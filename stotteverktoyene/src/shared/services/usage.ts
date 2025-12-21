import { doc, setDoc, serverTimestamp, increment, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

export type UsageEventType =
  | "app_open"
  | "page_view"
  | "standardtekst_open"
  | "standardtekst_copy"
  | "search_standardtekster";

function getTodayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapEventToField(event: UsageEventType): string {
  switch (event) {
    case "app_open":
      return "opens";
    case "page_view":
      return "pageViews";
    case "standardtekst_open":
      return "standardtekstOpens";
    case "standardtekst_copy":
      return "copies";
    case "search_standardtekster":
      return "searches";
    default:
      return "events";
  }
}

async function getFirstName(uid: string): Promise<string | undefined> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return undefined;
    const data = snap.data() as any;
    const name = typeof data.firstName === "string" ? data.firstName.trim() : "";
    return name || undefined;
  } catch {
    return undefined;
  }
}

export type UsageEventMetadata = {
  page?: "standardtekster" | "omeq" | "profil" | "produktskjema" | "other";
  standardtekstId?: string;
  searchLen?: number;
};

export async function logUsage(event: UsageEventType, data?: UsageEventMetadata) {
  const user = auth.currentUser;
  if (!user) return;

  const dateKey = getTodayKey();
  const field = mapEventToField(event);

  const userRef = doc(db, "usage_daily", dateKey, "users", user.uid);
  const totalsRef = doc(db, "usage_daily", dateKey, "totals", "all");

  const firstName = await getFirstName(user.uid);

  const meta: Record<string, unknown> = {};

  if (data?.page) {
    meta.lastPage = data.page;
  }

  if (typeof data?.searchLen === "number" && Number.isFinite(data.searchLen)) {
    meta.lastSearchLen = Math.max(0, Math.floor(data.searchLen));
  }

  if (data?.standardtekstId) {
    // Store as "last opened" id only (bounded field count)
    meta.lastStandardtekstId = data.standardtekstId;
  }

  await Promise.all([
    setDoc(
      userRef,
      {
        uid: user.uid,
        ...(firstName ? { firstName } : {}),
        [field]: increment(1),
        ...meta,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    setDoc(
      totalsRef,
      {
        [field]: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
  ]);
}
