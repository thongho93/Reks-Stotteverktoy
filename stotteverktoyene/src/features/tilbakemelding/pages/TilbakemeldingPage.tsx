import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { FirebaseError } from "firebase/app";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
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
  "#F1F3F4",
  "#FFEDE1",
];

type PrivateNote = {
  id: string;
  mode: "text" | "checklist";
  title: string;
  content: string;
  checklistItems: NoteChecklistItem[];
  color: string | null;
  updatedAtMs: number;
};

type NoteChecklistItem = {
  id: string;
  text: string;
  done: boolean;
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

function isValidNoteColor(value: unknown): value is string {
  return typeof value === "string" && KEEP_CARD_COLORS.includes(value);
}

function getNoteColor(note: Pick<PrivateNote, "id" | "color">): string {
  if (note.color && isValidNoteColor(note.color)) return note.color;
  let hash = 0;
  for (let i = 0; i < note.id.length; i += 1) {
    hash = (hash << 5) - hash + note.id.charCodeAt(i);
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

function createChecklistItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  const active = items.filter((item) => !item.done);
  const completed = items.filter((item) => item.done);
  return [...active, ...completed];
}

function normalizeChecklistItems(items: NoteChecklistItem[]): NoteChecklistItem[] {
  return sortChecklistItems(
    items
      .map((item) => ({
        id: item.id || createChecklistItemId(),
        text: item.text.trim(),
        done: Boolean(item.done),
      }))
      .filter((item) => item.text.length > 0)
  );
}

function buildChecklistContent(items: NoteChecklistItem[]): string {
  const normalized = normalizeChecklistItems(items);
  if (normalized.length === 0) return "";
  return normalized
    .map((item) => `${item.done ? "- [x]" : "- [ ]"} ${item.text}`)
    .join("\n");
}

function parseChecklistItems(raw: unknown): NoteChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const parsed = raw
    .map((item) => ({
      id:
        item && typeof item === "object" && typeof (item as any).id === "string"
          ? (item as any).id
          : createChecklistItemId(),
      text:
        item && typeof item === "object" && typeof (item as any).text === "string"
          ? (item as any).text
          : "",
      done:
        item && typeof item === "object" && typeof (item as any).done === "boolean"
          ? (item as any).done
          : false,
    }))
    .filter((item) => item.text.trim().length > 0)
    .map((item) => ({ ...item, text: item.text.trim() }));

  return sortChecklistItems(parsed);
}

function matchesSearchQuery(note: PrivateNote, query: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase("nb-NO").trim();
  if (normalizedQuery.length < 2) return true;

  const checklistText = note.checklistItems.map((item) => item.text).join(" ");
  const haystack = `${note.title} ${note.content} ${checklistText}`.toLocaleLowerCase("nb-NO");
  return haystack.includes(normalizedQuery);
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
  const [draftMode, setDraftMode] = React.useState<"text" | "checklist">("text");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftContent, setDraftContent] = React.useState("");
  const [draftChecklistItems, setDraftChecklistItems] = React.useState<NoteChecklistItem[]>([]);
  const [draftColor, setDraftColor] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [loadingNotes, setLoadingNotes] = React.useState(true);
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [deletingNote, setDeletingNote] = React.useState(false);
  const [draggingNoteId, setDraggingNoteId] = React.useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorSaving, setEditorSaving] = React.useState(false);
  const [composerExpanded, setComposerExpanded] = React.useState(false);
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
          setDraftMode("text");
          setDraftTitle("");
          setDraftContent("");
          setDraftChecklistItems([]);
          setDraftColor(null);
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
          const checklistItems = parseChecklistItems(data.checklistItems);
          const mode = data.noteMode === "checklist" || checklistItems.length > 0 ? "checklist" : "text";
          const content = mode === "checklist" ? buildChecklistContent(checklistItems) : String(data.content ?? "");
          return {
            id: noteDoc.id,
            mode,
            title: String(data.title ?? ""),
            content,
            checklistItems,
            color: isValidNoteColor(data.color) ? data.color : null,
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
                mode: "text",
                title: legacyTitle,
                content: legacyText,
                checklistItems: [],
                color: null,
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
            setDraftMode(loadedNotes[0].mode);
            setDraftTitle(loadedNotes[0].title);
            setDraftContent(loadedNotes[0].content);
            setDraftChecklistItems(loadedNotes[0].checklistItems);
            setDraftColor(loadedNotes[0].color);
          } else {
            setSelectedNoteId(null);
            setDraftMode("text");
            setDraftTitle("");
            setDraftContent("");
            setDraftChecklistItems([]);
            setDraftColor(null);
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
    setDraftMode("text");
    setDraftTitle("");
    setDraftContent("");
    setDraftChecklistItems([]);
    setDraftColor(null);
    setError(null);
    setSuccess(null);
  }, []);

  const handleOpenComposer = React.useCallback(() => {
    handleNewNote();
    setComposerExpanded(true);
  }, [handleNewNote]);

  const handleOpenChecklistComposer = React.useCallback(() => {
    handleNewNote();
    setComposerExpanded(true);
    setDraftMode("checklist");
    setDraftChecklistItems([{ id: createChecklistItemId(), text: "", done: false }]);
  }, [handleNewNote]);

  const addChecklistItem = React.useCallback(() => {
    setDraftChecklistItems((prev) => [...prev, { id: createChecklistItemId(), text: "", done: false }]);
  }, []);

  const updateChecklistItemText = React.useCallback((id: string, text: string) => {
    setDraftChecklistItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  const toggleChecklistItemDone = React.useCallback((id: string, checked: boolean) => {
    setDraftChecklistItems((prev) =>
      sortChecklistItems(prev.map((item) => (item.id === id ? { ...item, done: checked } : item)))
    );
  }, []);

  const removeChecklistItem = React.useCallback((id: string) => {
    setDraftChecklistItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleDraftChecklistMode = React.useCallback(() => {
    if (draftMode === "checklist") {
      setDraftMode("text");
      if (!draftContent.trim()) {
        const checklistAsText = sortChecklistItems(draftChecklistItems)
          .map((item) => (item.done ? `[x] ${item.text}` : item.text))
          .join("\n");
        setDraftContent(checklistAsText);
      }
      return;
    }

    setDraftMode("checklist");
    if (draftChecklistItems.length > 0) return;

    const fromText = draftContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: createChecklistItemId(),
        text: line.replace(/^\[(x|X| )\]\s*/, ""),
        done: /^\[(x|X)\]\s*/.test(line),
      }));

    setDraftChecklistItems(
      fromText.length > 0 ? sortChecklistItems(fromText) : [{ id: createChecklistItemId(), text: "", done: false }]
    );
  }, [draftChecklistItems, draftContent, draftMode]);

  const createNoteFromComposer = React.useCallback(async () => {
    if (!user?.uid || savingNotes) return false;

    const title = draftTitle.trim();
    const normalizedChecklist = normalizeChecklistItems(draftChecklistItems);
    const content = draftMode === "checklist" ? buildChecklistContent(normalizedChecklist) : draftContent.trim();

    // New notes should only be created when title and body has content.
    if (selectedNoteId || !title) return false;
    if (draftMode === "checklist" && normalizedChecklist.length === 0) return false;
    if (draftMode === "text" && !content) return false;

    setSavingNotes(true);
    setError(null);
    setSuccess(null);

    try {
      const createdRef = await addDoc(collection(db, "users", user.uid, "privateNotes"), {
        title,
        content,
        noteMode: draftMode,
        checklistItems: draftMode === "checklist" ? normalizedChecklist : [],
        color: draftColor ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const created: PrivateNote = {
        id: createdRef.id,
        mode: draftMode,
        title,
        content,
        checklistItems: draftMode === "checklist" ? normalizedChecklist : [],
        color: draftColor ?? null,
        updatedAtMs: Date.now(),
      };

      const reordered = [created, ...savedNotesList];
      setSavedNotesList(reordered);
      await persistNotesOrder(reordered);
      setSuccess("Nytt notat er lagret.");

      // Reset composer for quick next note.
      setSelectedNoteId(null);
      setDraftMode("text");
      setDraftTitle("");
      setDraftContent("");
      setDraftChecklistItems([]);
      setDraftColor(null);
      return true;
    } catch (err) {
      setError(mapFirebaseError(err, "Lagring feilet. Prøv igjen."));
      return false;
    } finally {
      setSavingNotes(false);
    }
  }, [
    draftChecklistItems,
    draftColor,
    draftContent,
    draftMode,
    draftTitle,
    persistNotesOrder,
    savedNotesList,
    savingNotes,
    selectedNoteId,
    user?.uid,
  ]);

  const handleOpenEditor = React.useCallback((note: PrivateNote) => {
    setSelectedNoteId(note.id);
    setDraftMode(note.mode);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftChecklistItems(note.checklistItems);
    setDraftColor(note.color);
    setEditorOpen(true);
    setError(null);
    setSuccess(null);
  }, []);

  const saveExistingNote = React.useCallback(
    async (
      nextMode: "text" | "checklist",
      nextTitle: string,
      nextContent: string,
      nextChecklistItems: NoteChecklistItem[],
      nextColor: string | null
    ) => {
      if (!user?.uid || !selectedNoteId) return false;

      const current = savedNotesList.find((note) => note.id === selectedNoteId);
      const normalizedChecklist = normalizeChecklistItems(nextChecklistItems);
      const computedContent = nextMode === "checklist" ? buildChecklistContent(normalizedChecklist) : nextContent;
      const computedTitle = buildNoteTitle(nextTitle, computedContent);
      if (
        current &&
        current.title === computedTitle &&
        current.content === computedContent &&
        current.mode === nextMode &&
        JSON.stringify(current.checklistItems) === JSON.stringify(normalizedChecklist) &&
        current.color === nextColor
      ) {
        return true;
      }

      try {
        setEditorSaving(true);
        await setDoc(
          doc(db, "users", user.uid, "privateNotes", selectedNoteId),
          {
            title: computedTitle,
            content: computedContent,
            noteMode: nextMode,
            checklistItems: nextMode === "checklist" ? normalizedChecklist : [],
            color: nextColor ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSavedNotesList((prev) =>
          prev.map((note) =>
            note.id === selectedNoteId
              ? {
                  ...note,
                  mode: nextMode,
                  title: computedTitle,
                  content: computedContent,
                  checklistItems: nextMode === "checklist" ? normalizedChecklist : [],
                  color: nextColor ?? null,
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
    const normalizedChecklist = normalizeChecklistItems(draftChecklistItems);
    const computedContent = draftMode === "checklist" ? buildChecklistContent(normalizedChecklist) : draftContent;
    return (
      current.mode !== draftMode ||
      current.title !== buildNoteTitle(draftTitle, computedContent) ||
      current.content !== computedContent ||
      JSON.stringify(current.checklistItems) !== JSON.stringify(normalizedChecklist) ||
      current.color !== draftColor
    );
  }, [draftChecklistItems, draftColor, draftContent, draftMode, draftTitle, editorOpen, savedNotesList, selectedNoteId]);

  const handleCloseEditor = React.useCallback(() => {
    if (hasEditorPendingChanges) {
      void saveExistingNote(draftMode, draftTitle, draftContent, draftChecklistItems, draftColor);
    }
    setEditorOpen(false);
  }, [draftChecklistItems, draftColor, draftContent, draftMode, draftTitle, hasEditorPendingChanges, saveExistingNote]);

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
        setDraftMode(remaining[0].mode);
        setDraftTitle(remaining[0].title);
        setDraftContent(remaining[0].content);
        setDraftChecklistItems(remaining[0].checklistItems);
        setDraftColor(remaining[0].color);
      } else {
        setSelectedNoteId(null);
        setDraftMode("text");
        setDraftTitle("");
        setDraftContent("");
        setDraftChecklistItems([]);
        setDraftColor(null);
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
      void saveExistingNote(draftMode, draftTitle, draftContent, draftChecklistItems, draftColor);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    draftChecklistItems,
    draftColor,
    draftContent,
    draftMode,
    draftTitle,
    editorOpen,
    hasEditorPendingChanges,
    saveExistingNote,
    selectedNoteId,
  ]);

  React.useEffect(() => {
    if (!composerExpanded || selectedNoteId) return;
    if (!draftTitle.trim()) return;
    if (draftMode === "text" && !draftContent.trim()) return;
    if (draftMode === "checklist" && normalizeChecklistItems(draftChecklistItems).length === 0) return;

    const timeout = window.setTimeout(() => {
      void createNoteFromComposer();
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [composerExpanded, createNoteFromComposer, draftChecklistItems, draftContent, draftMode, draftTitle, selectedNoteId]);

  const filteredNotes = React.useMemo(
    () => savedNotesList.filter((note) => matchesSearchQuery(note, searchQuery)),
    [savedNotesList, searchQuery]
  );
  const selectedNote = React.useMemo(
    () => savedNotesList.find((note) => note.id === selectedNoteId) ?? null,
    [savedNotesList, selectedNoteId]
  );
  const activeEditorColor = selectedNote ? draftColor ?? getNoteColor(selectedNote) : draftColor;
  const hasActiveSearch = searchQuery.trim().length >= 2;

  return (
    <Box sx={{ width: "100%" }}>
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
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: { xs: 1.5, md: 2.5 },
                  alignItems: "stretch",
                  justifyContent: { xs: "stretch", md: "flex-start" },
                  mb: 3,
                }}
              >
                <Box sx={{ width: { xs: "100%", md: 442 }, maxWidth: { xs: "100%", md: 442 }, flexShrink: 0 }}>
                  {!composerExpanded ? (
                    <Paper
                      variant="outlined"
                      onClick={handleOpenComposer}
                      sx={{
                        px: 2,
                        py: 1.4,
                        borderRadius: 2,
                        borderColor: "rgba(186,104,200,0.5)",
                        bgcolor: "rgba(255,255,255,0.95)",
                        backgroundImage:
                          "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(252,248,252,0.96) 100%)",
                        boxShadow: "0 14px 30px rgba(186,104,200,0.18)",
                        cursor: "text",
                        transition: "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 18px 34px rgba(186,104,200,0.22)",
                          borderColor: "rgba(186,104,200,0.7)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.1 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "rgba(15,23,42,0.06)",
                              color: "text.primary",
                            }}
                          >
                            <EditNoteRoundedIcon sx={{ fontSize: 21 }} />
                          </Box>
                          <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
                            Skriv et notat
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenChecklistComposer();
                          }}
                          aria-label="Nytt sjekkliste-notat"
                          sx={{
                            color: "text.secondary",
                            border: "1px solid",
                            borderColor: "rgba(15,23,42,0.15)",
                            bgcolor: "rgba(255,255,255,0.85)",
                            "&:hover": {
                              bgcolor: "rgba(15,23,42,0.06)",
                            },
                          }}
                        >
                          <CheckBoxOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  ) : (
                    <ClickAwayListener
                      onClickAway={() => {
                        void createNoteFromComposer();
                        setComposerExpanded(false);
                      }}
                    >
                      <Paper
                        variant="outlined"
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        borderColor: "rgba(186,104,200,0.55)",
                        bgcolor: "rgba(255,255,255,0.98)",
                        backgroundImage:
                          "linear-gradient(160deg, rgba(255,255,255,0.99) 0%, rgba(252,248,252,0.96) 100%)",
                        boxShadow: "0 20px 36px rgba(186,104,200,0.2)",
                      }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                          <InputBase
                            value={draftTitle}
                            onChange={(event) => {
                              setDraftTitle(event.target.value);
                              if (success) setSuccess(null);
                            }}
                            placeholder="Tittel"
                            fullWidth
                            autoFocus
                            sx={{
                              px: 0.25,
                              fontSize: "1.35rem",
                              fontWeight: 600,
                              color: "text.primary",
                              "& input::placeholder": {
                                color: "text.secondary",
                                opacity: 1,
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={toggleDraftChecklistMode}
                            aria-label={draftMode === "checklist" ? "Bytt til vanlig notattekst" : "Bytt til sjekkliste"}
                            sx={{
                              color: draftMode === "checklist" ? "primary.main" : "text.secondary",
                              border: "1px solid",
                              borderColor: draftMode === "checklist" ? "primary.main" : "divider",
                              bgcolor: "background.paper",
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            <CheckBoxOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {draftMode === "checklist" ? (
                          <Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              {sortChecklistItems(draftChecklistItems)
                                .filter((item) => !item.done)
                                .map((item, index, activeItems) => (
                                  <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Checkbox
                                      checked={item.done}
                                      onChange={(event) => {
                                        toggleChecklistItemDone(item.id, event.target.checked);
                                        if (success) setSuccess(null);
                                      }}
                                      size="small"
                                    />
                                    <InputBase
                                      value={item.text}
                                      onChange={(event) => {
                                        updateChecklistItemText(item.id, event.target.value);
                                        if (success) setSuccess(null);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" && index === activeItems.length - 1) {
                                          event.preventDefault();
                                          addChecklistItem();
                                        }
                                      }}
                                      placeholder="Listeelement"
                                      fullWidth
                                      sx={{
                                        fontSize: "1.05rem",
                                        color: "text.primary",
                                        "& input::placeholder": {
                                          color: "text.secondary",
                                          opacity: 1,
                                        },
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        removeChecklistItem(item.id);
                                        if (success) setSuccess(null);
                                      }}
                                      aria-label="Fjern punkt"
                                    >
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ))}
                            </Box>

                            <Button variant="text" size="small" onClick={addChecklistItem} sx={{ mt: 0.5 }}>
                              + Listeelement
                            </Button>

                            {sortChecklistItems(draftChecklistItems).some((item) => item.done) && (
                              <Box sx={{ mt: 1.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                  Fullført
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                  {sortChecklistItems(draftChecklistItems)
                                    .filter((item) => item.done)
                                    .map((item) => (
                                      <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <Checkbox
                                          checked={item.done}
                                          onChange={(event) => {
                                            toggleChecklistItemDone(item.id, event.target.checked);
                                            if (success) setSuccess(null);
                                          }}
                                          size="small"
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            flex: 1,
                                            textDecoration: "line-through",
                                            color: "text.secondary",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {item.text}
                                        </Typography>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <InputBase
                            value={draftContent}
                            onChange={(event) => {
                              setDraftContent(event.target.value);
                              if (success) setSuccess(null);
                            }}
                            placeholder="Skriv et notat"
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={6}
                            sx={{
                              px: 0.25,
                              fontSize: "1.1rem",
                              lineHeight: 1.5,
                              color: "text.primary",
                              "& textarea::placeholder": {
                                color: "text.secondary",
                                opacity: 1,
                              },
                            }}
                          />
                        )}
                      </Paper>
                    </ClickAwayListener>
                  )}
                </Box>

                <Box
                  sx={{
                    display: { xs: "none", md: "block" },
                    width: "1px",
                    ml: { md: "auto" },
                    bgcolor: "rgba(15,23,42,0.12)",
                    borderRadius: 999,
                    my: 2.25,
                  }}
                />

                <Box sx={{ width: { xs: "100%", md: 340 }, maxWidth: { xs: "100%", md: 340 }, flexShrink: 0 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 1.7,
                      py: 1.15,
                      borderRadius: 2,
                      borderColor: "rgba(15,23,42,0.16)",
                      borderStyle: "dashed",
                      bgcolor: "rgba(255,255,255,0.94)",
                      backgroundImage:
                        "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(246,248,252,0.94) 100%)",
                      boxShadow: "0 8px 18px rgba(15,23,42,0.07)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      <InputBase
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="søk"
                        fullWidth
                        sx={{
                          fontSize: "1rem",
                          color: "text.primary",
                          "& input::placeholder": {
                            color: "text.secondary",
                            opacity: 1,
                          },
                        }}
                      />
                      {searchQuery.trim().length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery("")}
                          aria-label="Tøm søk"
                          sx={{ color: "text.secondary" }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Box>

              <Typography variant="h3" sx={{ mb: 1.25 }}>
                {`Lagrede notater (${filteredNotes.length}${searchQuery.trim() ? ` av ${savedNotesList.length}` : ""})`}
              </Typography>

              <Box
                sx={{
                  ...(hasActiveSearch
                    ? {
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          lg: "repeat(3, minmax(0, 1fr))",
                          xl: "repeat(4, minmax(0, 1fr))",
                        },
                        gap: 2,
                      }
                    : {
                        columnCount: { xs: 1, sm: 2, md: 3, xl: 4 },
                        columnGap: 2,
                      }),
                }}
              >
                {savedNotesList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen lagrede notater ennå.
                  </Typography>
                ) : filteredNotes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Ingen notater matcher søket ditt.
                  </Typography>
                ) : (
                  filteredNotes.map((note) => {
                    const isSelected = note.id === selectedNoteId;

                    return (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        onClick={() => {
                          void copyNoteToClipboard(
                            note.mode === "checklist" ? buildChecklistContent(note.checklistItems) : note.content,
                            "manual"
                          );
                        }}
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
                          mb: hasActiveSearch ? 0 : 2,
                          display: hasActiveSearch ? "block" : "inline-block",
                          width: "100%",
                          breakInside: hasActiveSearch ? "auto" : "avoid",
                          cursor: draggingNoteId === note.id ? "grabbing" : "pointer",
                          borderColor:
                            dragOverNoteId === note.id && draggingNoteId !== note.id
                              ? "primary.main"
                              : isSelected
                              ? "primary.main"
                              : "divider",
                          bgcolor: getNoteColor(note),
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
                                handleOpenEditor(note);
                              }}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.75,
                                color: "text.secondary",
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "transparent",
                                px: 1.2,
                                py: 0.4,
                                minHeight: 40,
                                minWidth: 98,
                                borderRadius: 1.25,
                                cursor: "pointer",
                                transition: "background-color 120ms ease, border-color 120ms ease",
                                "&:hover": {
                                  bgcolor: "action.hover",
                                  borderColor: "text.secondary",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: "primary.main",
                                  outlineOffset: 1,
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Endre
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {note.mode === "checklist" ? (
                          <Box sx={{ mt: 0.75 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                              {note.checklistItems
                                .filter((item) => !item.done)
                                .slice(0, 4)
                                .map((item) => (
                                  <Typography
                                    key={item.id}
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                                  >
                                    • {item.text}
                                  </Typography>
                                ))}
                            </Box>

                            {note.checklistItems.some((item) => item.done) && (
                              <Box sx={{ mt: 0.75 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                                  Fullført ({note.checklistItems.filter((item) => item.done).length})
                                </Typography>
                                {note.checklistItems
                                  .filter((item) => item.done)
                                  .slice(0, 2)
                                  .map((item) => (
                                    <Typography
                                      key={item.id}
                                      variant="body2"
                                      sx={{
                                        color: "text.secondary",
                                        textDecoration: "line-through",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {item.text}
                                    </Typography>
                                  ))}
                              </Box>
                            )}
                          </Box>
                        ) : (
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
                        )}
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
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1.5, mb: 1.25 }}>
            <InputBase
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value);
                if (success) setSuccess(null);
              }}
              placeholder="Tittel"
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              sx={{
                px: 0.25,
                fontSize: "1.35rem",
                fontWeight: 600,
                lineHeight: 1.3,
                color: "text.primary",
                "& textarea": {
                  resize: "none",
                },
              }}
            />
            <IconButton
              size="small"
              onClick={toggleDraftChecklistMode}
              aria-label={draftMode === "checklist" ? "Bytt til vanlig notattekst" : "Bytt til sjekkliste"}
              sx={{
                color: draftMode === "checklist" ? "primary.main" : "text.secondary",
                border: "1px solid",
                borderColor: draftMode === "checklist" ? "primary.main" : "divider",
                bgcolor: "background.paper",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <CheckBoxOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>

          {draftMode === "checklist" ? (
            <Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {sortChecklistItems(draftChecklistItems)
                  .filter((item) => !item.done)
                  .map((item, index, activeItems) => (
                    <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Checkbox
                        checked={item.done}
                        onChange={(event) => {
                          toggleChecklistItemDone(item.id, event.target.checked);
                          if (success) setSuccess(null);
                        }}
                        size="small"
                      />
                      <InputBase
                        value={item.text}
                        onChange={(event) => {
                          updateChecklistItemText(item.id, event.target.value);
                          if (success) setSuccess(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && index === activeItems.length - 1) {
                            event.preventDefault();
                            addChecklistItem();
                          }
                        }}
                        placeholder="Listeelement"
                        fullWidth
                        sx={{
                          fontSize: "1.05rem",
                          color: "text.primary",
                          "& input::placeholder": {
                            color: "text.secondary",
                            opacity: 1,
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          removeChecklistItem(item.id);
                          if (success) setSuccess(null);
                        }}
                        aria-label="Fjern punkt"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
              </Box>

              <Button variant="text" size="small" onClick={addChecklistItem} sx={{ mt: 0.75 }}>
                + Listeelement
              </Button>

              {sortChecklistItems(draftChecklistItems).some((item) => item.done) && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Fullført ({sortChecklistItems(draftChecklistItems).filter((item) => item.done).length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {sortChecklistItems(draftChecklistItems)
                      .filter((item) => item.done)
                      .map((item) => (
                        <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Checkbox
                            checked={item.done}
                            onChange={(event) => {
                              toggleChecklistItemDone(item.id, event.target.checked);
                              if (success) setSuccess(null);
                            }}
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              textDecoration: "line-through",
                              color: "text.secondary",
                              wordBreak: "break-word",
                            }}
                          >
                            {item.text}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
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
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {editorSaving ? "Lagrer automatisk..." : "Endringer lagres automatisk"}
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              flexWrap: "wrap",
              maxWidth: { xs: 220, sm: 320, md: 360 },
              justifyContent: "flex-end",
            }}
          >
            {KEEP_CARD_COLORS.map((color) => {
              const isActive = activeEditorColor === color;
              return (
                <IconButton
                  key={color}
                  onClick={() => {
                    setDraftColor(color);
                    if (success) setSuccess(null);
                  }}
                  aria-label="Velg notatfarge"
                  sx={{
                    width: 26,
                    height: 26,
                    p: 0,
                    border: "1px solid",
                    borderColor: isActive ? "text.primary" : "rgba(15,23,42,0.22)",
                    bgcolor: color,
                    boxShadow: isActive ? "0 0 0 2px rgba(15,23,42,0.18)" : "none",
                    "&:hover": {
                      transform: "scale(1.08)",
                      borderColor: "text.primary",
                    },
                  }}
                >
                  {isActive && <CheckIcon sx={{ fontSize: 16, color: "rgba(15,23,42,0.86)" }} />}
                </IconButton>
              );
            })}
          </Box>
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
