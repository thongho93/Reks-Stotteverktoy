import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const xmlPath = path.resolve(process.cwd(), "fest", "fest251.xml");
const outPath = path.resolve(process.cwd(), "src", "features", "fest", "meds.json");
const outInteractionsPath = path.resolve(
  process.cwd(),
  "src",
  "features",
  "interaksjoner",
  "interactions.json"
);

const xml = fs.readFileSync(xmlPath, "utf-8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true, // viktig: gjør <ns:LegemiddelMerkevare> til <LegemiddelMerkevare>
});

const data = parser.parse(xml);

const attr = (node: any, key: string) => (node && typeof node === "object" ? node[`@_${key}`] : undefined);

// hjelpefunksjoner
const asArray = <T>(v: T | T[] | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

const fest = data?.FEST;

// meds
const katMeds = fest?.KatLegemiddelMerkevare;
const oppfList = asArray(katMeds?.OppfLegemiddelMerkevare);

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

// interactions
const katInteraksjon = fest?.KatInteraksjon;
const oppfInteraksjonList = asArray(katInteraksjon?.OppfInteraksjon);

const interactions = oppfInteraksjonList
  .map((oppf: any) => {
    const oppfId = oppf?.Id ?? null;
    const tidspunkt = oppf?.Tidspunkt ?? null;

    const statusNode = oppf?.Status;
    const status = {
      v: attr(statusNode, "V") ?? null,
      dn: attr(statusNode, "DN") ?? null,
    };

    const i = oppf?.Interaksjon;
    if (!i) return null;

    const interaksjonId = i?.Id ?? null;

    const relevansNode = i?.Relevans;
    const relevans = {
      v: attr(relevansNode, "V") ?? null,
      dn: attr(relevansNode, "DN") ?? null,
    };

    const kildegrunnlagNode = i?.Kildegrunnlag;
    const kildegrunnlag = {
      v: attr(kildegrunnlagNode, "V") ?? null,
      dn: attr(kildegrunnlagNode, "DN") ?? null,
    };

    const visningsregler = asArray(i?.Visningsregel).map((vr: any) => ({
      v: attr(vr, "V") ?? null,
      dn: attr(vr, "DN") ?? null,
      s: attr(vr, "S") ?? null,
    }));

    const referanser = asArray(i?.Referanse).map((r: any) => ({
      kilde: r?.Kilde ?? null,
      lenke: attr(r?.Lenke, "V") ?? null,
    }));

    const substansgrupper = asArray(i?.Substansgruppe).map((sg: any) => ({
      navn: sg?.Navn ?? null,
      substanser: asArray(sg?.Substans).map((s: any) => ({
        substans: s?.Substans ?? null,
        atc: {
          v: attr(s?.Atc, "V") ?? null,
          dn: attr(s?.Atc, "DN") ?? null,
          s: attr(s?.Atc, "S") ?? null,
        },
      })),
    }));

    return {
      oppfId,
      tidspunkt,
      status,
      interaksjonId,
      relevans,
      kliniskKonsekvens: i?.KliniskKonsekvens ?? null,
      interaksjonsmekanisme: i?.Interaksjonsmekanisme ?? null,
      kildegrunnlag,
      handtering: (i?.Handtering ?? null)?.toString().trim() ?? null,
      visningsregler,
      referanser,
      substansgrupper,
    };
  })
  .filter(Boolean);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(meds, null, 2), "utf-8");

fs.mkdirSync(path.dirname(outInteractionsPath), { recursive: true });
fs.writeFileSync(outInteractionsPath, JSON.stringify(interactions, null, 2), "utf-8");


