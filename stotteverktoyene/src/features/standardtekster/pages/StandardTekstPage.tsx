import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Button,
  Chip,
  Stack,
  Snackbar,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import type { StandardTekst } from "../types";
import { mapDocToStandardTekst } from "../mappers/standardTekstMapper";
import {
  formatPreparatForTemplate,
  replaceNextPreparatToken,
  usePreparatRows,
  formatPreparatList,
  replacePreparatTokenWithList,
  replacePreparatTokensPrimarySecondary,
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

  const { preparatRows, resetPreparatRows, clearPreparats, addPickedPreparat, removePreparatById } =
    usePreparatRows();
  const preparatSectionRef = useRef<HTMLDivElement | null>(null);
  const preparatSearchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!preparatRows.some((r) => r.picked)) return;

      // Use Escape as a fast "clear all" anywhere on the page
      e.preventDefault();
      clearPreparats();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearPreparats, preparatRows]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Alt (Windows/Linux) / Option (macOS) + F -> focus preparat search
      if (!e.altKey) return;
      if (e.code !== "KeyF") return;

      e.preventDefault();
      preparatSearchInputRef.current?.focus();
      preparatSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

    const picked = preparatRows.map((r) => r.picked).filter(Boolean) as string[];

    // If the template uses {{PREPARAT1}}, treat it as a 2-slot template:
    //  - {{PREPARAT}}  -> first picked
    //  - {{PREPARAT1}} -> second picked
    // Otherwise keep the existing list behavior for {{PREPARAT}}.
    const usesSecondaryToken = /\{\{\s*PREPARAT1\s*\}\}/.test(text);

    if (usesSecondaryToken) {
      const primary = picked[0] ?? null;
      const secondary = picked[1] ?? null;
      text = replacePreparatTokensPrimarySecondary(text, primary, secondary);
    } else {
      const preparatList = formatPreparatList(picked);
      if (preparatList) {
        text = replacePreparatTokenWithList(text, preparatList);
      }
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

        <Box className={styles.headerActions}>
          <Button
            variant="contained"
            size="small"
            onClick={() => setShowGuide((v) => !v)}
            className={styles.pillButton}
            endIcon={
              <ExpandMoreIcon className={showGuide ? styles.expandIconOpen : styles.expandIcon} />
            }
          >
            {showGuide ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" className={styles.error}>
          {error}
        </Alert>
      )}
      <Collapse in={showGuide} unmountOnExit>
        <Paper className={styles.guidePaper}>
          <Typography variant="h6" className={styles.guideTitle}>
            Slik bruker du Standardtekster
          </Typography>

          <Box component="ul" className={styles.guideList}>
            <li>Søk i listen til venstre og velg en standardtekst.</li>
            <li>Bruk "Søk etter preparat" for å erstatte {"{{PREPARAT}}"} automatisk.</li>
            <li>Legg til flere preparater (+). De settes inn med komma, og "og" før siste.</li>
            <li>Sjekk at navnet ditt står riktig i slutten.</li>
            <li>Klikk i teksten for å kopiere.</li>
            {isAdmin && <li>Som admin kan du opprette, redigere og slette standardtekster.</li>}
          </Box>
        </Paper>
      </Collapse>

      <Box className={styles.grid}>
        <Paper className={styles.sidebar}>
          <Box className={styles.sidebarHeader}>
            {isAdmin && (
              <Box className={styles.sidebarCreateRow}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={createNewStandardTekst}
                  disabled={creating}
                  className={styles.pillButton}
                >
                  {creating ? "Oppretter..." : "Ny standardtekst"}
                </Button>
              </Box>
            )}
            <Typography variant="subtitle2" className={styles.sidebarSectionTitle}>
              Finn standardtekst
            </Typography>
            <Box className={styles.sidebarSearch}>
              <TextField
                fullWidth
                size="small"
                label="Søk i standardtekster"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            {search.trim() && (
              <Typography
                variant="subtitle2"
                color="text.secondary"
                className={styles.sidebarCount}
              >
                {loading ? "Laster..." : `${filtered.length} treff`}
              </Typography>
            )}
          </Box>
          <Divider className={styles.sidebarDivider} />
          <Box className={styles.sidebarBody}>
            {loading ? (
              <Box className={styles.sidebarLoading}>
                <CircularProgress size={28} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box className={styles.sidebarEmpty}>
                <Typography variant="body2" color="text.secondary">
                  Ingen treff.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding className={styles.sidebarList}>
                {filtered.map((it) => (
                  <ListItemButton
                    key={it.id}
                    selected={it.id === selectedId}
                    onClick={() => setSelectedId(it.id)}
                    className={styles.sidebarItem}
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
          </Box>
        </Paper>

        <Box className={styles.main}>
          <Paper className={styles.preparatPaper} ref={preparatSectionRef}>
            <Box className={styles.preparatHeader}>
              <Typography variant="subtitle2" className={styles.preparatTitle}>
                Preparater
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              className={styles.preparatSearchRow}
            >
              <Box className={styles.preparatSingleSearch} style={{ flex: 1 }}>
                <MedicationSearch
                  inputRef={preparatSearchInputRef}
                  onPick={(med) => {
                    const text = formatPreparatForTemplate(med);
                    if (!text) return;

                    addPickedPreparat(text);

                    // If admin is editing, also replace ONLY the next placeholder in draftContent.
                    if (isEditing) {
                      setDraftContent((prev) => replaceNextPreparatToken(prev, text));
                    }
                  }}
                />
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={clearPreparats}
                disabled={!preparatRows.some((r) => r.picked)}
                startIcon={<ClearAllIcon fontSize="small" />}
                title="Tøm alle (Escape når fokus er i preparatfeltet)"
              >
                Tøm
              </Button>
            </Stack>

            <Box className={styles.preparatChipsWrap}>
              {preparatRows
                .filter((r) => r.picked)
                .map((r) => (
                  <Chip
                    key={r.id}
                    label={r.picked as string}
                    onDelete={() => removePreparatById(r.id)}
                    className={styles.preparatChip}
                  />
                ))}
            </Box>

            <Typography variant="caption" color="text.secondary" className={styles.preparatHint}>
              <span className={styles.preparatHintTip}>
                Tips: Lim inn hele produktlinjen – søket rydder opp automatisk.
              </span>
              <span className={styles.preparatHintKeys}>
                <span className={styles.preparatHintKeyLabel}>Hurtigsøk:</span> ⌥F / Alt+F ·{" "}
                <span className={styles.preparatHintKeyLabel}>Tøm:</span> Escape
              </span>
            </Typography>
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
                  <>
                    <Typography variant="body1" component="div" className={styles.body}>
                      {renderContentWithPreparatHighlight(
                        displayContent || "(Tom tekst)",
                        preparatRows.map((r) => r.picked)
                      )}
                    </Typography>

                    {isAdmin && (
                      <Box className={styles.editRowBottom}>
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
                  </>
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
