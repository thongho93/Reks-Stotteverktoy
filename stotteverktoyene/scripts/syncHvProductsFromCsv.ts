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
  atc?: string;
  virkestoff?: string;
  produsent?: string;
  id?: string;
};

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

const FIXED_SPREADSHEET_ID =
  process.env.HV_PRODUCTS_SPREADSHEET_ID?.trim() || "1rBMivx3lHY4CKrFev_On__YVendKv6O7i_Zzcoy9QYg";
const FIXED_SHEET_GID = "1369769996";

const buildExportUrl = (spreadsheetId: string, gid: string) => {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  url.searchParams.set("format", "csv");
  if (gid) url.searchParams.set("gid", gid);
  return url.toString();
};
const INPUT_URL = buildExportUrl(FIXED_SPREADSHEET_ID, FIXED_SHEET_GID);
const OUTPUT_FILE = path.resolve(__dirname, "../src/features/fest/components/hvProducts.json");

type CanonicalColumn = "name" | "farmaloggNumber" | "atc" | "virkestoff" | "produsent" | "id";
type ResolvedHeaders = {
  name: string;
  farmaloggNumber: string;
  atc?: string;
  virkestoff?: string;
  produsent?: string;
  id?: string;
};

const COLUMN_ALIASES: Record<CanonicalColumn, readonly string[]> = {
  name: ["Name", "Varenavn", "Name (Product)", "Product name"],
  farmaloggNumber: [
    "farmaloggNumber",
    "Farmalogg number",
    "Varenummer",
    "Vare nummer",
    "Varenr",
    "Varenr.",
  ],
  atc: ["ATC", "Atc"],
  virkestoff: [
    "Virkestoff",
    "Active ingredient",
    "Activ ingredient",
    "Substance",
    "VirkestoffNavn",
  ],
  produsent: ["Produsent", "Producer", "Manufacturer", "Leverandor", "Leverandør"],
  id: ["ID", "Id", "Uuid", "UUID", "Row ID"],
};

const REQUIRED_COLUMNS: CanonicalColumn[] = ["name", "farmaloggNumber"];

function normalizeHeader(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function resolveColumnHeaders(foundHeaders: string[]) {
  const byNormalized = new Map<string, string>();
  for (const header of foundHeaders) {
    byNormalized.set(normalizeHeaderKey(header), header);
  }

  const resolved: Partial<Record<CanonicalColumn, string>> = {};

  for (const key of Object.keys(COLUMN_ALIASES) as CanonicalColumn[]) {
    const aliases = COLUMN_ALIASES[key];
    const match = aliases
      .map((alias) => byNormalized.get(normalizeHeaderKey(alias)))
      .find((header): header is string => Boolean(header));

    if (match) resolved[key] = match;
  }

  const missingRequired = REQUIRED_COLUMNS.filter((column) => !resolved[column]);
  if (missingRequired.length > 0) {
    const requiredDescription = REQUIRED_COLUMNS.map(
      (column) => `${column}: ${COLUMN_ALIASES[column].join(" / ")}`,
    ).join(" | ");

    throw new Error(
      [
        "Ugyldige kolonnenavn i Google Sheet CSV.",
        `Må finne disse kolonnene (med ett av aliasene): ${requiredDescription}`,
        `Fant: ${foundHeaders.join(" | ") || "(ingen headers funnet)"}`,
        `Mangler: ${missingRequired.join(" | ")}`,
        "Dette skjer ofte hvis CSV-lenken peker til feil ark.",
        `Bruker spreadsheet ${FIXED_SPREADSHEET_ID} med fast gid ${FIXED_SHEET_GID} (ark 2).`,
        "Hvis du vil bytte spreadsheet kan du sette HV_PRODUCTS_SPREADSHEET_ID, men scriptet leser fortsatt kun ark 2.",
      ].join("\n"),
    );
  }

  const resolvedHeaders: ResolvedHeaders = {
    name: resolved.name as string,
    farmaloggNumber: resolved.farmaloggNumber as string,
  };

  if (resolved.atc) resolvedHeaders.atc = resolved.atc;
  if (resolved.virkestoff) resolvedHeaders.virkestoff = resolved.virkestoff;
  if (resolved.produsent) resolvedHeaders.produsent = resolved.produsent;
  if (resolved.id) resolvedHeaders.id = resolved.id;

  return resolvedHeaders;
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
  const resolvedHeaders = resolveColumnHeaders(foundHeaders);

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet, {
    defval: null,
  });

  return {
    rows,
    headers: resolvedHeaders,
  };
}

async function syncHvProductsFromCsv() {
  const { rows, headers } = await loadCsvRows();

  const seen = new Set<string>();
  const products: HvProduct[] = rows
    .map((row) => {
      const name = normalizeText(row[headers.name]);
      const farmaloggNumber = normalizeText(row[headers.farmaloggNumber]);

      if (!name || !farmaloggNumber) return null;
      if (!/^\d+$/.test(farmaloggNumber)) return null;

      const dedupeKey = `${farmaloggNumber}::${name.toLowerCase()}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      const atc = normalizeText(headers.atc ? row[headers.atc] : "").toUpperCase();
      const virkestoff = normalizeText(headers.virkestoff ? row[headers.virkestoff] : "");
      const produsent = normalizeText(headers.produsent ? row[headers.produsent] : "");
      const id = normalizeText(headers.id ? row[headers.id] : "");

      const product: HvProduct = {
        name,
        farmaloggNumber,
      };

      if (atc) product.atc = atc;
      if (virkestoff) product.virkestoff = virkestoff;
      if (produsent) product.produsent = produsent;
      if (id) product.id = id;

      return product;
    })
    .filter((product): product is HvProduct => Boolean(product));

  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(products, null, 2)}\n`, "utf-8");
  console.log(`Synkroniserte ${products.length} HV-produkter til ${OUTPUT_FILE}`);
}

syncHvProductsFromCsv().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
