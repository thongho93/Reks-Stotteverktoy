# Reks Støtteverktøy

Et moderne støtteverktøy for farmasøyter som gjør omregninger og oppslag enklere, raskere og mer oversiktlige.

## Om prosjektet

Reks Støtteverktøy er utviklet for å forbedre tradisjonelle omregningstabeller ved å gjøre dem mer brukervennlige i en digital arbeidsflate. Målet er å støtte farmasøyter i praktiske vurderinger og daglige arbeidsoppgaver der nøyaktighet og effektivitet er viktig.

## Hvordan appen fungerer

Appen er laget for å være enkel å bruke:

1. Åpne verktøyet i nettleseren.
2. Legg inn relevante verdier eller velg ønsket type beregning.
3. Appen utfører beregningen automatisk.
4. Resultatet vises umiddelbart i et ryddig og lettlest grensesnitt.

Dette gjør det enklere å jobbe raskt og samtidig redusere risikoen for manuelle feil.

## Hva appen brukes til

Reks Støtteverktøy kan brukes til:

- omregninger mellom ulike verdier og enheter
- støtte i farmasøytiske vurderinger
- raskere oppslag enn i manuelle tabeller
- bedre oversikt i en travel arbeidshverdag

## Hvorfor dette prosjektet finnes

Tradisjonelle tabeller kan være nyttige, men de er ikke alltid like raske eller intuitive i bruk. Dette prosjektet forsøker å gjøre samme informasjon mer tilgjengelig gjennom en enkel, digital løsning tilpasset praktisk bruk.

## Teknologi

Prosjektet er hovedsakelig bygget med:

- **TypeScript**
- **CSS**

## Lokal utvikling

For å kjøre prosjektet lokalt:

```bash
npm install
npm run dev
```

## Videre planer

Mulige forbedringer fremover kan være:

- flere støtteverktøy og beregninger
- tydeligere forklaringer til resultater
- bedre mobiltilpasning
- ekstra validering av input
- forbedret dokumentasjon og brukerhjelp

## Status

Prosjektet er under utvikling, og både funksjonalitet og innhold kan bli endret over tid.

## Anbefalt branch protection for `main`

Repo-innstillinger kan ikke håndheves via kode i dette prosjektet, så bruk følgende oppsett manuelt i **Settings → Branches → Add rule** med branch pattern `main`:

- **Require a pull request before merging** (ingen direkte push til `main`)
- **Require approvals**: minst **1** godkjenning
- **Dismiss stale pull request approvals when new commits are pushed**
- **Require review from Code Owners** (når/om CODEOWNERS brukes)
- **Require conversation resolution before merging**
- **Require status checks to pass before merging** (velg relevante CI-checks når de finnes)
- **Require branches to be up to date before merging**
- **Require linear history** (anbefalt for ryddig historikk i små team)
- **Do not allow bypassing the above settings** (inkluder administratorer)
- **Allow force pushes**: **av**
- **Allow deletions**: **av**

Dette gir en trygg, praktisk standard for solo/små team som bruker pull requests som eneste vei inn i `main`.
