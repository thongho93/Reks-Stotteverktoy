import type { AdministrationRoute, ATCcode } from "./opioids";

export type ProductForm =
  | "depotplaster"
  | "sublingvaltablett"
  | "sublingvalfilm"
  | "lyofilisattablett"
  | "nesespray"
  | "mikstur"
  | "dråper"
  | "kapsel"
  | "tablett"
  | "brusetablett"
  | "depottablett"
  | "stikkpille"
  | "annet"
  | "injeksjon"
  | "infusjons-/injeksjonsvæske"
  | "depotinjeksjonsvæske";

export interface StrengthVariant {
  strength: string; // f.eks. "10 µg/time" eller "10 mg/ml"
  productNumbers?: number[]; // ett eller flere varenummer for samme styrke (ulike pakninger)
}

export interface ATCProduct {
  name: string; // handelsnavn
  manufacturer?: string; // produsent
  form?: ProductForm; // formulering
  variants?: StrengthVariant[]; // knytter styrke til varenummer
  strengths?: string[]; // legacy: brukes der det ikke trengs kobling mot varenummer
  productNumbers?: number[]; // legacy: samlet liste (bruk variants når varenummer er knyttet til styrke)
  notes?: string; // f.eks. “ikke-markedsført”, “hurtigvirkende”, osv.
}

// Map product form (from Felleskatalogen-style list) to the administration route used in OMEQ.
// This lets the UI infer the correct route label and (optionally) filter products by route.
export const formToRoute = (form?: ProductForm): AdministrationRoute | undefined => {
  if (!form) return undefined;

  switch (form) {
    case "depotplaster":
      return "transdermal";

    case "injeksjon":
      return "parenteral";

    case "infusjons-/injeksjonsvæske":
      return "parenteral";

    case "depotinjeksjonsvæske":
      return "parenteral";

    case "nesespray":
      return "intranasal";

    case "sublingvaltablett":
    case "sublingvalfilm":
    case "lyofilisattablett":
      return "sublingval";

    case "stikkpille":
      return "rektal";

    case "dråper":
    case "tablett":
    case "brusetablett":
    case "depottablett":
    case "kapsel":
    case "mikstur":
      return "oral";

    case "annet":
    default:
      return undefined;
  }
};

