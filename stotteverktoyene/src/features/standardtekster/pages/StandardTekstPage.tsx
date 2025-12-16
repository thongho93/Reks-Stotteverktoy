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
} from "@mui/material";
import {
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
  const name = (med.varenavn ?? "").trim();
  const nfs = (med.navnFormStyrke ?? "").trim();

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

  if (name && strength) return `${name} ${strength}`;
  if (name) return name;
  return nfs || "";
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
  const [pickedPreparat, setPickedPreparat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

    // Replace {{PREPARAT}} with picked preparat (if chosen)
    if (pickedPreparat) {
      text = text.replace(/\{\{\s*PREPARAT\s*\}\}/g, pickedPreparat);
    }

    return text;
  }, [selected, firstName, pickedPreparat]);

  useEffect(() => {
    // Når du bytter valgt tekst, avslutt redigering og synk draft
    setIsEditing(false);
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setPickedPreparat(null);
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
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Standardtekster</Typography>
        <Typography variant="body2" color="text.secondary">
          Data hentes fra Firebase (Firestore).
        </Typography>
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
              <MedicationSearch
                onPick={(med) => {
                  const text = formatPreparatForTemplate(med);
                  if (!text) return;

                  setPickedPreparat(text);

                  // If admin is editing, also replace inside the draft so it can be saved if desired.
                  if (isEditing) {
                    setDraftContent((prev) => prev.replace(/\{\{\s*PREPARAT\s*\}\}/g, text));
                  }
                }}
              />
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
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {displayContent || "(Tom tekst)"}
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
