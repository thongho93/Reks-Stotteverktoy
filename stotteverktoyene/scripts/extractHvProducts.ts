import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type HvProduct = {
  farmaloggNumber: string;
  name: string;
};

const INPUT_FILE = path.resolve(__dirname, "../produktkatalog/Produktkatalog HV 17 des 25.xlsx");

const OUTPUT_FILE = path.resolve(__dirname, "../src/features/fest/components/hvProducts.json");

function extractHvProducts() {
  const workbook = XLSX.readFile(INPUT_FILE);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // --- Validate headers (must match Excel exactly) ---
  const EXPECTED_HEADERS = ["Farmalogg number", "Name (Product)"] as const;

  const headerRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });
  const rawHeaderRow = (headerRows?.[0] ?? []) as (string | number | null)[];

  const foundHeaders = rawHeaderRow
    .map((h) => (h == null ? "" : String(h)).trim())
    .filter(Boolean);

  const missing = EXPECTED_HEADERS.filter((h) => !foundHeaders.includes(h));
  const extras = foundHeaders.filter((h) => !EXPECTED_HEADERS.includes(h as any));

  if (missing.length > 0) {
    throw new Error(
      [
        "Ugyldige kolonnenavn i Excel.",
        `Forventer nøyaktig: ${EXPECTED_HEADERS.join(" | ")}`,
        `Fant: ${foundHeaders.join(" | ") || "(ingen headers funnet)"}`,
        `Mangler: ${missing.join(" | ")}`,
        extras.length ? `Ukjente kolonner: ${extras.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  // --- end header validation ---

  const rows = XLSX.utils.sheet_to_json<Record<(typeof EXPECTED_HEADERS)[number], string | number | null>>(sheet, {
    defval: null,
  });

  const products: HvProduct[] = rows
    .map((row) => {
      const farmaloggNumber = String(row["Farmalogg number"]).trim();
      const name = String(row["Name (Product)"]).trim();

      if (!farmaloggNumber || !name) return null;

      return {
        farmaloggNumber,
        name,
      };
    })
    .filter(Boolean) as HvProduct[];

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), "utf-8");

  console.log(`✅ Extracted ${products.length} HV products`);
}

extractHvProducts();
