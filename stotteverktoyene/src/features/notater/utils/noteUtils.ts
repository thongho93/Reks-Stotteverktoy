import { richHtmlToPlainText } from "../../../shared/lib/richText";
import type { Note, NoteChecklistItem, NoteDraft } from "../types";

/** Pastellfarger som kan velges som notatfarge (uendret fra tidligere lagrede data). */
export const NOTE_COLORS = [
  "#FFF8E1",
  "#E8F5E9",
  "#E3F2FD",
  "#F3E5F5",
  "#FCE4EC",
  "#E0F2F1",
  "#FFF3E0",
  "#E8EAF6",
  "#F1F3F4",
  "#FFEDE1",
] as const;

/** Mer mettede varianter av pastellfargene, brukt til prikker og aksenter. */
export const NOTE_COLOR_ACCENTS: Record<string, string> = {
  "#FFF8E1": "#F5B800",
  "#E8F5E9": "#43A047",
  "#E3F2FD": "#1E88E5",
  "#F3E5F5": "#AB47BC",
  "#FCE4EC": "#EC407A",
  "#E0F2F1": "#00897B",
  "#FFF3E0": "#FB8C00",
  "#E8EAF6": "#5C6BC0",
  "#F1F3F4": "#78909C",
  "#FFEDE1": "#F4511E",
};

export function isValidNoteColor(value: unknown): value is string {
  return typeof value === "string" && (NOTE_COLORS as readonly string[]).includes(value);
}

export function toMillis(value: unknown): number {
  const v = value as { toMillis?: () => number; seconds?: number } | null | undefined;
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (v && typeof v.seconds === "number") return v.seconds * 1000;
  return 0;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  return [...items.filter((i) => !i.done), ...items.filter((i) => i.done)];
}

export function normalizeChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  return sortChecklistItems(
    items
      .map((item) => ({ id: item.id || createId(), text: item.text.trim(), done: Boolean(item.done) }))
      .filter((item) => item.text.length > 0),
  );
}

export function buildChecklistContent(items: NoteChecklistItem[]): string {
  return normalizeChecklistItems(items)
    .map((item) => `${item.done ? "- [x]" : "- [ ]"} ${item.text}`)
    .join("\n");
}

export function parseChecklistItems(raw: unknown): NoteChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const parsed: NoteChecklistItem[] = [];
  for (const item of raw) {
    const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const text = typeof obj.text === "string" ? obj.text.trim() : "";
    if (!text) continue;
    parsed.push({
      id: typeof obj.id === "string" ? obj.id : createId(),
      text,
      done: typeof obj.done === "boolean" ? obj.done : false,
    });
  }
  return sortChecklistItems(parsed);
}

/** Tittel brukeren har skrevet, ellers første linje av innholdet. */
export function buildNoteTitle(title: string, content: string): string {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  const plain = richHtmlToPlainText(content);
  const firstLine =
    plain
      .split("\n")
      .map((line) => line.trim().replace(/^- \[( |x)\]\s*/, ""))
      .find(Boolean) ?? "";
  return firstLine ? firstLine.slice(0, 60) : "Uten tittel";
}

/** Ren tekst som havner på utklippstavla. */
export function getNoteClipboardText(note: Pick<Note, "mode" | "content" | "checklistItems">): string {
  return note.mode === "checklist" ? buildChecklistContent(note.checklistItems) : richHtmlToPlainText(note.content);
}

export function getNoteClipboardTextWithTitle(note: Note): string {
  const body = getNoteClipboardText(note);
  const title = note.title.trim();
  if (!title) return body;
  return body ? `${title}\n\n${body}` : title;
}

/** Kort forhåndsvisning av innholdet (ren tekst, linjeskift bevart). */
export function getNotePreviewText(note: Pick<Note, "mode" | "content">): string {
  return note.mode === "checklist" ? "" : richHtmlToPlainText(note.content);
}

export function draftFromNote(note: Note): NoteDraft {
  return {
    mode: note.mode,
    title: note.title,
    content: note.content,
    checklistItems: note.checklistItems,
    color: note.color,
    tags: note.tags,
    isFavorite: note.isFavorite,
    reminderAtMs: note.reminderAtMs,
    deleteOn: note.deleteOn,
  };
}

export const EMPTY_DRAFT: NoteDraft = {
  mode: "text",
  title: "",
  content: "",
  checklistItems: [],
  color: null,
  tags: [],
  isFavorite: false,
  reminderAtMs: null,
  deleteOn: null,
};

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLocaleLowerCase("nb-NO");
}

