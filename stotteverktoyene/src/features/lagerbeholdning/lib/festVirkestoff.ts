// Kobler et innlimt preparatnavn mot FEST-katalogen (src/features/fest/meds.json)
// for å hente virkestoff + ATC + form/styrke. Brukes til å gruppere uttak på
// virkestoff i stedet for varenummer, slik at ulike merkenavn (f.eks. Norvasc og
// Amlodipin Sandoz) og ulike pakningsstørrelser av samme preparat slås sammen.
//
// FEST er ikke nøklet på varenummer, så koblingen skjer via navn (navnFormStyrke).
// Gruppenøkkelen blir `ATC|form+styrke`, slik at samme virkestoff i samme styrke
// og form havner sammen – mens f.eks. 5 mg og 10 mg holdes adskilt.

export interface FestMed {
  varenavn: string | null;
  navnFormStyrke: string | null;
  atc: string | null;
  virkestoff: string | null;
}

export interface VirkestoffMatch {
  atc: string;
  virkestoff: string;
  /** Form + styrke uten merkenavn, f.eks. "tab 5 mg". */
  formStyrke: string;
  /** Stabil gruppenøkkel: `ATC|formStyrke`. */
  groupKey: string;
}

export type VirkestoffResolver = (varenavn: string) => VirkestoffMatch | null;

// Henter konsentrasjon i mg/ml fra et preparatnavn. Støtter både "10 mg/ml" og
// "250 mg/5 ml" (→ 50 mg/ml). Returnerer null når mønsteret ikke finnes.
export const extractMgPerMl = (text: string): number | null => {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)?\s*ml\b/i);
  if (!m) return null;
  const mg = Number(m[1].replace(",", "."));
  const ml = m[2] ? Number(m[2].replace(",", ".")) : 1;
  if (!mg || !ml) return null;
  const verdi = mg / ml;
  return Number.isFinite(verdi) ? verdi : null;
};

// Normaliser navn: små bokstaver, sikre mellomrom mellom tall og enhet
// ("5mg" → "5 mg"), kollaps whitespace.
const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/(\d)(mg|g|mcg|mikrog|ml|mmol|ie)\b/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Form + styrke = navnFormStyrke uten merkenavn-prefikset (varenavn).
const deriveFormStyrke = (med: FestMed): string => {
  const nfs = med.navnFormStyrke ?? "";
  if (med.varenavn) {
    const stripped = nfs.replace(new RegExp("^" + escapeRegExp(med.varenavn), "i"), "").trim();
    if (stripped) return normalizeName(stripped);
  }
  return normalizeName(nfs);
};

export const buildVirkestoffResolver = (meds: FestMed[]): VirkestoffResolver => {
  const byName = new Map<string, FestMed>();
  for (const med of meds) {
    if (!med.navnFormStyrke || !med.atc) continue;
    const key = normalizeName(med.navnFormStyrke);
    if (!byName.has(key)) byName.set(key, med);
  }
  const keys = [...byName.keys()];

  return (varenavn: string): VirkestoffMatch | null => {
    const normalized = normalizeName(varenavn);
    if (!normalized) return null;

    let hit = byName.get(normalized);
    if (!hit) {
      // Innlimte navn kan ha pakningsstørrelse på slutten (tab-formatet). Finn det
      // lengste FEST-navnet som er et prefiks av det innlimte – det stripper halen.
      let bestLen = 0;
      for (const key of keys) {
        if (key.length >= 6 && normalized.startsWith(key) && key.length > bestLen) {
          bestLen = key.length;
          hit = byName.get(key);
        }
      }
    }
    if (!hit) return null;

    const formStyrke = deriveFormStyrke(hit);
    return {
      atc: hit.atc as string,
      virkestoff: hit.virkestoff ?? "",
      formStyrke,
      groupKey: `${hit.atc}|${formStyrke}`,
    };
  };
};
