---
name: firestore-crud
description: Conventions for building Firestore-backed services in Reks Støtteverktøy — collection access, mappers, actor tracking, server timestamps, and counter increments. Use when adding or editing CRUD code that touches Firestore (collections like Standardtekster, users, owners, admins, usage_daily), creating a new feature service file under src/features/*/services/, or designing a new Firestore data model.
---

# Firestore CRUD pattern

Reference implementation: `stotteverktoyene/src/features/standardtekster/services/standardTeksterApi.ts` and its mapper at `mappers/standardTekstMapper.ts`. Follow this shape for new collections.

## Layering

```
features/<feature>/
  services/<feature>Api.ts   # Firestore reads/writes, no React
  mappers/<entity>Mapper.ts  # Firestore doc → domain type
  hooks/use<Entity>.ts       # React-side state + cache + side effects
  types.ts                   # Domain types + DTOs (e.g. UpdateXDto)
```

Pages import the hook, never the api directly. The api never imports React.

## Service module shape

```ts
import {
  addDoc, collection, deleteDoc, doc, getDocs, increment,
  query, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";

const COL_NAME = "MyEntities";

type Actor = { uid?: string | null; name?: string | null };

export const myEntityApi = {
  async fetchAll(): Promise<MyEntity[]> { … },
  async create(actor?: Actor): Promise<MyEntity> { … },
  async update(id: string, patch: UpdateMyEntityDto, actor?: Actor): Promise<void> { … },
  async remove(id: string): Promise<void> { … },
};
```

Export a single object (`<feature>Api`), not loose functions. This matches the existing codebase and gives a single import surface.

## Conventions to copy

**Always tag writes with actor + timestamps.**

```ts
const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
if (actor?.uid)  payload.updatedByUid  = actor.uid;
if (actor?.name) payload.updatedByName = actor.name;
```

On create, also set `createdAt`, `createdByUid`, `createdByName`.

**Patch only fields that are present.** Use `typeof patch.x === "string"` / `patch.x !== undefined` guards rather than spreading the whole DTO. This prevents accidentally clearing fields and matches `standardTeksterApi.update`.

**Use `setDoc(ref, data, { merge: true })`** when you need upsert semantics or counter aggregation (see `usage.ts`). Use `updateDoc` when the doc must already exist.

**Counters use `increment(1)`**, not read-modify-write. See `usage.ts` for nested counter keys like `eventCounts.page_view` or `pageViewsByPage.standardtekster`.

**Sort with locale `"nb"`** (Norwegian Bokmål) — `.sort((a, b) => a.title.localeCompare(b.title, "nb"))`. ASCII sort will misorder Æ/Ø/Å.

## Mapper shape

`mappers/<entity>Mapper.ts` exports `mapDocToX(id, data)` and is responsible for:

1. **Field-name fallbacks.** Real-world Firestore docs in this app have mixed casing/Norwegian/English keys (`title` / `Title` / `tittel`, `content` / `Body` / `tekst`). Use `pickFirstNonEmptyString` (in `standardtekster/utils/strings.ts`) so the same domain type works across legacy and new docs.
2. **Date coercion.** Use `toDateMaybe` (in `standardtekster/utils/date.ts`) to handle Firestore `Timestamp`, ISO strings, and missing values uniformly.
3. **Boolean defaulting.** When an entity is "active by default", check explicit `isActive` first, then inverted `isInactive`/`deactivated`, then default `true`. Reference: `mapDocToStandardTekst`.
4. **No throws.** A mapper should always return a usable object. Bad data → sensible defaults, never an exception that crashes the list.

## Hooks layer

A `use<Entity>` hook owns:
- in-memory state (`useState` for the list, `loading`, `error`)
- a stable `refresh()` (or `useEffect` on mount)
- mutation wrappers that call the api, then optimistically update local state and call `refresh()` on failure

Pages should never import `firebase/firestore` directly. If they do, push that down into a service.

## Auth context for writes

When a page calls a mutation, pass an actor built from `useAuthUser()`:

```ts
const { user, firstName } = useAuthUser();
api.update(id, patch, { uid: user?.uid, name: firstName ?? user?.displayName });
```

This keeps `updatedByName` populated even when `displayName` is empty (which is common for MSAL-linked accounts).

## Things to avoid

- Don't fetch user docs inside services — that belongs in `useAuthUser` or `usage.ts`.
- Don't query without a `query(collection(db, X))` wrapper, even if there are no constraints. It keeps the call sites uniform and easier to extend.
- Don't store mutable arrays as nested fields when items have an identity — promote them to a subcollection.
- Don't log usage from inside an api method. Logging is a page-level concern (call `logUsage` after the mutation resolves).
