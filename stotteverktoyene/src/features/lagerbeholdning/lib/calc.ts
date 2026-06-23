// Kumulativ lagerbeholdning per vare.
//
// Modell (avklart med bruker):
//   - Summer alt som er hentet (totaltHentet).
//   - Brukeren oppgir dagsforbruk (enheter/dag).
//   - Forbruk regnes fra FØRSTE uttak fram til referansedato.
//   - beholdning  = totaltHentet − dagsforbruk × dager siden første uttak
//   - dagerIgjen  = beholdning ÷ dagsforbruk
//   - dekketTil   = referansedato + dagerIgjen

import type { ParsedUttak } from "./parse";
import { extractMgPerMl, type VirkestoffMatch, type VirkestoffResolver } from "./festVirkestoff";

/** Et distinkt preparat (varenr + navn) som inngår i en sammenslått gruppe. */
export interface VareMedlem {
  varenr: string;
  varenavn: string;
}

export interface VareBeregning {
  key: string;
  varenr: string;
  varenavn: string;
  enhet: string;
  // Flytende preparat (enhet ml) → tillater dosering i mg via styrke-omregning.
  erFlytende: boolean;
  // Konsentrasjon mg/ml hentet fra preparatnavnet (null hvis ikke funnet).
  styrkeMgPerMl: number | null;
  // Virkestoff-kobling (null når preparatet ikke ble funnet i FEST)
  virkestoff: string | null;
  atc: string | null;
  formStyrke: string | null;
  // Distinkte preparater slått sammen i gruppa, og om det faktisk er > 1
  members: VareMedlem[];
  merged: boolean;
  uttak: ParsedUttak[]; // gyldige uttak, sortert eldst → nyest
  antallUttak: number;
  totaltHentet: number;
  forsteUttak: Date | null;
  sisteUttak: Date | null;
  // Doseavhengige felt (null til dagsforbruk er oppgitt)
  dagligForbruk: number | null;
  dagerSidenForsteUttak: number | null;
  forbrukSaLangt: number | null;
  beholdning: number | null;
  dagerIgjen: number | null;
  dekketTil: Date | null;
}

/** Uttakene i en gruppe + virkestoff-treffet som definerte gruppa. */
export interface UttakGruppe {
  uttak: ParsedUttak[];
  match: VirkestoffMatch | null;
}

/** Doseringsinput. Dosen kan oppgis i preparatets enhet (ml) eller i mg som
 *  regnes om via styrke (mg/ml) – kun relevant for flytende preparater. */
export interface DoseSpec {
  /** Tallet brukeren tastet inn (i `doseEnhet`-enheten). */
  dose: number | null;
  /** Hva tallet er oppgitt i. "mg" konverteres til ml via styrke. */
  doseEnhet: "ml" | "mg";
  /** Manuell styrke (mg/ml) som overstyrer den auto-uttrukne. */
  styrkeOverride: number | null;
  /** Dager i doseringsperioden (1 = dag, 7 = uke, 30 = måned). */
  periodeDager: number;
}

const MS_PER_DAY = 86_400_000;

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const diffDays = (a: Date, b: Date): number =>
  Math.round((startOfDay(a) - startOfDay(b)) / MS_PER_DAY);

// Kalenderbasert (ikke ms-aritmetikk) for å unngå sommertid-feil ved lange spenn.
export const addDays = (d: Date, days: number): Date => {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  base.setDate(base.getDate() + days);
  return base;
};

/**
 * Grupperer uttak. Når en `resolver` er gitt, slås preparater med samme
 * virkestoff + styrke + form sammen (på tvers av merkenavn og pakningsstørrelse).
 * Uttak som ikke finnes i FEST faller tilbake på gruppering per varenummer.
 */
export const groupByVare = (
  uttak: ParsedUttak[],
  resolver?: VirkestoffResolver | null,
): Map<string, UttakGruppe> => {
  const map = new Map<string, UttakGruppe>();
  for (const u of uttak) {
    const match = resolver ? resolver(u.varenavn) : null;
    const key = match ? match.groupKey : u.varenr?.trim() || u.varenavn?.trim() || "ukjent";
    const entry = map.get(key) ?? { uttak: [], match };
    entry.uttak.push(u);
    if (!entry.match && match) entry.match = match;
    map.set(key, entry);
  }
  return map;
};

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Distinkte preparater (varenr + navn) i et sett uttak, i rekkefølge de dukker opp. */
const finnMedlemmer = (uttakList: ParsedUttak[]): VareMedlem[] => {
  const seen = new Map<string, VareMedlem>();
  for (const u of uttakList) {
    const varenr = u.varenr?.trim() ?? "";
    const varenavn = u.varenavn?.trim() ?? "";
    const dedupKey = varenr || varenavn;
    if (!dedupKey || seen.has(dedupKey)) continue;
    seen.set(dedupKey, { varenr, varenavn });
  }
  return [...seen.values()];
};

