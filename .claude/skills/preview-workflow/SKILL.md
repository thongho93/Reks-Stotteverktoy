---
name: preview-workflow
description: How to drive the local Vite preview for Reks Støtteverktøy — auto-login with the test account, navigating to feature routes, and the typical inspect-after-change loop. Use whenever starting or interacting with the preview (preview_start, preview_fill, preview_click, preview_screenshot), verifying a UI change in-browser, or testing role-gated routes.
---

# Preview workflow

The dev preview runs `npm run dev` (Vite, port `5173`) from `stotteverktoyene/`. The launch config is in `.claude/launch.json` at both the project root and in `stotteverktoyene/.claude/launch.json`.

## Auto-login (mandated by root CLAUDE.md)

Every session that uses the preview starts the same way:

1. `preview_start`
2. Fill the login form with:
   - **E-post**: `testuser2@farmasiet.no`
   - **Passord**: `11223344`
3. Submit (`preview_click` on the sign-in button).
4. Wait for the dashboard (`/omeq` after login redirect) before doing anything else.

Do this **before** any other preview interaction. Skipping it lands you on `/login` and every subsequent click fails silently.

## Routes worth knowing

- `/` → home dashboard
- `/omeq` → OMEQ calculator (default after login)
- `/standardtekster` → standard texts editor
- `/interaksjoner` → drug interactions search
- `/produkt-og-rad` → produkt og råd (knuse-deleliste + nutrition finder)
- `/tilbakemelding` → feedback (sidebar: "Innspill og notater")
- `/anbrudd` → embedded form (sidebar: "Innkjøp og anbrudd")
- `/statistikk` → usage dashboard
- `/profil` → user profile
- `/rekspert` → admin tools (gated; `testuser2` may not have access — use the rekspert test account if you have one, otherwise expect a redirect)
- `/login`, `/pending-approval` → auth screens

`/intern-chat`, `/teams-chat`, and `/produktskjema` redirect (the first two to `/omeq`, the last to `/anbrudd`).

## Common verify loop

After a UI change:

1. Make the edit.
2. Vite HMR will reload — usually no manual restart needed. If you changed `vite.config.ts`, MUI theme tokens, or anything in `App.tsx`'s top-level providers, do `preview_stop` + `preview_start` to be safe.
3. Navigate to the affected page (`preview_navigate` or click the sidebar item).
4. `preview_screenshot` to confirm visual state.
5. Toggle dark mode (the profile menu has the toggle, or the colorMode context exposes it via the avatar dropdown) and re-screenshot — both modes need to look right.

## Testing role-gated UI

`testuser2@farmasiet.no` is a regular user. To test rekspert-only paths:

- Create or reuse a test user with `users/{uid}.role: "rekspert"` (or add their uid to `owners/{OWNER_UID}.roles`).
- Or temporarily flip the local user doc in Firestore (revert before committing).
- Confirm both states: a regular user should NOT see "Rekspert" in the sidebar and should be redirected away from `/rekspert`.

Don't hardcode role assumptions in code paths that the preview will hit — the test account's role should be the same one production uses for that email.

## Common pitfalls

- **Login form rendering late.** MSAL provider initializes asynchronously; if `preview_fill` runs too early, the field selectors miss. Wait for the email input to be present before filling.
- **App Check failing in preview.** If Firebase calls error with App Check rejection, check `firebase/appCheck.ts` and the env vars. The preview may need a debug token; don't disable App Check globally just to make the preview work.
- **Stale build cache.** If a code change isn't reflecting, check the `.vite/` folder. `rm -rf .vite/` then restart preview.
- **Auto-login fights you.** If you're testing the unauthenticated flow (`/login`, `/pending-approval`), comment-skip the auto-login step for that turn — but say so explicitly so it's clear why.

## Don't

- Don't paste real user credentials into the preview. The only credentials that belong here are `testuser2@farmasiet.no` / `11223344`.
- Don't `preview_click` blindly without a `preview_screenshot` first — coordinates and selectors drift between renders, especially with the lazy-loaded routes.
- Don't run `npm run build` to "verify" UI changes; build only catches type errors. Use the live preview for visual verification.
- Don't skip the auto-login step "just this once" — it's the project convention, and skipping it produces confusing failures.
