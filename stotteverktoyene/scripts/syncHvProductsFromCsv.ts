import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

type HvProduct = {
  farmaloggNumber: string;
  name: string;
};

const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRF79xDn6HpwuF_beVoOAcvIOY-mLNNbWOc6HithWUlCSqAGT1rtvpXoE2T0fB88emlMg-fZrrMEMa6/pub?output=csv";

function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

loadDotEnvFile(path.join(PROJECT_ROOT, ".env"));
loadDotEnvFile(path.join(PROJECT_ROOT, ".env.local"));

const SPREADSHEET_ID = process.env.HV_PRODUCTS_SPREADSHEET_ID?.trim() || "";
const SHEET_GID = process.env.HV_PRODUCTS_CSV_GID?.trim() || "";

const buildExportUrl = (spreadsheetId: string, gid: string) => {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  url.searchParams.set("format", "csv");
  if (gid) url.searchParams.set("gid", gid);
  return url.toString();
};

const withSheetGid = (urlString: string, gid: string) => {
  if (!gid) return urlString;

  const url = new URL(urlString);
  url.searchParams.set("gid", gid);
  url.searchParams.set("single", "true");
  url.searchParams.set("output", "csv");
  return url.toString();
};

const INPUT_URL = SPREADSHEET_ID
  ? buildExportUrl(SPREADSHEET_ID, SHEET_GID)
  : withSheetGid(process.env.HV_PRODUCTS_CSV_URL?.trim() || DEFAULT_CSV_URL, SHEET_GID);
const OUTPUT_FILE = path.resolve(__dirname, "../src/features/fest/components/hvProducts.json");

const EXPECTED_HEADERS = ["Name", "farmaloggNumber"] as const;

function normalizeHeader(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

async function loadCsvRows() {
  const response = await fetch(INPUT_URL, {
    headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
  });

  if (!response.ok) {
    throw new Error(`Klarte ikke å hente HV-produktarket (HTTP ${response.status}).`);
  }

  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: "string" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Fant ingen ark i CSV-filen.");
  }

  const sheet = workbook.Sheets[sheetName];
  const headerRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });
  const rawHeaderRow = (headerRows?.[0] ?? []) as (string | number | null)[];
  const foundHeaders = rawHeaderRow.map(normalizeHeader).filter(Boolean);

  const missing = EXPECTED_HEADERS.filter((h) => !foundHeaders.includes(h));
  if (missing.length > 0) {
    throw new Error(
      [
        "Ugyldige kolonnenavn i Google Sheet CSV.",
        `Forventer: ${EXPECTED_HEADERS.join(" | ")}`,
        `Fant: ${foundHeaders.join(" | ") || "(ingen headers funnet)"}`,
        `Mangler: ${missing.join(" | ")}`,
        "Dette skjer ofte hvis CSV-lenken peker til feil ark.",
        SPREADSHEET_ID
          ? `Bruker spreadsheet ${SPREADSHEET_ID}${SHEET_GID ? ` med gid ${SHEET_GID}` : ""}.`
          : SHEET_GID
            ? `Aktiv gid: ${SHEET_GID}`
            : "Sett HV_PRODUCTS_CSV_GID til gid for arket som har kolonnene Name og farmaloggNumber.",
      ].join("\n"),
    );
  }

  return XLSX.utils.sheet_to_json<Record<(typeof EXPECTED_HEADERS)[number], string | number | null>>(
    sheet,
    {
      defval: null,
    },
  );
}

async function syncHvProductsFromCsv() {
  const rows = await loadCsvRows();

  const seen = new Set<string>();
  const products: HvProduct[] = rows
    .map((row) => {
      const name = String(row.Name ?? "").trim().replace(/\s+/g, " ");
      const farmaloggNumber = String(row.farmaloggNumber ?? "").trim();

      if (!name || !farmaloggNumber) return null;
      if (!/^\d+$/.test(farmaloggNumber)) return null;

      const dedupeKey = `${farmaloggNumber}::${name.toLowerCase()}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      return {
        name,
        farmaloggNumber,
      };
    })
    .filter((product): product is HvProduct => Boolean(product));

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(products, null, 2)}\n`, "utf-8");
  console.log(`Synkroniserte ${products.length} HV-produkter til ${OUTPUT_FILE}`);
}

syncHvProductsFromCsv().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
