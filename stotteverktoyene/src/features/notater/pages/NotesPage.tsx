import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputBase,
  Paper,
  Skeleton,
  Snackbar,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useLocation } from "react-router-dom";
import { AccentSelection } from "../../../styles/AccentSelection";
import { useAuthUser } from "../../../app/auth/useAuthUser";
import { NoteCard, type NoteCardActions } from "../components/NoteCard";
import { NoteDetailPanel } from "../components/NoteDetailPanel";
import { QuickComposer, type QuickComposerHandle } from "../components/QuickComposer";
import { TrashList } from "../components/TrashList";
import { useNotes } from "../hooks/useNotes";
import type { Note, NotesRouteState } from "../types";
import { getNoteClipboardText, getNoteClipboardTextWithTitle, matchesSearch } from "../utils/noteUtils";

const PURPLE = "#B648E8";
const GRID_SX = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 2,
  alignItems: "stretch",
} as const;

type Toast = {
  key: number;
  message: string;
  severity: "success" | "info" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

const ONE_CLICK_STORAGE_KEY = "notater.oneClickCopy";

/** «Ett klikk kopierer» huskes per nettleser. Standard: på. */
function useOneClickCopyPreference(): [boolean, (value: boolean) => void] {
  const [value, setValue] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(ONE_CLICK_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const update = React.useCallback((next: boolean) => {
    setValue(next);
    try {
      window.localStorage.setItem(ONE_CLICK_STORAGE_KEY, String(next));
    } catch {
      /* lagring utilgjengelig – valget gjelder kun denne økten */
    }
  }, []);
  return [value, update];
}

function NotesHeaderIcon() {
  return (
    <Box component="svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden sx={{ width: 26, height: 26, flexShrink: 0 }}>
      <path d="M26 6C26.5523 6 27 6.44772 27 7V11C27 11.5523 26.5523 12 26 12C25.4477 12 25 11.5523 25 11V10H19.0001L19.0001 8H25V7C25 6.44772 25.4477 6 26 6Z" fill="currentColor" />
      <path d="M16 6C15.4477 6 15 6.44772 15 7V8H13C11.3431 8 10 9.34315 10 11V35C10 36.6569 11.3431 38 13 38H30C31.6569 38 33 36.6569 33 35V11C33 9.34315 31.6569 8 30 8H29.0001V10H30C30.5523 10 31 10.4477 31 11V35C31 35.5523 30.5523 36 30 36H13C12.4477 36 12 35.5523 12 35V11C12 10.4477 12.4477 10 13 10H15V11C15 11.5523 15.4477 12 16 12C16.5523 12 17 11.5523 17 11V7C17 6.44772 16.5523 6 16 6Z" fill="currentColor" />
      <path d="M14 19C14 18.4477 14.4477 18 15 18H28C28.5523 18 29 18.4477 29 19C29 19.5523 28.5523 20 28 20H15C14.4477 20 14 19.5523 14 19Z" fill="currentColor" />
      <path d="M15 23C14.4477 23 14 23.4477 14 24C14 24.5523 14.4477 25 15 25H22C22.5523 25 23 24.5523 23 24C23 23.4477 22.5523 23 22 23H15Z" fill="currentColor" />
      <path d="M14 29C14 28.4477 14.4477 28 15 28H26C26.5523 28 27 28.4477 27 29C27 29.5523 26.5523 30 26 30H15C14.4477 30 14 29.5523 14 29Z" fill="currentColor" />
      <path d="M13 40C10.2386 40 8 37.7614 8 35V10H6V35C6 38.866 9.13401 42 13 42H30V40H13Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M36 13C36 11.3431 37.3431 10 39 10C40.6569 10 42 11.3431 42 13V33.3028L39 37.8028L36 33.3028V13ZM39 12C38.4477 12 38 12.4477 38 13V15H40V13C40 12.4477 39.5523 12 39 12ZM39 34.1972L40 32.6972V17H38V32.6972L39 34.1972Z" fill="currentColor" />
    </Box>
  );
}

function SectionHeading({ icon, label, count }: { icon?: React.ReactNode; label: string; count: number }) {
  return (
    <Typography
      component="h2"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        mb: 1.25,
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "text.secondary",
      }}
    >
      {icon}
      {label}
      <Box component="span" sx={{ fontWeight: 500, opacity: 0.7 }}>
        {count}
      </Box>
    </Typography>
  );
}

