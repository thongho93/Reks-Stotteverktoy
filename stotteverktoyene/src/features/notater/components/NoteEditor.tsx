import * as React from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  IconButton,
  InputBase,
  Popover,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { buildPasteHtml, escapeHtml, NOTE_ALLOWED_STYLE_PROPS } from "../../../shared/lib/richText";
import type { NoteChecklistItem, NoteDraft } from "../types";
import {
  createId,
  normalizeTag,
  normalizeLinkUrl,
  sortChecklistItems,
  stripHtml,
} from "../utils/noteUtils";
import { ColorPicker } from "./ColorPicker";
import { AutoDeleteField } from "./AutoDeleteField";
import { ReminderField } from "./ReminderField";

type NoteEditorProps = {
  draft: NoteDraft;
  onChange: (patch: Partial<NoteDraft>) => void;
  /** Endres når et annet notat lastes, slik at tekstfeltet får nytt innhold. */
  resetKey: string;
  autoFocus?: "title" | "content";
  minContentHeight?: number;
  onSubmit?: () => void;
  tagSuggestions: string[];
  /** Valgfri handling på slutten av tittellinjen (f.eks. lukk-knapp i popup). */
  titleTrailing?: React.ReactNode;
};

/** Lenken markøren/utvalget står i (kun innenfor editoren). */
function getSelectionLink(editor: HTMLElement): HTMLAnchorElement | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!element || !editor.contains(element)) return null;
  const anchor = element.closest("a");
  return anchor && editor.contains(anchor) ? (anchor as HTMLAnchorElement) : null;
}

const FORMAT_BUTTON_SX = {
  width: 30,
  height: 30,
  borderRadius: 1.5,
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
} as const;

