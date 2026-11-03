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

// Form-ord vi kjenner igjen i preparatnavn. Lengre/mer spesifikke først så de ikke
// skygges av kortere (\b sørger likevel for ordgrenser). Brukes i navnesignaturen
// for å skille f.eks. tabletter fra mikstur og depottab fra vanlig tab.
const FORM_ORD = [
  "depottab", "depotkaps", "depotgran", "depotplaster",
  "smeltetab", "brusetab", "brusegran", "tyggetab", "sugetab",
  "resoribl", "vagitab", "disperg",
  "tabl", "tab", "kapsel", "kaps",
  "mikstur", "mikst", "dråper", "dråp", "draaper",
  "stikkpille", "stikkp", "supp",
  "krem", "salve", "gel", "liniment", "linim",
  "injeksjon", "inj", "infusjon",
  "pulver", "pulv", "granulat", "gran",
  "nesespray", "øyedråper", "øredråper", "plaster", "spray",
  "oppløsning", "oppl", "konsentrat",
];

// Styrke i navnet, normalisert: "20 mg" → "20mg", "10 mg/ml" → "10mg/1ml",
// "250 mg/5 ml" → "250mg/5ml". Returnerer null når ingen styrke finnes.
const extractStyrke = (text: string): string | null => {
  const m = text.match(
    /(\d+(?:[.,]\d+)?)\s*(mikrogram|mikrog|mcg|mg|g|mmol|ie|%)\b(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*ml\b)?/i,
  );
  if (!m) return null;
  const tall = m[1].replace(",", ".");
  const enhet = m[2].toLowerCase();
  if (m[0].includes("/")) {
    const ml = m[3] ? m[3].replace(",", ".") : "1";
    return `${tall}${enhet}/${ml}ml`;
  }
  return `${tall}${enhet}`;
};

/**
 * Navnebasert virkestoff-signatur: `ledende navneord | form | styrke`, f.eks.
 * "Fluoxetin Sandoz disperg tab 20 mg" → "fluoxetin|disperg tab|20mg". Brukes som
 * fallback når FEST ikke kjenner preparatet, slik at samme virkestoff i samme
 * styrke og form slås sammen på tvers av merkenavn – mens ulike styrker (10 mg vs
 * 20 mg) holdes adskilt. Returnerer null når styrke mangler (da grupperes det ikke
 * på navn, men på varenummer).
 */
export const varenavnSignatur = (varenavn: string): string | null => {
  const navn = varenavn.toLowerCase().trim();
  if (!navn) return null;

  const styrke = extractStyrke(navn);
  if (!styrke) return null;

  const ledende = (navn.split(/\s+/)[0] ?? "").replace(/[^a-zæøå]/g, "");
  if (!ledende) return null;

  const former = FORM_ORD.filter((ord) => new RegExp(`\\b${ord}\\b`).test(navn))
    .sort()
    .join(" ");

  return `${ledende}|${former}|${styrke}`;
};

// Numerisk styrke fra en normalisert styrke-tekst ("5mg", "10mg/1ml", "500mikrogram"),
// i felles enhet slik at styrker kan sammenlignes: mg, mg/ml eller (uendret) ie/mmol/%.
const styrkeTilTall = (styrke: string | null): { verdi: number; enhet: string } | null => {
  if (!styrke) return null;
  const m = styrke.match(/^(\d+(?:\.\d+)?)(mikrogram|mikrog|mcg|mg|g|mmol|ie|%)(?:\/(\d+(?:\.\d+)?)ml)?$/);
  if (!m) return null;
  const tall = Number(m[1]);
  const perMl = m[3] ? Number(m[3]) : null;
  const tilMg = m[2] === "g" ? 1000 : m[2] === "mg" ? 1 : ["mikrogram", "mikrog", "mcg"].includes(m[2]) ? 0.001 : null;
  if (tilMg == null) return perMl ? { verdi: tall / perMl, enhet: `${m[2]}/ml` } : { verdi: tall, enhet: m[2] };
  return perMl ? { verdi: (tall * tilMg) / perMl, enhet: "mg/ml" } : { verdi: tall * tilMg, enhet: "mg" };
};

/** Styrke for en gruppe (fra FEST-treffet, ellers første innlimte navn). */
export const gruppeStyrke = (gruppe: UttakGruppe): { verdi: number; enhet: string } | null =>
  styrkeTilTall(
    extractStyrke((gruppe.match?.formStyrke ?? "").toLowerCase()) ??
      extractStyrke(gruppe.uttak.find((u) => u.varenavn)?.varenavn.toLowerCase() ?? ""),
  );

/**
 * Omregningsfaktor for å legge en gruppe inn i en annen: antall enheter av `fra`
 * uttrykt i enheter av `til` (10 mg-tabletter inn i 5 mg-gruppe → 2). 1 når
 * styrkene er like eller ikke kan sammenlignes.
 */
export const styrkeFaktor = (fra: UttakGruppe, til: UttakGruppe): number => {
  const a = gruppeStyrke(fra);
  const b = gruppeStyrke(til);
  if (!a || !b || a.enhet !== b.enhet || b.verdi <= 0) return 1;
  const faktor = a.verdi / b.verdi;
  return Number.isFinite(faktor) && faktor > 0 ? Math.round(faktor * 1000) / 1000 : 1;
};

// Automatisk gruppenøkkel for et FEST-treff: virkestoff (ATC) + styrke. Form-teksten
// ("tab" vs "filmdrasjert tab") og merkenavn skiller IKKE grupper – bare ulik styrke gjør det.
const festNokkel = (match: VirkestoffMatch): string => {
  const styrke = extractStyrke(match.formStyrke.toLowerCase());
  return styrke ? `${match.atc}|${styrke}` : match.groupKey;
};

