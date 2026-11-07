import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

// App-level user shape (Firebase Auth user + Firestore user document fields we care about)
export type AppUser = User & {
  firstName?: string | null;
  avatarUrl?: string | null;
};

// Root owner document (where roles map lives). Prefer env, fallback to your known owner uid.
const OWNER_UID = (import.meta as any)?.env?.VITE_OWNER_UID || "uFRgce8mJjaVeDjqyJZ0wsiLqNo2";

export function useAuthUser() {
  const [user, setUser] = React.useState<AppUser | null>(() => auth.currentUser as AppUser | null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [isOwner, setIsOwner] = React.useState<boolean>(false);
  const [isRekspert, setIsRekspert] = React.useState<boolean>(false);
  const [role, setRole] = React.useState<"owner" | "admin" | "rekspert" | "user">("user");
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isApproved, setIsApproved] = React.useState<boolean>(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u as AppUser | null);

      if (!u) {
        setIsOwner(false);
        setIsAdmin(false);
        setIsRekspert(false);
        setRole("user");
        setIsApproved(true);
        setFirstName(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const data = userSnap.exists() ? (userSnap.data() as any) : null;

        // Some installs store role info directly on the user document.
        // Keep this as a fallback so removing admin does not accidentally remove rekspert access.
        const userRoleRaw = typeof data?.role === "string" ? data.role.trim().toLowerCase() : "";
        const rekspertFromUserDoc =
          userRoleRaw === "rekspert" || data?.isRekspert === true || data?.rekspert === true;

        const name = typeof data?.firstName === "string" ? data.firstName.trim() : "";
        const resolvedFirstName = name.length > 0 ? name : null;
        setFirstName(resolvedFirstName);

        const avatar = typeof data?.avatarUrl === "string" ? data.avatarUrl.trim() : "";
        const resolvedAvatarUrl = avatar.length > 0 ? avatar : null;
        setAvatarUrl(resolvedAvatarUrl);

        // Attach app-level fields onto the auth user instance (typed as AppUser)
        setUser((prev) =>
          prev
            ? ({ ...prev, firstName: resolvedFirstName, avatarUrl: resolvedAvatarUrl } as AppUser)
            : prev
        );

        // Approval gate – speiler isApprovedUser() i firestore.rules:
        // - users/{uid} mangler   => IKKE godkjent. Reglene krever at dokumentet
        //   finnes, så uten det avvises alle delte lesinger og skrivinger
        //   (feedbacks, fagligDocuments, internalChats). Brukeren skal da møte
        //   godkjenningssiden, ikke en kryptisk permission-denied inne i appen.
        // - approved === false    => IKKE godkjent
        // - approved mangler/true => godkjent
        const approved = userSnap.exists() && data?.approved !== false;
        setIsApproved(approved);

        try {
          // Owner/admin are still resolved via docId == uid
          // Rekspert is resolved via roles map on the single root owner doc: owners/{OWNER_UID}
          const rootOwnerDocId = OWNER_UID;

          const shouldFetchRootOwner = rootOwnerDocId && rootOwnerDocId !== u.uid;

          const [adminSnap, rootOwnerSnap] = await Promise.all([
            getDoc(doc(db, "admins", u.uid)),
            shouldFetchRootOwner
              ? getDoc(doc(db, "owners", rootOwnerDocId))
              : Promise.resolve(null as any),
          ]);

          // Root owner is determined strictly by configured UID
          const owner = u.uid === rootOwnerDocId;

          // Admin is determined by admins/{uid} OR being the root owner
          const admin = owner || adminSnap.exists();

          // Determine rekspert:
          // Prefer the flag on the user doc (if present), otherwise fall back to the roles map on the root owner doc.
          let rekspert = rekspertFromUserDoc;

          if (!rekspert && !owner && rootOwnerSnap && typeof rootOwnerSnap.data === "function") {
            const rootData = rootOwnerSnap.exists() ? (rootOwnerSnap.data() as any) : null;
            const rolesMap = rootData?.roles;
            const roleValue = rolesMap && typeof rolesMap === "object" ? rolesMap[u.uid] : undefined;
            rekspert = roleValue === "rekspert";
          }

          setIsOwner(owner);
          setIsAdmin(admin);
          setIsRekspert(rekspert);

          // Resolve combined role string
          const resolvedRole: "owner" | "admin" | "rekspert" | "user" = owner
            ? "owner"
            : admin
            ? "admin"
            : rekspert
            ? "rekspert"
            : "user";
          setRole(resolvedRole);
        } catch {
          setIsOwner(false);
          setIsAdmin(false);
          setIsRekspert(rekspertFromUserDoc);
          setRole(rekspertFromUserDoc ? "rekspert" : "user");
        }
      } catch {
        // Lesingen av users/{uid} feilet (nettverk/App Check), så vi vet ikke om
        // brukeren er godkjent. Porten holdes åpen med vilje: å låse hele appen
        // på en forbigående lesefeil er verre enn at et enkelt kall eventuelt
        // avvises av reglene.
        setIsAdmin(false);
        setIsRekspert(false);
        setRole("user");
        setIsApproved(true);
        setFirstName(null);
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, loading, isOwner, isAdmin, isRekspert, role, isApproved, firstName, avatarUrl };
}
