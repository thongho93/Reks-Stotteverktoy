import * as React from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

export type NoteReminder = {
  id: string;
  title: string;
  reminderAtMs: number;
};

const CHECK_INTERVAL_MS = 20_000;

/**
 * Notater med påminnelse, i sanntid, og hvilke av dem som har forfalt.
 * Brukes globalt (utenfor notatsiden) til merke og Chrome-varsel.
 */
export function useNoteReminders(uid: string | null | undefined) {
  const [reminders, setReminders] = React.useState<NoteReminder[]>([]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "privateNotes"), where("reminderAt", ">", 0));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setReminders(
          snapshot.docs
            // Ikke varsle om skriving som ennå ikke er bekreftet av serveren (kan bli avvist).
            .filter((d) => !d.metadata.hasPendingWrites)
            // Slettede notater skal ikke gi varsel.
            .filter((d) => typeof (d.data() as Record<string, unknown>).deletedAt !== "number")
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              return {
                id: d.id,
                title: String(data.title ?? "") || "Uten tittel",
                reminderAtMs: typeof data.reminderAt === "number" ? data.reminderAt : 0,
              };
            })
            .filter((r) => r.reminderAtMs > 0),
        );
      },
      () => setReminders([]),
    );
    return () => {
      unsubscribe();
      setReminders([]);
    };
  }, [uid]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS);
    // Fanen kan ha sovet i bakgrunnen – sjekk på nytt når den blir synlig igjen.
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const due = React.useMemo(
    () => reminders.filter((r) => r.reminderAtMs <= now).sort((a, b) => a.reminderAtMs - b.reminderAtMs),
    [reminders, now],
  );

  return { reminders, due };
}
