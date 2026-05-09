---
name: data-sync-scripts
description: Conventions for the data-extraction/sync scripts under stotteverktoyene/scripts/ — FEST XML, PIM products, HV products from Google Sheets, and pharmacist advice from xlsx. Use when adding a new sync script, modifying extractFestMeds / extractPimProducts / extractPharmacistAdvice / syncHvProductsFromCsv, registering a new npm "*:sync" script, wiring something into prebuild, or troubleshooting a column-mapping error from one of these scripts.
---

# Data sync scripts

These scripts pull external data into checked-in JSON files under `public/data/` (or `src/features/<feature>/`), where the runtime app loads them. They're invoked manually during development and automatically by `prebuild` for the data sources that change frequently.

## Locations

- Scripts: `stotteverktoyene/scripts/`
  - `extractFestMeds.ts` — FEST XML → `src/features/fest/meds.json`
  - `extractPimProducts.ts` — PIM source → `public/data/pimProducts.json`
  - `syncHvProductsFromCsv.ts` — Google Sheets CSV → JSON
  - `extractPharmacistAdvice.mjs` — `rxkatalog/Farmasøytiskråd - <date>.xlsx` + `rxkatalog/<vnr-sku>.xlsx` → `public/data/pharmacistAdviceData.json`
- Source data: `stotteverktoyene/rxkatalog/` and `stotteverktoyene/fest/`
- Output JSON: `public/data/` (served at runtime as `/data/<file>.json`) or feature-local JSON

## npm script naming

In `package.json`:
```json
"<short-name>:sync": "tsx scripts/extract<Thing>.ts"
"<short-name>:sync": "node scripts/extract<Thing>.mjs"      // for pure-JS scripts
"fest:meds":         "tsx scripts/extractFestMeds.ts"       // exception: meds-specific
```

`prebuild` chains the syncs that should run on every CI build:
```json
"prebuild": "npm run pim:sync && npm run raad:sync"
```

If a new sync should run on every build (input file is checked in and stable), add it here. If it depends on private credentials or external network (HV from Google Sheets), keep it manual.

## TS vs MJS

- TypeScript scripts use `tsx` as the runner — no compile step, supports top-level imports.
- The `.mjs` script runs with bare Node and uses `import` plus the `__filename`/`__dirname` reconstruction shim from `extractPharmacistAdvice.mjs`. Use this if a script is small and you don't want to deal with TS types for one-off shapes.

## Conventions

**Resolve paths from `__dirname`**, not from `process.cwd()`. Example:
```ts
const INPUT  = path.resolve(__dirname, "../rxkatalog/<file>.xlsx");
const OUTPUT = path.resolve(__dirname, "../public/data/<file>.json");
```

**Handle messy column names with `resolveColumnKey`-style fuzzy matching.** Spreadsheets exported by humans rename columns constantly. The pattern from `extractPharmacistAdvice.mjs`:

1. Try exact match against a list of known candidates.
2. Try lowercase/trimmed match.
3. Throw with the full key list and a hint that the candidate list needs updating.

Always make the error message Norwegian and helpful: `"Mangler kolonne '<label>'. Fant keys: <keys>. Oppdater kandidatlisten i scriptet."`

**Normalize identifier digits (VNR/SKU)** with `value.replace(/\D+/g, "")`. Excel happily mixes `'012345`, `12345`, and `12345.0`.

**Prefer XLSX → JSON via the `xlsx` package** (`SheetJS`). Read with `XLSX.utils.sheet_to_json(sheet, { defval: "" })` so missing cells become `""` instead of `undefined`.

**Prefer XML via `fast-xml-parser`** for FEST and similar government feeds.

**Trim and collapse whitespace** as the first step on any string field: `String(v ?? "").replace(/\s+/g, " ").trim()`. Excel cells frequently have stray newlines and non-breaking spaces.

**Split bullet lists deterministically.** When a free-text field contains bullets/semicolons, normalize separators to `\n` first (see `splitAdvicePoints` in `extractPharmacistAdvice.mjs`), then split. Keep the separator regex in one helper at the top of the file.

**Sort output deterministically** before writing JSON. Random-order JSON produces noisy diffs.

**Pretty-print JSON with 2-space indent** so diffs are reviewable: `fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));`. Add a trailing newline.

**Log a one-line summary at the end**: `console.log("[<short-name>] Wrote N entries to <path>")`. Norwegian or English both fine, just keep it consistent within a script.

## Adding a new sync script — checklist

1. Drop input file under `stotteverktoyene/rxkatalog/` (or fest/) and add the path to `.gitignore` if it's large/proprietary.
2. Create `scripts/extract<Thing>.ts` (or `.mjs`).
3. Output JSON to `public/data/<thing>.json`.
4. Register a `<short>:sync` npm script.
5. If it should run automatically, append it to `prebuild`.
6. Add a constant in the consumer feature: e.g. `fetch("/data/<thing>.json")` lazy-loaded inside a hook.
7. Run the script locally; verify the JSON diff.

## Don't

- Don't write to `src/` from a script unless the data is small and tightly coupled to a feature (e.g. `meds.json` lives next to FEST mappers). Default destination is `public/data/`.
- Don't commit raw spreadsheets — keep them out of git via `.gitignore`. Only the derived JSON should be checked in.
- Don't import from `src/` into a script. Scripts are standalone; if you need a shared helper, duplicate or extract into `scripts/_lib/`.
