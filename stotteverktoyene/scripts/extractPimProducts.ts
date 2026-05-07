import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input / output
const INPUT_FILE = path.resolve(__dirname, "../rxkatalog/PIM product export - 18-12-2025.xlsx");

// Output til public slik at data kan lastes med fetch i appen.
const OUTPUT_FILE = path.resolve(__dirname, "../public/data/pimProducts.json");

// Tillat både gamle og nye kolonnenavn fra PIM-eksport.
const COL_FARMALOGG_CANDIDATES = ["Farmalogg number", "Farmalogg"];
const COL_NAME = "Name";
const COL_NAME_FORM_STRENGTH = "Name, form, strength";

type PimProduct = {
  farmaloggNumber: string;
  name: string;
  nameFormStrength: string;
};

function asString(v: unknown) {
  return (v ?? "").toString().trim();
}

function resolveColumnKey(
  row: Record<string, unknown>,
  candidates: string[],
  label: string
): string {
  const keys = Object.keys(row);

  for (const candidate of candidates) {
    const exact = keys.find((k) => k === candidate);
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const normalized = keys.find((k) => k.trim().toLowerCase() === candidate.trim().toLowerCase());
    if (normalized) return normalized;
  }

  throw new Error(
    `Mangler kolonne '${label}'. Fant keys: ${keys.join(", ")}. Prøv å oppdatere kandidatlisten i scriptet.`
  );
}

function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  if (!fs.existsSync(INPUT_FILE)) {
    console.warn(`[pim:sync] Kilde mangler: ${INPUT_FILE}. Skriver tom datafil.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), "utf8");
    return;
  }

  const workbook = XLSX.readFile(INPUT_FILE, { cellDates: false });
  const sheetName = workbook.SheetNames[0]; // bruker første ark
  const sheet = workbook.Sheets[sheetName];

  // Les rader som objekter med keys = kolonnenavn fra rad 1
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Finn kolonner dynamisk (første rad holder)
  const first = rows[0] ?? {};
  const colFarmalogg = resolveColumnKey(first, COL_FARMALOGG_CANDIDATES, "Farmalogg number/Farmalogg");
  const colName = resolveColumnKey(first, [COL_NAME], COL_NAME);
  const colNameFormStrength = resolveColumnKey(
    first,
    [COL_NAME_FORM_STRENGTH],
    COL_NAME_FORM_STRENGTH
  );

  const out: PimProduct[] = rows
    .map((r) => {
      const farmaloggNumber = asString(r[colFarmalogg]);
      const name = asString(r[colName]);
      const nameFormStrength = asString(r[colNameFormStrength]);

      if (!farmaloggNumber || !name) return null;

      return {
        farmaloggNumber,
        name,
        nameFormStrength,
      };
    })
    .filter(Boolean) as PimProduct[];

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");
}

main();
