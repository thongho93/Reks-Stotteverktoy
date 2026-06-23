// Parser for innlimt uttakshistorikk.
//
// To formater støttes:
//
//  1) Tab-/mellomromseparert (eldre):
//     "489 d. 17.02.2025 169052 Pinex brusetab 500 mg 20 STK\t5\t100 STK"
//      └ dager  └ dato     └ varenr └ varenavn + pakningsstørrelse    └ pakker └ mengde
//
//  2) Tankestrek-separert (slik kundeuttak limes inn fra FarmaPro/Eik):
//     "87 d. / 27.03.2026 — 22293 — Norvasc tab 5 mg — 100 ENPAC — 1 — 100 ENPAC"
//      └ dager / dato       └ varenr └ varenavn         └ pakn.str └ pakker └ mengde
//
// Feltene tolkes slik:
//   dager   = "antall dager hentet sist" (informativt – perioden uttaket dekker)
//   dato    = dato hentet (dd.mm.yyyy)
//   varenr  = 5–7 sifret varenummer
//   mengde  = totalt antall enheter hentet på dette uttaket (brukes i beregningen)

export interface ParsedUttak {
  dager: number | null;
  dato: Date | null;
  datoText: string;
  varenr: string | null;
  varenavn: string;
  pakningsstorrelse: number | null;
  antallPakker: number | null;
  mengde: number | null;
  enhet: string;
  annullert: boolean;
  raw: string;
}

const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;

