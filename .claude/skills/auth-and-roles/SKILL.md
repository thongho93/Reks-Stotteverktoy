---
name: auth-and-roles
description: How auth and role gating work in Reks Støtteverktøy — Firebase Auth + MSAL (Microsoft) sign-in, role resolution via owners/admins/users docs, and route/UI gating with RequireAuth and RequireRekspert. Use when adding a protected route, gating UI by role, reading the current user, troubleshooting login or pending-approval flows, or modifying anything under src/app/auth/.
---

# Auth and roles

Reks Støtteverktøy uses Firebase Authentication wrapped in MSAL (Microsoft Entra ID) for SSO with `farmasiet.no` accounts. Roles are layered on top via Firestore docs.

## Files (`stotteverktoyene/src/app/auth/`)

- `Auth.tsx` / `MsalProviderWrapper.tsx` — MSAL provider setup
- `msalConfig.ts` — MSAL client config (env-driven)
- `LoginPage.tsx` — `/login` route
- `PendingApprovalPage.tsx` — `/pending-approval` for users with `approved: false`
- `RequireAuth.tsx` — wraps the entire authenticated `Layout`; redirects to `/login` if signed out and to `/pending-approval` if not approved
- `RequireRekspert.tsx` — nested route guard for admin pages
- `useAuthUser.ts` — the canonical hook for "who am I and what can I do"
- `ProfileMenu.tsx` / `ProfilePage.tsx` — avatar dropdown + `/profil`
- `avatarUtils.ts` — initials/fallback avatar helpers

## Role model

Three Firestore collections combine to determine role:

- `users/{uid}` — every signed-in user. May contain `firstName`, `avatarUrl`, `approved`, `role`, `isRekspert`/`rekspert` (legacy variants supported by `useAuthUser`).
- `admins/{uid}` — presence makes you an admin.
- `owners/{OWNER_UID}` — single root-owner doc keyed by `VITE_OWNER_UID` (fallback hardcoded in `useAuthUser`). Contains a `roles: { [uid]: "rekspert" }` map used for granting rekspert access without requiring write to user docs.

Resolution order (see `useAuthUser`):

1. **owner** — `u.uid === VITE_OWNER_UID`
2. **admin** — owner OR `admins/{uid}` exists
3. **rekspert** — `users/{uid}.role === "rekspert"` / `users/{uid}.isRekspert === true` / `users/{uid}.rekspert === true`, OR fallback `owners/{OWNER_UID}.roles[uid] === "rekspert"`
4. else **user**

Returned shape:
```ts
{ user, loading, isOwner, isAdmin, isRekspert, role, isApproved, firstName, avatarUrl }
```

`role` is the single combined string (`"owner" | "admin" | "rekspert" | "user"`); the booleans are convenience for early returns.

## Approval gate

`approved === false` means NOT approved. Missing or `true` means approved. `RequireAuth` redirects unapproved users to `/pending-approval`. New collections that mutate `users/{uid}` must NOT clobber `approved` accidentally — write with merge or only patch the fields you mean to.

## Gating routes

Default `Layout` is wrapped in `<RequireAuth>` in `App.tsx`. Anything inside it requires login + approval.

For admin-only pages, wrap with `RequireRekspert`:
```tsx
<Route element={<RequireRekspert />}>
  <Route path="/rekspert" element={<RekspertPage />} />
</Route>
```

`RequireRekspert` should be the gate; don't also early-return inside the page component — that creates two sources of truth.

## Gating UI inside a page

```ts
const { isOwner, isRekspert, role, loading } = useAuthUser();
if (loading) return null;          // or a spinner
const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
```

The triple check (`isRekspert || role === "rekspert" || isOwner`) is intentional and matches `Sidebar` — keep it for new admin-only sidebar/menu items.

## Identifying the actor on writes

When a feature writes to Firestore, pass actor info from `useAuthUser`:

```ts
const { user, firstName } = useAuthUser();
api.update(id, patch, {
  uid: user?.uid,
  name: firstName ?? user?.displayName ?? null,
});
```

`firstName` from the `users/{uid}` doc is preferred because MSAL `displayName` is sometimes empty for federated identities.

## Env variables

- `VITE_OWNER_UID` — root owner uid; required in production.
- MSAL config values (client id, tenant, redirect) live in env and are wired in `msalConfig.ts`.
- App Check keys are in `firebase/appCheck.ts`.

## Don't

- Don't read auth state from `firebase/auth` directly in pages — use `useAuthUser`. The hook handles the user-doc + admin-doc + owner-doc fan-out.
- Don't hardcode the owner uid in new code — read `VITE_OWNER_UID` (with a fallback that matches `useAuthUser.ts` if you must).
- Don't add a fourth source of truth for "who's a rekspert". If you need a new role, add it to `useAuthUser` and surface it through the same return shape.
- Don't gate purely client-side. Admin pages must also be enforced by Firestore security rules — UI gates are convenience, not security.