export const ATC_PRODUCTS: Partial<Record<ATCcode, ATCProduct[]>> = {
  N02AE01: [
    {
      name: "Bugnanto",
      manufacturer: "Sandoz",
      form: "depotplaster",
      strengths: ["5 µg/time", "10 µg/time", "15 µg/time", "20 µg/time", "30 µg/time"],
      variants: [
        { strength: "5 µg/time", productNumbers: [587473] },
        { strength: "10 µg/time", productNumbers: [105440] },
        { strength: "15 µg/time", productNumbers: [454391] },
        { strength: "20 µg/time", productNumbers: [487279] },
        { strength: "30 µg/time", productNumbers: [377498] },
      ],
    },
    {
      name: "Buprefarm",
      manufacturer: "Orifarm Generics",
      form: "depotplaster",
      strengths: ["5 µg/time", "10 µg/time", "15 µg/time", "20 µg/time", "30 µg/time"],
      variants: [
        { strength: "5 µg/time", productNumbers: [588471] },
        { strength: "10 µg/time", productNumbers: [178332] },
        { strength: "15 µg/time", productNumbers: [448435] },
        { strength: "20 µg/time", productNumbers: [522039] },
        { strength: "30 µg/time", productNumbers: [130410] },
      ],
    },
    {
      name: "Buprenorphine G.L. Pharma",
      manufacturer: "G.L. Pharma",
      form: "sublingvaltablett",
      strengths: ["0,2 mg", "0,4 mg"],
    },
    {
      name: "Buprenorphine Orifarm",
      manufacturer: "Orifarm Generics",
      form: "sublingvaltablett",
      strengths: ["2 mg", "8 mg"],
    },
    {
      name: "Buprenorphine Sandoz",
      manufacturer: "Sandoz",
      form: "sublingvaltablett",
      strengths: ["2 mg", "8 mg"],
    },
    {
      name: "Espranor",
      manufacturer: "Ethypharm",
      form: "lyofilisattablett",
      strengths: ["2 mg", "8 mg"],
    },
    {
      name: "Norspan",
      manufacturer: "Mundipharma",
      form: "depotplaster",
      strengths: ["5 µg/time", "10 µg/time", "15 µg/time", "20 µg/time", "30 µg/time"],
    },
    {
      name: "Suboxone",
      manufacturer: "Indivior",
      form: "sublingvalfilm",
      strengths: ["2 mg/0,5 mg", "8 mg/2 mg", "12 mg/3 mg"],
    },
    {
      name: "Suboxone",
      manufacturer: "Indivior",
      form: "sublingvaltablett",
      strengths: ["2 mg/0,5 mg", "16 mg/4 mg"],
    },
    {
      name: "Subutex",
      manufacturer: "Indivior",
      form: "depotinjeksjonsvæske",
      strengths: ["100 mg", "300 mg"],
    },
    {
      name: "Subutex",
      manufacturer: "Indivior",
      form: "sublingvaltablett",
      strengths: ["2 mg", "8 mg"],
    },
    {
      name: "Temgesic",
      manufacturer: "Eumedica Pharmaceuticals",
      form: "sublingvaltablett",
      strengths: ["0,2 mg", "0,4 mg"],
    },
    {
      name: "Zubsolv",
      manufacturer: "Accord",
      form: "sublingvaltablett",
      strengths: [
        "1,4 mg/0,36 mg",
        "2,9 mg/0,71 mg",
        "5,7 mg/1,4 mg",
        "8,6 mg/2,1 mg",
        "11,4 mg/2,9 mg",
      ],
    },
  ],
  N02AA08: [
    { name: "DHC Continus", form: "depottablett", strengths: ["60 mg"] },
    { name: "DHC Ennogen", form: "depottablett", strengths: ["60 mg"] },
    { name: "Dihydrokodeine", manufacturer: "Actavis", form: "tablett", strengths: ["30 mg"] },
    { name: "Dihydrokodeine", manufacturer: "Ennogen", form: "depottablett", strengths: ["60 mg"] },
  ],
  N01AH01: [
    {
      name: "Fentanyl Hameln",
      manufacturer: "Hameln",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
    },
    {
      name: "Fentanyl Kalceks",
      manufacturer: "Kalceks",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
    },
    {
      name: "Fentanyl Piramal",
      manufacturer: "Piramal",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
    },
  ],
  N02AB03: [
    {
      name: "Abstral",
      manufacturer: "Grünenthal",
      form: "sublingvaltablett",
      strengths: ["100 µg", "200 µg", "300 µg", "400 µg", "600 µg", "800 µg"],
    },
    {
      name: "Durogesic",
      manufacturer: "Janssen",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
    },
    {
      name: "Fentanyl Hameln",
      manufacturer: "Hameln",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
    },
    {
      name: "Fentanyl ratiopharm",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
    },
    {
      name: "Fentanyl Sandoz",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
    },
    {
      name: "Instanyl DoseGuard",
      manufacturer: "Gentili",
      form: "nesespray",
      strengths: ["50 µg/dose", "100 µg/dose", "200 µg/dose"],
    },
  ],
  N02AB02: [
    {
      name: "Pethidine Macure",
      manufacturer: "Macure Pharma",
      form: "injeksjon",
      strengths: ["50 mg/ml"],
    },
    { name: "Petidin", manufacturer: "Takeda", form: "injeksjon", strengths: ["50 mg/ml"] },
  ],
  N02AA03: [
    {
      name: "Hydofon G.L. Pharma",
      manufacturer: "G.L. Pharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["50 mg/ml"],
    },
    {
      name: "Palladon",
      manufacturer: "Mundipharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["50 mg/ml"],
    },
  ],
  N02AJ06: [
    {
      name: "Altermol",
      manufacturer: "Alternova",
      form: "tablett",
      strengths: ["500 mg/30 mg"],
    },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "tablett",
      strengths: ["400 mg/30 mg"],
    },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["400 mg/30 mg"],
    },
    {
      name: "Paralgin major",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["800 mg/60 mg"],
    },
    {
      name: "Pinex Forte",
      manufacturer: "Teva",
      form: "tablett",
      strengths: ["500 mg/30 mg"],
    },
    {
      name: "Pinex Forte",
      manufacturer: "Teva",
      form: "brusetablett",
      strengths: ["500 mg/30 mg"],
    },
  ],
  R05DA04: [
    { name: "Kodein", manufacturer: "Orifarm Healthcare", form: "tablett", strengths: ["25 mg"] },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "tablett",
      strengths: ["400 mg/30 mg"],
    },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["400 mg/30 mg"],
    },
    {
      name: "Paralgin major",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["800 mg/60 mg"],
    },
    {
      name: "Pinex Forte",
      manufacturer: "Teva",
      form: "brusetablett",
      strengths: ["500 mg/30 mg"],
    },
  ],
  N07BC02: [
    {
      name: "Metadon Abcur",
      manufacturer: "Abcur",
      form: "tablett",
      strengths: ["5 mg", "10 mg", "20 mg", "40 mg"],
    },
    {
      name: "Metadon DnE",
      manufacturer: "dne pharma",
      form: "mikstur",
      strengths: ["1 mg/ml", "2 mg/ml", "5 mg/ml"],
    },
    {
      name: "Metadon Martindale",
      manufacturer: "Ethypharm",
      form: "mikstur",
      strengths: ["2 mg/ml"],
    },
    {
      name: "Metadon Nordic Drugs",
      manufacturer: "Nordic Drugs",
      form: "mikstur",
      strengths: [
        "10 mg",
        "15 mg",
        "20 mg",
        "25 mg",
        "30 mg",
        "35 mg",
        "40 mg",
        "45 mg",
        "50 mg",
        "55 mg",
        "60 mg",
        "70 mg",
        "80 mg",
        "90 mg",
        "100 mg",
        "110 mg",
        "120 mg",
        "130 mg",
        "140 mg",
        "150 mg",
        "160 mg",
        "170 mg",
        "180 mg",
        "190 mg",
        "200 mg",
      ],
    },
  ],
  N02AA05: [
    {
      name: "Oxycodone Abboxia",
      manufacturer: "Abboxia",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["1 mg/ml"],
    },
    {
      name: "Oxycodone Actavis",
      manufacturer: "Actavis",
      form: "kapsel",
      strengths: ["5 mg", "10 mg", "20 mg"],
    },
    {
      name: "Oxycodone Hameln",
      manufacturer: "Hameln",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["10 mg/ml", "50 mg/ml"],
    },
    {
      name: "Oxycodone Orifarm",
      manufacturer: "Orifarm Generics",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
    },

    {
      name: "OxyContin",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "15 mg", "20 mg", "30 mg", "40 mg", "60 mg", "80 mg", "120 mg"],
    },

    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["10 mg/ml", "50 mg/ml"],
    },
    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "kapsel",
      strengths: ["5 mg", "10 mg", "20 mg"],
    },
    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
    },
    {
      name: "OxyNorm",
      manufacturer: "Orifarm",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
    },

    {
      name: "Reltebon Depot",
      manufacturer: "Teva",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "15 mg", "20 mg", "30 mg", "40 mg", "60 mg", "80 mg"],
    },
    {
      name: "Targiniq",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: [
        "5 mg/2,5 mg",
        "10 mg/5 mg",
        "15 mg/7,5 mg",
        "20 mg/10 mg",
        "30 mg/15 mg",
        "40 mg/20 mg",
      ],
    },
  ],
  N02AA55: [
    {
      name: "Tanonalla",
      manufacturer: "Sandoz",
      form: "depottablett",
      strengths: ["5 mg/2,5 mg", "10 mg/5 mg", "20 mg/10 mg", "30 mg/15 mg", "40 mg/20 mg"],
    },
    {
      name: "Targin",
      manufacturer: "Orifarm",
      form: "depottablett",
      strengths: ["20 mg/10 mg"],
    },
    {
      name: "Targiniq",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: [
        "5 mg/2,5 mg",
        "10 mg/5 mg",
        "15 mg/7,5 mg",
        "20 mg/10 mg",
        "30 mg/15 mg",
        "40 mg/20 mg",
      ],
    },
  ],
  N02AA01: [
    {
      name: "Dolcontin",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "30 mg", "60 mg", "100 mg", "200 mg"],
    },
    {
      name: "Dropizol",
      manufacturer: "Pharmanovia",
      form: "dråper",
      strengths: ["10 mg/ml"],
    },
    {
      name: "Malfin",
      manufacturer: "Teva",
      form: "depottablett",
      strengths: ["10 mg", "30 mg", "60 mg", "100 mg"],
    },

    {
      name: "Morfin",
      manufacturer: "Orifarm Healthcare",
      form: "injeksjon",
      strengths: ["10 mg/ml"],
    },
    {
      name: "Morfin",
      manufacturer: "Orifarm Healthcare",
      form: "tablett",
      strengths: ["10 mg", "30 mg"],
    },
    {
      name: "Morfin Abcur",
      manufacturer: "Abcur",
      form: "injeksjon",
      strengths: ["10 mg/ml"],
    },
    {
      name: "Morfin Epidural",
      manufacturer: "Orifarm Healthcare",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["2 mg/ml"],
    },

    { name: "Oramorph", manufacturer: "care4", form: "mikstur", strengths: ["2 mg/ml"] },
    {
      name: "Oramorph",
      manufacturer: "Molteni",
      form: "dråper",
      strengths: ["20 mg/ml"],
    },
    {
      name: "Oramorph",
      manufacturer: "Molteni",
      form: "mikstur",
      strengths: ["2 mg/ml"],
    },
  ],
  N02AX06: [
    {
      name: "Palexia",
      manufacturer: "Grünenthal",
      form: "mikstur",
      strengths: ["4 mg/ml", "20 mg/ml"],
    },
    { name: "Palexia", manufacturer: "Grünenthal", form: "tablett", strengths: ["50 mg"] },
    {
      name: "Palexia depot",
      manufacturer: "Grünenthal",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg", "250 mg"],
    },
    {
      name: "Palexia depot",
      manufacturer: "Orifarm",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg"],
    },
    {
      name: "Tapentadol G.L. Pharma",
      manufacturer: "G.L. Pharma",
      form: "tablett",
      strengths: ["50 mg"],
    },
    {
      name: "Tapentadol Medical Valley",
      manufacturer: "Medical Valley",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg", "250 mg"],
    },
  ],
  N02AX02: [
    {
      name: "Nobligan",
      manufacturer: "Grünenthal",
      form: "kapsel",
      strengths: ["50 mg"],
    },
    {
      name: "Nobligan Retard",
      manufacturer: "Grünenthal",
      form: "depottablett",
      strengths: ["100 mg", "150 mg", "200 mg"],
    },

    {
      name: "Tramadol/Paracetamol Orion",
      manufacturer: "Orion",
      form: "tablett",
      strengths: ["37,5 mg/325 mg"],
    },

    {
      name: "Tramadol Actavis",
      manufacturer: "Actavis",
      form: "kapsel",
      strengths: ["50 mg"],
    },
    {
      name: "Tramadol HEXAL",
      manufacturer: "HEXAL",
      form: "kapsel",
      strengths: ["50 mg"],
    },
    {
      name: "Tramagetic OD",
      manufacturer: "care4",
      form: "depottablett",
      strengths: ["150 mg", "200 mg", "300 mg"],
    },
    {
      name: "Tramagetic OD",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["150 mg", "200 mg", "300 mg"],
    },
    {
      name: "Tramagetic Retard",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["100 mg", "150 mg"],
    },
  ],
};
