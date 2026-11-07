import * as React from "react";
import type { FirebaseError } from "firebase/app";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { NOTE_ALLOWED_STYLE_PROPS, sanitizeRichHtml } from "../../../shared/lib/richText";
import type { Note, NoteDraft } from "../types";
import {
  buildChecklistContent,
  buildNoteTitle,
  isValidNoteColor,
  moveToFront,
  normalizeChecklistItems,
  parseChecklistItems,
  reorderByIds,
  toMillis,
} from "../utils/noteUtils";

function mapFirebaseError(error: unknown, fallback: string): string {
  const code = (error as FirebaseError | undefined)?.code ?? "";
  if (code === "permission-denied") return "Mangler tilgang i Firestore-regler (permission-denied).";
  if (code === "unauthenticated") return "Du er ikke innlogget (unauthenticated).";
  return code ? `${fallback} (${code})` : fallback;
}

/** Normaliserer et utkast til feltene som faktisk lagres. */
function toStoredFields(draft: NoteDraft) {
  const checklistItems = draft.mode === "checklist" ? normalizeChecklistItems(draft.checklistItems) : [];
  const content =
    draft.mode === "checklist"
      ? buildChecklistContent(checklistItems)
      : sanitizeRichHtml(draft.content.trim(), NOTE_ALLOWED_STYLE_PROPS);
  return {
    mode: draft.mode,
    title: buildNoteTitle(draft.title, content),
    content,
    checklistItems,
    color: draft.color,
    tags: draft.tags,
    isFavorite: draft.isFavorite,
    reminderAtMs: draft.reminderAtMs,
  };
}

export function isDraftEmpty(draft: NoteDraft): boolean {
  const fields = toStoredFields({ ...draft, title: "" });
  return !draft.title.trim() && !fields.content && fields.checklistItems.length === 0;
}

export type UseNotes = ReturnType<typeof useNotes>;