/**
 * Grupperer uttak. Når en `resolver` er gitt, slås preparater med samme
 * virkestoff + styrke + form sammen (på tvers av merkenavn og pakningsstørrelse).
 *
 * Preparater FEST ikke kjenner igjen (ulike merkenavn/varenummer av en generika
 * finnes ikke alltid i katalogen) grupperes på en navnebasert signatur
 * (`varenavnSignatur`). Signaturen kobles mot en FEST-gruppe når en "søsken"-vare
 * med samme signatur ble gjenkjent, ellers danner den sin egen gruppe. Slik antas
 * samme virkestoff selv om navn og varenummer ser ulike ut – men ulike styrker
 * (f.eks. 10 mg vs 20 mg) slås aldri sammen. Uten styrke i navnet faller varen
 * tilbake på gruppering per varenummer.
 */
export const groupByVare = (
  uttak: ParsedUttak[],
  resolver?: VirkestoffResolver | null,
): Map<string, UttakGruppe> => {
  // Pass 1: kjør FEST-oppslag for alle, og lær hvilken FEST-gruppe en gitt
  // navnesignatur tilhører (fra varer som FAKTISK ble gjenkjent).
  const matches = uttak.map((u) => (resolver ? resolver(u.varenavn) : null));
  const signaturTilGruppe = new Map<string, string>();
  uttak.forEach((u, i) => {
    const match = matches[i];
    if (!match) return;
    const sig = varenavnSignatur(u.varenavn);
    if (sig && !signaturTilGruppe.has(sig)) signaturTilGruppe.set(sig, festNokkel(match));
  });

  // Pass 2: tildel gruppenøkkel. FEST-treff styrer; ellers brukes signaturen
  // (knyttet til en FEST-gruppe når en søsken-vare ble gjenkjent), så varenummer.
  const map = new Map<string, UttakGruppe>();
  uttak.forEach((u, i) => {
    const match = matches[i];
    const sig = match ? null : varenavnSignatur(u.varenavn);
    const fraNavn = (match ? festNokkel(match) : null) ?? (sig ? signaturTilGruppe.get(sig) ?? sig : null);
    const key = fraNavn || u.varenr?.trim() || u.varenavn?.trim() || "ukjent";
    const entry = map.get(key) ?? { uttak: [], match };
    entry.uttak.push(u);
    if (!entry.match && match) entry.match = match;
    map.set(key, entry);
  });
  return map;
};

/** Gruppa en nøkkel til slutt havner i etter manuell sammenslåing (kjeder følges). */
export const finnGruppeMaal = (
  grupper: Map<string, UttakGruppe>,
  mapping: Record<string, string>,
  key: string,
): string => {
  let current = key;
  const sett = new Set<string>([current]);
  while (mapping[current] && grupper.has(mapping[current]) && !sett.has(mapping[current])) {
    current = mapping[current];
    sett.add(current);
  }
  return current;
};

/**
 * Slår sammen grupper manuelt. `mapping` peker fra en gruppenøkkel til gruppa den
 * skal inn i. Uttakene samles i målgruppa, som beholder sitt eget virkestoff-treff,
 * slik at beholdning regnes fra ett felles første uttak med én dose – ellers telles
 * forbruket etter det nyeste uttaket flere ganger. Nøkler som ikke finnes
 * (f.eks. etter ny innliming) ignoreres.
 */
export const slaaSammenGrupper = (
  grupper: Map<string, UttakGruppe>,
  mapping: Record<string, string>,
): Map<string, UttakGruppe> => {
  const resultat = new Map<string, UttakGruppe>();
  for (const [key, gruppe] of grupper) {
    if (finnGruppeMaal(grupper, mapping, key) === key) {
      resultat.set(key, { uttak: [...gruppe.uttak], match: gruppe.match });
    }
  }
  for (const [key, gruppe] of grupper) {
    const maal = finnGruppeMaal(grupper, mapping, key);
    if (maal === key) continue;
    const mal = grupper.get(maal);
    const faktor = mal ? styrkeFaktor(gruppe, mal) : 1;
    resultat
      .get(maal)
      ?.uttak.push(...gruppe.uttak.map((u) => (faktor === 1 ? u : { ...u, omregningsfaktor: faktor })));
  }
  return resultat;
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

// Pakningsbetegnelser som alle betyr «enkeltenheter» (tabletter/kapsler o.l.):
// ENPAC = blisterpakning, ENDOSE = endoseblisterpakning, STK/BOKS = boks. Mengden
// er allerede antall enheter, så de summeres direkte – men gruppa skal ha ett
// felles enhetsnavn, ikke det første uttakets.
const ENKELTENHET_ALIAS = new Set(["STK", "BOKS", "ENPAC", "ENDOSE"]);

const velgEnhet = (uttakList: ParsedUttak[]): string => {
  const enheter = uttakList.map((u) => u.enhet).filter(Boolean);
  const distinkte = new Set(enheter.map((e) => e.toUpperCase()));
  if (distinkte.size > 1 && [...distinkte].every((e) => ENKELTENHET_ALIAS.has(e))) return "STK";
  return enheter[0] ?? "";
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

  const totaltHentet = tellende.reduce((sum, u) => sum + u.mengde! * (u.omregningsfaktor ?? 1), 0);
  const forsteUttak = tellende.length ? tellende[0].dato! : null;
  const sisteUttak = tellende.length ? tellende[tellende.length - 1].dato! : null;
  const enhet = velgEnhet(tellende.length ? tellende : uttakList);

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
