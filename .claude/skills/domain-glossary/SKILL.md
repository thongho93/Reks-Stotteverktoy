---
name: domain-glossary
description: Norwegian + pharmacy domain glossary for Reks Støtteverktøy. Use whenever a request, file path, identifier, or UI string contains Norwegian or pharmacy-specific terminology (anbrudd, standardtekster, interaksjoner, knuse-deleliste, OMEQ, FEST, vnr, ATC, rekspert, råd, tilbakemelding, produkt og råd, etc.) so terms are translated correctly and routed to the right feature folder.
---

# Domain glossary — Reks Støtteverktøy

Reks Støtteverktøy is a support tool for Norwegian pharmacists ("farmasøyter"). Almost every folder, route, and UI string is in Norwegian, and several terms are pharmacy-specific. Translate carefully — the wrong gloss will silently route you to the wrong feature.

## App-level terms

- **Reks / REKS+** — the brand. The app's chain context (Reks = a Norwegian pharmacy chain). Keep capitalization "REKS+" in UI.
- **Støtteverktøy** — "support tools". The whole app.
- **Rekspert** — internal admin/power-user role (a portmanteau of "Reks" + "ekspert"). Gated by `RequireRekspert`. Has access to `/rekspert` admin tooling. NOT a typo for "expert".
- **Bruker / brukar** — user.
- **Eier (owner)** — root admin, controlled by `VITE_OWNER_UID`.

## Feature modules (one per folder under `stotteverktoyene/src/features/`)

- **omeq** — Oral Morphine Equivalent calculator. Converts opioid doses across substances/routes. Core math in `lib/calc.ts`, factor table in `data/opioids.ts`.
- **standardtekster** — "Standard texts". Reusable counselling snippets pharmacists copy at the counter. Firestore-backed (`Standardtekster` collection). Most actively edited feature.
- **interaksjoner** — Drug-drug interaction search. Surfaces standardtekster relevant to a given interaction.
- **produktograd** — "Produkt og råd" = "Product and advice". Two tabs:
  - **Knuse-deleliste** ("crush/split list") — which tablets may be crushed, split, or opened. Sourced from `KnuseDeleListen v 16.pdf`.
  - **Nutrition product finder** — clinical/medical nutrition products (Fresubin, Fortini, Diasip, Cubitan, Calogen, etc.).
- **anbrudd** — "broken seal / opened-package". Tracks first-opened-date for products with limited shelf-life after opening. Currently rendered as an embedded Office Form / SharePoint page.
- **statistikk** — usage statistics dashboard, fed by `usage_daily/*` Firestore collections (see `shared/services/usage.ts`).
- **tilbakemelding** — "feedback / input". User-submitted notes and suggestions. Sidebar label is "Innspill og notater".
- **fest** — FEST = Forskrivnings- og ekspedisjonsstøtte. Norwegian government drug master data (Legemiddelverket). Imported via `scripts/extractFestMeds.ts` from XML, output to `src/features/fest/meds.json`.
- **kunstigintelligens** — "artificial intelligence". AI-related feature (currently scaffolded).
- **commandpalette** — Cmd/Ctrl-K global search. `GlobalSearch.tsx` + `useGlobalSearchHotkey.ts`.
- **teamsChat** — Microsoft Teams chat embed. Routes `/intern-chat` and `/teams-chat` currently redirect to `/omeq`.
- **rekspert** — admin-only page; gated.
- **produktskjema** — legacy route, now redirects to `/anbrudd`.

## Pharmacy / regulatory terms

- **ATC-kode** — Anatomical Therapeutic Chemical code (e.g. `N02AE01` = buprenorphine). Used as drug identifiers across FEST and `atcProducts.ts`.
- **VNR** ("varenummer") — Norwegian product code, the primary SKU. Often appears alongside ATC. Sometimes 6 digits, sometimes 7. Normalize via digit-only stripping (see `extractPharmacistAdvice.mjs`).
- **SKU** — Reks's internal stock-keeping number. The Excel "Kobling vnr sku" file maps VNR ↔ SKU.
- **PIM-produkter** — Product Information Management catalogue. Synced via `npm run pim:sync` → `public/data/pimProducts.json`.
- **HV-produkter** — "Handelsvare" = non-prescription / OTC merchandise. Synced via `npm run hv:sync` from a Google Sheets CSV.
- **Råd / farmasøytisk råd** — pharmacist counselling text. Synced via `npm run raad:sync` → `public/data/pharmacistAdviceData.json`.
- **Reseptfri / reseptpliktig** — OTC / prescription-only.
- **Mikstur** — oral liquid suspension. Important for route inference in `omeq/lib/calc.ts` (mikstur → `oral`, even when strength is `mg/ml`).
- **Dråper / dråpe** — drops (oral). Same route logic as mikstur.
- **Injeksjon / infusjon** — injection / infusion → `parenteral`.
- **Plaster** — patch (transdermal).
- **Sublingval / bukkal** — under the tongue / between cheek and gum.
- **Suppositorier / stikkpiller** — suppositories → `rektal`.
- **Knuse / dele** — crush / split (a tablet).
- **Anbrudd** — once a multi-dose product is opened, its shelf life often shortens. "Anbruddsdato" = date-of-first-opening.
- **OMEQ** — Oral Morphine Equivalent (synonyms: OME, MME). Standardised opioid potency unit.

## UI / sidebar labels (don't rename casually)

- "OMEQ-beregning" — the calculator page
- "Standardtekster"
- "Interaksjonssøk"
- "Produkt og råd"
- "Innspill og notater" (route: `/tilbakemelding`)
- "Innkjøp og anbrudd" (route: `/anbrudd`)
- "Rekspert-verktøy" (group header for admin items)

## Conventions

- Comments and error messages in scripts are Norwegian (e.g. `"Mangler kolonne '${label}'..."`). Keep new ones in Norwegian unless the surrounding code is English.
- File and folder names use lowercase Norwegian (no diacritics in folders: `stotteverktoyene`, not `støtteverktøyene`). Keep that convention.
- Variables/types in TS are English (e.g. `OpioidDefinition`, `AdministrationRoute`). Domain values inside them stay Norwegian (`"sublingval"`, `"rektal"`).

When in doubt, grep for the term — every concept above has at least one named file or symbol you can anchor to.
