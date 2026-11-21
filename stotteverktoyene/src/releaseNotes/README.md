# Release notes

`releases.json` styrer «Hva er nytt»-dialogen og arkivsiden.

## Hva skal med?

Ikke alle endringer trenger et innslag. Dialogen vises for alle brukerne, så den skal bare nevne det de faktisk bør få med seg.

**Ta med**
- Store nyheter: en ny side, en ny funksjon eller en tydelig ombygging av noe brukerne bruker ofte.
- Viktige rettelser: noe som kunne gitt feil svar i jobben, for eksempel feil dose, aldersgrense eller omregning.
- Endringer som gjør at brukerne må gjøre noe på en annen måte enn før.

**Ikke ta med**
- Små justeringer av utseende og tekst.
- Ny informasjon om enkeltprodukter, nye produktbilder og nye produkter i en liste.
- Feil som brukerne ikke har merket, og interne endringer.

Treffer ingenting av dette: ikke lag et innslag. Deploy uten innslag gir bare den vanlige, stille «Ny versjon»-linjen.

## Gruppering

- Flere små ting i samme område samles i **én linje**, for eksempel «Flere forbedringer i Næringsmidler».
- Nye produkter (legemidler, næringsdrikker osv.) og ny produktinfo samles i én linje per type. Ikke list opp hvilke produkter det er.
- Maks 3–4 punkter per oppdatering.

## Slik legger du til en oppdatering

Før du merger en branch som endrer noe brukerne merker, legg et nytt innslag **øverst** i `releases.json`:

```json
{
  "id": "2026-11-20",
  "date": "2026-11-20",
  "summary": "Én til to setninger som oppsummerer hele oppdateringen.",
  "items": [
    { "type": "nytt", "title": "Kort tittel", "text": "Én setning for brukeren." }
  ]
}
```

- `id` må sortere etter dato. Bruk `2026-11-20-2` hvis det kommer to samme dag.
- `type` er `nytt`, `forbedret` eller `rettet`.
- Skriv for brukerne i apotekene, ikke for utviklere. Ingen interne begreper.

## Hva skjer ved merge

1. Byggingen skriver hele listen inn i `version.json` (se `vite.config.ts`).
2. Åpne faner oppdager ny versjon og leser listen derfra.
3. Er det innslag nyere enn det brukeren sist har sett, vises dialogen med «Oppdater nå».
4. Deploy uten nytt innslag gir bare den vanlige, stille «Ny versjon»-linjen.
5. Åpner brukeren appen først etter deployen, vises samme dialog med «Forstått».

Hva brukeren har sett, lagres i `localStorage` (`release-notes-seen`).
