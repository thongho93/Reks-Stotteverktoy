# Reks Støtteverktøy

## Preview / dev-server

Bruk skillen `.claude/skills/dev-preview-login/` for å starte dev-serveren og logge inn. Den håndterer port 5173, henter credentials fra `stotteverktoyene/.env.local` (gitignored), og logger inn automatisk. Ikke hardkode passord her eller andre steder i repoet.

## Release notes

Når en branch endrer noe brukerne merker, legg et nytt innslag øverst i `stotteverktoyene/src/releaseNotes/releases.json` før merge. Format og regler står i `stotteverktoyene/src/releaseNotes/README.md`. Skriv for brukerne i apotekene, ikke for utviklere.