export function useNotes(uid: string | undefined) {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Speiler state slik at stabile callbacks alltid ser siste liste.
  const notesRef = React.useRef<Note[]>([]);
  const commit = React.useCallback((next: Note[]) => {
    notesRef.current = next;
    setNotes(next);
  }, []);

  const persistOrder = React.useCallback(
    async (list: Note[]) => {
      if (!uid) return;
      await setDoc(
        doc(db, "users", uid),
        { privateNotesOrder: list.map((n) => n.id), privateNotesOrderUpdatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [uid],
  );

  // --- Last inn -------------------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!uid) {
        commit([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const notesRef = collection(db, "users", uid, "privateNotes");
        const [notesSnap, userSnap] = await Promise.all([getDocs(notesRef), getDoc(doc(db, "users", uid))]);
        const userData = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null;
        const orderedIds = Array.isArray(userData?.privateNotesOrder)
          ? (userData.privateNotesOrder as unknown[]).filter((id): id is string => typeof id === "string")
          : [];
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));

        let loaded: Note[] = notesSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const checklistItems = parseChecklistItems(data.checklistItems);
          const mode = data.noteMode === "checklist" || checklistItems.length > 0 ? "checklist" : "text";
          return {
            id: d.id,
            mode,
            title: String(data.title ?? ""),
            content: mode === "checklist" ? buildChecklistContent(checklistItems) : String(data.content ?? ""),
            checklistItems,
            color: isValidNoteColor(data.color) ? data.color : null,
            updatedAtMs: toMillis(data.updatedAt),
            tags: Array.isArray(data.tags) ? (data.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
            isFavorite: data.isFavorite === true,
            reminderAtMs: typeof data.reminderAt === "number" && data.reminderAt > 0 ? data.reminderAt : null,
          };
        });

        // Engangsmigrering fra gammelt enkeltnotat-felt.
        if (loaded.length === 0) {
          const legacy = userData ? String(userData.privateNotes ?? "").trim() : "";
          if (legacy) {
            const title = buildNoteTitle("", legacy);
            const created = await addDoc(notesRef, {
              title,
              content: legacy,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            loaded = [
              {
                id: created.id,
                mode: "text",
                title,
                content: legacy,
                checklistItems: [],
                color: null,
                updatedAtMs: Date.now(),
                tags: [],
                isFavorite: false,
                reminderAtMs: null,
              },
            ];
          }
        }

        loaded.sort((a, b) => {
          const ao = orderMap.get(a.id);
          const bo = orderMap.get(b.id);
          if (typeof ao === "number" && typeof bo === "number") return ao - bo;
          if (typeof ao === "number") return -1;
          if (typeof bo === "number") return 1;
          return b.updatedAtMs - a.updatedAtMs;
        });

        if (!cancelled) commit(loaded);
      } catch (err) {
        if (!cancelled) setError(mapFirebaseError(err, "Kunne ikke laste notatene dine akkurat nå."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, commit]);

  // --- Opprett --------------------------------------------------------------
  const createNote = React.useCallback(
    async (draft: NoteDraft): Promise<Note | null> => {
      if (!uid) return null;
      if (isDraftEmpty(draft)) return null;
      const fields = toStoredFields(draft);
      setSaving(true);
      setError(null);
      try {
        const ref = await addDoc(collection(db, "users", uid, "privateNotes"), {
          title: fields.title,
          content: fields.content,
          noteMode: fields.mode,
          checklistItems: fields.checklistItems,
          color: fields.color,
          tags: fields.tags,
          isFavorite: fields.isFavorite,
          // Feltet skrives bare når det brukes, så vanlige notater fungerer også før reglene er oppdatert.
          ...(fields.reminderAtMs !== null ? { reminderAt: fields.reminderAtMs } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const created: Note = { id: ref.id, ...fields, updatedAtMs: Date.now() };
        const next = [created, ...notesRef.current];
        commit(next);
        await persistOrder(next);
        return created;
      } catch (err) {
        setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [uid, commit, persistOrder],
  );

  // --- Oppdater -------------------------------------------------------------
  const updateNote = React.useCallback(
    async (id: string, patch: Partial<NoteDraft>): Promise<boolean> => {
      if (!uid) return false;
      const current = notesRef.current.find((n) => n.id === id);
      if (!current) return false;

      const merged: NoteDraft = {
        mode: patch.mode ?? current.mode,
        title: patch.title ?? current.title,
        content: patch.content ?? current.content,
        checklistItems: patch.checklistItems ?? current.checklistItems,
        color: patch.color !== undefined ? patch.color : current.color,
        tags: patch.tags ?? current.tags,
        isFavorite: patch.isFavorite ?? current.isFavorite,
        reminderAtMs: patch.reminderAtMs !== undefined ? patch.reminderAtMs : current.reminderAtMs,
      };
      const fields = toStoredFields(merged);

      const unchanged =
        current.mode === fields.mode &&
        current.title === fields.title &&
        current.content === fields.content &&
        current.color === fields.color &&
        current.isFavorite === fields.isFavorite &&
        current.reminderAtMs === fields.reminderAtMs &&
        JSON.stringify(current.tags) === JSON.stringify(fields.tags) &&
        JSON.stringify(current.checklistItems) === JSON.stringify(fields.checklistItems);
      if (unchanged) return true;

      // Optimistisk oppdatering – rull tilbake ved feil.
      const previous = notesRef.current;
      commit(previous.map((n) => (n.id === id ? { ...n, ...fields, updatedAtMs: Date.now() } : n)));
      setSaving(true);
      try {
        await setDoc(
          doc(db, "users", uid, "privateNotes", id),
          {
            title: fields.title,
            content: fields.content,
            noteMode: fields.mode,
            checklistItems: fields.checklistItems,
            color: fields.color,
            tags: fields.tags,
            isFavorite: fields.isFavorite,
            ...(fields.reminderAtMs !== null || current.reminderAtMs !== null ? { reminderAt: fields.reminderAtMs } : {}),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        return true;
      } catch (err) {
        commit(previous);
        setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [uid, commit],
  );

  // --- Slett / angre --------------------------------------------------------
  const deleteNote = React.useCallback(
    async (id: string): Promise<{ note: Note; index: number } | null> => {
      if (!uid) return null;
      const index = notesRef.current.findIndex((n) => n.id === id);
      if (index < 0) return null;
      const note = notesRef.current[index];
      const previous = notesRef.current;
      const next = previous.filter((n) => n.id !== id);
      commit(next);
      try {
        await deleteDoc(doc(db, "users", uid, "privateNotes", id));
        await persistOrder(next);
        return { note, index };
      } catch (err) {
        commit(previous);
        setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
        return null;
      }
    },
    [uid, commit, persistOrder],
  );

  const restoreNote = React.useCallback(
    async (note: Note, index: number): Promise<boolean> => {
      if (!uid) return false;
      try {
        await setDoc(doc(db, "users", uid, "privateNotes", note.id), {
          title: note.title,
          content: note.content,
          noteMode: note.mode,
          checklistItems: note.checklistItems,
          color: note.color,
          tags: note.tags,
          isFavorite: note.isFavorite,
          ...(note.reminderAtMs !== null ? { reminderAt: note.reminderAtMs } : {}),
          createdAt: serverTimestamp(),
          updatedAt: note.updatedAtMs ? Timestamp.fromMillis(note.updatedAtMs) : serverTimestamp(),
        });
        const next = [...notesRef.current];
        next.splice(Math.min(index, next.length), 0, note);
        commit(next);
        await persistOrder(next);
        return true;
      } catch (err) {
        setError(mapFirebaseError(err, "Kunne ikke angre slettingen."));
        return false;
      }
    },
    [uid, commit, persistOrder],
  );

  // --- Rekkefølge -----------------------------------------------------------
  const applyOrder = React.useCallback(
    async (next: Note[]) => {
      if (next === notesRef.current) return;
      const previous = notesRef.current;
      commit(next);
      try {
        await persistOrder(next);
      } catch (err) {
        commit(previous);
        setError(mapFirebaseError(err, "Kunne ikke lagre ny rekkefølge."));
      }
    },
    [commit, persistOrder],
  );

  const reorder = React.useCallback(
    (fromId: string, toId: string) => applyOrder(reorderByIds(notesRef.current, fromId, toId)),
    [applyOrder],
  );
  const moveNoteToFront = React.useCallback(
    (id: string) => applyOrder(moveToFront(notesRef.current, id)),
    [applyOrder],
  );

  return {
    notes,
    loading,
    saving,
    error,
    setError,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    reorder,
    moveNoteToFront,
  };
}
