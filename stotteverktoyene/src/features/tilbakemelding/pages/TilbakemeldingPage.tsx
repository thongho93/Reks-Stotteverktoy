import * as React from "react";
import { Alert, Box, Button, CircularProgress, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import type { FirebaseError } from "firebase/app";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/useAuthUser";

const MELDESKJEMA_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScKadKrBcIT-8a9CgD4QFfCjXsERjolCZbhojJU8jFhy8V6ZA/viewform?embedded=true";

type PrivateNote = {
  id: string;
  title: string;
  content: string;
  updatedAtMs: number;
};

function toMillis(value: any): number {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function buildNoteTitle(title: string, content: string): string {
  const trimmedTitle = title.trim();
  if (trimmedTitle) return trimmedTitle;

  const firstNonEmptyLine =
    content
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "";

  if (!firstNonEmptyLine) return "Uten tittel";
  return firstNonEmptyLine.slice(0, 60);
}

function buildSnippet(content: string): string {
  const text = content.replace(/\s+/g, " ").trim();
  if (!text) return "Tomt notat";
  return text.length > 110 ? `${text.slice(0, 110)}...` : text;
}

function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapFirebaseError(error: unknown, fallback: string): string {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code ?? "";

  if (code === "permission-denied") {
    return "Mangler tilgang i Firestore-regler (permission-denied).";
  }
  if (code === "unauthenticated") {
    return "Du er ikke autentisert (unauthenticated).";
  }
  if (code === "failed-precondition") {
    return "Feil precondition fra Firebase (failed-precondition).";
  }

  return code ? `${fallback} (${code})` : fallback;
}

export default function TilbakemeldingPage() {
  const { user } = useAuthUser();
  const [tab, setTab] = React.useState<"meldeskjema" | "notater">("meldeskjema");

  const [savedNotesList, setSavedNotesList] = React.useState<PrivateNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftContent, setDraftContent] = React.useState("");

  const [loadingNotes, setLoadingNotes] = React.useState(true);
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [deletingNote, setDeletingNote] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (!user?.uid) {
        if (!cancelled) {
          setSavedNotesList([]);
          setSelectedNoteId(null);
          setDraftTitle("");
          setDraftContent("");
          setLoadingNotes(false);
        }
        return;
      }

      setLoadingNotes(true);
      setError(null);

      try {
        const notesRef = collection(db, "users", user.uid, "privateNotes");
        const notesSnap = await getDocs(notesRef);

        let loadedNotes: PrivateNote[] = notesSnap.docs.map((noteDoc) => {
          const data = noteDoc.data() as any;
          return {
            id: noteDoc.id,
            title: String(data.title ?? ""),
            content: String(data.content ?? ""),
            updatedAtMs: toMillis(data.updatedAt),
          };
        });

        // One-time migration from old single-note field to first note document.
        if (loadedNotes.length === 0) {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const legacyText = userSnap.exists()
            ? String((userSnap.data() as any)?.privateNotes ?? "").trim()
            : "";

          if (legacyText) {
            const legacyTitle = buildNoteTitle("", legacyText);
            const createdRef = await addDoc(notesRef, {
              title: legacyTitle,
              content: legacyText,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            loadedNotes = [
              {
                id: createdRef.id,
                title: legacyTitle,
                content: legacyText,
                updatedAtMs: Date.now(),
              },
            ];
          }
        }

        loadedNotes.sort((a, b) => b.updatedAtMs - a.updatedAtMs);

        if (!cancelled) {
          setSavedNotesList(loadedNotes);

          if (loadedNotes.length > 0) {
            setSelectedNoteId(loadedNotes[0].id);
            setDraftTitle(loadedNotes[0].title);
            setDraftContent(loadedNotes[0].content);
          } else {
            setSelectedNoteId(null);
            setDraftTitle("");
            setDraftContent("");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(mapFirebaseError(err, "Kunne ikke laste notatene dine akkurat nå."));
        }
      } finally {
        if (!cancelled) {
          setLoadingNotes(false);
        }
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const selectedNote = React.useMemo(
    () => savedNotesList.find((note) => note.id === selectedNoteId) ?? null,
    [savedNotesList, selectedNoteId]
  );

  const normalizedDraftTitle = buildNoteTitle(draftTitle, draftContent);
  const normalizedDraftContent = draftContent.trim();

  const hasUnsavedChanges = React.useMemo(() => {
    if (selectedNote) {
      return (
        normalizedDraftTitle !== selectedNote.title ||
        normalizedDraftContent !== selectedNote.content
      );
    }

    return draftTitle.trim().length > 0 || draftContent.trim().length > 0;
  }, [draftContent, draftTitle, normalizedDraftContent, normalizedDraftTitle, selectedNote]);

  const handleNewNote = React.useCallback(() => {
    setSelectedNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setError(null);
    setSuccess(null);
  }, []);

  const handleSelectNote = React.useCallback((note: PrivateNote) => {
    setSelectedNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setError(null);
    setSuccess(null);
  }, []);

  const handleSaveNote = React.useCallback(async () => {
    if (!user?.uid) {
      setError("Du må være innlogget for å lagre notater.");
      return;
    }

    if (!normalizedDraftContent) {
      setError("Skriv inn litt tekst før du lagrer notatet.");
      return;
    }

    setSavingNotes(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        title: normalizedDraftTitle,
        content: normalizedDraftContent,
        updatedAt: serverTimestamp(),
      };

      if (selectedNoteId) {
        await setDoc(doc(db, "users", user.uid, "privateNotes", selectedNoteId), payload, {
          merge: true,
        });

        const updated: PrivateNote = {
          id: selectedNoteId,
          title: normalizedDraftTitle,
          content: normalizedDraftContent,
          updatedAtMs: Date.now(),
        };

        setSavedNotesList((prev) =>
          [updated, ...prev.filter((note) => note.id !== selectedNoteId)].sort(
            (a, b) => b.updatedAtMs - a.updatedAtMs
          )
        );

        setDraftTitle(updated.title);
        setDraftContent(updated.content);
        setSuccess("Notatet er oppdatert.");
      } else {
        const createdRef = await addDoc(collection(db, "users", user.uid, "privateNotes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });

        const created: PrivateNote = {
          id: createdRef.id,
          title: normalizedDraftTitle,
          content: normalizedDraftContent,
          updatedAtMs: Date.now(),
        };

        setSavedNotesList((prev) => [created, ...prev]);
        setSelectedNoteId(created.id);
        setDraftTitle(created.title);
        setDraftContent(created.content);
        setSuccess("Nytt notat er lagret.");
      }
    } catch (err) {
      setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
    } finally {
      setSavingNotes(false);
    }
  }, [normalizedDraftContent, normalizedDraftTitle, selectedNoteId, user?.uid]);

  const handleDeleteNote = React.useCallback(async () => {
    if (!user?.uid || !selectedNoteId) return;

    const confirmed = window.confirm("Er du sikker på at du vil slette dette notatet?");
    if (!confirmed) return;

    setDeletingNote(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteDoc(doc(db, "users", user.uid, "privateNotes", selectedNoteId));

      const remaining = savedNotesList.filter((note) => note.id !== selectedNoteId);
      setSavedNotesList(remaining);

      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
        setDraftTitle(remaining[0].title);
        setDraftContent(remaining[0].content);
      } else {
        setSelectedNoteId(null);
        setDraftTitle("");
        setDraftContent("");
      }

      setSuccess("Notatet er slettet.");
    } catch (err) {
      setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
    } finally {
      setDeletingNote(false);
    }
  }, [savedNotesList, selectedNoteId, user?.uid]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", width: "100%" }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, nextTab: "meldeskjema" | "notater") => setTab(nextTab)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="meldeskjema" label="Meldeskjema" />
          <Tab value="notater" label="Mine notater" />
        </Tabs>
      </Paper>

      {tab === "meldeskjema" ? (
        <Paper
          sx={{
            height: { xs: "calc(100vh - 310px)", md: "calc(100vh - 280px)" },
            minHeight: 520,
            overflow: "hidden",
          }}
        >
          <Box
            component="iframe"
            src={MELDESKJEMA_EMBED_URL}
            title="Meldeskjema for REKS+"
            sx={{ width: "100%", height: "100%", border: 0 }}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h2" sx={{ mb: 1 }}>
            Private notater
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dette er kun dine notater, lagret på din bruker.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {loadingNotes ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1.5,
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="h3">Skriv private notater</Typography>
                  <Button variant="outlined" onClick={handleNewNote}>
                    Nytt notat
                  </Button>
                </Box>

                <TextField
                  label="Tittel"
                  value={draftTitle}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                    if (success) setSuccess(null);
                  }}
                  placeholder="F.eks. Egne huskeregler"
                  fullWidth
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  label="Notat"
                  value={draftContent}
                  onChange={(event) => {
                    setDraftContent(event.target.value);
                    if (success) setSuccess(null);
                  }}
                  placeholder="Skriv egne notater her..."
                  fullWidth
                  multiline
                  minRows={12}
                />

                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {hasUnsavedChanges ? "Du har ulagrede endringer." : "Alt er lagret."}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {selectedNoteId && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDeleteNote}
                        disabled={savingNotes || deletingNote}
                      >
                        {deletingNote ? "Sletter..." : "Slett notat"}
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      onClick={handleSaveNote}
                      disabled={savingNotes || deletingNote || !hasUnsavedChanges}
                    >
                      {savingNotes ? "Lagrer..." : selectedNoteId ? "Oppdater notat" : "Lagre nytt notat"}
                    </Button>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h3" sx={{ mb: 1.5 }}>
                  Lagrede notater ({savedNotesList.length})
                </Typography>

                <Box sx={{ maxHeight: { xs: 360, md: 540 }, overflowY: "auto", pr: 0.5 }}>
                  {savedNotesList.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Ingen lagrede notater ennå.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "grid", gap: 1 }}>
                      {savedNotesList.map((note) => {
                        const isSelected = note.id === selectedNoteId;

                        return (
                          <Paper
                            key={note.id}
                            variant="outlined"
                            onClick={() => handleSelectNote(note)}
                            sx={{
                              p: 1.5,
                              cursor: "pointer",
                              borderColor: isSelected ? "primary.main" : "divider",
                              bgcolor: isSelected ? "action.selected" : "background.paper",
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {note.title || "Uten tittel"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {buildSnippet(note.content)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                              Oppdatert: {formatDateTime(note.updatedAtMs)}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