export default function NotesPage() {
  const baseTheme = useTheme();
  const isDark = baseTheme.palette.mode === "dark";
  const purpleTheme = React.useMemo(
    () => createTheme(baseTheme, { palette: { primary: baseTheme.palette.augmentColor({ color: { main: PURPLE } }) } }),
    [baseTheme],
  );
  return (
    <ThemeProvider theme={purpleTheme}>
      <AccentSelection />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          bgcolor: isDark ? "#0D0B12" : "#FAF6FE",
          backgroundImage: isDark
            ? "radial-gradient(circle at 8% -12%, rgba(140,40,200,0.12) 0%, rgba(140,40,200,0) 40%), radial-gradient(circle at 94% -4%, rgba(100,20,160,0.10) 0%, rgba(100,20,160,0) 34%)"
            : "radial-gradient(circle at 8% -12%, rgba(182,72,232,0.14) 0%, rgba(182,72,232,0) 40%), radial-gradient(circle at 94% -4%, rgba(140,40,200,0.10) 0%, rgba(140,40,200,0) 34%)",
        }}
      />
      <NotesContent />
    </ThemeProvider>
  );
}

function NotesContent() {
  const location = useLocation();
  const routeState = (location.state as NotesRouteState | null) ?? null;
  const { user } = useAuthUser();
  const {
    notes,
    trash,
    autoDeleted,
    clearAutoDeleted,
    restoreFromTrash,
    deletePermanently,
    emptyTrash,
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
  } = useNotes(user?.uid);

  const [oneClickCopy, setOneClickCopy] = useOneClickCopyPreference();
  // Oppdateres hvert halve minutt, slik at forfalte påminnelser markeres uten reload.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [query, setQuery] = React.useState("");
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);
  const [showTrash, setShowTrash] = React.useState(false);
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<Toast | null>(null);
  const [toastOpen, setToastOpen] = React.useState(false);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const composerRef = React.useRef<QuickComposerHandle>(null);
  const notesRef = React.useRef<Note[]>(notes);
  React.useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  const draggingRef = React.useRef<string | null>(null);

  const showToast = React.useCallback((next: Omit<Toast, "key">) => {
    setToast({ ...next, key: Date.now() });
    setToastOpen(true);
  }, []);

  // --- Avledede lister ----------------------------------------------------
  const tagCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nb-NO"));
  }, [notes]);
  const allTags = React.useMemo(() => tagCounts.map(([tag]) => tag), [tagCounts]);
  const favoriteCount = React.useMemo(() => notes.filter((n) => n.isFavorite).length, [notes]);

  const filtered = React.useMemo(
    () =>
      notes.filter(
        (n) =>
          matchesSearch(n, query) &&
          (!onlyFavorites || n.isFavorite) &&
          (!activeTag || n.tags.includes(activeTag)),
      ),
    [notes, query, onlyFavorites, activeTag],
  );
  const favorites = React.useMemo(() => filtered.filter((n) => n.isFavorite), [filtered]);
  const others = React.useMemo(() => filtered.filter((n) => !n.isFavorite), [filtered]);
  const visible = React.useMemo(() => (showTrash ? [] : [...favorites, ...others]), [favorites, others, showTrash]);
  const visibleRef = React.useRef<Note[]>(visible);
  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const selectedNote = React.useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);
  const isFiltering = query.trim().length > 0 || onlyFavorites || activeTag !== null;

  // Hold utvalget gyldig (slettet notat, ny filtrering).
  React.useEffect(() => {
    if (selectedId && !notes.some((n) => n.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  // Tilstand fra globalt søk (Ctrl+K): forhåndsfyll søk og åpne notatet.
  const appliedRouteKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!routeState || appliedRouteKey.current === location.key) return;
    if (loading) return;
    appliedRouteKey.current = location.key;
    if (typeof routeState.noteSearchQuery === "string") setQuery(routeState.noteSearchQuery);
    const target = typeof routeState.selectedNoteId === "string" ? routeState.selectedNoteId.trim() : "";
    if (target && notes.some((n) => n.id === target)) setSelectedId(target);
  }, [routeState, location.key, loading, notes]);

  // Notater som ble flyttet til Slettede notater fordi «slett automatisk»-datoen utløp.
  React.useEffect(() => {
    if (autoDeleted.length === 0) return;
    showToast({
      message:
        autoDeleted.length === 1
          ? `«${autoDeleted[0]}» ble slettet automatisk og ligger i Slettede notater`
          : `${autoDeleted.length} notater ble slettet automatisk og ligger i Slettede notater`,
      severity: "info",
    });
    clearAutoDeleted();
  }, [autoDeleted, clearAutoDeleted, showToast]);

  // --- Handlinger -----------------------------------------------------------
  const copyNote = React.useCallback(
    async (id: string, withTitle = false) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      const text = (withTitle ? getNoteClipboardTextWithTitle(note) : getNoteClipboardText(note)).trim();
      if (!text) {
        showToast({ message: "Notatet er tomt – ingenting å kopiere.", severity: "info" });
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast({ message: withTitle ? "Kopiert med tittel" : "Kopiert til utklippstavla", severity: "success" });
      } catch {
        showToast({ message: "Kunne ikke kopiere til utklippstavla.", severity: "error" });
      }
    },
    [showToast],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      setSelectedId((current) => (current === id ? null : current));
      const result = await deleteNote(id);
      if (!result) return;
      showToast({
        message: `«${result.note.title || "Uten tittel"}» er flyttet til Slettede notater`,
        severity: "info",
        actionLabel: "Angre",
        onAction: () => {
          void restoreNote(result.note, result.index);
        },
      });
    },
    [deleteNote, restoreNote, showToast],
  );

  const toggleFavorite = React.useCallback(
    (id: string) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (note) void updateNote(id, { isFavorite: !note.isFavorite });
    },
    [updateNote],
  );

  const toggleChecklistItem = React.useCallback(
    (id: string, itemId: string) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (!note) return;
      void updateNote(id, {
        checklistItems: note.checklistItems.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
      });
    },
    [updateNote],
  );

  const groupOf = (id: string | null) => notesRef.current.find((n) => n.id === id)?.isFavorite ?? false;

  const cardActions = React.useMemo<NoteCardActions>(
    () => ({
      onSelect: (id) => setSelectedId(id),
      onEdit: (id) => setSelectedId(id),
      onCopy: (id, withTitle) => void copyNote(id, withTitle),
      onToggleFavorite: toggleFavorite,
      onClearReminder: (id) => void updateNote(id, { reminderAtMs: null }),
      onClearDeleteOn: (id) => void updateNote(id, { deleteOn: null }),
      onToggleChecklistItem: toggleChecklistItem,
      onColor: (id, color) => void updateNote(id, { color }),
      onMoveToFront: (id) => void moveNoteToFront(id),
      onDelete: (id) => void handleDelete(id),
      onTagClick: (tag) => setActiveTag(tag),
      onDragStart: (id, event) => {
        draggingRef.current = id;
        setDraggingId(id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        const ghost = document.createElement("div");
        ghost.textContent = "Flytt notat";
        Object.assign(ghost.style, {
          position: "fixed",
          top: "-1000px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: "rgba(33,33,33,0.92)",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "600",
        });
        document.body.appendChild(ghost);
        event.dataTransfer.setDragImage(ghost, 14, 14);
        window.setTimeout(() => ghost.remove(), 0);
      },
      onDragEnter: (id) => {
        const from = draggingRef.current;
        if (!from || from === id || groupOf(from) !== groupOf(id)) return;
        setDragOverId(id);
      },
      onDrop: (id) => {
        const from = draggingRef.current;
        draggingRef.current = null;
        setDraggingId(null);
        setDragOverId(null);
        if (!from || from === id || groupOf(from) !== groupOf(id)) return;
        void reorder(from, id);
      },
      onDragEnd: () => {
        draggingRef.current = null;
        setDraggingId(null);
        setDragOverId(null);
      },
    }),
    [copyNote, handleDelete, moveNoteToFront, reorder, toggleChecklistItem, toggleFavorite, updateNote],
  );

  const clearFilters = () => {
    setShowTrash(false);
    setQuery("");
    setOnlyFavorites(false);
    setActiveTag(null);
  };

  const composerTags = React.useMemo(() => (activeTag ? [activeTag] : undefined), [activeTag]);

  // --- Tastatursnarveier ----------------------------------------------------
  const selectAndReveal = React.useCallback((id: string) => {
    // I «ett klikk kopierer»-modus flytter piltastene bare fokus; editoren åpnes via Rediger.
    if (!oneClickCopy) setSelectedId(id);
    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(id)}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [oneClickCopy]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const active = document.activeElement as HTMLElement | null;
      const inSearch = active === searchRef.current;
      const typing =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || Boolean(active?.isContentEditable);
      const overlayOpen = Boolean(document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]'));
      const key = event.key;
      const focusedCardId = active?.closest?.("[data-note-id]")?.getAttribute("data-note-id") ?? null;
      const targetId = focusedCardId ?? selectedId;

      if (mod && key.toLowerCase() === "s") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (overlayOpen) return;

      if (key === "Escape") {
        if (inSearch || query) {
          event.preventDefault();
          setQuery("");
          searchRef.current?.blur();
        } else if (selectedId) {
          event.preventDefault();
          setSelectedId(null);
        }
        return;
      }

      if (inSearch && key === "ArrowDown" && visibleRef.current.length > 0) {
        event.preventDefault();
        searchRef.current?.blur();
        selectAndReveal(visibleRef.current[0].id);
        return;
      }
      if (typing || mod || event.altKey) {
        if (!(mod && key.toLowerCase() === "c")) return;
      }

      if (key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (key.toLowerCase() === "n" && !mod) {
        event.preventDefault();
        composerRef.current?.open();
        return;
      }
      if (mod && key.toLowerCase() === "c") {
        if (typing || window.getSelection()?.toString() || !targetId) return;
        event.preventDefault();
        void copyNote(targetId);
        return;
      }
      if (key === "Delete" && targetId) {
        event.preventDefault();
        void handleDelete(targetId);
        return;
      }
      if (key === "Enter" && !oneClickCopy && selectedId && (active === document.body || active?.matches("[data-note-id]"))) {
        window.setTimeout(() => {
          document.querySelector<HTMLElement>("[data-note-editor-content], [data-note-editor-title]")?.focus();
        }, 60);
        return;
      }

      const list = visibleRef.current;
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(key) || list.length === 0) return;
      event.preventDefault();
      const index = targetId ? list.findIndex((n) => n.id === targetId) : -1;
      if (index === -1) {
        selectAndReveal(list[0].id);
        return;
      }
      if (key === "ArrowLeft" || key === "ArrowRight") {
        const next = Math.min(Math.max(index + (key === "ArrowRight" ? 1 : -1), 0), list.length - 1);
        selectAndReveal(list[next].id);
        return;
      }
      // Opp/ned: nærmeste kort i samme kolonne.
      const rects = list.map((n) =>
        document.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(n.id)}"]`)?.getBoundingClientRect(),
      );
      const current = rects[index];
      if (!current) return;
      const cx = current.left + current.width / 2;
      let best = -1;
      let bestScore = Infinity;
      rects.forEach((r, i) => {
        if (!r || i === index) return;
        const dy = key === "ArrowDown" ? r.top - current.top : current.top - r.top;
        if (dy <= 8) return;
        const dx = Math.abs(r.left + r.width / 2 - cx);
        if (dx > current.width * 0.6) return;
        const score = dy * 4 + dx;
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      });
      if (best >= 0) selectAndReveal(list[best].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copyNote, handleDelete, oneClickCopy, query, selectAndReveal, selectedId]);

  // --- Rendering ------------------------------------------------------------
  const renderCards = (list: Note[]) => (
    <Box sx={GRID_SX}>
      {list.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          selected={note.id === selectedId}
          dragging={note.id === draggingId}
          dragOver={note.id === dragOverId}
          query={query}
          canMoveToFront={notes[0]?.id !== note.id}
          oneClickCopy={oneClickCopy}
          now={now}
          actions={cardActions}
        />
      ))}
    </Box>
  );

  const showHeadings = favorites.length > 0 && others.length > 0;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Topplinje */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr minmax(0, 360px) 1fr" },
          alignItems: "center",
          gap: { xs: 1.25, md: 2 },
          px: { xs: 2, md: 3 },
          pt: 0.75,
          pb: 1.25,
          bgcolor: "background.paper",
          borderRadius: "4px 4px 0 0",
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "#B07FD4",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotesHeaderIcon />
          <Typography component="h1" sx={{ fontSize: "1.25rem", fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>
            Mine notater
          </Typography>
        </Box>

        <Box
          sx={(t) => ({
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: "100%",
            gridColumn: { md: 2 },
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
            color: "text.secondary",
            transition: "border-color 150ms, box-shadow 150ms, background-color 150ms",
            "&:focus-within": {
              borderColor: "primary.main",
              bgcolor: "background.paper",
              boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.2)}`,
            },
          })}
        >
          <SearchRoundedIcon sx={{ fontSize: 20 }} />
          <InputBase
            inputRef={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk i notater eller #tag"
            fullWidth
            inputProps={{ "aria-label": "Søk i notater" }}
            sx={{ fontSize: "0.95rem", color: "text.primary", "& input::placeholder": { color: "text.secondary", opacity: 0.9 } }}
          />
          {query ? (
            <IconButton size="small" aria-label="Tøm søk" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <Typography
              component="kbd"
              variant="caption"
              sx={{
                display: { xs: "none", md: "inline-block" },
                px: 0.75,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                fontFamily: "inherit",
                color: "text.disabled",
              }}
            >
              /
            </Typography>
          )}
        </Box>

        <Tooltip
          title="Klikk på et notat kopierer det med én gang. Bruk Rediger-knappen på kortet for å endre."
          placement="bottom-end"
        >
          <Box
            component="label"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "flex-start", md: "flex-end" },
              gap: 0.5,
              gridColumn: { md: 3 },
              cursor: "pointer",
              color: "text.secondary",
              userSelect: "none",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
              Ett klikk kopierer
            </Typography>
            <Switch
              size="small"
              checked={oneClickCopy}
              onChange={(e) => setOneClickCopy(e.target.checked)}
              slotProps={{ input: { "aria-label": "Ett klikk kopierer" } }}
            />
          </Box>
        </Tooltip>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "0 0 4px 4px", mt: 0, boxShadow: (t) => t.shadows[1] }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ maxWidth: 520, mx: "auto", mb: 2.5, display: showTrash ? "none" : "block" }}>
              <QuickComposer
                ref={composerRef}
                tagSuggestions={allTags}
                initialTags={composerTags}
                onOpen={() => {
                  setSelectedId(null);
                  setShowTrash(false);
                }}
                onCreate={createNote}
                onCreated={(note) =>
                  showToast({ message: `«${note.title}» er lagret`, severity: "success" })
                }
              />
            </Box>

            {/* Filterlinje */}
            {!loading && (notes.length > 0 || trash.length > 0) && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mb: 2.5,
                  overflowX: "auto",
                  pb: 0.5,
                  scrollbarWidth: "thin",
                }}
                role="group"
                aria-label="Filtrer notater"
              >
                <Chip
                  label={`Alle · ${notes.length}`}
                  size="small"
                  clickable
                  color={!showTrash && !onlyFavorites && !activeTag ? "primary" : "default"}
                  variant={!showTrash && !onlyFavorites && !activeTag ? "filled" : "outlined"}
                  onClick={() => { setShowTrash(false); setOnlyFavorites(false); setActiveTag(null); }}
                  sx={{ fontWeight: 600, flexShrink: 0 }}
                />
                {favoriteCount > 0 && (
                  <Chip
                    icon={<StarRoundedIcon sx={{ fontSize: 16, color: onlyFavorites ? "inherit" : "warning.main" }} />}
                    label={`Favoritter · ${favoriteCount}`}
                    size="small"
                    clickable
                    color={onlyFavorites ? "primary" : "default"}
                    variant={onlyFavorites ? "filled" : "outlined"}
                    onClick={() => { setShowTrash(false); setOnlyFavorites((v) => !v); }}
                    sx={{ fontWeight: 600, flexShrink: 0 }}
                  />
                )}
                {tagCounts.map(([tag, count]) => (
                  <Chip
                    key={tag}
                    label={`#${tag} · ${count}`}
                    size="small"
                    clickable
                    color={activeTag === tag ? "primary" : "default"}
                    variant={activeTag === tag ? "filled" : "outlined"}
                    onClick={() => { setShowTrash(false); setActiveTag((current) => (current === tag ? null : tag)); }}
                    sx={{ fontWeight: 500, flexShrink: 0 }}
                  />
                ))}
                <Chip
                  icon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                  label={`Slettede · ${trash.length}`}
                  size="small"
                  clickable
                  color={showTrash ? "primary" : "default"}
                  variant={showTrash ? "filled" : "outlined"}
                  onClick={() => {
                    setSelectedId(null);
                    setShowTrash((v) => !v);
                  }}
                  sx={{ fontWeight: 600, flexShrink: 0, ml: "auto" }}
                />
                {isFiltering && !showTrash && (
                  <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", flexShrink: 0, ml: 0.5 }}>
                    Fjern filter ({filtered.length} av {notes.length})
                  </Button>
                )}
              </Box>
            )}

            {/* Innhold */}
            {showTrash ? (
              <TrashList
                notes={trash}
                now={now}
                onRestore={(id) => {
                  void restoreFromTrash(id).then((ok) => {
                    if (ok) showToast({ message: "Notatet er gjenopprettet", severity: "success" });
                  });
                }}
                onDeleteForever={(id) => void deletePermanently([id])}
                onEmpty={() => void emptyTrash()}
              />
            ) : loading ? (
              <Box sx={GRID_SX} aria-busy="true" aria-label="Laster notater">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={150 + (i % 3) * 20} sx={{ borderRadius: "14px" }} />
                ))}
              </Box>
            ) : notes.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 72,
                    height: 72,
                    mx: "auto",
                    mb: 2,
                    borderRadius: "50%",
                    color: "primary.main",
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                  }}
                >
                  <EditNoteRoundedIcon sx={{ fontSize: 38 }} />
                </Box>
                <Typography variant="h6" sx={{ color: "text.primary", mb: 0.5 }}>
                  Ingen notater ennå
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Skriv ditt første notat, eller trykk <b>N</b> for å komme raskt i gang.
                </Typography>
                <Button variant="contained" disableElevation onClick={() => composerRef.current?.open()} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                  Skriv et notat
                </Button>
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                <SearchRoundedIcon sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
                <Typography variant="h6" sx={{ color: "text.primary", mb: 0.5 }}>
                  Ingen treff
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {query.trim() ? `Fant ingen notater som matcher «${query.trim()}».` : "Ingen notater passer med filteret."}
                </Typography>
                <Button onClick={clearFilters} sx={{ textTransform: "none" }}>Fjern søk og filter</Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {favorites.length > 0 && (
                  <section aria-label="Favoritter">
                    {showHeadings && (
                      <SectionHeading icon={<StarRoundedIcon sx={{ fontSize: 16, color: "warning.main" }} />} label="Favoritter" count={favorites.length} />
                    )}
                    {renderCards(favorites)}
                  </section>
                )}
                {others.length > 0 && (
                  <section aria-label="Notater">
                    {showHeadings && <SectionHeading label="Andre notater" count={others.length} />}
                    {renderCards(others)}
                  </section>
                )}
                {!isFiltering && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: { xs: "none", md: "block" } }}>
                    {oneClickCopy
                      ? "Klikk et notat for å kopiere det · Rediger-knappen åpner editoren · dra for å endre rekkefølge"
                      : "Dra et notat for å endre rekkefølge · piltaster for å navigere · Ctrl + C kopierer valgt notat"}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {selectedNote && (
            <NoteDetailPanel
              note={selectedNote}
              saving={saving}
              canMoveToFront={notes[0]?.id !== selectedNote.id}
              tagSuggestions={allTags}
              onClose={() => setSelectedId(null)}
              onSave={updateNote}
              onCopy={(id, withTitle) => void copyNote(id, withTitle)}
              onMoveToFront={(id) => void moveNoteToFront(id)}
              onDelete={(id) => void handleDelete(id)}
            />
          )}
        </Box>
      </Paper>

      <Snackbar
        key={toast?.key}
        open={toastOpen}
        autoHideDuration={toast?.onAction ? 6000 : 2200}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setToastOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast?.severity ?? "success"}
          variant="filled"
          icon={toast?.severity === "success" ? <CheckCircleRoundedIcon fontSize="inherit" /> : undefined}
          action={
            toast?.onAction ? (
              <Button
                color="inherit"
                size="small"
                sx={{ fontWeight: 700 }}
                onClick={() => {
                  toast.onAction?.();
                  setToastOpen(false);
                }}
              >
                {toast.actionLabel}
              </Button>
            ) : undefined
          }
          sx={{
            borderRadius: 999,
            alignItems: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            // Info-varsler (f.eks. «slettet») bruker sidens lilla i stedet for MUIs blå.
            ...(toast?.severity === "info" && { bgcolor: "primary.main", color: "primary.contrastText" }),
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
