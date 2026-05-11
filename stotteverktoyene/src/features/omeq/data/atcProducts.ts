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
      variants: [
        { strength: "0,2 mg", productNumbers: [592558] },
        { strength: "0,4 mg", productNumbers: [89309] },
      ],
    },
    {
      name: "Buprenorphine Orifarm",
      manufacturer: "Orifarm Generics",
      form: "sublingvaltablett",
      strengths: ["2 mg", "8 mg"],
      variants: [
        { strength: "2 mg", productNumbers: [407679, 494268] },
        { strength: "8 mg", productNumbers: [90181, 126812] },
      ],
    },
    {
      name: "Buprenorphine Sandoz",
      manufacturer: "Sandoz",
      form: "sublingvaltablett",
      strengths: ["2 mg", "8 mg"],
      variants: [
        { strength: "2 mg", productNumbers: [438914] },
        { strength: "8 mg", productNumbers: [96862] },
      ],
    },
    {
      name: "Norspan",
      manufacturer: "Mundipharma",
      form: "depotplaster",
      strengths: ["5 µg/time", "10 µg/time", "15 µg/time", "20 µg/time", "30 µg/time"],
      variants: [
        { strength: "5 µg/time", productNumbers: [24765] },
        { strength: "10 µg/time", productNumbers: [24773] },
        { strength: "15 µg/time", productNumbers: [501930] },
        { strength: "20 µg/time", productNumbers: [24784] },
        { strength: "30 µg/time", productNumbers: [540540] },
      ],
    },
    {
      name: "Temgesic",
      manufacturer: "Eumedica Pharmaceuticals",
      form: "sublingvaltablett",
      strengths: ["0,2 mg", "0,4 mg"],
      variants: [
        { strength: "0,2 mg", productNumbers: [485473] },
        { strength: "0,4 mg", productNumbers: [424959] },
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
      variants: [{ strength: "50 µg/ml", productNumbers: [7007, 7016, 432520] }],
    },
    {
      name: "Fentanyl Kalceks",
      manufacturer: "Kalceks",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
      variants: [{ strength: "50 µg/ml", productNumbers: [60983, 194608] }],
    },
    {
      name: "Fentanyl Piramal",
      manufacturer: "Piramal",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
      variants: [{ strength: "50 µg/ml", productNumbers: [441432, 516532] }],
    },
  ],
  N02AB03: [
    {
      name: "Abstral",
      manufacturer: "Grünenthal",
      form: "sublingvaltablett",
      strengths: ["100 µg", "200 µg", "300 µg", "400 µg", "600 µg", "800 µg"],
      variants: [
        { strength: "100 µg", productNumbers: [29277, 29300] },
        { strength: "200 µg", productNumbers: [29311, 29211] },
        { strength: "300 µg", productNumbers: [29335] },
        { strength: "400 µg", productNumbers: [29222] },
      ],
    },
    {
      name: "Durogesic",
      manufacturer: "Janssen",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
      variants: [
        { strength: "12 µg/time", productNumbers: [137006] },
        { strength: "25 µg/time", productNumbers: [466131] },
        { strength: "50 µg/time", productNumbers: [114828] },
        { strength: "75 µg/time", productNumbers: [479288] },
        { strength: "100 µg/time", productNumbers: [559779] },
      ],
    },
    {
      name: "Fentanyl Hameln",
      manufacturer: "Hameln",
      form: "injeksjon",
      strengths: ["50 µg/ml"],
      variants: [{ strength: "50 µg/ml", productNumbers: [70007, 70016, 432520] }],
    },
    {
      name: "Fentanyl ratiopharm",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
      variants: [
        { strength: "12 µg/time", productNumbers: [539772] },
        { strength: "25 µg/time", productNumbers: [583438] },
        { strength: "50 µg/time", productNumbers: [382436] },
        { strength: "75 µg/time", productNumbers: [482228] },
        { strength: "100 µg/time", productNumbers: [582473] },
      ],
    },
    {
      name: "Fentanyl Sandoz",
      form: "depotplaster",
      strengths: ["12 µg/time", "25 µg/time", "50 µg/time", "75 µg/time", "100 µg/time"],
      variants: [
        { strength: "12 µg/time", productNumbers: [80314] },
        { strength: "25 µg/time", productNumbers: [80323] },
        { strength: "50 µg/time", productNumbers: [80332] },
        { strength: "75 µg/time", productNumbers: [80342] },
        { strength: "100 µg/time", productNumbers: [80351] },
      ],
    },
    {
      name: "Instanyl DoseGuard",
      manufacturer: "Gentili",
      form: "nesespray",
      strengths: ["50 µg/dose", "100 µg/dose", "200 µg/dose"],
      variants: [
        { strength: "50 µg/dose", productNumbers: [466500, 86184] },
        { strength: "100 µg/dose", productNumbers: [142255, 490814] },
        { strength: "200 µg/dose", productNumbers: [396282, 430043] },
      ],
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
    {
      name: "Petidin NAF",
      manufacturer: "Sykehusapoteket Oslo, Ullevål",
      form: "stikkpille",
      variants: [{ strength: "100 mg", productNumbers: [214251] }],
    },
    {
      name: "Dolcontral",
      manufacturer: "Mibe",
      form: "stikkpille",
      variants: [{ strength: "100 mg", productNumbers: [267331] }],
    },
  ],
  N02AA03: [
    {
      name: "Hydofon G.L. Pharma",
      manufacturer: "G.L. Pharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["50 mg/ml"],
      variants: [{ strength: "50 mg/ml", productNumbers: [189493] }],
    },
    {
      name: "Palladon",
      manufacturer: "Mundipharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["50 mg/ml"],
      variants: [{ strength: "50 mg/ml", productNumbers: [585764] }],
    },
  ],
  N02AJ06: [
    {
      name: "Altermol",
      manufacturer: "Alternova",
      form: "tablett",
      strengths: ["500 mg/30 mg"],
      variants: [{ strength: "500 mg/30 mg", productNumbers: [129722, 61935, 376910, 411253] }],
    },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "tablett",
      strengths: ["400 mg/30 mg"],
      variants: [
        {
          strength: "400 mg/30 mg",
          productNumbers: [189274, 112664, 575381, 119099, 112680],
        },
      ],
    },
    {
      name: "Paralgin forte",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["400 mg/30 mg"],
      variants: [{ strength: "400 mg/30 mg", productNumbers: [112698] }],
    },
    {
      name: "Paralgin major",
      manufacturer: "Karo Pharma",
      form: "stikkpille",
      strengths: ["800 mg/60 mg"],
      variants: [{ strength: "800 mg/60 mg", productNumbers: [116830] }],
    },
    {
      name: "Pinex Forte",
      manufacturer: "Teva",
      form: "tablett",
      strengths: ["500 mg/30 mg"],
      variants: [{ strength: "500 mg/30 mg", productNumbers: [386535, 110699, 502687, 89019] }],
    },
    {
      name: "Pinex Forte",
      manufacturer: "Teva",
      form: "brusetablett",
      strengths: ["500 mg/30 mg"],
      variants: [{ strength: "500 mg/30 mg", productNumbers: [453878] }],
    },
  ],
  R05DA04: [
    {
      name: "Kodein",
      manufacturer: "Orifarm Healthcare",
      form: "tablett",
      strengths: ["25 mg"],
      variants: [{ strength: "25 mg", productNumbers: [599456] }],
    },
  ],
  N07BC02: [
    {
      name: "Metadon Abcur",
      manufacturer: "Abcur",
      form: "tablett",
      strengths: ["5 mg", "10 mg", "20 mg", "40 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [546660, 534712] },
        { strength: "10 mg", productNumbers: [142606, 413053] },
        { strength: "20 mg", productNumbers: [105669, 33644] },
        { strength: "40 mg", productNumbers: [189430] },
      ],
    },
    {
      name: "Metadon DnE",
      manufacturer: "dne pharma",
      form: "mikstur",
      strengths: ["1 mg/ml", "2 mg/ml", "5 mg/ml"],
      variants: [
        { strength: "1 mg/ml", productNumbers: [25035, 25108, 25141, 138764, 144358] },
        {
          strength: "2 mg/ml",
          productNumbers: [51424, 594310, 388255, 184007, 199991, 186014, 552444],
        },
        {
          strength: "5 mg/ml",
          productNumbers: [138841, 138852, 138863, 138874, 138885, 138896, 138907, 138918, 138929],
        },
      ],
    },
    {
      name: "Metadon Martindale",
      manufacturer: "Ethypharm",
      form: "mikstur",
      strengths: ["2 mg/ml"],
      variants: [{ strength: "2 mg/ml", productNumbers: [98314, 48842, 48860, 48878] }],
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
      variants: [
        { strength: "10 mg", productNumbers: [428498, 469490] },
        { strength: "15 mg", productNumbers: [476137, 456243] },
        { strength: "20 mg", productNumbers: [53007, 417647] },
        { strength: "25 mg", productNumbers: [399319, 498243] },
        { strength: "30 mg", productNumbers: [180493, 41732] },
        { strength: "35 mg", productNumbers: [399570, 66939] },
        { strength: "40 mg", productNumbers: [524514, 468830] },
        { strength: "45 mg", productNumbers: [178338, 578308] },
        { strength: "50 mg", productNumbers: [192275, 374605] },
        { strength: "55 mg", productNumbers: [458134, 40540] },
        { strength: "60 mg", productNumbers: [382268, 34477] },
        { strength: "70 mg", productNumbers: [489347, 497921] },
        { strength: "80 mg", productNumbers: [575088, 460912] },
        { strength: "90 mg", productNumbers: [506079, 143333] },
        { strength: "100 mg", productNumbers: [119897, 414491] },
        { strength: "110 mg", productNumbers: [450865, 184497] },
        { strength: "120 mg", productNumbers: [478499, 408839] },
        { strength: "130 mg", productNumbers: [433303, 432458] },
        { strength: "140 mg", productNumbers: [438235, 391262] },
        { strength: "150 mg", productNumbers: [51012, 596112] },
        { strength: "160 mg", productNumbers: [387320, 375645] },
        { strength: "170 mg", productNumbers: [177392, 474813] },
        { strength: "180 mg", productNumbers: [465162, 585863] },
        { strength: "190 mg", productNumbers: [57065, 56928] },
        { strength: "200 mg", productNumbers: [145412, 34684] },
      ],
    },
  ],
  N02AA05: [
    {
      name: "Oxycodone Abboxia",
      manufacturer: "Abboxia",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["1 mg/ml"],
      variants: [{ strength: "1 mg/ml", productNumbers: [513323, 487567] }],
    },
    {
      name: "Oxycodone Actavis",
      manufacturer: "Actavis",
      form: "kapsel",
      strengths: ["5 mg", "10 mg", "20 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [499299, 583676] },
        { strength: "10 mg", productNumbers: [81462, 154269] },
        { strength: "20 mg", productNumbers: [475074, 547384] },
      ],
    },
    {
      name: "Oxycodone Hameln",
      manufacturer: "Hameln",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["10 mg/ml", "50 mg/ml"],
      variants: [
        { strength: "10 mg/ml", productNumbers: [432994, 445811] },
        { strength: "50 mg/ml", productNumbers: [95963] },
      ],
    },
    {
      name: "Oxycodone Orifarm",
      manufacturer: "Orifarm Generics",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
      variants: [
        { strength: "1 mg/ml", productNumbers: [176085] },
        { strength: "10 mg/ml", productNumbers: [34048] },
      ],
    },

    {
      name: "OxyContin",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "15 mg", "20 mg", "30 mg", "40 mg", "60 mg", "80 mg", "120 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [13346] },
        { strength: "10 mg", productNumbers: [5604, 5773] },
        { strength: "15 mg", productNumbers: [128596] },
        { strength: "20 mg", productNumbers: [5706, 5798] },
        { strength: "30 mg", productNumbers: [128607, 483406] },
        { strength: "40 mg", productNumbers: [5715, 5842] },
        { strength: "60 mg", productNumbers: [373947] },
        { strength: "80 mg", productNumbers: [6729, 6772] },
        { strength: "120 mg", productNumbers: [128630] },
      ],
    },

    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["10 mg/ml", "50 mg/ml"],
      variants: [
        { strength: "10 mg/ml", productNumbers: [20944, 20955] },
        { strength: "50 mg/ml", productNumbers: [460406] },
      ],
    },
    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "kapsel",
      strengths: ["5 mg", "10 mg", "20 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [9521, 9532] },
        { strength: "10 mg", productNumbers: [9543, 9554] },
        { strength: "20 mg", productNumbers: [9565, 9576] },
      ],
    },
    {
      name: "OxyNorm",
      manufacturer: "Mundipharma",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
      variants: [
        { strength: "1 mg/ml", productNumbers: [9587] },
        { strength: "10 mg/ml", productNumbers: [9598] },
      ],
    },
    {
      name: "OxyNorm",
      manufacturer: "Orifarm",
      form: "mikstur",
      strengths: ["1 mg/ml", "10 mg/ml"],
      variants: [{ strength: "10 mg/ml", productNumbers: [194782] }],
    },

    {
      name: "Reltebon Depot",
      manufacturer: "Teva",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "15 mg", "20 mg", "30 mg", "40 mg", "60 mg", "80 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [588435] },
        { strength: "10 mg", productNumbers: [180008, 497407, 59513] },
        { strength: "15 mg", productNumbers: [497833, 123243] },
        { strength: "20 mg", productNumbers: [133185, 550501] },
        { strength: "30 mg", productNumbers: [523206, 164611] },
        { strength: "40 mg", productNumbers: [446976, 184532] },
        { strength: "60 mg", productNumbers: [43132] },
        { strength: "80 mg", productNumbers: [469681, 413782] },
      ],
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
      variants: [
        { strength: "5 mg/2,5 mg", productNumbers: [60028, 60039, 106011] },
        { strength: "10 mg/5 mg", productNumbers: [29711, 29722, 483144] },
        { strength: "15 mg/7,5 mg", productNumbers: [371402, 176147] },
        { strength: "20 mg/10 mg", productNumbers: [29733, 29745, 181562] },
        { strength: "30 mg/15 mg", productNumbers: [529318, 447087] },
        { strength: "40 mg/20 mg", productNumbers: [60051, 60062, 90384] },
      ],
    },
  ],
  N02AA55: [
    {
      name: "Tanonalla",
      manufacturer: "Sandoz",
      form: "depottablett",
      strengths: ["5 mg/2,5 mg", "10 mg/5 mg", "20 mg/10 mg", "30 mg/15 mg", "40 mg/20 mg"],
      variants: [
        { strength: "5 mg/2,5 mg", productNumbers: [70713, 55220] },
        { strength: "10 mg/5 mg", productNumbers: [73471, 379353] },
        { strength: "20 mg/10 mg", productNumbers: [481337, 59267] },
        { strength: "30 mg/15 mg", productNumbers: [133179, 426633] },
        { strength: "40 mg/20 mg", productNumbers: [423824, 77013] },
      ],
    },
    {
      name: "Targin",
      manufacturer: "Orifarm",
      form: "depottablett",
      strengths: ["20 mg/10 mg"],
      variants: [{ strength: "20 mg/10 mg", productNumbers: [513428] }],
    },
  ],
  N02AA01: [
    {
      name: "Dolcontin",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["5 mg", "10 mg", "30 mg", "60 mg", "100 mg", "200 mg"],
      variants: [
        { strength: "5 mg", productNumbers: [563767] },
        { strength: "10 mg", productNumbers: [478685, 461400] },
        { strength: "30 mg", productNumbers: [478743, 461434] },
        { strength: "60 mg", productNumbers: [488734] },
        { strength: "100 mg", productNumbers: [478875, 139881] },
        { strength: "200 mg", productNumbers: [581983] },
      ],
    },
    {
      name: "Dropizol",
      manufacturer: "Pharmanovia",
      form: "dråper",
      strengths: ["10 mg/ml"],
      variants: [{ strength: "10 mg/ml", productNumbers: [480553, 44780] }],
    },
    {
      name: "Malfin",
      manufacturer: "Teva",
      form: "depottablett",
      strengths: ["10 mg", "30 mg", "60 mg", "100 mg"],
      variants: [
        { strength: "10 mg", productNumbers: [482198, 102769] },
        { strength: "30 mg", productNumbers: [373288, 102778] },
        { strength: "60 mg", productNumbers: [102787] },
        { strength: "100 mg", productNumbers: [572641, 102796] },
      ],
    },

    {
      name: "Morfin",
      manufacturer: "Orifarm Healthcare",
      form: "injeksjon",
      strengths: ["10 mg/ml", "20 mg/ml"],
      variants: [
        { strength: "10 mg/ml", productNumbers: [36309, 11866] },
        { strength: "20 mg/ml", productNumbers: [127291] },
      ],
    },
    {
      name: "Morfin",
      manufacturer: "Orifarm Healthcare",
      form: "tablett",
      strengths: ["10 mg", "30 mg"],
      variants: [
        { strength: "10 mg", productNumbers: [551747] },
        { strength: "30 mg", productNumbers: [551796] },
      ],
    },
    {
      name: "Morfin Abcur",
      manufacturer: "Abcur",
      form: "injeksjon",
      strengths: ["10 mg/ml"],
      variants: [{ strength: "10 mg/ml", productNumbers: [171174] }],
    },
    {
      name: "Morfin Epidural",
      manufacturer: "Orifarm Healthcare",
      form: "infusjons-/injeksjonsvæske",
      strengths: ["2 mg/ml"],
      variants: [{ strength: "2 mg/ml", productNumbers: [449298] }],
    },

    {
      name: "Oramorph",
      manufacturer: "care4",
      form: "mikstur",
      strengths: ["2 mg/ml"],
      variants: [{ strength: "2 mg/ml", productNumbers: [398411] }],
    },
    {
      name: "Oramorph",
      manufacturer: "Molteni",
      form: "dråper",
      strengths: ["20 mg/ml"],
      variants: [{ strength: "20 mg/ml", productNumbers: [478000] }],
    },
    {
      name: "Oramorph",
      manufacturer: "Molteni",
      form: "mikstur",
      strengths: ["2 mg/ml"],
      variants: [{ strength: "2 mg/ml", productNumbers: [599903] }],
    },
  ],
  N02AX06: [
    {
      name: "Palexia",
      manufacturer: "Grünenthal",
      form: "mikstur",
      strengths: ["4 mg/ml", "20 mg/ml"],
      variants: [
        { strength: "4 mg/ml", productNumbers: [438833] },
        { strength: "20 mg/ml", productNumbers: [57462] },
      ],
    },
    {
      name: "Palexia",
      manufacturer: "Grünenthal",
      form: "tablett",
      strengths: ["50 mg"],
      variants: [{ strength: "50 mg", productNumbers: [94202] }],
    },
    {
      name: "Palexia depot",
      manufacturer: "Grünenthal",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg", "250 mg"],
      variants: [
        { strength: "50 mg", productNumbers: [94270, 94281] },
        { strength: "100 mg", productNumbers: [94293, 94304] },
        { strength: "150 mg", productNumbers: [94327, 94338] },
        { strength: "200 mg", productNumbers: [94349, 94361] },
        { strength: "250 mg", productNumbers: [94372, 94384] },
      ],
    },
    {
      name: "Palexia depot",
      manufacturer: "Orifarm",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg"],
      variants: [
        { strength: "50 mg", productNumbers: [47723] },
        { strength: "100 mg", productNumbers: [391513] },
        { strength: "150 mg", productNumbers: [516710] },
        { strength: "200 mg", productNumbers: [478102] },
      ],
    },
    {
      name: "Tapentadol G.L. Pharma",
      manufacturer: "G.L. Pharma",
      form: "tablett",
      strengths: ["50 mg"],
      variants: [{ strength: "50 mg", productNumbers: [389375] }],
    },
    {
      name: "Tapentadol Medical Valley",
      manufacturer: "Medical Valley",
      form: "depottablett",
      strengths: ["50 mg", "100 mg", "150 mg", "200 mg", "250 mg"],
      variants: [
        { strength: "50 mg", productNumbers: [64670, 119723] },
        { strength: "100 mg", productNumbers: [174019, 456605] },
        { strength: "150 mg", productNumbers: [419520, 187332] },
        { strength: "200 mg", productNumbers: [32453, 123088] },
        { strength: "250 mg", productNumbers: [438897, 94670] },
      ],
    },
  ],
  N02AX02: [
    {
      name: "Nobligan",
      manufacturer: "Grünenthal",
      form: "kapsel",
      strengths: ["50 mg"],
      variants: [{ strength: "50 mg", productNumbers: [60396, 60387] }],
    },
    {
      name: "Nobligan Retard",
      manufacturer: "Grünenthal",
      form: "depottablett",
      strengths: ["100 mg", "150 mg", "200 mg"],
      variants: [
        { strength: "100 mg", productNumbers: [469890, 469932] },
        { strength: "150 mg", productNumbers: [469866, 469874] },
        { strength: "200 mg", productNumbers: [469742, 469817] },
      ],
    },

    {
      name: "Tramadol/Paracetamol Orion",
      manufacturer: "Orion",
      form: "tablett",
      strengths: ["37,5 mg/325 mg"],
      variants: [{ strength: "37,5 mg/325 mg", productNumbers: [410633, 378878] }],
    },

    {
      name: "Tramadol Actavis",
      manufacturer: "Actavis",
      form: "kapsel",
      strengths: ["50 mg"],
      variants: [{ strength: "50 mg", productNumbers: [155391, 384929] }],
    },
    {
      name: "Tramadol HEXAL",
      manufacturer: "HEXAL",
      form: "kapsel",
      strengths: ["50 mg"],
      variants: [{ strength: "50 mg", productNumbers: [380769, 563850] }],
    },
    {
      name: "Tramagetic OD",
      manufacturer: "2care4",
      form: "depottablett",
      strengths: ["200 mg"],
      variants: [{ strength: "200 mg", productNumbers: [538145] }],
    },
    {
      name: "Tramagetic OD",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["150 mg", "200 mg", "300 mg"],
      variants: [
        { strength: "150 mg", productNumbers: [586035] },
        { strength: "200 mg", productNumbers: [64095] },
        { strength: "300 mg", productNumbers: [406319] },
      ],
    },
    {
      name: "Tramagetic Retard",
      manufacturer: "Mundipharma",
      form: "depottablett",
      strengths: ["100 mg", "150 mg"],
      variants: [
        { strength: "100 mg", productNumbers: [596844] },
        { strength: "150 mg", productNumbers: [182376] },
      ],
    },
  ],
};