export function NoteEditor({
  draft,
  onChange,
  resetKey,
  autoFocus,
  minContentHeight = 180,
  onSubmit,
  tagSuggestions,
  titleTrailing,
}: NoteEditorProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [format, setFormat] = React.useState({ bold: false, italic: false, underline: false, link: false });
  const [linkAnchor, setLinkAnchor] = React.useState<HTMLElement | null>(null);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState(false);
  const linkRangeRef = React.useRef<Range | null>(null);
  const linkTargetRef = React.useRef<HTMLAnchorElement | null>(null);
  const [focusItemId, setFocusItemId] = React.useState<string | null>(null);
  const itemRefs = React.useRef(new Map<string, HTMLInputElement>());

  // contentEditable er ukontrollert: sett innhold kun ved nytt notat / bytte av modus.
  React.useLayoutEffect(() => {
    if (draft.mode === "text" && contentRef.current) {
      contentRef.current.innerHTML = draft.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, draft.mode]);

  React.useEffect(() => {
    if (autoFocus !== "content" || draft.mode !== "text") return;
    contentRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, autoFocus]);

  React.useEffect(() => {
    if (!focusItemId) return;
    itemRefs.current.get(focusItemId)?.focus();
    setFocusItemId(null);
  }, [focusItemId, draft.checklistItems]);

  const updateFormatState = React.useCallback(() => {
    const el = contentRef.current;
    if (!el || document.activeElement !== el) return;
    setFormat({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      link: Boolean(getSelectionLink(el)),
    });
  }, []);

  React.useEffect(() => {
    document.addEventListener("selectionchange", updateFormatState);
    return () => document.removeEventListener("selectionchange", updateFormatState);
  }, [updateFormatState]);

  const syncContent = () => {
    const el = contentRef.current;
    if (!el) return;
    // Rydd opp i resten av en tømt editor, så plassholderen vises igjen.
    if (el.innerHTML === "<br>" || el.innerHTML === "<div><br></div>") el.innerHTML = "";
    onChange({ content: el.innerHTML });
  };

  const run = (command: string, value?: string) => {
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, value);
    syncContent();
    updateFormatState();
  };

  // --- lenker ---
  const openLinkPopover = (button: HTMLElement) => {
    const el = contentRef.current;
    if (!el) return;
    const selection = window.getSelection();
    linkRangeRef.current =
      selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
    const existing = getSelectionLink(el);
    linkTargetRef.current = existing;
    setLinkUrl(existing?.getAttribute("href") ?? "");
    setLinkError(false);
    setLinkAnchor(button);
  };

  const closeLinkPopover = () => setLinkAnchor(null);

  const restoreLinkSelection = () => {
    const el = contentRef.current;
    if (!el) return null;
    el.focus();
    const range = linkRangeRef.current;
    const selection = window.getSelection();
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return selection;
  };

  const applyLink = () => {
    const url = normalizeLinkUrl(linkUrl);
    if (!url) {
      setLinkError(true);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const target = linkTargetRef.current;
    closeLinkPopover();
    const selection = restoreLinkSelection();
    if (target && el.contains(target)) {
      target.setAttribute("href", url);
    } else if (selection && selection.isCollapsed) {
      document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("createLink", false, url);
    }
    syncContent();
    updateFormatState();
  };

  const removeLink = () => {
    const el = contentRef.current;
    const target = linkTargetRef.current;
    closeLinkPopover();
    if (el && target && el.contains(target)) {
      restoreLinkSelection();
      target.replaceWith(...Array.from(target.childNodes));
      syncContent();
      updateFormatState();
    }
  };

  const toggleMode = (_: unknown, next: "text" | "checklist" | null) => {
    if (!next || next === draft.mode) return;
    if (next === "checklist") {
      const plain = (contentRef.current?.innerText ?? stripHtml(draft.content)).trim();
      const fromText: NoteChecklistItem[] = plain
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
          id: createId(),
          text: line.replace(/^\[(x|X| )\]\s*/, "").replace(/^[-•*]\s+/, ""),
          done: /^\[(x|X)\]\s*/.test(line),
        }));
      const items =
        draft.checklistItems.length > 0
          ? draft.checklistItems
          : fromText.length > 0
            ? sortChecklistItems(fromText)
            : [{ id: createId(), text: "", done: false }];
      onChange({ mode: "checklist", checklistItems: items });
      return;
    }
    const asText = sortChecklistItems(draft.checklistItems)
      .filter((i) => i.text.trim())
      .map((i) => (i.done ? `[x] ${i.text}` : i.text))
      .join("\n");
    const html = asText
      .split("\n")
      .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .join("<br>");
    onChange({ mode: "text", content: draft.content.trim() ? draft.content : html });
  };

  // --- sjekkliste ---
  const setItems = (items: NoteChecklistItem[]) => onChange({ checklistItems: items });
  const items = draft.checklistItems;

  const addItemAfter = (afterId?: string) => {
    const created: NoteChecklistItem = { id: createId(), text: "", done: false };
    const index = afterId ? items.findIndex((i) => i.id === afterId) : -1;
    const next = [...items];
    if (index >= 0) next.splice(index + 1, 0, created);
    else {
      const firstDone = next.findIndex((i) => i.done);
      next.splice(firstDone < 0 ? next.length : firstDone, 0, created);
    }
    setItems(next);
    setFocusItemId(created.id);
  };

  const active = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
      {/* Tittel + favoritt */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Tooltip title={draft.isFavorite ? "Fjern fra favoritter" : "Legg til i favoritter"}>
          <IconButton
            size="small"
            onClick={() => onChange({ isFavorite: !draft.isFavorite })}
            aria-pressed={draft.isFavorite}
            aria-label="Favoritt"
            sx={{ color: draft.isFavorite ? "warning.main" : "text.disabled", flexShrink: 0, ml: -0.75 }}
          >
            {draft.isFavorite ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
          </IconButton>
        </Tooltip>
        <InputBase
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.mode === "text") contentRef.current?.focus();
              else if (items[0]) itemRefs.current.get(items[0].id)?.focus();
            }
          }}
          placeholder="Tittel"
          autoFocus={autoFocus === "title"}
          fullWidth
          inputProps={{ "aria-label": "Tittel", "data-note-editor-title": "" }}
          sx={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3, color: "text.primary" }}
        />
        {titleTrailing}
      </Box>

      {/* Verktøylinje */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          flexWrap: "wrap",
          pb: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={draft.mode}
          onChange={toggleMode}
          aria-label="Notattype"
          sx={{
            mr: 0.75,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              gap: 0.5,
              px: 1.25,
              py: 0.25,
              fontSize: "0.8125rem",
              borderRadius: 1.5,
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
            },
          }}
        >
          <ToggleButton value="text">
            <NotesRoundedIcon sx={{ fontSize: 16 }} /> Tekst
          </ToggleButton>
          <ToggleButton value="checklist">
            <ChecklistRoundedIcon sx={{ fontSize: 16 }} /> Sjekkliste
          </ToggleButton>
        </ToggleButtonGroup>

        {draft.mode === "text" && (
          <>
            {[
              { cmd: "bold", icon: <FormatBoldIcon sx={{ fontSize: 18 }} />, label: "Fet (Ctrl+B)", active: format.bold },
              { cmd: "italic", icon: <FormatItalicIcon sx={{ fontSize: 18 }} />, label: "Kursiv (Ctrl+I)", active: format.italic },
              { cmd: "underline", icon: <FormatUnderlinedIcon sx={{ fontSize: 18 }} />, label: "Understreket (Ctrl+U)", active: format.underline },
            ].map(({ cmd, icon, label, active: isActive }) => (
              <Tooltip key={cmd} title={label}>
                <IconButton
                  size="small"
                  aria-label={label}
                  aria-pressed={isActive}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(cmd)}
                  sx={{
                    ...FORMAT_BUTTON_SX,
                    color: isActive ? "primary.main" : "text.secondary",
                    bgcolor: isActive ? "action.selected" : "transparent",
                  }}
                >
                  {icon}
                </IconButton>
              </Tooltip>
            ))}
            <Box sx={{ width: "1px", height: 18, bgcolor: "divider", mx: 0.5 }} />
            <Tooltip title="Punktliste">
              <IconButton size="small" aria-label="Punktliste" onMouseDown={(e) => e.preventDefault()} onClick={() => run("insertUnorderedList")} sx={{ ...FORMAT_BUTTON_SX, color: "text.secondary" }}>
                <FormatListBulletedRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Nummerert liste">
              <IconButton size="small" aria-label="Nummerert liste" onMouseDown={(e) => e.preventDefault()} onClick={() => run("insertOrderedList")} sx={{ ...FORMAT_BUTTON_SX, color: "text.secondary" }}>
                <FormatListNumberedRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={format.link ? "Rediger lenke" : "Legg til lenke"}>
              <IconButton
                size="small"
                aria-label={format.link ? "Rediger lenke" : "Legg til lenke"}
                aria-pressed={format.link}
                aria-haspopup="dialog"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => openLinkPopover(e.currentTarget)}
                sx={{
                  ...FORMAT_BUTTON_SX,
                  color: format.link ? "primary.main" : "text.secondary",
                  bgcolor: format.link ? "action.selected" : "transparent",
                }}
              >
                <LinkRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Innhold */}
      {draft.mode === "text" ? (
        <Box
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Notatinnhold"
          data-note-editor-content=""
          data-placeholder="Skriv notatet her…"
          onInput={syncContent}
          onPaste={(e: React.ClipboardEvent) => {
            e.preventDefault();
            const html = buildPasteHtml(e.clipboardData, NOTE_ALLOWED_STYLE_PROPS);
            if (html) document.execCommand("insertHTML", false, html);
            syncContent();
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          onClick={(e: React.MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest("a");
            if (anchor && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              window.open(anchor.getAttribute("href") ?? "", "_blank", "noopener,noreferrer");
            }
          }}
          sx={{
            minHeight: minContentHeight,
            outline: "none",
            fontSize: "0.95rem",
            lineHeight: 1.65,
            color: "text.primary",
            wordBreak: "break-word",
            "& p, & div": { m: 0 },
            "& ul, & ol": { pl: 2.75, my: 0.5 },
            "& a": { color: "primary.main", textDecoration: "underline", cursor: "pointer" },
            "&:empty::before": { content: "attr(data-placeholder)", color: "text.disabled", pointerEvents: "none" },
          }}
        />
      ) : (
        <Box sx={{ minHeight: minContentHeight }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {active.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                registerRef={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                onToggle={(checked) => setItems(sortChecklistItems(items.map((i) => (i.id === item.id ? { ...i, done: checked } : i))))}
                onText={(text) => setItems(items.map((i) => (i.id === item.id ? { ...i, text } : i)))}
                onEnter={() => addItemAfter(item.id)}
                onRemove={() => {
                  const idx = active.findIndex((i) => i.id === item.id);
                  setItems(items.filter((i) => i.id !== item.id));
                  const prev = active[idx - 1];
                  if (prev) setFocusItemId(prev.id);
                }}
                onSubmit={onSubmit}
              />
            ))}
          </Box>
          <Chip
            icon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
            label="Legg til punkt"
            size="small"
            variant="outlined"
            onClick={() => addItemAfter(active[active.length - 1]?.id)}
            sx={{ mt: 1, borderStyle: "dashed" }}
          />
          {done.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Fullført ({done.length})
              </Typography>
              {done.map((item) => (
                <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Checkbox
                    checked
                    size="small"
                    onChange={(e) => setItems(sortChecklistItems(items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i))))}
                    inputProps={{ "aria-label": `Fullført: ${item.text}` }}
                    sx={{ p: 0.5 }}
                  />
                  <Typography variant="body2" sx={{ textDecoration: "line-through", color: "text.secondary", wordBreak: "break-word" }}>
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tags + farge */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          {draft.tags.map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              onDelete={() => onChange({ tags: draft.tags.filter((t) => t !== tag) })}
              sx={{ bgcolor: "action.selected", color: "primary.main", fontWeight: 600 }}
            />
          ))}
          <TagAdder
            suggestions={tagSuggestions.filter((t) => !draft.tags.includes(t))}
            onAdd={(raw) => {
              const tag = normalizeTag(raw);
              if (tag && !draft.tags.includes(tag)) onChange({ tags: [...draft.tags, tag] });
            }}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", columnGap: 3, rowGap: 1.25, flexWrap: "wrap" }}>
          <ReminderField value={draft.reminderAtMs} onChange={(reminderAtMs) => onChange({ reminderAtMs })} />
          <AutoDeleteField value={draft.deleteOn} onChange={(deleteOn) => onChange({ deleteOn })} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Farge
          </Typography>
          <ColorPicker value={draft.color} onChange={(color) => onChange({ color })} />
        </Box>
      </Box>

      <Popover
        open={Boolean(linkAnchor)}
        anchorEl={linkAnchor}
        onClose={closeLinkPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Lenke", sx: { p: 2, width: 340, borderRadius: 2 } } as object }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.75 }}>
          {linkTargetRef.current ? "Rediger lenke" : "Legg til lenke"}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="https://…"
          value={linkUrl}
          error={linkError}
          helperText={linkError ? "Skriv inn en gyldig adresse" : undefined}
          onChange={(e) => {
            setLinkUrl(e.target.value);
            setLinkError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
          slotProps={{ htmlInput: { "aria-label": "Lenkeadresse" } }}
        />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
          {linkTargetRef.current ? (
            <Button size="small" color="error" onClick={removeLink} sx={{ textTransform: "none" }}>
              Fjern lenke
            </Button>
          ) : (
            <span />
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" color="inherit" onClick={closeLinkPopover} sx={{ textTransform: "none", color: "text.secondary" }}>
              Avbryt
            </Button>
            <Button size="small" variant="contained" disableElevation onClick={applyLink} sx={{ textTransform: "none", fontWeight: 600 }}>
              {linkTargetRef.current ? "Lagre" : "Legg til"}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}

function ChecklistRow({
  item,
  registerRef,
  onToggle,
  onText,
  onEnter,
  onRemove,
  onSubmit,
}: {
  item: NoteChecklistItem;
  registerRef: (el: HTMLInputElement | null) => void;
  onToggle: (checked: boolean) => void;
  onText: (text: string) => void;
  onEnter: () => void;
  onRemove: () => void;
  onSubmit?: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, "&:hover .remove": { opacity: 1 } }}>
      <Checkbox
        checked={item.done}
        size="small"
        onChange={(e) => onToggle(e.target.checked)}
        inputProps={{ "aria-label": "Merk som fullført" }}
        sx={{ p: 0.5 }}
      />
      <InputBase
        value={item.text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if ((e.metaKey || e.ctrlKey) && onSubmit) onSubmit();
            else if (item.text.trim()) onEnter();
          } else if (e.key === "Backspace" && item.text === "") {
            e.preventDefault();
            onRemove();
          }
        }}
        placeholder="Punkt"
        fullWidth
        inputRef={registerRef}
        sx={{ fontSize: "0.95rem" }}
      />
      <IconButton
        className="remove"
        size="small"
        onClick={onRemove}
        aria-label="Fjern punkt"
        sx={{ opacity: { xs: 1, md: 0 }, "&:focus-visible": { opacity: 1 }, transition: "opacity 120ms" }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

function TagAdder({ suggestions, onAdd }: { suggestions: string[]; onAdd: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const typed = React.useRef("");

  if (!open) {
    return (
      <Chip
        icon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
        label="Tagg"
        size="small"
        variant="outlined"
        onClick={() => setOpen(true)}
        sx={{ borderStyle: "dashed" }}
      />
    );
  }

  const close = () => {
    typed.current = "";
    setOpen(false);
  };

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      openOnFocus
      size="small"
      options={suggestions}
      onInputChange={(_, value) => {
        typed.current = value;
      }}
      onChange={(_, value) => {
        if (typeof value === "string" && value.trim()) onAdd(value);
        close();
      }}
      onBlur={() => {
        if (typed.current.trim()) onAdd(typed.current);
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          typed.current = "";
          close();
        }
      }}
      sx={{ width: 150 }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus
          placeholder="Ny tagg"
          variant="outlined"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 999, py: 0, fontSize: "0.8125rem" } }}
        />
      )}
    />
  );
}
