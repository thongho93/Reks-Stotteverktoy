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
  | "injeksjon";

export interface ATCProduct {
  name: string; // handelsnavn
  manufacturer?: string; // produsent
  form?: ProductForm; // formulering
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
    { name: "Bugnanto", manufacturer: "Sandoz", form: "depotplaster" },
    { name: "Buprefarm", manufacturer: "Orifarm Generics", form: "depotplaster" },
    { name: "Buprenorphine G.L. Pharma", manufacturer: "G.L. Pharma", form: "sublingvaltablett" },
    { name: "Espranor", manufacturer: "Ethypharm", form: "lyofilisattablett" },
    { name: "Norspan", manufacturer: "Mundipharma", form: "depotplaster" },
    { name: "Suboxone", manufacturer: "Indivior", form: "sublingvalfilm" },
    { name: "Subutex", manufacturer: "Indivior", form: "sublingvaltablett" },
    { name: "Temgesic", manufacturer: "Eumedica Pharmaceuticals", form: "sublingvaltablett" },
    { name: "Zubsolv", manufacturer: "Accord", form: "sublingvaltablett" },
  ],
  N02AA08: [
    { name: "DHC Continus", form: "depottablett" },
    { name: "DHC Ennogen", form: "depottablett" },
    { name: "Dihydrokodeine", manufacturer: "Actavis", form: "tablett" },
    { name: "Dihydrokodeine", manufacturer: "Ennogen", form: "depottablett" },
  ],
  N01AH01: [
    { name: "Fentanyl Hameln", form: "injeksjon" },
    { name: "Fentanyl Kalceks", form: "injeksjon" },
    { name: "Fentanyl Piramal", form: "injeksjon" },
  ],
  N02AB03: [
    { name: "Abstral", manufacturer: "Grünenthal", form: "sublingvaltablett" },
    { name: "Durogesic", manufacturer: "Janssen", form: "depotplaster" },
    { name: "Fentanyl Hameln", form: "injeksjon" },
    { name: "Fentanyl ratiopharm", form: "depotplaster" },
    { name: "Fentanyl Sandoz", form: "depotplaster" },
    { name: "Instanyl DoseGuard", manufacturer: "Gentili", form: "nesespray" },
  ],
  N02AB02: [
    { name: "Pethidine Macure", manufacturer: "Macure Pharma", form: "injeksjon" },
    { name: "Petidin", manufacturer: "Takeda", form: "injeksjon" },
  ],
  N02AA03: [
    { name: "Hydofon G.L. Pharma", form: "injeksjon" },
    { name: "Palladon", manufacturer: "Mundipharma", form: "injeksjon" },
  ],
  N02AJ06: [
    { name: "Altermol", manufacturer: "Alternova", form: "tablett" },
    { name: "Paralgin forte", manufacturer: "Karo Pharma", form: "tablett" },
    { name: "Paralgin major", manufacturer: "Karo Pharma", form: "tablett" },
    { name: "Paralgin forte", manufacturer: "Karo Pharma", form: "stikkpille" },
    { name: "Paralgin major", manufacturer: "Karo Pharma", form: "stikkpille" },
    { name: "Pinex Forte", manufacturer: "Teva", form: "brusetablett" },
  ],
  R05DA04: [
    { name: "Kodein", manufacturer: "Orifarm Healthcare", form: "tablett" },
    { name: "Paralgin forte", manufacturer: "Karo Pharma", form: "tablett" },
    { name: "Paralgin major", manufacturer: "Karo Pharma", form: "tablett" },
    { name: "Paralgin forte", manufacturer: "Karo Pharma", form: "stikkpille" },
    { name: "Paralgin major", manufacturer: "Karo Pharma", form: "stikkpille" },
    { name: "Pinex Forte", manufacturer: "Teva", form: "brusetablett" },
  ],
  N07BC02: [
    { name: "Metadon Abcur", manufacturer: "Abcur", form: "tablett" },
    { name: "Metadon DnE", manufacturer: "dne pharma", form: "mikstur" },
    { name: "Metadon Martindale", manufacturer: "Ethypharm", form: "mikstur" },
    { name: "Metadon Nordic Drugs", manufacturer: "Nordic Drugs", form: "mikstur" },
  ],
  N02AA05: [
    { name: "Oxycodone Abboxia", manufacturer: "Abboxia", form: "injeksjon" },
    { name: "Oxycodone Actavis", manufacturer: "Actavis", form: "kapsel" },
    { name: "Oxycodone Hameln", manufacturer: "Hameln", form: "injeksjon" },
    { name: "Oxycodone Orifarm", manufacturer: "Orifarm Generics", form: "mikstur" },

    { name: "OxyContin", manufacturer: "Mundipharma", form: "depottablett" },

    { name: "OxyNorm", manufacturer: "Mundipharma", form: "injeksjon" },
    { name: "OxyNorm", manufacturer: "Mundipharma", form: "kapsel" },
    { name: "OxyNorm", manufacturer: "Mundipharma", form: "mikstur" },
    { name: "OxyNorm", manufacturer: "Orifarm", form: "mikstur" },

    { name: "Reltebon Depot", manufacturer: "Teva", form: "depottablett" },
    { name: "Targiniq", manufacturer: "Mundipharma", form: "depottablett" },
  ],
  N02AA55: [
    { name: "Tanonalla", manufacturer: "Sandoz", form: "depottablett" },
    { name: "Targin", manufacturer: "Orifarm", form: "depottablett" },
    { name: "Targiniq", manufacturer: "Mundipharma", form: "depottablett" },
  ],
  N02AA01: [
    { name: "Dolcontin", manufacturer: "Mundipharma", form: "depottablett" },
    { name: "Dropizol", manufacturer: "Pharmanovia", form: "dråper" },
    { name: "Malfin", manufacturer: "Teva", form: "depottablett" },

    { name: "Morfin", manufacturer: "Orifarm Healthcare", form: "injeksjon" },
    { name: "Morfin", manufacturer: "Orifarm Healthcare", form: "tablett" },
    { name: "Morfin Abcur", manufacturer: "Abcur", form: "injeksjon" },
    { name: "Morfin Epidural", manufacturer: "Orifarm Healthcare", form: "injeksjon" },

    { name: "Oramorph", manufacturer: "care4", form: "mikstur" },
    { name: "Oramorph", manufacturer: "Molteni", form: "dråper" },
    { name: "Oramorph", manufacturer: "Molteni", form: "mikstur" },
  ],
  N02AX06: [
    { name: "Palexia", manufacturer: "Grünenthal", form: "mikstur" },
    { name: "Palexia", manufacturer: "Grünenthal", form: "tablett" },
    { name: "Palexia depot", manufacturer: "Grünenthal", form: "depottablett" },
    { name: "Palexia depot", manufacturer: "Orifarm", form: "depottablett" },
    { name: "Tapentadol G.L. Pharma", manufacturer: "G.L. Pharma", form: "tablett" },
    { name: "Tapentadol Medical Valley", manufacturer: "Medical Valley", form: "depottablett" },
  ],
  N02AX02: [
    { name: "Nobligan", manufacturer: "Grünenthal", form: "kapsel" },
    { name: "Nobligan Retard", manufacturer: "Grünenthal", form: "depottablett" },

    { name: "Tramadol/Paracetamol Orion", manufacturer: "Orion", form: "tablett" },

    { name: "Tramadol Actavis", manufacturer: "Actavis", form: "kapsel" },
    { name: "Tramadol HEXAL", manufacturer: "HEXAL", form: "kapsel" },

    { name: "Tramagetic OD", manufacturer: "care4", form: "depottablett" },
    { name: "Tramagetic OD", manufacturer: "Mundipharma", form: "depottablett" },
    { name: "Tramagetic Retard", manufacturer: "Mundipharma", form: "depottablett" },
  ],
};
