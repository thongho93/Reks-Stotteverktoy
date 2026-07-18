// Prune public/interactions.json ned til kun feltene appen faktisk bruker.
//
// FEST-eksporten er en stor, pretty-printet fil (~35 MB) med mange felt som
// aldri leses av appen. Indeksbyggingen (src/features/fest/mappers/
// interactionsToIndex.ts) og UI-et bruker kun feltene som beholdes under.
// Å droppe resten + skrive minifisert kutter både nedlasting og JSON.parse-tid
// kraftig, uten noen runtime-kodeendring.
//
// Idempotent: kan trygt kjøres på nytt (også på en allerede prunet fil).
// Kjør: npm run interaksjon:prune  (eller: node scripts/pruneInteractions.mjs)

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "../public/interactions.json");

const str = (v) => (v === undefined || v === null ? null : String(v));

// Behold KUN feltene som leses av interactionsToIndex.ts / UI-et.
const pruneEntry = (raw) => ({
  interaksjonId: str(raw?.interaksjonId),
  relevans: raw?.relevans
    ? { v: str(raw.relevans.v), dn: str(raw.relevans.dn) }
    : null,
  kliniskKonsekvens: str(raw?.kliniskKonsekvens),
  interaksjonsmekanisme: str(raw?.interaksjonsmekanisme),
  handtering: str(raw?.handtering),
  substansgrupper: (raw?.substansgrupper ?? []).map((g) => ({
    navn: str(g?.navn),
    substanser: (g?.substanser ?? []).map((s) => ({
      substans: str(s?.substans),
      // Indeksen leser kun atc.v; behold objekt-formen så runtime er uendret.
      atc: s?.atc?.v ? { v: str(s.atc.v) } : null,
    })),
  })),
});

const before = statSync(FILE).size;
const data = JSON.parse(readFileSync(FILE, "utf8"));
if (!Array.isArray(data)) {
  throw new Error("Forventet en JSON-array i interactions.json");
}

const pruned = data.map(pruneEntry);
writeFileSync(FILE, JSON.stringify(pruned)); // minifisert (ingen whitespace)

const after = statSync(FILE).size;
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `interactions.json: ${data.length} oppføringer · ${mb(before)} MB → ${mb(after)} MB ` +
    `(${Math.round((1 - after / before) * 100)} % mindre)`,
);