const parseDato = (text: string): Date | null => {
  const m = text.match(DATE_RE);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (yyyy < 100) yyyy += 2000;

  if (!dd || !mm || dd > 31 || mm > 12) return null;

  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Tall + (valgfri) enhet fra et felt, f.eks. "100 ENPAC" → { num: 100, enhet: "ENPAC" }.
const parseNumUnit = (text: string): { num: number | null; enhet: string } => {
  const m = text.match(/([\d.,]+)\s*([A-Za-zØÆÅøæå%]+)?/);
  if (!m) return { num: null, enhet: "" };
  const num = Number(m[1].replace(",", "."));
  return { num: Number.isFinite(num) ? num : null, enhet: m[2] ?? "" };
};

// Format 2: feltene er separert med tankestrek (— eller –). Returnerer null hvis
// linja ikke ser ut som dette formatet, slik at vi kan falle tilbake på format 1.
const parseDelimitedLine = (
  cleaned: string,
  annullert: boolean,
  raw: string,
): ParsedUttak | null => {
  if (!/[—–]/.test(cleaned)) return null;

  const fields = cleaned
    .split(/\s*[—–]\s*/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  const last = fields.length - 1;

  // Halen må være: … <antall pakker (heltall)> <mengde (tall + enhet)>.
  if (fields.length < 5 || !/^\d+$/.test(fields[last - 1]) || !/\d/.test(fields[last])) {
    return null;
  }

  const { num: mengde, enhet } = parseNumUnit(fields[last]);
  if (mengde == null) return null;
  const antallPakker = Number(fields[last - 1]);

  // Feltet før «antall pakker» er pakningsstørrelse hvis det starter med et tall
  // (f.eks. "100 ENPAC"). Ellers finnes ikke kolonnen og navnet går helt fram dit.
  let nameEnd = last - 1;
  let pakningsstorrelse: number | null = null;
  if (/^\d/.test(fields[last - 2])) {
    pakningsstorrelse = parseNumUnit(fields[last - 2]).num;
    nameEnd = last - 2;
  }

  const varenrIdx = fields.findIndex((f, i) => i > 0 && /^\d{5,7}$/.test(f));
  const varenr = varenrIdx >= 0 ? fields[varenrIdx] : null;
  const nameStart = varenrIdx >= 0 ? varenrIdx + 1 : 1;
  const varenavn = fields.slice(nameStart, nameEnd).join(" ").trim();
  if (!varenavn) return null;

  const dagerMatch = fields[0].match(/(\d+)\s*d\.?\b/i);
  const dager = dagerMatch ? Number(dagerMatch[1]) : null;
  const datoMatch = fields[0].match(DATE_RE);
  const dato = parseDato(fields[0]);
  const datoText = datoMatch ? datoMatch[0] : "";

  return {
    dager,
    dato,
    datoText,
    varenr,
    varenavn,
    pakningsstorrelse,
    antallPakker,
    mengde,
    enhet,
    annullert,
    raw,
  };
};

export const parseUttakLine = (line: string): ParsedUttak | null => {
  const raw = line;
  const normalized = line.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  // Et uttak merket "Annullert" skal ikke telle i beregningen. Fjern ordet før
  // feltene tolkes, men behold flagget.
  const annullert = /\bannullert\b/i.test(normalized);
  const cleaned = normalized.replace(/\bannullert\b/gi, " ").replace(/\s+/g, " ").trim();

  // Prøv tankestrek-formatet først – det gir reneste varenavn. Faller tilbake på
  // posisjonsparsing under hvis linja ikke matcher.
  const delimited = parseDelimitedLine(cleaned, annullert, raw);
  if (delimited) return delimited;

  // "489 d." → 489
  const dagerMatch = cleaned.match(/^(\d+)\s*d\.?\b/i);
  const dager = dagerMatch ? Number(dagerMatch[1]) : null;

  const datoMatch = cleaned.match(DATE_RE);
  const dato = parseDato(cleaned);
  const datoText = datoMatch ? datoMatch[0] : "";

  // Varenummer er første 5–7 sifrede tall ETTER datoen.
  const afterDate = datoMatch
    ? cleaned.slice((datoMatch.index ?? 0) + datoMatch[0].length)
    : cleaned;
  const varenrMatch = afterDate.match(/\b(\d{5,7})\b/);
  const varenr = varenrMatch ? varenrMatch[1] : null;

  // Resten etter varenummeret: varenavn + pakningsstørrelse + antall pakker + mengde.
  const tail = varenrMatch
    ? afterDate.slice((varenrMatch.index ?? 0) + varenrMatch[0].length).trim()
    : afterDate.trim();

  // De to siste tallene er: <antall pakker> <mengde> [enhet]
  const tailMatch = tail.match(/^(.*?)\s+(\d+)\s+([\d.,]+)\s*([A-Za-zØÆÅøæå%]+)?\s*$/);

  let varenavn = tail;
  let pakningsstorrelse: number | null = null;
  let antallPakker: number | null = null;
  let mengde: number | null = null;
  let enhet = "";

  if (tailMatch) {
    varenavn = tailMatch[1].trim();
    antallPakker = Number(tailMatch[2]);
    mengde = Number(tailMatch[3].replace(",", "."));
    enhet = tailMatch[4] ?? "";

    // Pakningsstørrelse = siste "<tall> [enhet]" inne i varenavnet (f.eks. "20 STK").
    const pakMatch = varenavn.match(/(\d+)\s*[A-Za-zØÆÅøæå]*\s*$/);
    if (pakMatch) pakningsstorrelse = Number(pakMatch[1]);
  }

  // Forkast linjer vi ikke fikk noe meningsfullt ut av.
  if (dato == null && varenr == null && mengde == null) return null;

  return {
    dager,
    dato,
    datoText,
    varenr,
    varenavn,
    pakningsstorrelse,
    antallPakker,
    mengde,
    enhet,
    annullert,
    raw,
  };
};

// En ny uttaks-record starter på en "N d."-linje (f.eks. "489 d." eller "10 d.").
const isRecordStart = (line: string): boolean => /^\s*\d+\s*d\.?(?=$|\s)/i.test(line);

export const parseUttakInput = (input: string): ParsedUttak[] => {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Bygg records. Feltene kan stå på samme linje (tab/space-separert) ELLER
  // fordelt over flere linjer – begge deler samles til én record per "N d."-markør.
  const records: string[] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (isRecordStart(line)) {
      if (current) records.push(current.join(" "));
      current = [line];
    } else if (current) {
      current.push(line);
    }
    // Linjer før første "N d."-markør ignoreres.
  }
  if (current) records.push(current.join(" "));

  // Fant vi ingen markører? Tolk hver linje som sin egen record.
  const source = records.length > 0 ? records : lines;

  return source.map(parseUttakLine).filter((u): u is ParsedUttak => u !== null);
};
