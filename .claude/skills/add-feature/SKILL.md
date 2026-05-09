---
name: add-feature
description: End-to-end checklist for adding a new feature module, page, or sidebar route to Reks Støtteverktøy. Use when the user asks to "add a feature", "add a page", "add a tool", "add a sidebar item", "create a new module under src/features", or otherwise wire a new top-level area into the app shell.
---

# Adding a new feature/page

Features in this app follow a consistent shape. Doing all six steps keeps usage telemetry, lazy-loading, and auth gating consistent.

## 1. Folder structure under `stotteverktoyene/src/features/<feature>/`

Match the existing convention. Not every feature needs every folder — pick the ones that apply:

```
features/<feature>/
  pages/         # Top-level page component(s) referenced by the router
  components/    # Feature-internal presentational components
  hooks/         # Feature-specific React hooks
  services/      # API clients (Firestore, REST, etc.)
  mappers/       # Firestore-doc → domain type mapping
  utils/         # Pure helpers (date, string, render, etc.)
  data/          # Static data (TS modules, JSON)
  types.ts       # Shared types for the feature
```

Reference: `src/features/standardtekster/` is the most complete example. Smaller features (`anbrudd`, `commandpalette`) collapse this aggressively — that's fine.

## 2. Lazy-import the page in `src/app/App.tsx`

```ts
const MyFeaturePage = React.lazy(() => import("../features/myfeature/pages/MyFeaturePage"));
```

If your default export is a named export, use the `.then` shape used for `ProfilePage` / `LoginPage`.

## 3. Register the route inside `Layout`'s `<Routes>`

Add a `<Route path="/myfeature" element={<MyFeaturePage />} />`. If it should be admin-only, wrap it under a `<Route element={<RequireRekspert />}>` block like `/rekspert`.

## 4. Add a sidebar entry

Pick a slot:
- Regular tool → push into `mainItems` in `Sidebar`
- Admin tool → push into `adminItems` (already gated by `hasRekspertAccess`)

Each item needs `{ label, path, Icon, color }`. Pick a distinctive accent color — existing palette: `#29A1FF` (blue, OMEQ), `#4BC76A` (green, standardtekster), `#FF5E5B` (red, interaksjoner), `#C93586` (pink, produkt og råd), `#B648E8` (purple, tilbakemelding), `#FFA726` (orange, anbrudd), `#00A3D7` (cyan, rekspert). Don't reuse a color across mainItems.

## 5. Extend telemetry

Two edits in `App.tsx`:
- Add `"myfeature"` to the `UsagePage` union in `src/shared/services/usage.ts`.
- Add a branch to `pathToUsagePage` so `/myfeature` resolves to `"myfeature"`.

`logUsage("page_view", …)` and `logUsage("menu_click", …)` are already wired — they'll start emitting once your page is reachable.

If your page has a primary user action worth measuring (open, copy, search, …), extend `UsageEventType` and `mapEventToField` as well. Follow the `standardtekst_open` / `standardtekst_copy` pattern.

## 6. Auth gating

The default `Layout` is wrapped in `<RequireAuth>`, so any route inside it requires login. For admin-only pages add a nested `<Route element={<RequireRekspert />}>`. To gate UI inside a page, read flags from `useAuthUser()`:

```ts
const { isOwner, isRekspert, role } = useAuthUser();
const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
```

## 7. Page boilerplate

- Default-export the page component from `pages/MyFeaturePage.tsx`.
- Wrap top-level layout in `<Box>` from MUI; don't re-implement the sidebar.
- Use the MUI theme — don't hardcode colors. See the `mui-theming` skill.
- Norwegian copy throughout. See the `norwegian-copy` skill.

## Smell test before you ship

- `npm run lint` is clean
- `npm run build` succeeds (it runs `prebuild` → `pim:sync` + `raad:sync` first)
- Sidebar label, route path, and `UsagePage` value all agree on a name
- Dark and light mode both look right
- The route renders for both a regular user and a rekspert (or correctly redirects if gated)
