export type NoteMode = "text" | "checklist";

export type NoteChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Note = {
  id: string;
  mode: NoteMode;
  title: string;
  /** Rik tekst (HTML) for tekstnotater, ren tekst med "- [ ]" for sjekklister. */
  content: string;
  checklistItems: NoteChecklistItem[];
  color: string | null;
  updatedAtMs: number;
  tags: string[];
  isFavorite: boolean;
  /** Tidsfrist/påminnelse (ms siden epoch), eller null. */
  reminderAtMs: number | null;
  /** Dato (YYYY-MM-DD, lokal tid) notatet slettes automatisk ved midnatt etter, eller null. */
  deleteOn: string | null;
  /** Tidspunkt (ms) notatet ble flyttet til «Slettede notater», eller null. */
  deletedAtMs: number | null;
};

/** Feltene brukeren kan endre i editor/komponist. */
export type NoteDraft = {
  mode: NoteMode;
  title: string;
  content: string;
  checklistItems: NoteChecklistItem[];
  color: string | null;
  tags: string[];
  isFavorite: boolean;
  reminderAtMs: number | null;
  deleteOn: string | null;
};

export type NotesRouteState = {
  initialTab?: string;
  noteSearchQuery?: string;
  selectedNoteId?: string | null;
};
