---
name: omeq-calculation
description: Clinical rules for the OMEQ (Oral Morphine Equivalent) calculator — opioid conversion factors, route inference, and FEST product matching. Use whenever touching src/features/omeq/* (calc.ts, parseMedicationInput.ts, opioids.ts, atcProducts.ts, OMEQRow.tsx, MedicationInput.tsx, OMEQPage.tsx) or making any change that could affect a computed daily MME for a real prescription. This is clinically sensitive code — wrong factors mean wrong doses.
---

# OMEQ calculation — clinical rules

OMEQ stands for Oral Morphine Equivalent. The calculator converts a patient's actual opioid regimen into a single morphine-equivalent daily dose so a pharmacist can assess potency, switch products safely, or evaluate cumulative exposure.

This is **clinically sensitive** code. Any change that affects a number must be cross-checked against the existing factor table and, ideally, a published reference.

## Files

- `src/features/omeq/data/opioids.ts` — substance ↔ route ↔ `omeqFactor` table. Source of truth for conversion factors.
- `src/features/omeq/data/atcProducts.ts` — maps ATC code + product form → administration route, used to infer route when the user enters a FEST product.
- `src/features/omeq/lib/calc.ts` — the calculator. `inferRoute`, dose math, factor lookup.
- `src/features/omeq/lib/parseMedicationInput.ts` — parses free-text strength input ("10 mg", "5 mg/ml", "12 µg/h") into `{ value, unit, perHour }`.
- `src/features/omeq/components/MedicationInput.tsx` — autocomplete + strength field.
- `src/features/omeq/components/OMEQRow.tsx` — one regimen row.
- `src/features/omeq/pages/OMEQPage.tsx` — the page itself.

## Domain model

```ts
type AdministrationRoute =
  | "oral" | "parenteral" | "transdermal"
  | "sublingval" | "intranasal" | "rektal";

interface OpioidDefinition {
  id: string;
  substance: string;        // human-readable Norwegian name
  atcCode: ATCcode[];       // one or more ATC codes that map to this row
  route: AdministrationRoute[];
  omeqFactor: number;       // multiplier to convert this route's dose to oral morphine
  isPatch?: boolean;        // transdermal patch (µg/h dosing)
  isShortActing?: boolean;  // immediate-release (used by UI hints)
  helpText?: string;        // tooltip / explanatory text
}
```

`omeqFactor` is the multiplier: `oralMorphineEquivalent = doseInThatRoute * omeqFactor`. Higher factor = more potent than oral morphine.

## Route inference rules (`inferRoute` in `calc.ts`)

The form string from FEST is the primary signal. Order matters:

1. If form contains any of `mikstur`, `dråpe`/`dråper`, `oral`, `oppløsning`, `løsning`, `suspensjon` → **oral**. Critical: oral liquids often have `mg/ml` strengths, but the route is still oral, not parenteral.
2. If form contains `injeks` or `infus` → **parenteral**.
3. Otherwise, fall back to whatever route was mapped in `atcProducts.ts`.

When adding a new oral form (e.g. a new suspension brand), make sure the substring match catches it; don't add a special case unless it really doesn't fit the existing keywords.

Patches (`isPatch: true`) are dosed in µg/h — `parseMedicationInput` sets `perHour: true`. The calculator then multiplies by 24 to get a daily dose. Never silently treat a patch as point-in-time mg.

## Daily dose conventions

- `dailyDose` in `CalcInput` is **antall enheter per døgn** (units per 24 h), not per administration.
- Strengths can be:
  - mass per unit: `10 mg` → straightforward
  - mass per volume: `5 mg/ml` → multiply by volume per dose (mikstur)
  - mass per hour: `12 µg/h` → multiply by 24 (transdermal)

`parseMedicationInput.ts` is the only place that should classify these — don't re-parse strings inside `calc.ts` or components.

## Adding a new opioid

1. Add an entry to `OPIOIDS` in `opioids.ts` with the correct ATC code(s) and route(s).
2. If it's a new route, extend `AdministrationRoute` and update `inferRoute` patterns.
3. Cite the source for the `omeqFactor` in a comment (or the `helpText` field) — at minimum the reference table you used. Future you will need this.
4. Add representative products to `atcProducts.ts` so route inference works without typing strength manually.
5. Add a unit-style sanity check: enter a known dose in `OMEQPage` UI and confirm the computed MME matches the reference.

## Editing an existing factor

- Don't. If you must, treat it as a clinical change: get a second pair of eyes, document the source, and consider whether existing standardtekster / interaction warnings need updating too.

## Display rounding

UI rounds OMEQ to a sensible number of decimals; raw `calc.ts` returns the unrounded number. Don't round inside `calc` — keep arithmetic precise and round at the edge. This makes test cases stable.

## Don't

- Don't introduce floats stored as strings in `opioids.ts` — keep `omeqFactor` numeric so TS catches typos.
- Don't combine factor and route into a single string key. Keep route as a typed enum.
- Don't bypass `parseMedicationInput` from a component.
- Don't infer route from substance name alone — same substance has multiple routes (buprenorphine sublingval vs. transdermal vs. parenteral) with very different factors.
- Don't mix per-administration and per-day dosing in the same field. The whole calculation rests on `dailyDose` being a daily total.
