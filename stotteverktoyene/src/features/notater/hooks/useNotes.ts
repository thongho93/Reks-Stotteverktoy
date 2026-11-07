import * as React from "react";
import type { FirebaseError } from "firebase/app";
import {
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
  TRASH_RETENTION_MS,
  buildChecklistContent,
  buildNoteTitle,
  isDeleteExpired,
  isValidDateString,
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
    deleteOn: draft.deleteOn,
  };
}

export function isDraftEmpty(draft: NoteDraft): boolean {
  const fields = toStoredFields({ ...draft, title: "" });
  return !draft.title.trim() && !fields.content && fields.checklistItems.length === 0;
}

export type UseNotes = ReturnType<typeof useNotes>;

export function useNotes(uid: string | undefined) {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [trash, setTrash] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /** Titler på notater som nettopp ble flyttet til «Slettede notater» fordi datoen utløp. */
  const [autoDeleted, setAutoDeleted] = React.useState<string[]>([]);

  // Speiler state slik at stabile callbacks alltid ser siste lister.
  const notesRef = React.useRef<Note[]>([]);
  const trashRef = React.useRef<Note[]>([]);
  const commit = React.useCallback((next: Note[]) => {
    notesRef.current = next;
    setNotes(next);
  }, []);
  const commitTrash = React.useCallback((next: Note[]) => {
    trashRef.current = next;
    setTrash(next);
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
        commitTrash([]);
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

        const all: Note[] = notesSnap.docs.map((d) => {
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
            deleteOn: isValidDateString(data.deleteOn) ? data.deleteOn : null,
            deletedAtMs: typeof data.deletedAt === "number" && data.deletedAt > 0 ? data.deletedAt : null,
          };
        });

        let loaded = all.filter((n) => n.deletedAtMs === null);
        const trashed = all.filter((n) => n.deletedAtMs !== null);

        // Engangsmigrering fra gammelt enkeltnotat-felt.
        if (all.length === 0) {
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
                deleteOn: null,
                deletedAtMs: null,
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
        trashed.sort((a, b) => (b.deletedAtMs ?? 0) - (a.deletedAtMs ?? 0));

        if (!cancelled) {
          commit(loaded);
          commitTrash(trashed);
        }
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
  }, [uid, commit, commitTrash]);

  // --- Flytt til / hent fra «Slettede notater» -------------------------------
  /** Flytter notater til papirkurven (myk sletting). Returnerer de som faktisk ble flyttet. */
  const moveToTrash = React.useCallback(
    async (ids: string[]): Promise<{ note: Note; index: number }[]> => {
      if (!uid || ids.length === 0) return [];
      const active = notesRef.current;
      const targets = ids
        .map((id) => ({ note: active.find((n) => n.id === id), index: active.findIndex((n) => n.id === id) }))
        .filter((t): t is { note: Note; index: number } => t.note !== undefined);
      if (targets.length === 0) return [];

      const deletedAtMs = Date.now();
      const results = await Promise.all(
        targets.map((t) =>
          setDoc(
            doc(db, "users", uid, "privateNotes", t.note.id),
            {
              deletedAt: deletedAtMs,
              // En utløpt «slett automatisk»-dato skal ikke ta notatet på nytt etter gjenoppretting.
              ...(t.note.deleteOn !== null ? { deleteOn: null } : {}),
            },
            { merge: true },
          ).then(
            () => true,
            (err) => {
              setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
              return false;
            },
          ),
        ),
      );
      const moved = targets.filter((_, i) => results[i]);
      if (moved.length === 0) return [];

      const movedIds = new Set(moved.map((t) => t.note.id));
      const nextActive = notesRef.current.filter((n) => !movedIds.has(n.id));
      commit(nextActive);
      commitTrash([
        ...moved.map((t) => ({ ...t.note, deleteOn: null, deletedAtMs })),
        ...trashRef.current,
      ]);
      try {
        await persistOrder(nextActive);
      } catch {
        /* rekkefølgen rettes opp ved neste endring */
      }
      return moved;
    },
    [uid, commit, commitTrash, persistOrder],
  );

  /** Gjenoppretter et notat fra papirkurven til gitt posisjon i listen. */
  const restoreFromTrash = React.useCallback(
    async (id: string, index = 0): Promise<boolean> => {
      if (!uid) return false;
      const note = trashRef.current.find((n) => n.id === id);
      if (!note) return false;
      try {
        await setDoc(doc(db, "users", uid, "privateNotes", id), { deletedAt: null }, { merge: true });
      } catch (err) {
        setError(mapFirebaseError(err, "Kunne ikke gjenopprette notatet."));
        return false;
      }
      commitTrash(trashRef.current.filter((n) => n.id !== id));
      const restored: Note = { ...note, deletedAtMs: null };
      const next = [...notesRef.current];
      next.splice(Math.min(index, next.length), 0, restored);
      commit(next);
      try {
        await persistOrder(next);
      } catch {
        /* rekkefølgen rettes opp ved neste endring */
      }
      return true;
    },
    [uid, commit, commitTrash, persistOrder],
  );

  /** Sletter notater for godt (kan ikke angres). */
  const deletePermanently = React.useCallback(
    async (ids: string[]): Promise<number> => {
      if (!uid || ids.length === 0) return 0;
      const results = await Promise.all(
        ids.map((id) =>
          deleteDoc(doc(db, "users", uid, "privateNotes", id)).then(
            () => id,
            (err) => {
              setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
              return null;
            },
          ),
        ),
      );
      const removed = new Set(results.filter((id): id is string => id !== null));
      if (removed.size > 0) commitTrash(trashRef.current.filter((n) => !removed.has(n.id)));
      return removed.size;
    },
    [uid, commitTrash],
  );

  const emptyTrash = React.useCallback(
    () => deletePermanently(trashRef.current.map((n) => n.id)),
    [deletePermanently],
  );

  // --- Automatisk sletting ------------------------------------------------------
  // 1) Notater med utløpt «slett automatisk»-dato (midnatt etter datoen) går til papirkurven.
  // 2) Notater som har ligget i papirkurven i 15 dager slettes for godt.
  const sweep = React.useCallback(async () => {
    if (!uid) return;

    const expired = notesRef.current.filter((n) => isDeleteExpired(n.deleteOn));
    if (expired.length > 0) {
      const moved = await moveToTrash(expired.map((n) => n.id));
      if (moved.length > 0) setAutoDeleted(moved.map((t) => t.note.title || "Uten tittel"));
    }

    const cutoff = Date.now() - TRASH_RETENTION_MS;
    const old = trashRef.current.filter((n) => n.deletedAtMs !== null && n.deletedAtMs <= cutoff);
    if (old.length > 0) await deletePermanently(old.map((n) => n.id));
  }, [uid, moveToTrash, deletePermanently]);

  React.useEffect(() => {
    if (loading || !uid) return;
    void sweep();
    const timer = window.setInterval(() => void sweep(), 60_000);
    return () => window.clearInterval(timer);
  }, [loading, uid, sweep]);

  const clearAutoDeleted = React.useCallback(() => setAutoDeleted([]), []);

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
          // Valgfrie felt skrives bare når de brukes.
          ...(fields.reminderAtMs !== null ? { reminderAt: fields.reminderAtMs } : {}),
          ...(fields.deleteOn !== null ? { deleteOn: fields.deleteOn } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const created: Note = { id: ref.id, ...fields, updatedAtMs: Date.now(), deletedAtMs: null };
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
        deleteOn: patch.deleteOn !== undefined ? patch.deleteOn : current.deleteOn,
      };
      const fields = toStoredFields(merged);

      const unchanged =
        current.mode === fields.mode &&
        current.title === fields.title &&
        current.content === fields.content &&
        current.color === fields.color &&
        current.isFavorite === fields.isFavorite &&
        current.reminderAtMs === fields.reminderAtMs &&
        current.deleteOn === fields.deleteOn &&
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
            ...(fields.deleteOn !== null || current.deleteOn !== null ? { deleteOn: fields.deleteOn } : {}),
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

  // --- Slett (til papirkurven) / angre ---------------------------------------
  const deleteNote = React.useCallback(
    async (id: string): Promise<{ note: Note; index: number } | null> => {
      const moved = await moveToTrash([id]);
      return moved[0] ?? null;
    },
    [moveToTrash],
  );

  /** Angre en sletting: henter notatet tilbake til samme plass. */
  const restoreNote = React.useCallback(
    (note: Note, index: number) => restoreFromTrash(note.id, index),
    [restoreFromTrash],
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
    trash,
    loading,
    saving,
    error,
    setError,
    autoDeleted,
    clearAutoDeleted,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    restoreFromTrash,
    deletePermanently,
    emptyTrash,
    reorder,
    moveNoteToFront,
  };
}
