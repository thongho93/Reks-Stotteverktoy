import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  FormControlLabel,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { FirebaseError } from "firebase/app";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/useAuthUser";

const MELDESKJEMA_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScKadKrBcIT-8a9CgD4QFfCjXsERjolCZbhojJU8jFhy8V6ZA/viewform?embedded=true";
const MELDESKJEMA_RESPONSES_URL =
  "https://docs.google.com/forms/d/1dQq_pvU1lXf295odpYPWXs0_zX693iLbKxSFfNS3sAQ/edit#responses";
const KEEP_CARD_COLORS = [
  "#FFF8E1",
  "#E8F5E9",
  "#E3F2FD",
  "#F3E5F5",
  "#FCE4EC",
  "#E0F2F1",
  "#FFF3E0",
  "#E8EAF6",
];

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

function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getNoteColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return KEEP_CARD_COLORS[Math.abs(hash) % KEEP_CARD_COLORS.length];
}

function reorderByIds(items: PrivateNote[], fromId: string, toId: string): PrivateNote[] {
  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
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
  const { user, isOwner } = useAuthUser();
  const [tab, setTab] = React.useState<"meldeskjema" | "notater">("notater");

  const [savedNotesList, setSavedNotesList] = React.useState<PrivateNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftContent, setDraftContent] = React.useState("");

  const [loadingNotes, setLoadingNotes] = React.useState(true);
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [deletingNote, setDeletingNote] = React.useState(false);
  const [draggingNoteId, setDraggingNoteId] = React.useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorSaving, setEditorSaving] = React.useState(false);
  const [composerExpanded, setComposerExpanded] = React.useState(false);
  const [autoCopyEnabled, setAutoCopyEnabled] = React.useState(true);
  const [copyToast, setCopyToast] = React.useState<{
    message: string;
    severity: "success" | "error" | "info";
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const persistNotesOrder = React.useCallback(
    async (notes: PrivateNote[]) => {
      if (!user?.uid) return;
      await setDoc(
        doc(db, "users", user.uid),
        {
          privateNotesOrder: notes.map((note) => note.id),
          privateNotesOrderUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user?.uid]
  );

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
        const userRef = doc(db, "users", user.uid);
        const notesRef = collection(db, "users", user.uid, "privateNotes");
        const [notesSnap, userSnap] = await Promise.all([getDocs(notesRef), getDoc(userRef)]);
        const userData = userSnap.exists() ? (userSnap.data() as any) : null;
        const orderedIds = Array.isArray(userData?.privateNotesOrder)
          ? userData.privateNotesOrder.filter((id: unknown): id is string => typeof id === "string")
          : [];
        const orderMap = new Map<string, number>(
          orderedIds.map((id: string, index: number) => [id, index])
        );

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
          const legacyText = userData
            ? String(userData.privateNotes ?? "").trim()
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

        loadedNotes.sort((a, b) => {
          const aOrder = orderMap.get(a.id);
          const bOrder = orderMap.get(b.id);

          if (typeof aOrder === "number" && typeof bOrder === "number") return aOrder - bOrder;
          if (typeof aOrder === "number") return -1;
          if (typeof bOrder === "number") return 1;
          return b.updatedAtMs - a.updatedAtMs;
        });

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
  const normalizedDraftContent = draftContent;
  const hasDraftContent = draftContent.trim().length > 0;

  const hasUnsavedChanges = React.useMemo(() => {
    if (selectedNote) {
      return (
        normalizedDraftTitle !== selectedNote.title ||
        normalizedDraftContent !== selectedNote.content
      );
    }

    return draftTitle.trim().length > 0 || draftContent.trim().length > 0;
  }, [draftContent, draftTitle, normalizedDraftContent, normalizedDraftTitle, selectedNote]);

  const copyNoteToClipboard = React.useCallback(
    async (content: string, mode: "auto" | "manual") => {
      const text = content.trim();
      if (!text) {
        setCopyToast({ message: "Notatet er tomt, ingenting å kopiere.", severity: "info" });
        return;
      }

      try {
        if (!navigator?.clipboard?.writeText) {
          setCopyToast({
            message: "Utklippstavle er ikke tilgjengelig i denne nettleseren.",
            severity: "error",
          });
          return;
        }
        await navigator.clipboard.writeText(text);
        setCopyToast({
          message: mode === "auto" ? "Notat kopiert automatisk." : "Notat kopiert.",
          severity: "success",
        });
      } catch {
        setCopyToast({ message: "Kunne ikke kopiere til utklippstavlen.", severity: "error" });
      }
    },
    []
  );

  const handleNewNote = React.useCallback(() => {
    setSelectedNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setError(null);
    setSuccess(null);
  }, []);

  const handleOpenComposer = React.useCallback(() => {
    handleNewNote();
    setComposerExpanded(true);
  }, [handleNewNote]);

  const handleOpenEditor = React.useCallback((note: PrivateNote) => {
    setSelectedNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setEditorOpen(true);
    setError(null);
    setSuccess(null);
  }, []);

  const saveExistingNote = React.useCallback(
    async (nextTitle: string, nextContent: string) => {
      if (!user?.uid || !selectedNoteId) return false;

      const current = savedNotesList.find((note) => note.id === selectedNoteId);
      const computedTitle = buildNoteTitle(nextTitle, nextContent);
      if (current && current.title === computedTitle && current.content === nextContent) return true;

      try {
        setEditorSaving(true);
        await setDoc(
          doc(db, "users", user.uid, "privateNotes", selectedNoteId),
          {
            title: computedTitle,
            content: nextContent,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSavedNotesList((prev) =>
          prev.map((note) =>
            note.id === selectedNoteId
              ? {
                  ...note,
                  title: computedTitle,
                  content: nextContent,
                  updatedAtMs: Date.now(),
                }
              : note
          )
        );
        return true;
      } catch (err) {
        setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
        return false;
      } finally {
        setEditorSaving(false);
      }
    },
    [savedNotesList, selectedNoteId, user?.uid]
  );

  const hasEditorPendingChanges = React.useMemo(() => {
    if (!selectedNoteId || !editorOpen) return false;
    const current = savedNotesList.find((note) => note.id === selectedNoteId);
    if (!current) return false;
    return current.title !== buildNoteTitle(draftTitle, draftContent) || current.content !== draftContent;
  }, [draftContent, draftTitle, editorOpen, savedNotesList, selectedNoteId]);

  const handleCloseEditor = React.useCallback(() => {
    if (hasEditorPendingChanges) {
      void saveExistingNote(draftTitle, draftContent);
    }
    setEditorOpen(false);
  }, [draftContent, draftTitle, hasEditorPendingChanges, saveExistingNote]);

  const handleSaveNote = React.useCallback(async () => {
    if (!user?.uid) {
      setError("Du må være innlogget for å lagre notater.");
      return false;
    }

    if (!hasDraftContent) {
      setError("Skriv inn litt tekst før du lagrer notatet.");
      return false;
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

        setSavedNotesList((prev) => prev.map((note) => (note.id === selectedNoteId ? updated : note)));

        setDraftTitle(updated.title);
        setDraftContent(updated.content);
        setSuccess("Notatet er oppdatert.");
        if (autoCopyEnabled) {
          void copyNoteToClipboard(updated.content, "auto");
        }
        return true;
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

        const reordered = [created, ...savedNotesList];
        setSavedNotesList(reordered);
        await persistNotesOrder(reordered);
        setSelectedNoteId(created.id);
        setDraftTitle(created.title);
        setDraftContent(created.content);
        setSuccess("Nytt notat er lagret.");
        if (autoCopyEnabled) {
          void copyNoteToClipboard(created.content, "auto");
        }
        return true;
      }
    } catch (err) {
      setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
      return false;
    } finally {
      setSavingNotes(false);
    }
  }, [
    autoCopyEnabled,
    copyNoteToClipboard,
    hasDraftContent,
    normalizedDraftContent,
    normalizedDraftTitle,
    persistNotesOrder,
    savedNotesList,
    selectedNoteId,
    user?.uid,
  ]);

  const handleDeleteNote = React.useCallback(async () => {
    if (!user?.uid || !selectedNoteId) return false;

    const confirmed = window.confirm("Er du sikker på at du vil slette dette notatet?");
    if (!confirmed) return false;

    setDeletingNote(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteDoc(doc(db, "users", user.uid, "privateNotes", selectedNoteId));

      const remaining = savedNotesList.filter((note) => note.id !== selectedNoteId);
      setSavedNotesList(remaining);
      await persistNotesOrder(remaining);

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
      return true;
    } catch (err) {
      setError(mapFirebaseError(err, "Sletting feilet. Prøv igjen."));
      return false;
    } finally {
      setDeletingNote(false);
    }
  }, [persistNotesOrder, savedNotesList, selectedNoteId, user?.uid]);

  const handleDropOnNote = React.useCallback(
    async (targetNoteId: string) => {
      if (!draggingNoteId) return;

      const reordered = reorderByIds(savedNotesList, draggingNoteId, targetNoteId);
      setDraggingNoteId(null);
      setDragOverNoteId(null);

      if (reordered === savedNotesList) return;

      setSavedNotesList(reordered);
      try {
        await persistNotesOrder(reordered);
      } catch (err) {
        setError(mapFirebaseError(err, "Kunne ikke lagre ny rekkefølge."));
      }
    },
    [draggingNoteId, persistNotesOrder, savedNotesList]
  );

  React.useEffect(() => {
    if (!editorOpen || !selectedNoteId) return;
    if (!hasEditorPendingChanges) return;

    const timeout = window.setTimeout(() => {
      void saveExistingNote(draftTitle, draftContent);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    draftContent,
    draftTitle,
    editorOpen,
    hasEditorPendingChanges,
    saveExistingNote,
    selectedNoteId,
  ]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", width: "100%" }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, nextTab: "meldeskjema" | "notater") => setTab(nextTab)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="notater" label="Mine notater" />
          <Tab value="meldeskjema" label="Innspill" />
        </Tabs>
      </Paper>

      {tab === "meldeskjema" ? (
        <>
          {isOwner && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Kun eier kan åpne innsendinger og se svaroversikt.
              </Typography>
              <Button
                variant="outlined"
                href={MELDESKJEMA_RESPONSES_URL}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewIcon />}
              >
                Åpne svar
              </Button>
            </Paper>
          )}
          <Paper
            sx={{
              height: { xs: isOwner ? "calc(100vh - 390px)" : "calc(100vh - 310px)", md: isOwner ? "calc(100vh - 360px)" : "calc(100vh - 280px)" },
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
        </>
      ) : (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5 }}>
                Private notater
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dette er kun dine notater, lagret på din bruker.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={autoCopyEnabled}
                  onChange={(event) => setAutoCopyEnabled(event.target.checked)}
                />
              }
              label="Kopi aktiv"
              sx={{ mr: 0 }}
            />
          </Box>

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
            <>
              <Paper
                component="div"
                sx={{ maxWidth: 760, mx: "auto", mb: 2.5 }}
              >
                {!composerExpanded ? (
                  <Paper
                    variant="outlined"
                    onClick={handleOpenComposer}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                      cursor: "text",
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      Skriv et notat
                    </Typography>
                  </Paper>
                ) : (
                  <ClickAwayListener
                    onClickAway={() => {
                      setComposerExpanded(false);
                    }}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      }}
                    >
                      <TextField
                        label="Tittel"
                        value={draftTitle}
                        onChange={(event) => {
                          setDraftTitle(event.target.value);
                          if (success) setSuccess(null);
                        }}
                        placeholder="F.eks. Egne huskeregler"
                        fullWidth
                        autoFocus
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
                        minRows={7}
                      />

                      <Box
                        sx={{
                          mt: 1.5,
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
                          <Button
                            variant="text"
                            onClick={() => {
                              handleNewNote();
                              setComposerExpanded(false);
                            }}
                          >
                            Avbryt
                          </Button>
                          <Button
                            variant="contained"
                            onClick={async () => {
                              const saved = await handleSaveNote();
                              if (saved) {
                                setComposerExpanded(false);
                              }
                            }}
                            disabled={savingNotes || deletingNote || !hasDraftContent}
                          >
                            {savingNotes ? "Lagrer..." : "Lagre notat"}
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  </ClickAwayListener>
                )}
              </Paper>

              <Typography variant="h3" sx={{ mb: 1.25 }}>
                Lagrede notater ({savedNotesList.length})
              </Typography>

              <Box
                sx={{
                  columnCount: { xs: 1, sm: 2, md: 3, xl: 4 },
                  columnGap: 2,
                }}
              >
                {savedNotesList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen lagrede notater ennå.
                  </Typography>
                ) : (
                  savedNotesList.map((note) => {
                    const isSelected = note.id === selectedNoteId;

                    return (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        onClick={() => handleOpenEditor(note)}
                        draggable
                        onDragStart={(event) => {
                          setDraggingNoteId(note.id);
                          setDragOverNoteId(note.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", note.id);

                          const dragPreview = document.createElement("div");
                          dragPreview.textContent = "⤢ Flytt notat";
                          dragPreview.style.position = "fixed";
                          dragPreview.style.top = "-1000px";
                          dragPreview.style.left = "-1000px";
                          dragPreview.style.padding = "6px 10px";
                          dragPreview.style.borderRadius = "999px";
                          dragPreview.style.background = "rgba(33, 33, 33, 0.92)";
                          dragPreview.style.color = "#fff";
                          dragPreview.style.fontSize = "12px";
                          dragPreview.style.fontWeight = "600";
                          dragPreview.style.pointerEvents = "none";
                          dragPreview.style.zIndex = "9999";
                          document.body.appendChild(dragPreview);
                          event.dataTransfer.setDragImage(dragPreview, 14, 14);
                          window.setTimeout(() => {
                            dragPreview.remove();
                          }, 0);
                        }}
                        onDragEnter={() => {
                          if (!draggingNoteId || draggingNoteId === note.id) return;
                          setDragOverNoteId(note.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDropOnNote(note.id);
                        }}
                        onDragEnd={() => {
                          setDraggingNoteId(null);
                          setDragOverNoteId(null);
                        }}
                        sx={{
                          p: 1.5,
                          mb: 2,
                          display: "inline-block",
                          width: "100%",
                          breakInside: "avoid",
                          cursor: draggingNoteId === note.id ? "grabbing" : "grab",
                          borderColor:
                            dragOverNoteId === note.id && draggingNoteId !== note.id
                              ? "primary.main"
                              : isSelected
                              ? "primary.main"
                              : "divider",
                          bgcolor: getNoteColor(note.id),
                          boxShadow: isSelected ? "0 0 0 1px rgba(25,118,210,0.35)" : "none",
                          transition: "transform 120ms ease, box-shadow 120ms ease",
                          opacity: draggingNoteId === note.id ? 0.55 : 1,
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 1,
                          }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {note.title || "Uten tittel"}
                          </Typography>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                            <DragIndicatorIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          <Box
                            component="button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!autoCopyEnabled) return;
                              void copyNoteToClipboard(note.content, "manual");
                            }}
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "text.secondary",
                              border: 0,
                              bgcolor: "transparent",
                              p: 0,
                              cursor: autoCopyEnabled ? "pointer" : "not-allowed",
                              opacity: autoCopyEnabled ? 1 : 0.45,
                            }}
                          >
                            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption">Kopi</Typography>
                          </Box>
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.75,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {note.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: "block" }}>
                          Oppdatert: {formatDateTime(note.updatedAtMs)}
                        </Typography>
                      </Paper>
                    );
                  })
                )}
              </Box>
            </>
          )}
        </Paper>
      )}
      <Snackbar
        open={Boolean(copyToast)}
        autoHideDuration={1500}
        onClose={() => setCopyToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopyToast(null)}
          severity={copyToast?.severity ?? "success"}
          variant="filled"
          icon={copyToast?.severity === "success" ? <CheckCircleIcon fontSize="inherit" /> : undefined}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 0.75,
            alignItems: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          {copyToast?.message ?? ""}
        </Alert>
      </Snackbar>
      <Dialog
        open={editorOpen}
        onClose={handleCloseEditor}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            maxWidth: 544,
          },
        }}
      >
        <DialogTitle>Rediger notat</DialogTitle>
        <DialogContent>
          <TextField
            label="Tittel"
            value={draftTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              if (success) setSuccess(null);
            }}
            fullWidth
            sx={{ mt: 1.5, mb: 2 }}
          />
          <TextField
            label="Notat"
            value={draftContent}
            onChange={(event) => {
              setDraftContent(event.target.value);
              if (success) setSuccess(null);
            }}
            fullWidth
            multiline
            minRows={10}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {editorSaving ? "Lagrer automatisk..." : "Endringer lagres automatisk"}
          </Typography>
          {selectedNoteId && (
            <Button
              color="error"
              onClick={async () => {
                const deleted = await handleDeleteNote();
                if (deleted) setEditorOpen(false);
              }}
              disabled={savingNotes || deletingNote}
            >
              {deletingNote ? "Sletter..." : "Slett"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
