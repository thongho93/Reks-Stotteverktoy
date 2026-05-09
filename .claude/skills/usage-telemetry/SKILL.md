---
name: usage-telemetry
description: How usage analytics are recorded in Reks Støtteverktøy via shared/services/usage.ts → usage_daily Firestore collections. Use when adding a new event type, instrumenting a new feature page, extending the UsagePage union, debugging why an event isn't being recorded, or interpreting the statistikk dashboard's data shape.
---

# Usage telemetry

Source: `stotteverktoyene/src/shared/services/usage.ts`. Consumed by the statistikk page (`src/features/statistikk/`) and feeds the daily dashboards.

## What gets logged where

Three top-level event surfaces, all under `usage_daily/{YYYY-MM-DD}/`:

- `users/{uid}` — per-user, per-day rollup
- `totals/all` — global, per-day rollup
- `standardtekster/{id}` and `users/{uid}/standardtekster/{id}` — per-standardtekst opens

All writes use `setDoc(..., { merge: true })` with `increment(1)` counters, so they are safe to call repeatedly.

## Event types (`UsageEventType`)

```ts
"app_open" | "page_view" | "menu_click"
| "standardtekst_open" | "standardtekst_copy" | "search_standardtekster"
```

Each maps to a single canonical counter field via `mapEventToField`:
- `app_open → opens`
- `page_view → pageViews`
- `menu_click → menuClicks`
- `standardtekst_open → standardtekstOpens`
- `standardtekst_copy → copies`
- `search_standardtekster → searches`

There's also a uniform `eventCounts.<event>` increment for every event, so the dashboard can be built either off the named field or the generic map.

## `UsagePage` union

```ts
"home" | "omeq" | "standardtekster" | "interaksjoner" | "produktograd"
| "profil" | "statistikk" | "produktskjema" | "tilbakemelding"
| "anbrudd" | "teamschat" | "rekspert" | "other"
```

When you add a new feature/route, **also** add its slug here. `pathToUsagePage` in `App.tsx` maps `location.pathname` → this union. Any unmapped path falls through to `"other"` and is invisible in the dashboard breakdowns.

## Sessions

`ensureSession` uses `localStorage` keys `usage:session-id` and `usage:last-activity-ms` with a **30-minute** inactivity timeout. A new session increments `sessions` on both user and totals docs. Don't roll your own session id — call `logUsage("app_open")` on mount, which is already wired into `Layout`.

## Path counters

`page_view` events also bump:
- `pageViewsByPage.<usagePage>` (typed slug)
- `pageViewsByPath.<pathKey>` (sanitized full path; `/` becomes `root`, slashes become `__`, anything non-`[a-z0-9_-]` becomes `_`, max 120 chars)

…and store the human-readable original path in `pathLabels.<pathKey>` so the dashboard can show pretty names.

## Adding a new event type

1. Append the literal to `UsageEventType`.
2. Add a case to `mapEventToField` if it deserves its own named counter (otherwise it falls through to `events`, which is fine for ad-hoc events).
3. If the event has a typed payload field, extend `UsageEventMetadata` (e.g. `searchLen`, `targetPage`).
4. Inside `logUsage`, add any extra side-bumps your event needs (e.g. extra subcollections, like `standardtekster/{id}`).
5. Call from the page: `logUsage("my_event", { … })`.

Keep the field count bounded — Firestore rejects docs with too many distinct fields. When tracking entity-level breakdowns (like per-standardtekst opens), use a subcollection, not a wide field-per-entity counter on the parent doc.

## Adding a new page's `page_view` instrumentation

Already automatic if you wire your route into `Layout` — the existing `useEffect` on `location.pathname` calls `logUsage("page_view", { page, pagePath })`. The only thing you must do is extend `UsagePage` and `pathToUsagePage` so your page doesn't get bucketed as `"other"`.

## Failure mode

Errors inside `logUsage` are caught and warned (`console.warn("[usage] Kunne ikke logge bruk:", error)`). Telemetry never breaks the user flow. Don't `await` it from a critical path — fire-and-forget is fine.

## Don't

- Don't write directly to `usage_daily/*` from feature code. Always go through `logUsage`.
- Don't add high-cardinality dimensions (search query strings, free-text). Hash or bucket first; we already do this for `searchLen`.
- Don't change `getTodayKey` to a different timezone without updating the dashboard queries.
- Don't trust `auth.currentUser` to be present — `logUsage` already returns early if signed out, and your call sites should do the same when relevant.