export const beregnVare = (
  varenrKey: string,
  gruppe: UttakGruppe,
  referansedato: Date,
  dose: DoseSpec,
): VareBeregning => {
  const uttakList = gruppe.uttak;
  const match = gruppe.match;

  // Uttak med gyldig dato + mengde, og som ikke ligger etter referansedatoen.
  // Annullerte uttak vises i historikken, men teller IKKE i beregningen.
  const medData = uttakList
    .filter((u): u is ParsedUttak & { dato: Date; mengde: number } => u.dato != null && u.mengde != null)
    .filter((u) => diffDays(referansedato, u.dato) >= 0)
    .sort((a, b) => a.dato.getTime() - b.dato.getTime());

  const tellende = medData.filter((u) => !u.annullert);

  const totaltHentet = tellende.reduce((sum, u) => sum + u.mengde!, 0);
  const forsteUttak = tellende.length ? tellende[0].dato! : null;
  const sisteUttak = tellende.length ? tellende[tellende.length - 1].dato! : null;
  const enhet =
    tellende.find((u) => u.enhet)?.enhet ?? uttakList.find((u) => u.enhet)?.enhet ?? "";

  const members = finnMedlemmer(uttakList);
  const merged = members.length > 1;
  const varenr = members[0]?.varenr || uttakList.find((u) => u.varenr)?.varenr || varenrKey;

  // Visningsnavn: ved virkestoff-treff vises virkestoff + form/styrke (det som
  // faktisk slår preparatene sammen). Ellers brukes det innlimte varenavnet.
  const fallbackNavn = members[0]?.varenavn || varenrKey;
  const varenavn = match
    ? `${capitalize(match.virkestoff)}${match.formStyrke ? ` ${match.formStyrke}` : ""}`.trim()
    : fallbackNavn;

  // Flytende preparat (enhet ml) → tillat mg-dosering med styrke-omregning.
  const erFlytende = enhet.toUpperCase() === "ML";
  const styrkeMgPerMl = erFlytende
    ? extractMgPerMl([match?.formStyrke, ...members.map((m) => m.varenavn)].filter(Boolean).join(" "))
    : null;

  // Omregn dosen til ml/dag. I mg-modus deles på styrke (manuell overstyrer auto).
  const effektivStyrke = dose.styrkeOverride && dose.styrkeOverride > 0 ? dose.styrkeOverride : styrkeMgPerMl;
  let mlDose: number | null = dose.dose;
  if (erFlytende && dose.doseEnhet === "mg") {
    mlDose =
      dose.dose != null && effektivStyrke != null && effektivStyrke > 0
        ? dose.dose / effektivStyrke
        : null;
  }
  const dagligForbruk =
    mlDose != null && Number.isFinite(mlDose) && dose.periodeDager > 0
      ? mlDose / dose.periodeDager
      : null;

  let dagerSidenForsteUttak: number | null = null;
  let forbrukSaLangt: number | null = null;
  let beholdning: number | null = null;
  let dagerIgjen: number | null = null;
  let dekketTil: Date | null = null;

  if (forsteUttak) {
    dagerSidenForsteUttak = diffDays(referansedato, forsteUttak);
  }

  if (
    dagligForbruk != null &&
    dagligForbruk > 0 &&
    forsteUttak &&
    dagerSidenForsteUttak != null
  ) {
    forbrukSaLangt = dagligForbruk * dagerSidenForsteUttak;
    beholdning = totaltHentet - forbrukSaLangt;
    dagerIgjen = beholdning / dagligForbruk;
    dekketTil = addDays(referansedato, Math.round(dagerIgjen));
  }

  return {
    key: varenrKey,
    varenr,
    varenavn,
    enhet,
    erFlytende,
    styrkeMgPerMl,
    virkestoff: match?.virkestoff ?? null,
    atc: match?.atc ?? null,
    formStyrke: match?.formStyrke ?? null,
    members,
    merged,
    uttak: medData,
    antallUttak: tellende.length,
    totaltHentet,
    forsteUttak,
    sisteUttak,
    dagligForbruk: dagligForbruk ?? null,
    dagerSidenForsteUttak,
    forbrukSaLangt,
    beholdning,
    dagerIgjen,
    dekketTil,
  };
};

export const formatDato = (d: Date | null): string => {
  if (!d) return "–";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

/** "yyyy-mm-dd" for <input type="date"> ↔ Date. */
export const toDateInputValue = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const fromDateInputValue = (value: string): Date | null => {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
