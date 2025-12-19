import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StandardTekstSidebar from "../components/StandardTekstSidebar";
import StandardTekstContent from "../components/StandardTekstContent";
import { standardTeksterApi } from "../services/standardTeksterApi";
import { useAuthUser } from "../../../app/auth/Auth";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  replaceNextPreparatToken,
  replaceTallTokens,
  templateHasTallToken,
  usePreparatRows,
} from "../utils/preparat";
import { buildDisplayContent, buildPreviewContent, templateUsesPreparat1 } from "../utils/content";
import { renderContentWithPreparatHighlight } from "../utils/render";
import styles from "../../../styles/standardTekstPage.module.css";

import { useStandardTekster } from "../hooks/useStandardTekster";

import { useStandardTekstHotkeys } from "../hooks/useStandardTekstHotkeys";

import PreparatPanel from "../components/PreparatPanel";

import { deleteStandardTekst } from "../utils/deleteStandardTekst";

import type { StandardTekstFollowUp } from "../types";

export default function StandardTekstPage() {
  const {
    setItems,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    loading,
    error,
    filtered,
    selected,
  } = useStandardTekster();

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const errorToShow = errorLocal ?? error;

  const { isAdmin, firstName } = useAuthUser();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);

  const { preparatRows, resetPreparatRows, clearPreparats, addPickedPreparat, removePreparatById } =
    usePreparatRows();
  const preparatSectionRef = useRef<HTMLDivElement | null>(null);
  const preparatSearchInputRef = useRef<HTMLInputElement | null>(null);
  const preserveInputsOnNextSelectRef = useRef(false);
  useStandardTekstHotkeys({
    preparatRows,
    clearPreparats,
    preparatSearchInputRef,
  });
  const [tallValue, setTallValue] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [draftFollowUps, setDraftFollowUps] = useState<StandardTekstFollowUp[]>([]);
  const [followUpPick, setFollowUpPick] = useState<{ id: string; title: string } | null>(null);
  const [followUpLabel, setFollowUpLabel] = useState<string>("");

  const pickedPreparats = useMemo(
    () => preparatRows.map((r) => r.picked).filter(Boolean) as string[],
    [preparatRows]
  );

  const displayContent = useMemo(() => {
    if (!selected) return "";

    const base = buildDisplayContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });

    // Apply {{TALL}} replacement last, so it affects both preview + copy.
    if (templateHasTallToken(selected.content)) {
      // Only replace when user has provided a value. If empty, keep token so we can block copy.
      if (!tallValue.trim()) return base;
      return replaceTallTokens(base, tallValue);
    }

    return base;
  }, [selected, firstName, pickedPreparats, tallValue]);

  const previewContent = useMemo(() => {
    if (!selected) return "";

    const base = buildPreviewContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });

    if (templateHasTallToken(selected.content)) {
      const valueToShow = tallValue.trim() ? tallValue : "____";
      return replaceTallTokens(base, valueToShow);
    }

    return base;
  }, [selected, firstName, pickedPreparats, tallValue]);

  useEffect(() => {
    // Når du bytter valgt tekst, avslutt redigering og synk draft
    setIsEditing(false);
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    if (!preserveInputsOnNextSelectRef.current) {
      resetPreparatRows();
      setTallValue("");

      // Auto-focus preparat search when a template is selected, so user can start typing right away.
      // Use rAF to wait for the input to be mounted/updated.
      requestAnimationFrame(() => {
        preparatSearchInputRef.current?.focus();
        preparatSearchInputRef.current?.select();
      });
    }

    // Always clear the flag after handling a selection change
    preserveInputsOnNextSelectRef.current = false;
  }, [selectedId, resetPreparatRows, selected]);

  const startEdit = () => {
    if (!selected) return;
    setDraftTitle(selected.title ?? "");
    setDraftContent(selected.content ?? "");
    setDraftFollowUps((selected.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setErrorLocal(null);
    try {
      // If admin selected a follow-up but didn't press +, include it on save.
      const followUpsToSave: StandardTekstFollowUp[] = (() => {
        if (!followUpPick) return draftFollowUps;

        const label = followUpLabel.trim() || `Oppfølging: ${followUpPick.title}`;
        const exists = draftFollowUps.some((p) => p.id === followUpPick.id);
        if (exists) return draftFollowUps;

        return [...draftFollowUps, { id: followUpPick.id, label }];
      })();

      await standardTeksterApi.update(selected.id, {
        title: draftTitle,
        content: draftContent,
        followUps: followUpsToSave,
      });

      // Oppdater lokalt state så UI viser ny tekst uten refresh
      setItems((prev) =>
        prev.map((it) =>
          it.id === selected.id
            ? {
                ...it,
                title: draftTitle,
                content: draftContent,
                followUps: followUpsToSave,
                updatedAt: new Date(),
              }
            : it
        )
      );

      // Sync local draft + clear add-form
      setDraftFollowUps(followUpsToSave);
      setFollowUpPick(null);
      setFollowUpLabel("");

      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved lagring";
      setErrorLocal(message);
    } finally {
      setSaving(false);
    }
  };

  const createNewStandardTekst = async () => {
    if (!isAdmin) return;

    setCreating(true);
    setErrorLocal(null);

    try {
      const localItem = await standardTeksterApi.createEmpty();

      // Add to local list and select it immediately
      setItems((prev) => {
        const next = [localItem, ...prev];
        return next.sort((a, b) => a.title.localeCompare(b.title, "nb"));
      });

      setSelectedId(localItem.id);

      // Start editing right away
      setDraftTitle(localItem.title);
      setDraftContent(localItem.content);
      setIsEditing(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ukjent feil ved opprettelse";
      setErrorLocal(message);
    } finally {
      setCreating(false);
    }
  };

  const followUpLabelPresets = useMemo(
    () => [
      "Kunden svarer ja",
      "Kunden svarer nei",
      "Kunden ønsker å bytte",
      "Kunden ønsker å slette",
      "Kunden har spørsmål",
      "Annet",
    ],
    []
  );

  const followUpOptions = useMemo(() => {
    // We only have access to the currently filtered list from the hook.
    // This is OK for now: users can search in the sidebar first, then add from the list.
    return (filtered ?? [])
      .filter((t) => t.id !== selected?.id)
      .map((t) => ({ id: t.id, title: t.title }));
  }, [filtered, selected?.id]);

  const addFollowUp = () => {
    if (!followUpPick) return;
    const label = followUpLabel.trim() || `Oppfølging: ${followUpPick.title}`;

    setDraftFollowUps((prev) => {
      if (prev.some((p) => p.id === followUpPick.id)) return prev;
      return [...prev, { id: followUpPick.id, label }];
    });

    setFollowUpPick(null);
    setFollowUpLabel("");
  };

  const removeFollowUp = (id: string) => {
    setDraftFollowUps((prev) => prev.filter((p) => p.id !== id));
  };

  const openFollowUp = (id: string) => {
    preserveInputsOnNextSelectRef.current = true;
    setSelectedId(id);
  };

  const followUpsEditor = (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Legg til oppfølgingstekster som knapper for denne standardteksten.
      </Typography>

      {draftFollowUps.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
          {draftFollowUps.map((fu) => (
            <Chip
              key={fu.id}
              label={fu.label}
              onClick={() => openFollowUp(fu.id)}
              onDelete={isAdmin && isEditing ? () => removeFollowUp(fu.id) : undefined}
              deleteIcon={isAdmin && isEditing ? <DeleteOutlineIcon /> : undefined}
              icon={<OpenInNewIcon />}
              variant="outlined"
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Ingen oppfølgingstekster lagt til enda.
        </Typography>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Autocomplete
          size="small"
          disabled={!isEditing}
          value={followUpPick}
          onChange={(_, v) => setFollowUpPick(v)}
          options={followUpOptions}
          getOptionLabel={(o) => o.title}
          renderInput={(params) => <TextField {...params} label="Velg oppfølgingstekst" />}
          fullWidth
        />

        <Autocomplete
          freeSolo
          size="small"
          disabled={!isEditing}
          value={followUpLabel}
          onInputChange={(_, v) => setFollowUpLabel(v)}
          options={followUpLabelPresets}
          renderInput={(params) => (
            <TextField {...params} label="Etikett" placeholder="F.eks. Kunden svarer ja" />
          )}
          fullWidth
        />

        <IconButton
          aria-label="Legg til oppfølging"
          disabled={!isEditing || !followUpPick}
          onClick={addFollowUp}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Tips: Trykk Rediger på standardteksten først, så kan du legge til/fjerne oppfølginger og
        lagre.
      </Typography>
    </Box>
  );

  const followUpsPreview = selected?.followUps?.length ? (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {selected.followUps.map((fu) => (
        <Chip
          key={fu.id}
          label={fu.label}
          onClick={(e) => {
            e.stopPropagation();
            openFollowUp(fu.id);
          }}
          icon={<OpenInNewIcon />}
          variant="outlined"
          size="small"
        />
      ))}
    </Stack>
  ) : null;

  const copyBodyToClipboard = async () => {
    if (!selected) return;
    if (isEditing) return;

    // Prevent copying if the template requires a number and it hasn't been filled in.
    if (templateHasTallToken(selected.content) && !tallValue.trim()) {
      setErrorLocal("Fyll inn tallfeltet ({{TALL}}) før du kopierer teksten.");
      return;
    }

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

  const requestDelete = () => {
    if (!selected) return;
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    setErrorLocal(null);

    try {
      await deleteStandardTekst({
        id: selected.id,
        setItems,
        setSelectedId,
        onError: (msg) => setErrorLocal(msg),
      });

      setDeleteOpen(false);
      setIsEditing(false);
      setDraftTitle("");
      setDraftContent("");
      resetPreparatRows();
    } catch {
      // errorLocal is set via onError
    } finally {
      setDeleting(false);
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
            variant="text"
            size="small"
            onClick={() => setShowGuide((v) => !v)}
            className={styles.headerLinkButton}
            endIcon={
              <ExpandMoreIcon className={showGuide ? styles.expandIconOpen : styles.expandIcon} />
            }
          >
            {showGuide ? "Skjul bruksanvisning" : "Vis bruksanvisning"}
          </Button>
        </Box>
      </Box>

      {errorToShow && (
        <Alert severity="error" className={styles.error}>
          {errorToShow}
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
        <StandardTekstSidebar
          isAdmin={isAdmin}
          creating={creating}
          onCreate={createNewStandardTekst}
          search={search}
          setSearch={setSearch}
          loading={loading}
          filtered={filtered}
          selectedId={selectedId}
          setSelectedId={(id) => setSelectedId(id)}
        />

        <Box className={styles.main}>
          <Box ref={preparatSectionRef}>
            <PreparatPanel
              preparatRows={preparatRows}
              inputRef={preparatSearchInputRef}
              onPickText={(text) => {
                addPickedPreparat(text);

                if (isEditing) {
                  setDraftContent((prev) => replaceNextPreparatToken(prev, text));
                }
              }}
              onClear={clearPreparats}
              onRemove={(id) => removePreparatById(typeof id === "number" ? id : Number(id))}
            />
          </Box>

          {selected && templateHasTallToken(selected.content) && (
            <Paper
              elevation={0}
              sx={{
                mt: 1,
                mb: 1.5,
                p: 1.25,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Tall i teksten
              </Typography>
              <TextField
                label="Tall"
                value={tallValue}
                onChange={(e) => setTallValue(e.target.value)}
                size="small"
                type="number"
                inputProps={{ inputMode: "numeric" }}
                helperText={
                  tallValue.trim()
                    ? "Tallet settes inn der {{TALL}} står i teksten."
                    : "Plasseringen vises som ____ i teksten til du fyller inn et tall."
                }
                fullWidth
              />
            </Paper>
          )}

          <StandardTekstContent
            selected={selected}
            loading={loading}
            isAdmin={isAdmin}
            isEditing={isEditing}
            draftTitle={draftTitle}
            draftContent={draftContent}
            saving={saving || deleting}
            onDraftTitleChange={setDraftTitle}
            onDraftContentChange={setDraftContent}
            onCancel={cancelEdit}
            onSave={saveEdit}
            onStartEdit={startEdit}
            onDelete={requestDelete}
            deleting={deleting}
            onCopy={copyBodyToClipboard}
            previewNode={renderContentWithPreparatHighlight(
              previewContent || "(Tom tekst)",
              preparatRows.map((r) => r.picked),
              { enableSecondaryHighlight: templateUsesPreparat1(selected?.content ?? "") }
            )}
            editorTools={
              isAdmin ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFollowUpsOpen(true);
                  }}
                >
                  Oppfølgingstekster
                </Button>
              ) : null
            }
            headerRight={!isEditing ? followUpsPreview : null}
          />
        </Box>
      </Box>
      <Dialog open={followUpsOpen} onClose={() => setFollowUpsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Oppfølgingstekster</DialogTitle>
        <DialogContent>{followUpsEditor}</DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpsOpen(false)}>Lukk</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteOpen} onClose={closeDelete}>
        <DialogTitle>Slett standardtekst?</DialogTitle>
        <DialogContent>Dette kan ikke angres.</DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleting}>
            Avbryt
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Sletter..." : "Slett"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={copied}
        autoHideDuration={1500}
        onClose={() => setCopied(false)}
        message="Teksten er kopiert"
      />
    </Box>
  );
}
