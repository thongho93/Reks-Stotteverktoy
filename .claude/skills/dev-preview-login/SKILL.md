---
name: dev-preview-login
description: Start Reks-Støtteverktøy dev-serveren på port 5173 og logg inn automatisk med testbrukeren. Bruk når brukeren ber om å "starte dev", "start preview", "åpne appen", "kjør prosjektet", eller liknende — alt der målet er å få appen i gang i Claude Preview ferdig innlogget. Skipper ikke selv om dev-serveren allerede kjører på feil port; da skal den ryddes opp først.
---

# dev-preview-login

Mål: Reks-Støtteverktøy skal starte på **port 5173** og være **innlogget med testbrukeren** før du gir kontrollen tilbake. Skillen er prosjekt-lokal og fungerer på enhver maskin som har repoet — forutsatt at maskinen har en lokal `.env.local` med dev-credentials.

## Credentials

Credentials leses fra `stotteverktoyene/.env.local` (gitignored). Forventede nøkler:

```
DEV_LOGIN_EMAIL=<e-post>
DEV_LOGIN_PASSWORD=<passord>
```

### Steg 0 — sørg for at credentials finnes (kjør FØR alt annet)

Dette steget gjør førstegangs-oppsett på en ny maskin selv-betjent: hvis filen eller en nøkkel mangler, spør brukeren via `AskUserQuestion` og skriv verdiene til `.env.local` for deg.

1. Les `stotteverktoyene/.env.local` med PowerShell-snutten under. Den setter `$email` og `$password` hvis filen finnes og nøklene er fylt inn.
2. Hvis filen mangler eller `DEV_LOGIN_PASSWORD` er tom:
   - Bruk `AskUserQuestion` med spørsmål: **"Passordet for dev-login mangler i `stotteverktoyene/.env.local`. Hva er passordet for `<e-post>`?"** — gi to alternativer: "Bruk samme testkonto som tidligere" og "Annet (skriv inn)". Brukerens svar er passordet i klartekst.
   - Hvis `DEV_LOGIN_EMAIL` også er tom: spør om e-post først på samme måte.
   - Skriv verdiene til `stotteverktoyene/.env.local` med `Set-Content -Encoding utf8` (se snutt under). Hvis filen ikke finnes fra før, opprett den.
   - Ikke gjenta passordet tilbake til brukeren i tekst-svaret. Bekreft kun: "Lagret i .env.local."
3. Les filen på nytt og fortsett.

Lese-snutt (PowerShell):
```powershell
$envFile = "stotteverktoyene/.env.local"
$creds = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
        $k, $v = $_ -split '=', 2
        $creds[$k.Trim()] = $v.Trim()
    }
}
$email = $creds['DEV_LOGIN_EMAIL']
$password = $creds['DEV_LOGIN_PASSWORD']
$needsEmail = [string]::IsNullOrWhiteSpace($email)
$needsPassword = [string]::IsNullOrWhiteSpace($password)
Write-Output "needsEmail=$needsEmail needsPassword=$needsPassword"
```

Skrive-snutt (PowerShell) — kall den ETTER at du har samlet inn manglende verdier fra brukeren:
```powershell
$envFile = "stotteverktoyene/.env.local"
$lines = @(
    "# Lokale dev-credentials for auto-login via Claude-skillen dev-preview-login.",
    "# Denne filen er .gitignored — den skal IKKE committes.",
    "",
    "DEV_LOGIN_EMAIL=$email",
    "DEV_LOGIN_PASSWORD=$password"
)
Set-Content -Path $envFile -Value $lines -Encoding utf8
```

Bruk `$email`/`$password` i steg 4 (login). Ikke ekko verdiene til terminalen ut over `needsEmail`/`needsPassword`-flagget.

> **Sikkerhet:** `.env.local` skal aldri committes (den er allerede i `.gitignore`). Den dedikerte testkontoen er kun for lokal utvikling — ikke legg ekte/personlige credentials der.

## Steg

> Steg 0 (credentials-sjekk + evt. innhenting) er beskrevet i seksjonen "Credentials" over. Kjør det FØR resten.

### 1. Forhåndssjekker (fersk klone)

Disse bør kjøres én gang per maskin. På maskiner der prosjektet allerede har kjørt, vil de fleste returnere tomt og være raske.

**a) Vite-config (`.env`) finnes:**
```powershell
if (-not (Test-Path "stotteverktoyene/.env")) {
    Write-Output "STOP: stotteverktoyene/.env mangler — VITE_FIREBASE_* kreves. Hent .env fra teamet."
}
```
Hvis filen mangler: stopp og be brukeren skaffe den (den er committet under normale omstendigheter; manglende fil betyr klone-problem).

**b) `node_modules` finnes og er ikke utdatert:**
```powershell
$nm = "stotteverktoyene/node_modules"
$lock = "stotteverktoyene/package-lock.json"
$needsInstall = (-not (Test-Path $nm))
if (-not $needsInstall -and (Test-Path $lock)) {
    $lockMtime = (Get-Item $lock).LastWriteTime
    $nmMtime = (Get-Item $nm).LastWriteTime
    if ($lockMtime -gt $nmMtime) { $needsInstall = $true }
}
Write-Output "needsInstall=$needsInstall"
```
Hvis `needsInstall=True`: kjør `npm --prefix stotteverktoyene install`. Dette løser også feil som "Failed to resolve import" som vi har sett før.

