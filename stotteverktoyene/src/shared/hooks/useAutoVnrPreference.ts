import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/firebase";

// Per-user "Auto vnr" preference. Keyed by uid so the choice is remembered for the
// specific signed-in user (important on shared pharmacy workstations), and stored
// per device in localStorage. Defaults to ON — only an explicit opt-out is persisted.
function fullKey(baseKey: string, uid: string | null) {
  return uid ? `${baseKey}.autoVnr:${uid}` : `${baseKey}.autoVnr:anon`;
}

function read(baseKey: string, uid: string | null): boolean {
  try {
    const raw = localStorage.getItem(fullKey(baseKey, uid));
    return raw === null ? true : raw === "true"; // default ON when never set
  } catch {
    return true;
  }
}

function write(baseKey: string, uid: string | null, value: boolean) {
  try {
    localStorage.setItem(fullKey(baseKey, uid), String(value));
  } catch {
    // ignore (private mode / storage disabled)
  }
}

// Lightweight current-uid subscription — no Firestore reads (unlike useAuthUser).
function useUid(): string | null {
  const [uid, setUid] = React.useState<string | null>(() => auth.currentUser?.uid ?? null);
  React.useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

/**
 * `[enabled, setEnabled]` for the "Auto vnr" toggle. Defaults to ON; an explicit
 * opt-out is remembered per signed-in user.
 *
 * @param baseKey Per-surface namespace, e.g. "omeq" / "standardtekster" / "interaksjoner".
 */
export function useAutoVnrPreference(baseKey: string) {
  const uid = useUid();
  const [enabled, setEnabledState] = React.useState<boolean>(() => read(baseKey, uid));
  const lastUidRef = React.useRef(uid);

  // When auth resolves (or the user switches), load that user's saved choice.
  React.useEffect(() => {
    if (lastUidRef.current === uid) return;
    lastUidRef.current = uid;
    setEnabledState(read(baseKey, uid));
  }, [baseKey, uid]);

  const setEnabled = React.useCallback(
    (value: boolean) => {
      setEnabledState(value);
      write(baseKey, uid, value);
    },
    [baseKey, uid],
  );

  return [enabled, setEnabled] as const;
}
