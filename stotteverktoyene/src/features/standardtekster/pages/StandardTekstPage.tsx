import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Collapse, Paper, Typography, Button, Snackbar } from "@mui/material";
import StandardTekstSidebar from "../components/StandardTekstSidebar";
import StandardTekstContent from "../components/StandardTekstContent";
import { standardTeksterApi } from "../services/standardTeksterApi";
import { useAuthUser } from "../../../app/auth/Auth";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { replaceNextPreparatToken, usePreparatRows } from "../utils/preparat";
import { buildDisplayContent, buildPreviewContent, templateUsesPreparat1 } from "../utils/content";
import { renderContentWithPreparatHighlight } from "../utils/render";
import styles from "../../../styles/standardTekstPage.module.css";

import { useStandardTekster } from "../hooks/useStandardTekster";

import { useStandardTekstHotkeys } from "../hooks/useStandardTekstHotkeys";

import PreparatPanel from "../components/PreparatPanel";

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

  const { preparatRows, resetPreparatRows, clearPreparats, addPickedPreparat, removePreparatById } =
    usePreparatRows();
  const preparatSectionRef = useRef<HTMLDivElement | null>(null);
  const preparatSearchInputRef = useRef<HTMLInputElement | null>(null);
  useStandardTekstHotkeys({
    preparatRows,
    clearPreparats,
    preparatSearchInputRef,
  });
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const pickedPreparats = useMemo(
    () => preparatRows.map((r) => r.picked).filter(Boolean) as string[],
    [preparatRows]
  );

  const displayContent = useMemo(() => {
    if (!selected) return "";
    return buildDisplayContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });
  }, [selected, firstName, pickedPreparats]);

  const previewContent = useMemo(() => {
    if (!selected) return "";
    return buildPreviewContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });
  }, [selected, firstName, pickedPreparats]);

  useEffect(() => {
    // Når du bytter valgt tekst, avslutt redigering og synk draft
    setIsEditing(false);
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    resetPreparatRows();

    // Auto-focus preparat search when a template is selected, so user can start typing right away.
    // Use rAF to wait for the input to be mounted/updated.
    requestAnimationFrame(() => {
      preparatSearchInputRef.current?.focus();
      preparatSearchInputRef.current?.select();
    });
  }, [selectedId, resetPreparatRows, selected]);

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
    setErrorLocal(null);
    try {
      await standardTeksterApi.update(selected.id, { title: draftTitle, content: draftContent });

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

          <StandardTekstContent
            selected={selected}
            loading={loading}
            isAdmin={isAdmin}
            isEditing={isEditing}
            draftTitle={draftTitle}
            draftContent={draftContent}
            saving={saving}
            onDraftTitleChange={setDraftTitle}
            onDraftContentChange={setDraftContent}
            onCancel={cancelEdit}
            onSave={saveEdit}
            onStartEdit={startEdit}
            onCopy={copyBodyToClipboard}
            previewNode={renderContentWithPreparatHighlight(
              previewContent || "(Tom tekst)",
              preparatRows.map((r) => r.picked),
              { enableSecondaryHighlight: templateUsesPreparat1(selected?.content ?? "") }
            )}
          />
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
