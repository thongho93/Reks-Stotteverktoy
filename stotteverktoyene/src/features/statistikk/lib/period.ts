/**
 * Periodehåndtering for statistikksider.
 *
 * usage_daily er lagret med ett dokument per dato (YYYY-MM-DD), så all
 * aggregering skjer ved å liste datonøklene i valgt periode og summere.
 * Periodene kappes alltid ved dagens dato – vi viser aldri framtid.
 */

export type ViewMode = "day" | "week" | "month";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function atStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfIsoWeekMonday(date: Date) {
  const d = atStartOfDay(date);
  const dayIndex = (d.getDay() + 6) % 7; // mandag = 0
  d.setDate(d.getDate() - dayIndex);
  return d;
}

export function startOfMonth(date: Date) {
  const d = atStartOfDay(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date: Date) {
  return atStartOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function isSameYearMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function formatNorDate(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Start/slutt for perioden som inneholder anchor, kappet ved dagens dato. */
export function getRangeForAnchor(anchorInput: Date, mode: ViewMode) {
  const anchor = atStartOfDay(anchorInput);
  const today = atStartOfDay(new Date());

  if (mode === "day") {
    return { from: anchor, to: anchor };
  }

  if (mode === "week") {
    const weekStart = startOfIsoWeekMonday(anchor);
    const weekEnd = addDays(weekStart, 6);
    return { from: weekStart, to: weekEnd > today ? today : weekEnd };
  }

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return { from: monthStart, to: isSameYearMonth(anchor, today) ? today : monthEnd };
}

export function shiftAnchorByMode(anchorInput: Date, mode: ViewMode, direction: -1 | 1) {
  const anchor = atStartOfDay(anchorInput);

  if (mode === "day") return addDays(anchor, direction);
  if (mode === "week") return addDays(anchor, direction * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

/** Alle datonøkler i perioden, inklusive endepunktene. */
export function listDateKeys(from: Date, to: Date) {
  const keys: string[] = [];
  const cursor = atStartOfDay(from);
  const end = atStartOfDay(to);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function formatPeriodLabel(anchor: Date, mode: ViewMode) {
  if (mode === "day") {
    const today = atStartOfDay(new Date());
    const isToday = toDateKey(anchor) === toDateKey(today);
    return isToday ? `I dag – ${formatNorDate(anchor)}` : formatNorDate(anchor);
  }

  if (mode === "week") {
    const start = startOfIsoWeekMonday(anchor);
    const end = addDays(start, 6);
    return `${formatNorDate(start)} – ${formatNorDate(end)}`;
  }

  const label = anchor.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Hindrer navigering inn i framtidige perioder. */
export function canNavigateForward(anchor: Date, mode: ViewMode) {
  const today = atStartOfDay(new Date());
  const current = atStartOfDay(anchor);

  if (mode === "day") return current < today;
  if (mode === "week") return startOfIsoWeekMonday(current) < startOfIsoWeekMonday(today);
  return startOfMonth(current) < startOfMonth(today);
}