/** Søk i tittel, innhold (uten HTML), sjekkliste og tags. "#tag" matcher kun tags. */
export function matchesSearch(note: Note, rawQuery: string): boolean {
  const query = rawQuery.toLocaleLowerCase("nb-NO").trim();
  if (query.length === 0) return true;

  const terms = query.split(/\s+/).filter(Boolean);
  const text = [
    note.title,
    note.mode === "checklist" ? note.checklistItems.map((i) => i.text).join(" ") : stripHtml(note.content),
    note.tags.join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase("nb-NO");

  return terms.every((term) => {
    if (term.startsWith("#") && term.length > 1) {
      const tag = term.slice(1);
      return note.tags.some((t) => t.toLocaleLowerCase("nb-NO").includes(tag));
    }
    return text.includes(term);
  });
}

export function formatNoteDate(ms: number): string {
  if (!ms) return "";
  const date = new Date(ms);
  const now = new Date();
  const time = date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  if (ms >= startOfToday) return `I dag ${time}`;
  if (ms >= startOfToday - dayMs) return `I går ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatNoteDateFull(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" });
}

export function reorderByIds(items: Note[], fromId: string, toId: string): Note[] {
  const from = items.findIndex((i) => i.id === fromId);
  const to = items.findIndex((i) => i.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function moveToFront(items: Note[], id: string): Note[] {
  const index = items.findIndex((i) => i.id === id);
  if (index <= 0) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.unshift(moved);
  return next;
}

/** Gjør brukerinput om til en gyldig http(s)/mailto-adresse, ellers null. */
export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const candidate = /^(https?:|mailto:)/i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

// --- Påminnelser ------------------------------------------------------------

export function isReminderDue(reminderAtMs: number | null, now: number): boolean {
  return reminderAtMs !== null && reminderAtMs <= now;
}

/** «I dag 15:00», «I morgen 08:00», «Forfalt 4. nov» osv. */
export function formatReminder(reminderAtMs: number, now: number = Date.now()): string {
  const date = new Date(reminderAtMs);
  const time = date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const dayMs = 86_400_000;
  const dayLabel =
    reminderAtMs >= startOfToday + dayMs && reminderAtMs < startOfToday + 2 * dayMs
      ? "I morgen"
      : reminderAtMs >= startOfToday && reminderAtMs < startOfToday + dayMs
        ? "I dag"
        : reminderAtMs >= startOfToday - dayMs && reminderAtMs < startOfToday
          ? "I går"
          : date.toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "short",
              ...(date.getFullYear() === new Date(now).getFullYear() ? {} : { year: "numeric" }),
            });
  return `${dayLabel} ${time}`;
}

export type ReminderPreset = { label: string; at: number };

/** Hurtigvalg for tidsfrist: om 1 time, og i morgen kl. 08:00. */
export function getReminderPresets(now: number = Date.now()): ReminderPreset[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return [
    { label: "Om 1 time", at: now + 3_600_000 },
    { label: "I morgen kl. 08:00", at: tomorrow.getTime() },
  ];
}

/** Verdi for <input type="datetime-local"> i lokal tid. */
export function toDateTimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

// --- Automatisk sletting (kun dato) ------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** «YYYY-MM-DD» i lokal tid. */
export function toLocalDateString(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Utløpt = datoen er før i dag, altså midnatt etter den valgte datoen er passert. */
export function isDeleteExpired(deleteOn: string | null, now: number = Date.now()): boolean {
  return deleteOn !== null && deleteOn < toLocalDateString(now);
}

/** «Slettes i dag», «Slettes i morgen», «Slettes 12. nov». */
export function formatDeleteOn(deleteOn: string, now: number = Date.now()): string {
  const today = toLocalDateString(now);
  const tomorrow = toLocalDateString(now + 86_400_000);
  if (deleteOn === today) return "Slettes i dag";
  if (deleteOn === tomorrow) return "Slettes i morgen";
  const [y, m, d] = deleteOn.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date(now).getFullYear();
  return `Slettes ${date.toLocaleDateString("nb-NO", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })}`;
}

export function getDeletePresets(now: number = Date.now()): { label: string; value: string }[] {
  const inDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return toLocalDateString(d.getTime());
  };
  const inMonth = new Date(now);
  inMonth.setMonth(inMonth.getMonth() + 1);
  return [
    { label: "Om 1 uke", value: inDays(7) },
    { label: "Om 1 måned", value: toLocalDateString(inMonth.getTime()) },
  ];
}

// --- Slettede notater (papirkurv) ----------------------------------------------

export const TRASH_RETENTION_DAYS = 15;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 86_400_000;

/** Hele dager igjen før et slettet notat fjernes for godt (minst 0). */
export function trashDaysLeft(deletedAtMs: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deletedAtMs + TRASH_RETENTION_MS - now) / 86_400_000));
}

export function formatTrashRemaining(deletedAtMs: number, now: number = Date.now()): string {
  const days = trashDaysLeft(deletedAtMs, now);
  if (days <= 0) return "Slettes for godt snart";
  return days === 1 ? "Slettes for godt i morgen" : `Slettes for godt om ${days} dager`;
}
