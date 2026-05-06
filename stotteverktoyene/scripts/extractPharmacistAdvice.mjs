import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADVICE_INPUT_FILE = path.resolve(__dirname, "../rxkatalog/Farmasøytiskråd - 24-04-2026.xlsx");
const SKU_INPUT_FILE = path.resolve(__dirname, "../rxkatalog/260501 Kobling vnr sku (1).xlsx");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../src/features/produktograd/data/pharmacistAdviceData.json"
);

function asString(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeDigits(value) {
  return value.replace(/\D+/g, "");
}

function resolveColumnKey(row, candidates, label) {
  const keys = Object.keys(row);

  for (const candidate of candidates) {
    const exact = keys.find((key) => key === candidate);
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const normalized = keys.find(
      (key) => key.trim().toLowerCase() === candidate.trim().toLowerCase()
    );
    if (normalized) return normalized;
  }

  throw new Error(
    `Mangler kolonne '${label}'. Fant keys: ${keys.join(", ")}. Oppdater kandidatlisten i scriptet.`
  );
}

function splitAdvicePoints(advice) {
  const cleaned = advice
    .replace(/[\u2022\u00B7]+/g, "\n")
    .replace(/\s*;\s*/g, "\n")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

  if (!cleaned) return [];

  const primaryParts = cleaned
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);

  if (primaryParts.length > 1) return primaryParts;

  const sentenceParts = cleaned
    .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceParts.length > 0 ? sentenceParts : [cleaned];
}

function collectAdvicePointsFromRow(row, keys, adviceColumn) {
  const adviceColumnIndex = keys.indexOf(adviceColumn);
  if (adviceColumnIndex === -1) return [];

  const candidateKeys = keys.slice(adviceColumnIndex).filter((key) => {
    if (key === adviceColumn) return true;
    return /^__EMPTY(?:_\d+)?$/.test(key);
  });

  const points = [];
  const seen = new Set();

  for (const key of candidateKeys) {
    const cell = asString(row[key]);
    if (!cell) continue;

    for (const point of splitAdvicePoints(cell)) {
      const normalized = point.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      points.push(point);
    }
  }

  return points;
}

function loadRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fant ikke fil: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}

function buildAdviceMap(rows) {
  const first = rows[0] ?? {};
  const keys = Object.keys(first);
  const farmaloggColumn = resolveColumnKey(first, ["Farmalogg number", "Farmalogg"], "Farmalogg number");
  const nameColumn = resolveColumnKey(first, ["Name"], "Name");
  const atcColumn = resolveColumnKey(first, ["ATC code", "ATC"], "ATC code");
  const adviceColumn = resolveColumnKey(
    first,
    ["Pharmacist advices", "Pharmacist advice", "Pharmacist Advice"],
    "Pharmacist advices"
  );

  const adviceByFarmalogg = new Map();

  for (const row of rows) {
    const farmaloggNumber = asString(row[farmaloggColumn]);
    const name = asString(row[nameColumn]);
    const atcCode = asString(row[atcColumn]).toUpperCase();
    const advicePoints = collectAdvicePointsFromRow(row, keys, adviceColumn);

    if (!farmaloggNumber || !name || advicePoints.length === 0) continue;

    const farmaloggKey = normalizeDigits(farmaloggNumber);
    if (!farmaloggKey) continue;

    adviceByFarmalogg.set(farmaloggKey, {
      name,
      atcCode,
      farmaloggNumber,
      advicePoints,
    });
  }

  return adviceByFarmalogg;
}

function buildMergedRows(skuRows, adviceByFarmalogg) {
  const first = skuRows[0] ?? {};
  const farmaloggColumn = resolveColumnKey(first, ["Farmalogg", "Farmalogg number"], "Farmalogg");
  const skuColumn = resolveColumnKey(first, ["SKU", "Sku"], "SKU");
  const nameColumn = resolveColumnKey(first, ["Name"], "Name");

  const output = [];
  const seen = new Set();
  const includedFarmalogg = new Set();

  for (const row of skuRows) {
    const farmaloggNumber = asString(row[farmaloggColumn]);
    const farmaloggKey = normalizeDigits(farmaloggNumber);
    const sku = asString(row[skuColumn]);
    const nameFromSku = asString(row[nameColumn]);
    if (!farmaloggKey || !sku || !nameFromSku) continue;

    const advice = adviceByFarmalogg.get(farmaloggKey);
    const mergedName = advice?.name || nameFromSku;
    const mergedFarmalogg = advice?.farmaloggNumber || farmaloggNumber;
    const atcCode = advice?.atcCode || "";
    const advicePoints = advice?.advicePoints ?? [];

    const dedupeKey = `${farmaloggKey}::${sku}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    includedFarmalogg.add(farmaloggKey);

    output.push({
      id: `${farmaloggKey}-${sku}`,
      name: mergedName,
      atcCode,
      farmaloggNumber: mergedFarmalogg,
      sku,
      advicePoints,
    });
  }

  // Safety: include advice rows even if they are absent in SKU sheet.
  for (const [farmaloggKey, advice] of adviceByFarmalogg.entries()) {
    if (includedFarmalogg.has(farmaloggKey)) continue;

    output.push({
      id: `${farmaloggKey}-${advice.name}`,
      name: advice.name,
      atcCode: advice.atcCode,
      farmaloggNumber: advice.farmaloggNumber,
      sku: "",
      advicePoints: advice.advicePoints,
    });
  }

  return output;
}

function main() {
  const adviceRows = loadRows(ADVICE_INPUT_FILE);
  const skuRows = loadRows(SKU_INPUT_FILE);

  const adviceByFarmalogg = buildAdviceMap(adviceRows);
  const output = buildMergedRows(skuRows, adviceByFarmalogg);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(
    `Skrev ${output.length} produkter til ${OUTPUT_FILE}. Med råd: ${output.filter((row) => row.advicePoints.length > 0).length}`
  );
}

main();
