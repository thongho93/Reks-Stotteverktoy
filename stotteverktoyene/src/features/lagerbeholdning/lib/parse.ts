// Parser for innlimt uttakshistorikk.
//
// Forventet linjeformat (kolonner kan være tab- eller mellomrom-separert):
//   "489 d. 17.02.2025 169052 Pinex brusetab 500 mg 20 STK\t5\t100 STK"
//    └ dager  └ dato     └ varenr └ varenavn + pakningsstørrelse    └ pakker └ mengde
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

export const parseUttakLine = (line: string): ParsedUttak | null => {
  const raw = line;
  const normalized = line.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  // Et uttak merket "Annullert" skal ikke telle i beregningen. Fjern ordet før
  // feltene tolkes, men behold flagget.
  const annullert = /\bannullert\b/i.test(normalized);
  const cleaned = normalized.replace(/\bannullert\b/gi, " ").replace(/\s+/g, " ").trim();

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
