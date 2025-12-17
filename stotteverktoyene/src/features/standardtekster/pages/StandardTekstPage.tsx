import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Button,
  Stack,
  Snackbar,
  IconButton,
} from "@mui/material";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/Auth";
import MedicationSearch from "../../fest/components/MedicationSearch";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

type StandardTekst = {
  id: string;
  title: string;
  category?: string;
  content: string;
  updatedAt?: Date | null;
};

function toDateMaybe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  // Firestore can also store millis or ISO strings depending on your implementation
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function pickFirstNonEmptyString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function mapDocToStandardTekst(id: string, data: Record<string, unknown>): StandardTekst {
  // Du kan endre feltnavnene her hvis databasen din bruker andre navn
  const title =
    pickFirstNonEmptyString(data["title"], data["Title"], data["tittel"]) ?? "Uten tittel";

  const category = pickFirstNonEmptyString(data["category"], data["kategori"]) ?? "";

  const content =
    pickFirstNonEmptyString(data["content"], data["Body"], data["tekst"], data["body"]) ?? "";

  const updatedAt = toDateMaybe(data["updatedAt"] ?? data["updated_at"] ?? data["sistOppdatert"]);

  return {
    id,
    title,
    category: category || undefined,
    content,
    updatedAt,
  };
}

function formatPreparatForTemplate(med: {
  varenavn: string | null;
  navnFormStyrke: string | null;
}): string {
  const nfsRaw = (med.navnFormStyrke ?? "").trim();
  const nfs = nfsRaw.replace(/\s+/g, " ").trim();

  // Try to extract the first strength-like fragment.
  // Supports: "0,1 mg/dose", "40 mg", "50 mikrog/500 mikrog", "1,25 mg/2,5 ml"
  // We stop at comma+space (", ") which is used as field separators in many FEST strings.
  const unit = "mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\\.e\\.|mmol|ml";
  const m = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*(?:${unit})(?:\\s*\\/\\s*[^;\\)\\n]+?)?)(?=,\\s|$)`, "i")
  );

  const strength = m?.[1]
    ? m[1]
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  // Prefer name extracted from navnFormStyrke (this typically avoids manufacturer tokens like “Viatris/xiromed”).
  // 1) remove trailing metadata after comma (often pack info)
  const head = nfs.replace(/,.*$/, "").trim();

  // 2) take everything before a common dosage-form keyword
  const formWords = [
    "tab",
    "tablett",
    "kaps",
    "kapsel",
    "inj",
    "mikst",
    "mikstur",
    "inh",
    "aerosol",
    "pulv",
    "plaster",
    "spray",
    "oppl",
    "susp",
    "granulat",
    "krem",
    "salve",
    "gel",
    "liniment",
    "drasj",
    "supp",
    "stikkpille",
    "mikrog",
    "mikrogram",
  ].join("|");

  const beforeForm = head.split(new RegExp(`\\b(?:${formWords})\\b`, "i"))[0]?.trim() ?? "";
  const nameFromNfs = beforeForm.replace(/\s+/g, " ").trim();

  const fallbackName = (med.varenavn ?? "").trim();
  const name = nameFromNfs || fallbackName;

  if (name && strength) return `${name} ${strength}`.replace(/\s+/g, " ").trim();
  if (name) return name;
  return nfs || "";
}

function renderContentWithPreparatHighlight(text: string, pickedPreparat: string | null) {
  const tokenSx = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 0.75,
    px: 0.75,
    py: 0.15,
    lineHeight: 1.2,
    fontSize: "0.95em",
    whiteSpace: "nowrap",
  } as const;

  const placeholderSx = {
    ...tokenSx,
    bgcolor: "warning.light",
    color: "warning.contrastText",
    fontFamily: "monospace",
  } as const;

  const pickedSx = {
    ...tokenSx,
    bgcolor: "success.light",
    color: "success.contrastText",
    fontWeight: 600,
  } as const;

  // 1) If placeholder exists, highlight it clearly.
  const placeholder = "{{PREPARAT}}";
  if (text.includes(placeholder)) {
    const parts = text.split(placeholder);
    return (
      <>
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 ? (
              <Box component="span" sx={placeholderSx}>
                {placeholder}
              </Box>
            ) : null}
          </span>
        ))}
      </>
    );
  }

  // 2) If placeholder is already replaced, highlight the chosen preparat once so you can verify it.
  if (pickedPreparat) {
    const lower = text.toLowerCase();
    const needle = pickedPreparat.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const hit = text.slice(idx, idx + pickedPreparat.length);
      const after = text.slice(idx + pickedPreparat.length);
      return (
        <>
          {before}
          <Box component="span" sx={pickedSx}>
            {hit}
          </Box>
          {after}
        </>
      );
    }
  }

  return text;
}

export default function StandardTekstPage() {
  const [items, setItems] = useState<StandardTekst[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, firstName } = useAuthUser();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  type PreparatRow = { id: number; picked: string | null };
  const [preparatRows, setPreparatRows] = useState<PreparatRow[]>([{ id: 0, picked: null }]);
  const [copied, setCopied] = useState(false);

  const addPreparatRow = () => {
    setPreparatRows((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      return [...prev, { id: nextId, picked: null }];
    });
  };

  const removePreparatRow = (id: number) => {
    setPreparatRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      // Always keep at least one field
      return next.length ? next : [{ id: 0, picked: null }];
    });
  };

  const setPickedForRow = (id: number, picked: string | null) => {
    setPreparatRows((prev) => prev.map((r) => (r.id === id ? { ...r, picked } : r)));
  };

  const replaceNextPreparatToken = (text: string, value: string) => {
    // Replace ONLY the next (first) placeholder occurrence
    return text.replace(/\{\{\s*PREPARAT\s*\}\}/, value);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(collection(db, "Standardtekster"));

        const snap = await getDocs(q);
        const mapped = snap.docs
          .map((d) => mapDocToStandardTekst(d.id, d.data()))
          .sort((a, b) => a.title.localeCompare(b.title, "nb"));

        if (!isMounted) return;

        setItems(mapped);
        // Autovelg første hvis listen ikke er tom
        setSelectedId((prev) => prev ?? mapped[0]?.id ?? null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ukjent feil ved henting fra Firebase";
        if (!isMounted) return;
        setError(message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) => {
      const haystack = `${it.title} ${it.category ?? ""} ${it.content}`.toLowerCase();
      return haystack.includes(s);
    });
  }, [items, search]);

  const selected = useMemo(() => {
    return items.find((it) => it.id === selectedId) ?? null;
  }, [items, selectedId]);

  const displayContent = useMemo(() => {
    if (!selected) return "";

    let text = selected.content;

    // Replace standalone XX with the user's first name
    if (firstName) {
      text = text.replace(/\bXX\b/g, firstName);
    }

    // Replace {{PREPARAT}} placeholders in order, one per picked preparat
    for (const row of preparatRows) {
      if (row.picked) {
        text = replaceNextPreparatToken(text, row.picked);
      }
    }

    return text;
  }, [selected, firstName, preparatRows]);

  useEffect(() => {
    // Når du bytter valgt tekst, avslutt redigering og synk draft
    setIsEditing(false);
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setPreparatRows([{ id: 0, picked: null }]);
  }, [selectedId]);

  const startEdit = () => {
    if (!selected) return;
    setDraftTitle(selected.title ?? "");
    setDraftContent(selected.content ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, "Standardtekster", selected.id);
      await updateDoc(ref, {
        title: draftTitle,
        content: draftContent,
        updatedAt: serverTimestamp(),
      });

      // Oppdater lokalt state så UI viser ny tekst uten refresh
      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id
            ? { ...it, title: draftTitle, content: draftContent, updatedAt: new Date() }
            : it
        )
      );
      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved lagring";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const createNewStandardTekst = async () => {
    if (!isAdmin) return;

    setCreating(true);
    setError(null);

    try {
      const colRef = collection(db, "Standardtekster");

      const now = serverTimestamp();
      const newDoc = {
        title: "Ny standardtekst",
        category: "",
        content: "",
        updatedAt: now,
        createdAt: now,
      } as const;

      const docRef = await addDoc(colRef, newDoc);

      const localItem: StandardTekst = {
        id: docRef.id,
        title: "Ny standardtekst",
        category: undefined,
        content: "",
        updatedAt: new Date(),
      };

      // Add to local list and select it immediately
      setItems((prev) => {
        const next = [localItem, ...prev];
        return next.sort((a, b) => a.title.localeCompare(b.title, "nb"));
      });

      setSelectedId(docRef.id);

      // Start editing right away
      setDraftTitle(localItem.title);
      setDraftContent(localItem.content);
      setIsEditing(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved opprettelse";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const copyBodyToClipboard = async () => {
    if (!selected) return;
    if (isEditing) return;

    const text = (displayContent ?? "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return;
    } catch {
      // Fallback for eldre nettlesere / usikre kontekster
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
      } catch {
        // ignore
      }
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h4">Standardtekster</Typography>
          <Typography variant="body2" color="text.secondary">
            Data hentes fra Firebase (Firestore).
          </Typography>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            size="small"
            onClick={createNewStandardTekst}
            disabled={creating}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              px: 2,
              py: 0.75,
              whiteSpace: "nowrap",
              alignSelf: "center",
            }}
          >
            {creating ? "Oppretter..." : "Ny standardtekst"}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper sx={{ p: 1 }}>
          <Box sx={{ px: 1.5, pt: 1, pb: 1 }}>
            <Box sx={{ maxWidth: 340 }}>
              <TextField
                fullWidth
                size="small"
                label="Søk i standardtekster"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              {loading ? "Laster..." : `${filtered.length} treff`}
            </Typography>
          </Box>
          <Divider />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <List dense disablePadding>
              {filtered.map((it) => (
                <ListItemButton
                  key={it.id}
                  selected={it.id === selectedId}
                  onClick={() => setSelectedId(it.id)}
                >
                  <ListItemText
                    primary={it.title}
                    secondary={it.category ? it.category : undefined}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          {!loading && filtered.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ingen treff.
              </Typography>
            </Box>
          )}
        </Paper>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ maxWidth: 520 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {preparatRows.map((row) => (
                  <Box key={row.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <MedicationSearch
                        onPick={(med) => {
                          const text = formatPreparatForTemplate(med);
                          if (!text) return;

                          setPickedForRow(row.id, text);

                          // If admin is editing, also replace ONLY the next placeholder in draftContent.
                          if (isEditing) {
                            setDraftContent((prev) => replaceNextPreparatToken(prev, text));
                          }
                        }}
                      />
                    </Box>

                    <Box sx={{ pt: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <IconButton
                        aria-label="Legg til nytt preparat"
                        size="small"
                        onClick={addPreparatRow}
                        sx={{
                          borderRadius: 999,
                        }}
                      >
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>

                      {preparatRows.length > 1 && (
                        <IconButton
                          aria-label="Fjern dette preparatet"
                          size="small"
                          onClick={() => removePreparatRow(row.id)}
                          sx={{
                            borderRadius: 999,
                          }}
                        >
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>

          <Paper
            onClick={selected && !isEditing ? copyBodyToClipboard : undefined}
            sx={{
              p: 2,
              minHeight: 280,
              cursor: selected && !isEditing ? "copy" : "default",
            }}
          >
            {!selected && !loading && (
              <Typography variant="body2" color="text.secondary">
                Velg en standardtekst fra listen.
              </Typography>
            )}

            {selected && (
              <>
                {isAdmin && !isEditing && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit();
                      }}
                      sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        px: 2,
                        py: 0.5,
                        backgroundColor: "background.paper",
                      }}
                    >
                      Endre
                    </Button>
                  </Box>
                )}
                <Typography variant="h5" sx={{ mb: 0.5 }}>
                  {selected.title}
                </Typography>
                {selected.category && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {selected.category}
                  </Typography>
                )}

                {selected.updatedAt && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 2 }}
                  >
                    Sist oppdatert: {selected.updatedAt.toLocaleString("nb-NO")}
                  </Typography>
                )}

                {isEditing ? (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      label="Overskrift"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      sx={{ mb: 2, maxWidth: 520 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={10}
                      label="Tekst"
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
                      <Button
                        variant="text"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        disabled={saving}
                      >
                        Avbryt
                      </Button>
                      <Button
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit();
                        }}
                        disabled={saving}
                      >
                        {saving ? "Lagrer..." : "Lagre"}
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Typography
                    variant="body1"
                    component="div"
                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                  >
                    {renderContentWithPreparatHighlight(
                      displayContent || "(Tom tekst)",
                      preparatRows.find((r) => r.picked)?.picked ?? null
                    )}
                  </Typography>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>
      <Snackbar
        open={copied}
        autoHideDuration={1500}
        onClose={() => setCopied(false)}
        message="Teksten er kopiert"
      />
    </Box>
  );
}