**c) Datafiler for Produkt-og-råd:**
```powershell
$dataFiles = @(
    "stotteverktoyene/public/data/pimProducts.json",
    "stotteverktoyene/public/data/pharmacistAdviceData.json"
)
$missing = $dataFiles | Where-Object { -not (Test-Path $_) }
if ($missing) { Write-Output "missingData=$($missing -join ',')" }
```
Hvis noen mangler: kjør `npm --prefix stotteverktoyene run pim:sync` og/eller `npm --prefix stotteverktoyene run raad:sync` for å generere dem. Disse er gitignored men whitelistet i `.gitignore` (linje 45–46) — de skal eksistere lokalt, ikke i git. Hvis sync-scriptene feiler (typisk fordi de trenger Excel/CSV-kildefiler som ikke ligger i klonen), rapporter til brukeren og fortsett uten — appen kjører fortsatt, men Produkt-og-råd-/Interaksjon-sidene vil ikke laste data.

### 2. Frigjør port 5173

Sjekk om noen lytter på 5173. Hvis det er en gammel `node`-prosess (typisk en glemt Vite-instans), drep den. Hvis det er noe annet — stopp og spør brukeren før du dreper.

```powershell
$conn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
        Stop-Process -Id $conn.OwningProcess -Force
        Write-Output "Killed stale node on 5173 (PID $($conn.OwningProcess))"
    } else {
        Write-Output "Port 5173 occupied by $($proc.ProcessName) (PID $($conn.OwningProcess)) — STOP and ask user"
    }
}
```

### 3. Start Vite på port 5173

Bruk `preview_start` med den navngitte konfigurasjonen `"Stotteverktoyene Dev"` fra [.claude/launch.json](../../launch.json). Den er allerede satt opp med `port: 5173` og `autoPort: false`, så den feiler synlig hvis porten ikke er ledig (i stedet for å falle til 5174):

```
preview_start({ name: "Stotteverktoyene Dev" })
```

Hvis du får en feil om at porten er opptatt: gå tilbake til steg 2.

### 4. Vent på serveren

Bruk `preview_logs` (eller `preview_snapshot`) til Vite rapporterer "ready" og appen mounter. Vanligvis tar første snapshot 1–2 sekunder. Hvis du fortsatt ser "Failed to resolve import" på en pakke etter forhåndssjekkene — kjør `npm --prefix stotteverktoyene install` på nytt og restart serveren med `preview_stop` + `preview_start`.

### 5. Logg inn

Login-skjemaet er Firebase Auth via MUI TextFields (se [stotteverktoyene/src/app/auth/LoginPage.tsx](../../../stotteverktoyene/src/app/auth/LoginPage.tsx)). Selektorer:

- E-post: `input[autocomplete="email"]`
- Passord: `input[type="password"]`
- Submit: `button[type="submit"]` inni `.authForm` (knappen viser "LOGG INN")

Steg:

1. `preview_snapshot` — bekreft at du ser login-skjemaet ("Logg inn"-overskrift). Hvis du i stedet ser hovedmenyen (sidebar med "OMEQ-beregning", "Standardtekster" osv.) er du allerede innlogget fra forrige sesjon — hopp til steg 6.
2. `preview_fill` med `input[autocomplete="email"]` → `$email` (fra `.env.local`)
3. `preview_fill` med `input[type="password"]` → `$password` (fra `.env.local`)
4. `preview_click` på `button[type="submit"]`
5. `preview_snapshot` igjen.

**Sjekk utfallet:**

- Hvis snapshot viser sidebar med menypunkter ("OMEQ-beregning", "Standardtekster", osv.) → innlogget OK. Fortsett til steg 6.
- Hvis snapshot viser tekst om at brukeren venter på godkjenning, eller URL inneholder `/pending-approval` → testbrukeren er ikke godkjent i Firestore (`approved: false`). Se [RequireRekspert.tsx:74](../../../stotteverktoyene/src/app/auth/RequireRekspert.tsx) og [useAuthUser.ts](../../../stotteverktoyene/src/app/auth/useAuthUser.ts). Rapporter dette til brukeren — Firebase-bruker må manuelt settes `approved: true` i Firestore-doc `users/<uid>`. Ikke prøv å logge inn med en annen bruker uten å spørre.
- Hvis snapshot viser `Alert severity="error"` i skjemaet (tekst på rød bakgrunn) → rapporter feilmeldingens tekst og stopp. Ikke prøv andre passord.

### 6. Bekreft og rapporter

Gi brukeren én kort linje med:
- URL (http://localhost:5173/)
- Innlogget-status (ja / venter på godkjenning / feil + tekst)

Ikke ta `preview_screenshot` med mindre brukeren ba om det.

## Feilmodi

- **`.env` mangler:** Stopp. Bruker må skaffe `stotteverktoyene/.env` (Firebase-config).
- **Port 5173 opptatt av ikke-node-prosess:** Stopp, spør brukeren før du dreper.
- **Pakke ikke funnet (`Failed to resolve import`):** Kjør `npm --prefix stotteverktoyene install`, restart server.
- **Datafiler mangler og sync-script feiler:** Rapporter, fortsett — appen kjører, men noen sider mangler data.
- **Login → `/pending-approval`:** Testbruker ikke godkjent i Firestore. Rapporter, ikke prøv andre brukere.
- **Login feiler med "user not found" / "wrong password":** Bruker slettet eller passord endret. Rapporter — ikke prøv andre passord.
- **Login-skjemaet vises ikke (siden er blank):** Sjekk `preview_console_logs` for runtime errors og rapporter.
