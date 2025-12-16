import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const xmlPath = path.resolve(process.cwd(), "fest", "fest251.xml");
const outPath = path.resolve(process.cwd(), "src", "features", "fest", "meds.json");

const xml = fs.readFileSync(xmlPath, "utf-8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true, // viktig: gjør <ns:LegemiddelMerkevare> til <LegemiddelMerkevare>
});

const data = parser.parse(xml);

// hjelpefunksjoner
const asArray = <T>(v: T | T[] | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

const fest = data?.FEST;
const kat = fest?.KatLegemiddelMerkevare;
const oppfList = asArray(kat?.OppfLegemiddelMerkevare);

const meds = oppfList
  .map((oppf: any) => {
    const lm = oppf?.LegemiddelMerkevare; // etter removeNSPrefix
    if (!lm) return null;

    const atc = lm?.Atc?.["@_V"] ?? null;
    const virkestoff = lm?.Atc?.["@_DN"] ?? null;

    const varenavn = lm?.Varenavn ?? null;
    const navnFormStyrke = lm?.NavnFormStyrke ?? null;

    const produsent = lm?.ProduktInfo?.Produsent ?? null;

    const reseptgruppe = lm?.Reseptgruppe?.["@_V"] ?? null;

    const id = lm?.Id ?? oppf?.Id ?? null;

    if (!varenavn && !navnFormStyrke) return null;

    return {
      id,
      varenavn,
      navnFormStyrke,
      atc,
      virkestoff,
      produsent,
      reseptgruppe,
    };
  })
  .filter(Boolean);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(meds, null, 2), "utf-8");

console.log(`Skrev ${meds.length} medisiner til ${outPath}`);
