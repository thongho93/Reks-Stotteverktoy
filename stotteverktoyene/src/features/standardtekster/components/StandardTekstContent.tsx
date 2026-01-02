import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  Stack,
  Autocomplete,
  Popper,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";
import { logUsage } from "../../../shared/services/usage";
import { STANDARDTEKST_TOKEN_DEFS } from "../utils/preparat";

type Props = {
  selected: StandardTekst | null;
  loading: boolean;
  isAdmin: boolean;

  isEditing: boolean;
  draftTitle: string;
  draftCategory: string;
  draftContent: string;
  saving: boolean;

  onDraftTitleChange: (value: string) => void;
  onDraftCategoryChange: (value: string) => void;
  onDraftContentChange: (value: string) => void;

  onCancel: () => void;
  onSave: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  deleting: boolean;

  onCopy: () => void;

  editorTools?: ReactNode;
  belowContent?: ReactNode;
  headerRight?: ReactNode;

  previewNode: ReactNode;
  categoryOptions?: string[];
};

export default function StandardTekstContent({
  selected,
  loading,
  isAdmin,
  isEditing,
  draftTitle,
  draftCategory,
  draftContent,
  saving,
  onDraftTitleChange,
  onDraftCategoryChange,
  onDraftContentChange,
  onCancel,
  onSave,
  onStartEdit,
  onDelete,
  deleting,
  onCopy,
  editorTools,
  belowContent,
  headerRight,
  previewNode,
  categoryOptions = [],
}: Props) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const contentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const didInitNewStandardtekstContentRef = useRef(false);

  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [tokenPickerAnchor, setTokenPickerAnchor] = useState<HTMLElement | null>(null);
  const [tokenQuery, setTokenQuery] = useState("");
  const [tokenCursor, setTokenCursor] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [tokenActiveIndex, setTokenActiveIndex] = useState(0);

  const TOKEN_OPTIONS = useMemo(() => STANDARDTEKST_TOKEN_DEFS, []);

  const DEFAULT_NEW_STANDARDTEKST_CONTENT =
    "Hei, og takk for at du har valgt Farmasiet til å levere dine reseptvarer.\n\n" +
    "\n" +
    "Vennlig hilsen\n" +
    "XX, farmasøyt\n" +
    "Farmasiet";
  const DEFAULT_NEW_STANDARDTEKST_CURSOR_POS = Math.max(
    0,
    DEFAULT_NEW_STANDARDTEKST_CONTENT.indexOf("\n\n") + 2
  );

  useEffect(() => {
    // Reset the one-time flag when we leave editing or change selection away from "Ny standardtekst"
    if (!isEditing || !selected || selected.title !== "Ny standardtekst") {
      didInitNewStandardtekstContentRef.current = false;
    }
  }, [isEditing, selected]);

  useEffect(() => {
    if (!isEditing) return;
    if (!selected || selected.title !== "Ny standardtekst") return;
    if (didInitNewStandardtekstContentRef.current) return;
    if (draftContent.trim().length > 0) {
      // Don't overwrite existing content, but still consider this "initialized"
      didInitNewStandardtekstContentRef.current = true;
      return;
    }

    didInitNewStandardtekstContentRef.current = true;
    onDraftContentChange(DEFAULT_NEW_STANDARDTEKST_CONTENT);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = contentInputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(
          DEFAULT_NEW_STANDARDTEKST_CURSOR_POS,
          DEFAULT_NEW_STANDARDTEKST_CURSOR_POS
        );
      });
    });
  }, [isEditing, selected, draftContent, onDraftContentChange]);

  const filteredTokenOptions = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase();
    if (!q) return TOKEN_OPTIONS;
    return TOKEN_OPTIONS.filter(
      (t) => t.label.toLowerCase().includes(q) || (t.help ?? "").toLowerCase().includes(q)
    );
  }, [TOKEN_OPTIONS, tokenQuery]);

  useEffect(() => {
    if (!isEditing) return;

    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [isEditing]);

  const closeTokenPicker = () => {
    setTokenPickerOpen(false);
    setTokenQuery("");
    setTokenActiveIndex(0);
    // re-focus the textarea
    requestAnimationFrame(() => {
      contentInputRef.current?.focus();
    });
  };

  // Helper: Insert token at an explicit range (start, end), replacing selection
  const insertTokenAtRange = (tokenText: string, start: number, end: number) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const safeStart = Math.max(0, Math.min(start ?? 0, draftContent.length));
    const safeEnd = Math.max(safeStart, Math.min(end ?? safeStart, draftContent.length));

    const before = draftContent.slice(0, safeStart);
    const after = draftContent.slice(safeEnd);

    // Insert token with a leading space if needed, and trailing space for nicer flow.
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);

    const insert = `${needsLeadingSpace ? " " : ""}${tokenText}${needsTrailingSpace ? " " : ""}`;
    const next = `${before}${insert}${after}`;

    onDraftContentChange(next);

    // Restore caret right after inserted token
    const nextPos = safeStart + insert.length;
    requestAnimationFrame(() => {
      contentInputRef.current?.focus();
      contentInputRef.current?.setSelectionRange(nextPos, nextPos);
    });

    if (tokenPickerOpen) closeTokenPicker();
  };

  const insertTokenAtCursor = (tokenText: string) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const start = tokenCursor.start ?? textarea.selectionStart ?? 0;
    const end = tokenCursor.end ?? textarea.selectionEnd ?? start;

    insertTokenAtRange(tokenText, start, end);
  };

  // Helper for inserting token at current textarea selection (not using tokenCursor)
  const insertTokenFromTextareaSelection = (tokenText: string) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;

    // Update tokenCursor for consistency, but do NOT rely on it for the insert
    setTokenCursor({ start, end });

    insertTokenAtRange(tokenText, start, end);
  };

  const openTokenPickerFromEvent = (anchor: HTMLElement) => {
    const textarea = contentInputRef.current;
    setTokenPickerAnchor(anchor);
    setTokenPickerOpen(true);
    setTokenQuery("");
    setTokenActiveIndex(0);

    setTokenCursor({
      start: textarea?.selectionStart ?? 0,
      end: textarea?.selectionEnd ?? 0,
    });

    // Let popper render, then focus its search input (we'll identify it via id)
    requestAnimationFrame(() => {
      const el = document.getElementById("token-picker-input") as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
  };

  useEffect(() => {
    if (!tokenPickerOpen) return;

    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      const popperEl = document
        .getElementById("token-picker-input")
        ?.closest("[data-popper-placement]");
      if (popperEl && target && popperEl.contains(target)) return;
      closeTokenPicker();
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [tokenPickerOpen]);

  const handleCopy = () => {
    // Log copy without storing sensitive text
    logUsage("standardtekst_copy");
    onCopy();
  };

  const lockBeforeEdit = Boolean(selected && !isEditing && selected.title === "Ny standardtekst");

  const isEmptyNewDraft = Boolean(
    selected &&
      selected.title === "Ny standardtekst" &&
      (draftTitle.trim() === "Ny standardtekst" ||
        draftCategory.trim() === "" ||
        draftContent.trim() === "")
  );

  return (
    <Paper
      sx={{ position: "relative" }}
      onClick={selected && !isEditing && !lockBeforeEdit ? handleCopy : undefined}
      className={
        selected && !isEditing
          ? `${styles.contentPaper} ${styles.contentPaperCopy}`
          : styles.contentPaper
      }
    >
      {!selected && !loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 360,
            px: 2,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, fontSize: 25, mt: 2 }}
          >
            Søk eller velg en standardtekst fra listen
          </Typography>
          <Box
            component="img"
            src="/img/checkthisout.gif"
            alt="Velg standardtekst"
            sx={{
              width: 450,
              maxWidth: "80%",
              mt: 2,
              opacity: 0.95,
            }}
          />
        </Box>
      )}

      {selected && (
        <>
          {lockBeforeEdit ? (
            <Box
              className={styles.contentLockOverlay}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          ) : null}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography variant="h2" className={styles.title} sx={{ mb: 1 }}>
              {selected.title}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {!isEditing && !lockBeforeEdit && (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleCopy}
                  sx={{ minWidth: "auto", p: 0.5 }}
                  aria-label="Kopier standardtekst"
                >
                  <ContentCopyIcon fontSize="small" />
                </Button>
              )}

              {headerRight ? headerRight : null}
            </Box>
          </Box>

          {isAdmin && isEditing && (
            <Typography variant="body2" color="text.secondary" className={styles.category}>
              {selected.category}
            </Typography>
          )}

          {selected.updatedAt && (
            <Typography variant="caption" color="text.secondary" className={styles.updatedAt}>
              Sist oppdatert: {selected.updatedAt.toLocaleString("nb-NO")}
            </Typography>
          )}

          {isEditing ? (
            <>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Overskrift"
                    value={selected && selected.title === "Ny standardtekst" ? "" : draftTitle}
                    placeholder="F.eks. Hyppig uttak…"
                    onChange={(e) => onDraftTitleChange(e.target.value)}
                    inputRef={titleInputRef}
                    className={styles.editorTitleField}
                    sx={{ flex: 1, mt: 1 }}
                  />

                  {editorTools ? (
                    <Box sx={{ pb: 0.25, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {editorTools}
                    </Box>
                  ) : null}
                </Box>

                {isAdmin ? (
                  <Autocomplete
                    freeSolo
                    options={categoryOptions}
                    value={draftCategory}
                    onInputChange={(_, value) => onDraftCategoryChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        label="Kategori"
                        placeholder="F.eks. Vedtak, Restvare, Interaksjon"
                      />
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : null}

                <TextField
                  fullWidth
                  multiline
                  minRows={10}
                  label="Tekst"
                  helperText="Tips: Ctrl+Space for søk av innsettingsfelt – eller bruk hurtigvalgene under."
                  value={draftContent}
                  inputRef={contentInputRef}
                  onChange={(e) => onDraftContentChange(e.target.value)}
                  onKeyDown={(e) => {
                    const isCmd = e.metaKey;
                    const isCtrl = e.ctrlKey;

                    const isSpace = e.code === "Space" || e.key === " ";
                    const isK = (e.key || "").toLowerCase() === "k";

                    // Primary shortcuts:
                    // - Ctrl+Space (works in browsers on all platforms)
                    // - Cmd/Ctrl + K (works on Mac where Cmd+Space is typically reserved for Spotlight)
                    const openToken = (isCtrl && isSpace) || ((isCmd || isCtrl) && isK);

                    if (openToken) {
                      e.preventDefault();
                      e.stopPropagation();
                      openTokenPickerFromEvent(e.currentTarget as HTMLElement);
                      return;
                    }

                    if (tokenPickerOpen) {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        closeTokenPicker();
                        return;
                      }
                    }
                  }}
                />

                <Box sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="caption" color="text.secondary">
                      Innsettingsfelt:
                    </Typography>

                    {TOKEN_OPTIONS.filter((t) => t.group === "PREPARAT").map((t) => (
                      <Chip
                        key={t.label}
                        size="small"
                        variant="outlined"
                        label={`${t.label} – ${t.help ?? ""}`.trim()}
                        clickable
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertTokenFromTextareaSelection(t.insert)}
                      />
                    ))}

                    {TOKEN_OPTIONS.some((t) => t.group === "TALL" || t.group === "VARE") ? (
                      <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
                    ) : null}

                    {TOKEN_OPTIONS.filter((t) => t.group === "TALL").map((t) => (
                      <Chip
                        key={t.label}
                        size="small"
                        variant="outlined"
                        label={`${t.label} – ${t.help ?? ""}`.trim()}
                        clickable
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertTokenFromTextareaSelection(t.insert)}
                      />
                    ))}

                    {TOKEN_OPTIONS.some((t) => t.group === "TALL") &&
                    TOKEN_OPTIONS.some((t) => t.group === "VARE") ? (
                      <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
                    ) : null}

                    {TOKEN_OPTIONS.filter((t) => t.group === "VARE").map((t) => (
                      <Chip
                        key={t.label}
                        size="small"
                        variant="outlined"
                        label={`${t.label}`.trim()}
                        clickable
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertTokenFromTextareaSelection(t.insert)}
                      />
                    ))}
                  </Stack>
                </Box>

                <Popper
                  open={tokenPickerOpen}
                  anchorEl={tokenPickerAnchor}
                  placement="bottom-start"
                  disablePortal
                  sx={{ zIndex: 2000, width: 360, maxWidth: "90vw" }}
                >
                  <Paper
                    elevation={8}
                    sx={{ p: 1 }}
                    onMouseDown={(e) => {
                      // Prevent textarea from losing selection/caret on click inside popper
                      e.preventDefault();
                    }}
                  >
                    <TextField
                      id="token-picker-input"
                      size="small"
                      fullWidth
                      autoComplete="off"
                      placeholder="Søk etter innsettingsfelt..."
                      value={tokenQuery}
                      onChange={(e) => {
                        setTokenQuery(e.target.value);
                        setTokenActiveIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          closeTokenPicker();
                          return;
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setTokenActiveIndex((i) =>
                            Math.min(i + 1, Math.max(filteredTokenOptions.length - 1, 0))
                          );
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setTokenActiveIndex((i) => Math.max(i - 1, 0));
                          return;
                        }
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const choice = filteredTokenOptions[tokenActiveIndex];
                          if (choice) insertTokenAtCursor(choice.insert);
                          return;
                        }
                      }}
                    />

                    <List dense sx={{ maxHeight: 220, overflow: "auto", mt: 0.5 }}>
                      {filteredTokenOptions.length === 0 ? (
                        <ListItemText
                          primary="Ingen treff"
                          secondary="Prøv et annet søk"
                          sx={{ px: 1, py: 1 }}
                        />
                      ) : (
                        filteredTokenOptions.map((t, idx) => (
                          <ListItemButton
                            key={t.label}
                            selected={idx === tokenActiveIndex}
                            onClick={() => insertTokenAtCursor(t.insert)}
                            onMouseEnter={() => setTokenActiveIndex(idx)}
                          >
                            <ListItemText primary={t.label} secondary={t.help} />
                          </ListItemButton>
                        ))
                      )}
                    </List>
                  </Paper>
                </Popper>

                {belowContent}
              </Stack>

              <Box display="flex" gap={1} className={styles.editorActions}>
                <Button
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Hvis dette er en helt ny standardtekst uten innhold, spør om å slette den
                    if (isAdmin && isEmptyNewDraft) {
                      onDelete();
                      return;
                    }
                    onCancel();
                  }}
                  disabled={saving}
                >
                  Avbryt
                </Button>
                <Button
                  variant="contained"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  disabled={saving}
                >
                  {saving ? "Lagrer..." : "Lagre"}
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body1" component="div" className={styles.body}>
                {previewNode}
              </Typography>
              {belowContent}

              {isAdmin && (
                <Box
                  className={styles.editRowBottom}
                  display="flex"
                  gap={1}
                  sx={{ position: "relative", zIndex: 2 }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    sx={{ color: "#fff" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}
                    className={styles.pillButton}
                  >
                    Rediger
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className={styles.pillButton}
                    disabled={saving || deleting}
                  >
                    Slett
                  </Button>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Paper>
  );
}
