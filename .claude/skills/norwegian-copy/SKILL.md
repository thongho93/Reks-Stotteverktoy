---
name: norwegian-copy
description: Norwegian (Bokmål) UI copy conventions for Reks Støtteverktøy — tone, capitalization, vocabulary choices, error messages, and date/number formatting. Use whenever writing or editing user-facing strings (page titles, sidebar labels, button labels, form helper text, validation messages, dialog copy, console warnings shown to users), or naming routes/sections that map to existing Norwegian terms.
---

# Norwegian (Bokmål) UI copy

All user-facing copy is Norwegian Bokmål. The audience is Norwegian pharmacists ("farmasøyter") in a clinical-but-friendly context. Tone target: precise, calm, and professional — closer to "fagperson som hjelper" than marketing.

## Spelling and casing

- **Sentence case for headings**, not Title Case: `"Standardtekster"`, `"Innkjøp og anbrudd"`, `"Produkt og råd"` — not `"Innkjøp Og Anbrudd"`.
- Norwegian **does not capitalize common nouns mid-sentence** (unlike German). Only proper nouns and the start of a sentence.
- Keep characters: æ, ø, å. Use them in copy. Use ASCII fallbacks **only** in folder/file names (`stotteverktoyene`, not `støtteverktøyene`).
- Brand: **REKS+** with the plus sign, all caps. Don't write "Reks+" or "REKS Plus".
- **Rekspert** — capitalized as a title in headings ("Rekspert-verktøy"); lowercase elsewhere.

## Established sidebar labels (don't paraphrase)

- "OMEQ-beregning"
- "Standardtekster"
- "Interaksjonssøk"
- "Produkt og råd"
- "Innspill og notater" (route `/tilbakemelding`)
- "Innkjøp og anbrudd" (route `/anbrudd`)
- "Rekspert" (route `/rekspert`, under heading "Rekspert-verktøy")

If you change one of these, search the repo — the same string appears in `Sidebar`, `pathToUsagePage`, page `<title>`, and possibly user-facing analytics labels.

## Common terms — preferred form

- "legemiddel" (drug/medication), plural "legemidler" — NOT "medisin" in clinical contexts (medisin is fine for lay copy)
- "preparat" (preparation/product) — used in standardtekster panel headers
- "virkestoff" — active substance
- "styrke" — strength (e.g. "10 mg")
- "døgn" — 24-hour day; "per døgn" is the standard for daily dose
- "anbrudd" — keep as-is; don't translate
- "legeforordning / forordning" — prescription/order
- "reseptpliktig / reseptfri" — Rx / OTC
- "tilbakemelding" — feedback (the page label is "Innspill og notater"; "tilbakemelding" is fine in body copy)
- "lagre" — save (button)
- "avbryt" — cancel
- "lukk" — close
- "slett" — delete (be careful: prefer "fjern" = remove for non-destructive removal)
- "rediger" — edit
- "opprett ny" — create new (followed by entity, e.g. "Opprett ny standardtekst")

## Error and validation copy

Pattern: stay calm, name what's missing, suggest the fix. Examples to match:

- `"Mangler kolonne 'Tittel'. Fant keys: ... Oppdater kandidatlisten i scriptet."` (script error)
- `"Kunne ikke logge bruk: …"` (silent telemetry failure)
- `"Uten tittel"` (default title fallback)

Avoid: exclamation marks ("Feil!"), capitalized scolding ("UGYLDIG"), idioms ("oi sann"). A pharmacist on a busy shift should read these as informational.

## Numbers, units, dates

- **Decimal separator: comma.** "10,5 mg", not "10.5 mg". `numberFormat.ts` in `shared/lib/` handles this — use it instead of `Number.toFixed()`.
- **Thousands separator: non-breaking space** ("12 500 kr") in formatted output, but write source-code numbers normally.
- **Units after the number with a space**: "5 mg", "12 µg/h", "10 ml". Exception: "%" attached: "5 %" with non-breaking space, but inline UI may use plain `%` for compactness — match nearby code.
- **Dates**: `dd.mm.yyyy` for short form, "9. mai 2026" for long form. Use Intl with locale `"nb-NO"` rather than ad-hoc formatting:
  ```ts
  new Intl.DateTimeFormat("nb-NO", { dateStyle: "long" }).format(date);
  ```
- **Sort with locale `"nb"`**: `a.localeCompare(b, "nb")`. Otherwise æ/ø/å sort wrong.

## Tone examples

- Good: "Standardtekster oppdateres jevnlig. Sjekk at innholdet stemmer før du sender."
- Avoid (too casual): "Husk å sjekke at standardteksten din er fresh!"
- Avoid (too stiff): "Vennligst forsikre Dem om at standardtekstens innhold er korrekt."

Address the user as "du", not "De" or "Dem". Avoid imperative shouting; prefer information over instruction where possible.

## Microcopy quirks specific to this app

- Drawer toggle tooltips: "Utvid meny" / "Skjul meny" (not "Åpne" / "Lukk").
- Empty list states: short, no emoji, often "Ingen <X> funnet."
- Success confirmations: brief, e.g. "Lagret." rather than "Standardteksten ble lagret med suksess."

## Don't

- Don't mix English and Norwegian in the same UI string ("Save endringer").
- Don't translate ATC codes, VNR numbers, or substance names taken from FEST — those are canonical identifiers.
- Don't sentence-case acronyms (OMEQ stays OMEQ, ATC stays ATC, FEST stays FEST).
- Don't auto-translate copy with an LLM and ship it without a Norwegian-speaking review when the term is clinical — pharmacy terminology is precise and often surprising.
