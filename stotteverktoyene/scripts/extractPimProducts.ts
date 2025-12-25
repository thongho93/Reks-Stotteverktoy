import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input / output
const INPUT_FILE = path.resolve(__dirname, "../rxkatalog/PIM product export - 18-12-2025.xlsx");

// Legg output der du allerede har data for søk (samme sted som hvProducts/meds)
const OUTPUT_FILE = path.resolve(__dirname, "../src/features/fest/components/pimProducts.json");

// Hvis Excel-kolonnene heter noe annet, endre disse strengene så de matcher nøyaktig.
const COL_FARMALOGG = "Farmalogg number";
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

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Fant ikke fil: ${INPUT_FILE}`);
  }

  const workbook = XLSX.readFile(INPUT_FILE, { cellDates: false });
  const sheetName = workbook.SheetNames[0]; // bruker første ark
  const sheet = workbook.Sheets[sheetName];

  // Les rader som objekter med keys = kolonnenavn fra rad 1
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Valider at kolonner finnes (første rad holder)
  const first = rows[0] ?? {};
  const missing = [COL_FARMALOGG, COL_NAME, COL_NAME_FORM_STRENGTH].filter((k) => !(k in first));
  if (missing.length > 0) {
    throw new Error(
      `Mangler kolonner i Excel-arket (${sheetName}). Fant keys: ${Object.keys(first).join(
        ", "
      )}. Mangler: ${missing.join(", ")}`
    );
  }

  const out: PimProduct[] = rows
    .map((r) => {
      const farmaloggNumber = asString(r[COL_FARMALOGG]);
      const name = asString(r[COL_NAME]);
      const nameFormStrength = asString(r[COL_NAME_FORM_STRENGTH]);

      if (!farmaloggNumber || !name) return null;

      return {
        farmaloggNumber,
        name,
        nameFormStrength,
      };
    })
    .filter(Boolean) as PimProduct[];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), "utf8");
}

main();
