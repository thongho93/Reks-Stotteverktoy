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

export interface VareBeregning {
  varenr: string;
  varenavn: string;
  enhet: string;
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

/** Grupperer uttak per varenummer (faller tilbake på varenavn når varenr mangler). */
export const groupByVare = (uttak: ParsedUttak[]): Map<string, ParsedUttak[]> => {
  const map = new Map<string, ParsedUttak[]>();
  for (const u of uttak) {
    const key = u.varenr?.trim() || u.varenavn?.trim() || "ukjent";
    const arr = map.get(key) ?? [];
    arr.push(u);
    map.set(key, arr);
  }
  return map;
};

export const beregnVare = (
  varenrKey: string,
  uttakList: ParsedUttak[],
  referansedato: Date,
  dagligForbruk: number | null,
): VareBeregning => {
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
  const varenavn =
    uttakList.find((u) => u.varenavn.trim())?.varenavn.trim() ?? varenrKey;
  const varenr = uttakList.find((u) => u.varenr)?.varenr ?? varenrKey;

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
    varenr,
    varenavn,
    enhet,
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
