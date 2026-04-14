import { doc, setDoc, serverTimestamp, increment, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

export type UsagePage =
  | "home"
  | "omeq"
  | "standardtekster"
  | "interaksjoner"
  | "profil"
  | "statistikk"
  | "produktskjema"
  | "tilbakemelding"
  | "anbrudd"
  | "teamschat"
  | "rekspert"
  | "other";

export type UsageEventType =
  | "app_open"
  | "page_view"
  | "menu_click"
  | "standardtekst_open"
  | "standardtekst_copy"
  | "search_standardtekster";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_LAST_ACTIVITY_KEY = "usage:last-activity-ms";
const SESSION_ID_KEY = "usage:session-id";

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
    case "menu_click":
      return "menuClicks";
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
  page?: UsagePage;
  pagePath?: string;
  targetPage?: UsagePage;
  standardtekstId?: string;
  searchLen?: number;
};

export function normalizeUsagePath(rawPath: string): string {
  const base = (rawPath || "").trim().toLowerCase();
  if (!base) return "/";

  const [noQuery] = base.split("?");
  const [noHash] = (noQuery || "/").split("#");
  let path = noHash.startsWith("/") ? noHash : `/${noHash}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

export function usagePathToCounterKey(path: string): string {
  const normalized = normalizeUsagePath(path);
  if (normalized === "/") return "root";

  return normalized
    .replace(/^\//, "")
    .replace(/\//g, "__")
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 120);
}

function ensureSession(nowMs: number): { sessionId: string; isNewSession: boolean } {
  if (typeof window === "undefined") {
    return { sessionId: `server-${nowMs}`, isNewSession: false };
  }

  const lastActivity = Number(window.localStorage.getItem(SESSION_LAST_ACTIVITY_KEY) ?? "0");
  const existingSessionId = window.localStorage.getItem(SESSION_ID_KEY);
  const isExpired = !Number.isFinite(lastActivity) || nowMs - lastActivity > SESSION_TIMEOUT_MS;
  const isNewSession = !existingSessionId || isExpired;
  const sessionId = isNewSession
    ? `${nowMs}-${Math.random().toString(36).slice(2, 8)}`
    : existingSessionId ?? `${nowMs}-${Math.random().toString(36).slice(2, 8)}`;

  window.localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(nowMs));
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);

  return { sessionId, isNewSession };
}

export async function logUsage(event: UsageEventType, data?: UsageEventMetadata) {
  const user = auth.currentUser;
  if (!user) return;

  const nowMs = Date.now();
  const { sessionId, isNewSession } = ensureSession(nowMs);
  const dateKey = getTodayKey();
  const field = mapEventToField(event);

  const userRef = doc(db, "usage_daily", dateKey, "users", user.uid);
  const totalsRef = doc(db, "usage_daily", dateKey, "totals", "all");

  const standardtekstId = data?.standardtekstId;

  const firstName = await getFirstName(user.uid);

  const meta: Record<string, unknown> = {};
  const userCounters: Record<string, unknown> = {
    [`eventCounts.${event}`]: increment(1),
  };
  const totalsCounters: Record<string, unknown> = {
    [`eventCounts.${event}`]: increment(1),
  };

  if (data?.page) {
    meta.lastPage = data.page;
  }
  meta.lastSessionId = sessionId;

  if (data?.targetPage) {
    meta.lastTargetPage = data.targetPage;
  }

  if (typeof data?.searchLen === "number" && Number.isFinite(data.searchLen)) {
    meta.lastSearchLen = Math.max(0, Math.floor(data.searchLen));
  }

  if (standardtekstId) {
    // Store as "last opened" id only (bounded field count)
    meta.lastStandardtekstId = standardtekstId;
  }

  if (event === "page_view" && data?.page) {
    userCounters[`pageViewsByPage.${data.page}`] = increment(1);
    totalsCounters[`pageViewsByPage.${data.page}`] = increment(1);

    const normalizedPath = normalizeUsagePath(data.pagePath ?? "/");
    const pathKey = usagePathToCounterKey(normalizedPath);
    userCounters[`pageViewsByPath.${pathKey}`] = increment(1);
    totalsCounters[`pageViewsByPath.${pathKey}`] = increment(1);
    meta[`pathLabels.${pathKey}`] = normalizedPath;
  }

  if (isNewSession) {
    userCounters.sessions = increment(1);
    totalsCounters.sessions = increment(1);
  }

  if (event === "menu_click" && data?.targetPage) {
    userCounters[`menuClicksByPage.${data.targetPage}`] = increment(1);
    totalsCounters[`menuClicksByPage.${data.targetPage}`] = increment(1);
  }

  const standardtekstRef =
    event === "standardtekst_open" && standardtekstId
      ? doc(db, "usage_daily", dateKey, "standardtekster", standardtekstId)
      : null;

  const standardtekstUserRef =
    event === "standardtekst_open" && standardtekstId
      ? doc(db, "usage_daily", dateKey, "users", user.uid, "standardtekster", standardtekstId)
      : null;

  await Promise.all([
    setDoc(
      userRef,
      {
        uid: user.uid,
        ...(firstName ? { firstName } : {}),
        [field]: increment(1),
        ...userCounters,
        ...meta,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    setDoc(
      totalsRef,
      {
        [field]: increment(1),
        ...totalsCounters,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    ...(standardtekstRef
      ? [
          setDoc(
            standardtekstRef,
            {
              opens: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ),
        ]
      : []),
    ...(standardtekstUserRef
      ? [
          setDoc(
            standardtekstUserRef,
            {
              opens: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ),
        ]
      : []),
  ]);
}
