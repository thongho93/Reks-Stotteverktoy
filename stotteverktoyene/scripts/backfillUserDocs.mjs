// Backfill users/{uid} for kontoer som finnes i Firebase Auth, men mangler
// brukerdokument i Firestore.
//
// Hvorfor: isApprovedUser() i firestore.rules krever at users/{uid} FINNES.
// Mangler dokumentet, avvises brukeren på alt delt innhold (feedbacks,
// fagligDocuments, internalChats) med permission-denied. Dokumentet kan mangle
// for kontoer opprettet direkte i Firebase-konsollen, eller der skrivingen ved
// registrering feilet. Slike brukere vises heller ikke i brukerlisten på
// Profil-siden, så eier kan ikke godkjenne dem fra appen – derfor dette skriptet.
//
// Kjør (tørrkjøring, skriver ingenting):
//   GOOGLE_APPLICATION_CREDENTIALS=/sti/til/serviceAccount.json npm run users:backfill
// Skriv dokumentene (approved: false – eier godkjenner etterpå i appen):
//   ... npm run users:backfill -- --apply
// Skriv dem ferdig godkjent (bruk kun for brukere du vet skal ha tilgang):
//   ... npm run users:backfill -- --apply --approved
//
// Idempotent: eksisterende dokumenter røres ikke, uansett innhold.
//
// GDPR: skriptet leser og skriver ut e-postadresser til ansatte. Ikke lagre
// utdata i repoet eller del det videre. Servicekonto-nøkkelen er en hemmelighet
// – hold den utenfor git (bruk en sti utenfor prosjektet).

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const APPROVED = process.argv.includes("--approved");

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;

if (!keyPath) {
  console.error(
    "Mangler servicekonto. Sett GOOGLE_APPLICATION_CREDENTIALS til stien til\n" +
      "service-account-JSON-filen (Firebase-konsoll > Prosjektinnstillinger >\n" +
      "Tjenestekontoer > Generer ny privat nøkkel)."
  );
  process.exit(1);
}

let credential;
try {
  // Les filen selv, så vi kan gi en tydelig feilmelding hvis stien er feil.
  const raw = JSON.parse(readFileSync(keyPath, "utf-8"));
  credential = cert(raw);
  console.log(`Prosjekt: ${raw.project_id}`);
} catch (err) {
  console.error(`Kunne ikke lese servicekonto fra ${keyPath}: ${err.message}`);
  console.error("Faller tilbake til applicationDefault().");
  credential = applicationDefault();
}

initializeApp({ credential });

const auth = getAuth();
const db = getFirestore();

/** Fornavn er det appen viser; Auth har sjelden mer enn displayName/e-post. */
function guessFirstName(user) {
  const display = (user.displayName || "").trim();
  if (display) return display.split(/\s+/)[0];

  const local = (user.email || "").split("@")[0];
  if (!local) return "";

  // fornavn.etternavn@farmasiet.no -> Fornavn
  const first = local.split(/[._-]/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

/** Alle Auth-brukere, sidevis (1000 per kall). */
async function listAllAuthUsers() {
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

const [authUsers, userDocs] = await Promise.all([
  listAllAuthUsers(),
  db.collection("users").select().get(),
]);

const existingUids = new Set(userDocs.docs.map((d) => d.id));
const authUids = new Set(authUsers.map((u) => u.uid));

const missing = authUsers.filter((u) => !existingUids.has(u.uid));
const orphans = [...existingUids].filter((uid) => !authUids.has(uid));

console.log(
  `\nAuth-kontoer: ${authUsers.length}  |  users-dokumenter: ${existingUids.size}` +
    `  |  mangler dokument: ${missing.length}`
);

if (orphans.length > 0) {
  // Kun rapport: dokumenter uten Auth-konto kan være slettede ansatte. Rydding
  // er en egen avgjørelse – skriptet sletter aldri noe.
  console.log(
    `\nusers-dokumenter uten Auth-konto (${orphans.length}) – vurder opprydding manuelt:`
  );
  for (const uid of orphans) console.log(`  ${uid}`);
}

if (missing.length === 0) {
  console.log("\nIngen kontoer mangler brukerdokument. Ingenting å gjøre.");
  process.exit(0);
}

console.log(`\nKontoer som mangler users/{uid}:`);
for (const u of missing) {
  console.log(
    `  ${u.uid}  ${u.email ?? "(ingen e-post)"}  opprettet ${u.metadata.creationTime}`
  );
}

if (!APPLY) {
  console.log(
    `\nTørrkjøring – ingenting er skrevet. Kjør på nytt med --apply for å` +
      ` opprette de ${missing.length} dokumentene` +
      ` (approved: ${APPROVED ? "true" : "false"}).`
  );
  process.exit(0);
}

// Batch tar 500 skrivinger; del opp så store prosjekter også går gjennom.
const CHUNK = 400;
let written = 0;

for (let i = 0; i < missing.length; i += CHUNK) {
  const chunk = missing.slice(i, i + CHUNK);
  const batch = db.batch();

  for (const u of chunk) {
    batch.create(db.collection("users").doc(u.uid), {
      email: u.email ?? "",
      firstName: guessFirstName(u),
      avatarUrl: null,
      createdAt: Timestamp.fromDate(new Date(u.metadata.creationTime)),
      approved: APPROVED,
      backfilledAt: Timestamp.now(),
    });
  }

  await batch.commit();
  written += chunk.length;
  console.log(`Skrev ${written}/${missing.length}`);
}

console.log(
  `\nFerdig: ${written} dokumenter opprettet med approved: ${APPROVED}.` +
    (APPROVED
      ? " Brukerne har tilgang nå."
      : " Godkjenn dem på Profil-siden i appen for å gi tilgang.")
);
console.log("Kontroller fornavnene på Profil-siden – de er utledet fra e-post.");
