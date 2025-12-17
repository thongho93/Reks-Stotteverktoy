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
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/Auth";
import MedicationSearch from "../../fest/components/MedicationSearch";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import type { StandardTekst } from "../types";
import { mapDocToStandardTekst } from "../mappers/standardTekstMapper";
import {
  formatPreparatForTemplate,
  replaceNextPreparatToken,
  usePreparatRows,
  formatPreparatList,
  replacePreparatTokenWithList,
} from "../utils/preparat";
import { renderContentWithPreparatHighlight } from "../utils/render";
import styles from "../../../styles/standardTekstPage.module.css";

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

  const { preparatRows, addPreparatRow, removePreparatRow, setPickedForRow, resetPreparatRows } =
    usePreparatRows();
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

    // Replace {{PREPARAT}} placeholders in order, one per picked preparat
    const preparatList = formatPreparatList(preparatRows.map((r) => r.picked));
    if (preparatList) {
      text = replacePreparatTokenWithList(text, preparatList);
    }

    return text;
  }, [selected, firstName, preparatRows]);

  useEffect(() => {
    // Når du bytter valgt tekst, avslutt redigering og synk draft
    setIsEditing(false);
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    resetPreparatRows();
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
    <Box className={styles.page}>
      <Box className={styles.header}>
        <Box>
          <Typography variant="h4">Standardtekster</Typography>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            size="small"
            onClick={createNewStandardTekst}
            disabled={creating}
            className={styles.pillButton}
          >
            {creating ? "Oppretter..." : "Ny standardtekst"}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" className={styles.error}>
          {error}
        </Alert>
      )}

      <Box className={styles.grid}>
        <Paper className={styles.sidebar}>
          <Box className={styles.sidebarHeader}>
            <Box className={styles.sidebarSearch}>
              <TextField
                fullWidth
                size="small"
                label="Søk i standardtekster"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" className={styles.sidebarCount}>
              {loading ? "Laster..." : `${filtered.length} treff`}
            </Typography>
          </Box>
          <Divider />

          {loading ? (
            <Box className={styles.sidebarLoading}>
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
            <Box className={styles.sidebarEmpty}>
              <Typography variant="body2" color="text.secondary">
                Ingen treff.
              </Typography>
            </Box>
          )}
        </Paper>

        <Box className={styles.main}>
          <Paper className={styles.preparatPaper}>
            <Box className={styles.preparatMaxWidth}>
              <Box className={styles.preparatList}>
                {preparatRows.map((row) => (
                  <Box key={row.id} className={styles.preparatRow}>
                    <Box className={styles.preparatField}>
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

                    <Box className={styles.preparatIcons}>
                      <IconButton
                        aria-label="Legg til nytt preparat"
                        size="small"
                        onClick={addPreparatRow}
                        className={styles.roundIconButton}
                      >
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>

                      {preparatRows.length > 1 && (
                        <IconButton
                          aria-label="Fjern dette preparatet"
                          size="small"
                          onClick={() => removePreparatRow(row.id)}
                          className={styles.roundIconButton}
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
            className={
              selected && !isEditing
                ? `${styles.contentPaper} ${styles.contentPaperCopy}`
                : styles.contentPaper
            }
          >
            {!selected && !loading && (
              <Typography variant="body2" color="text.secondary">
                Velg en standardtekst fra listen.
              </Typography>
            )}

            {selected && (
              <>
                {isAdmin && !isEditing && (
                  <Box className={styles.editRow}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit();
                      }}
                      className={styles.pillButton}
                    >
                      Endre
                    </Button>
                  </Box>
                )}
                <Typography variant="h5" className={styles.title}>
                  {selected.title}
                </Typography>
                {selected.category && (
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
                    <TextField
                      fullWidth
                      size="small"
                      label="Overskrift"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className={styles.editorTitleField}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={10}
                      label="Tekst"
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                    />
                    <Stack direction="row" spacing={1} className={styles.editorActions}>
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
                  <Typography variant="body1" component="div" className={styles.body}>
                    {renderContentWithPreparatHighlight(
                      displayContent || "(Tom tekst)",
                      preparatRows.map((r) => r.picked)
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
