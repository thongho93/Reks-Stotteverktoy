export type AdministrationRoute =
  | "oral"
  | "parenteral"
  | "transdermal"
  | "sublingval"
  | "intranasal"
  | "rektal";

export type ATCcode =
  | "N02AE01"
  | "N02AA08"
  | "N01AH01"
  | "N02AB03"
  | "N02AA03"
  | "N02AB01"
  | "N02AG02"
  | "N02AJ06"
  | "R05DA04"
  | "N07BC02"
  | "N02AA01"
  | "N02AA05"
  | "N02AA55"
  | "A07DA02"
  | "N02AB02"
  | "N02AX06"
  | "N02AX02";

export interface OpioidDefinition {
  id: string;
  substance: string;
  atcCode: ATCcode[];
  route: AdministrationRoute[];
  omeqFactor: number;
  isPatch?: boolean;
  isShortActing?: boolean;
  helpText?: string;
}

export const OPIOIDS: OpioidDefinition[] = [
  {
    id: "buprenorfin-sublingval",
    substance: "Buprenorfin",
    atcCode: ["N02AE01"],
    route: ["sublingval"],
    omeqFactor: 48,
    isShortActing: true,
  },
  {
    id: "buprenorfin-transdermal",
    substance: "Buprenorfin",
    atcCode: ["N02AE01"],
    route: ["transdermal"],
    omeqFactor: 2.22,
    isPatch: true,
    helpText: "For depotplaster er døgndose ikke nødvendig. Velg riktig styrke.",
  },
  {
    id: "dihydrokodein-oral",
    substance: "Dihydrokodein",
    atcCode: ["N02AA08"],
    route: ["oral"],
    omeqFactor: 0.05,
  },
  {
    id: "fentanyl-parenteral",
    substance: "Fentanyl",
    atcCode: ["N01AH01", "N02AB03"],
    route: ["parenteral"],
    omeqFactor: 150,
    isShortActing: true,
    helpText:
      "Styrken er allerede omregnet fra µg til mg. Legg inn døgndose som antall tabletter/doser (nesespray).",
  },
  {
    id: "fentanyl-sublingval-intranasal",
    substance: "Fentanyl",
    atcCode: ["N01AH01", "N02AB03"],
    route: ["sublingval", "intranasal"],
    omeqFactor: 250,
    isShortActing: true,
    helpText:
      "Styrken er allerede omregnet fra µg til mg. Legg inn døgndose som antall tabletter/doser (nesespray).",
  },
  {
    id: "fentanyl-transdermal",
    substance: "Fentanyl",
    atcCode: ["N01AH01", "N02AB03"],
    route: ["transdermal"],
    omeqFactor: 2.4,
    isPatch: true,
    helpText: "For depotplaster er døgndose ikke nødvendig. Velg riktig styrke.",
  },
  {
    id: "hydromorfon-oral",
    substance: "Hydromorfon",
    atcCode: ["N02AA03"],
    route: ["oral"],
    omeqFactor: 5,
  },
  {
    id: "hydromorfon-parenteral",
    substance: "Hydromorfon",
    atcCode: ["N02AA03"],
    route: ["parenteral"],
    omeqFactor: 15,
    isShortActing: true,
  },
  {
    id: "ketobemidon-oral",
    substance: "Ketobemidon",
    atcCode: ["N02AB01", "N02AG02"],
    route: ["oral"],
    omeqFactor: 1,
  },
  {
    id: "ketobemidon-parenteral",
    substance: "Ketobemidon",
    atcCode: ["N02AB01", "N02AG02"],
    route: ["parenteral"],
    omeqFactor: 3,
    isShortActing: true,
  },
  {
    id: "ketobemidon-rektal",
    substance: "Ketobemidon",
    atcCode: ["N02AB01", "N02AG02"],
    route: ["rektal"],
    omeqFactor: 0.3,
  },
  {
    id: "kodein-oral-rektal",
    substance: "Kodein",
    atcCode: ["N02AJ06", "R05DA04"],
    route: ["oral", "rektal"],
    omeqFactor: 0.1,
    helpText:
      "Styke til kodein er allerede valgt. Legg inn døgndose som antall tabletter/stikkpiller.",
  },
  {
    id: "metadon-oral",
    substance: "Metadon",
    atcCode: ["N07BC02"],
    route: ["oral"],
    omeqFactor: 6,
    helpText: "Vær oppmerksom på ulike styrker. Legg inn døgndose i mg, ikke i ml.",
  },
  {
    id: "metadon-parenteral",
    substance: "Metadon",
    atcCode: ["N07BC02"],
    route: ["parenteral"],
    omeqFactor: 6,
    isShortActing: true,
  },
  {
    id: "morfin-oral",
    substance: "Morfin",
    atcCode: ["N02AA01"],
    route: ["oral"],
    omeqFactor: 1,
  },
  {
    id: "morfin-parenteral",
    substance: "Morfin",
    atcCode: ["N02AA01"],
    route: ["parenteral"],
    omeqFactor: 3,
    isShortActing: true,
  },
  {
    id: "morfin-rektal",
    substance: "Morfin",
    atcCode: ["N02AA01"],
    route: ["rektal"],
    omeqFactor: 0.94,
  },
  {
    id: "oksykodon-oral",
    substance: "Oksykodon",
    atcCode: ["N02AA05", "N02AA55"],
    route: ["oral"],
    omeqFactor: 1.5,
    helpText:
      "Styrken for virkestoffet oksykodon er allerede valgt. Legg inn døgndose som antall tabletter/doser.",
  },
  {
    id: "oksykodon-parenteral",
    substance: "Oksykodon",
    atcCode: ["N02AA05", "N02AA55"],
    route: ["parenteral"],
    omeqFactor: 3,
    isShortActing: true,
  },
  {
    id: "opium-morfin-oral",
    substance: "Opium (morfin)",
    atcCode: ["A07DA02"],
    route: ["oral"],
    omeqFactor: 1,
    helpText: "1 dråpe inneholder 0,5 mg morfin. 10 dråper = 5 mg morfin.",
  },
  {
    id: "petidin-parenteral",
    substance: "Petidin",
    atcCode: ["N02AB02"],
    route: ["parenteral"],
    omeqFactor: 0.3,
    isShortActing: true,
  },
  {
    id: "petidin-rektal",
    substance: "Petidin",
    atcCode: ["N02AB02"],
    route: ["rektal"],
    omeqFactor: 0.1,
  },
  {
    id: "tapentadol-oral",
    substance: "Tapentadol",
    atcCode: ["N02AX06"],
    route: ["oral"],
    omeqFactor: 0.2,
  },
  {
    id: "tramadol-oral",
    substance: "Tramadol",
    atcCode: ["N02AX02"],
    route: ["oral"],
    omeqFactor: 0.15,
  },
];
