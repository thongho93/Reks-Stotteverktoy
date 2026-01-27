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
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";
import StandardTekstSidebar from "../components/StandardTekstSidebar";
import StandardTekstContent from "../components/StandardTekstContent";
import { standardTeksterApi } from "../services/standardTeksterApi";
import { useAuthUser } from "../../../app/auth/Auth";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  getTallTokenIndices,
  replaceNextPreparatToken,
  replaceTallTokenByIndex,
  templateHasDatoMndToken,
  templateHasDatoToken,
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

  const clearedInitialSelectionRef = useRef(false);

  // Start with no selected template after initial load (so the user actively selects one)
  useEffect(() => {
    if (loading) return;
    if (clearedInitialSelectionRef.current) return;

    clearedInitialSelectionRef.current = true;
    setSelectedId(null);
  }, [loading, setSelectedId]);

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const errorToShow = errorLocal ?? error;

  const { isAdmin, firstName } = useAuthUser();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftCategory, setDraftCategory] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const lockBeforeEdit = Boolean(selected && !isEditing && selected.title === "Ny standardtekst");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);

  const { preparatRows, resetPreparatRows, clearPreparats, addPickedPreparat, removePreparatById } =
    usePreparatRows();
  const preparatSectionRef = useRef<HTMLDivElement | null>(null);
  const preparatSearchInputRef = useRef<HTMLInputElement | null>(null);
  const standardTekstSearchInputRef = useRef<HTMLInputElement | null>(null);
  const preserveInputsOnNextSelectRef = useRef(false);

  const DEFAULT_NEW_STANDARDTEKST_CONTENT =
    "Hei, og takk for at du har valgt Farmasiet til å levere dine reseptvarer.\n\n" +
    "\n" +
    "Vennlig hilsen\n" +
    "XX, farmasøyt\n" +
    "Farmasiet";

  // For auto-focus glow effect on preparat / standardtekst search inputs
  const [autoFocusGlowTarget, setAutoFocusGlowTarget] = useState<"standard" | "preparat" | null>(
    null,
  );

  const triggerGlow = (target: "standard" | "preparat") => {
    setAutoFocusGlowTarget(target);
    window.setTimeout(() => setAutoFocusGlowTarget(null), 1000);
  };

  // Hotkeys for preparat search focus/clearing and standardtekster search focus
  useStandardTekstHotkeys({
    preparatRows,
    clearPreparats,
    preparatSearchInputRef,
    standardTekstSearchInputRef,
    clearNumbersAndDate: () => {
      // Reset tall fields based on the currently selected template
      const indices = getTallTokenIndices(selected?.content ?? "");
      if (indices.length) {
        const next: Record<number, string> = {};
        for (const i of indices) next[i] = "";
        setTallByIndex(next);
      } else {
        setTallByIndex({ 0: "" });
      }

      // Reset date input
      setDatoInput("");
    },
  });

  const [tallByIndex, setTallByIndex] = useState<Record<number, string>>({ 0: "" });
  const [datoInput, setDatoInput] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [clearOnCopy, setClearOnCopy] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("standardtekster.clearOnCopy");
      return raw === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("standardtekster.clearOnCopy", String(clearOnCopy));
    } catch {
      // ignore
    }
  }, [clearOnCopy]);
  const [showGuide, setShowGuide] = useState(false);
  const [draftFollowUps, setDraftFollowUps] = useState<StandardTekstFollowUp[]>([]);
  const [followUpPick, setFollowUpPick] = useState<{ id: string; title: string } | null>(null);
  const [followUpLabel, setFollowUpLabel] = useState<string>("");

  const pickedPreparats = useMemo(
    () => preparatRows.map((r) => r.picked).filter(Boolean) as string[],
    [preparatRows],
  );

  const normalizedDato = useMemo(() => {
    const digits = (datoInput ?? "").replace(/\D/g, "");
    return digits.length === 8 ? digits : "";
  }, [datoInput]);

  const formattedDato = useMemo(() => {
    if (!normalizedDato) return "";
    const dd = normalizedDato.slice(0, 2);
    const mm = normalizedDato.slice(2, 4);
    const yyyy = normalizedDato.slice(4, 8);
    return `${dd}.${mm}.${yyyy}`;
  }, [normalizedDato]);

  const normalizedDatoMnd = useMemo(() => {
    const digits = (datoInput ?? "").replace(/\D/g, "");
    // accept MMYYYY (6 digits)
    if (digits.length !== 6) return "";
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    const m = Number(mm);
    if (!Number.isFinite(m) || m < 1 || m > 12) return "";
    return `${mm}${yyyy}`;
  }, [datoInput]);

  const formattedDatoMnd = useMemo(() => {
    if (!normalizedDatoMnd) return "";
    const mm = normalizedDatoMnd.slice(0, 2);
    const yyyy = normalizedDatoMnd.slice(2, 6);
    return `${mm}.${yyyy}`;
  }, [normalizedDatoMnd]);

  const formattedDatoMndName = useMemo(() => {
    if (!normalizedDatoMnd) return "";
    const mm = Number(normalizedDatoMnd.slice(0, 2));
    const yyyy = normalizedDatoMnd.slice(2, 6);
    const months = [
      "januar",
      "februar",
      "mars",
      "april",
      "mai",
      "juni",
      "juli",
      "august",
      "september",
      "oktober",
      "november",
      "desember",
    ];
    const name = months[mm - 1];
    if (!name) return "";
    return `${name} ${yyyy}`;
  }, [normalizedDatoMnd]);

  // DATO-token: prefer full dato (DD.MM.YYYY), fall back to month name (e.g. "juni 2025")
  const effectiveDato = formattedDato || formattedDatoMndName;

  const handleDatoPicker = (iso: string) => {
    const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return;
    const [, yyyy, mm, dd] = m;
    setDatoInput(`${dd}.${mm}.${yyyy}`);

    if (errorLocal?.startsWith("Fyll inn dato") || errorLocal?.startsWith("Fyll inn måned/år")) {
      setErrorLocal(null);
    }
  };

  // Bygg innhold med preparater og tall
  const displayContent = useMemo(() => {
    if (!selected) return "";

    const base = buildDisplayContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
      dato: effectiveDato,
      datoMnd: formattedDatoMnd,
    });

    if (!templateHasTallToken(selected.content)) return base;

    // Replace each TALL token individually (TALL, TALL1, TALL2...)
    let out = base;
    for (const idx of getTallTokenIndices(selected.content)) {
      const v = (tallByIndex[idx] ?? "").trim();
      // If user hasn't filled it, keep token in place (copy will be blocked)
      if (!v) continue;
      out = replaceTallTokenByIndex(out, idx, v);
    }

    return out;
  }, [
    selected,
    firstName,
    pickedPreparats,
    tallByIndex,
    formattedDato,
    formattedDatoMnd,
    formattedDatoMndName,
    effectiveDato,
    normalizedDato,
    normalizedDatoMnd,
  ]);

  // Preview content with preparats and tall
  const previewContent = useMemo(() => {
    if (!selected) return "";

    // IMPORTANT: Do NOT replace TALL tokens here.
    // We keep tokens (TALL/TALL1/...) intact so renderContentWithPreparatHighlight
    // can render them as blue chips using `tallValues`.
    return buildPreviewContent({
      template: selected.content,
      firstName,
      picked: pickedPreparats,
    });
  }, [selected, firstName, pickedPreparats]);

  // Når valgt tekst endres, sync draft og avslutt redigering
  useEffect(() => {
    const shouldAutoEditNew = Boolean(isAdmin && selected && selected.title === "Ny standardtekst");
    setIsEditing(shouldAutoEditNew);
    setDraftTitle(selected?.title ?? "");
    setDraftCategory(selected?.category ?? "");
    if (shouldAutoEditNew) {
      const base = selected?.content ?? "";
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
    } else {
      setDraftContent(selected?.content ?? "");
    }
    setDraftFollowUps((selected?.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    if (!preserveInputsOnNextSelectRef.current) {
      resetPreparatRows();
      const indices = getTallTokenIndices(selected?.content ?? "");
      if (indices.length) {
        const next: Record<number, string> = {};
        for (const i of indices) next[i] = "";
        setTallByIndex(next);
      } else {
        setTallByIndex({ 0: "" });
      }
      setDatoInput("");

      // Når vi åpner en helt ny standardtekst i edit mode, skal fokus gå til overskrift-feltet
      // (StandardTekstContent håndterer dette via titleInputRef).
      if (selected && !shouldAutoEditNew) {
        requestAnimationFrame(() => {
          preparatSearchInputRef.current?.focus();
          preparatSearchInputRef.current?.select();
          triggerGlow("preparat");
        });
      }
    }

    // Always clear the flag after handling a selection change
    preserveInputsOnNextSelectRef.current = false;
  }, [selectedId, resetPreparatRows, selected, isAdmin]);

  // Auto-focus standardtekst search on first load when no template is selected
  useEffect(() => {
    if (loading) return;
    if (selected) return;

    requestAnimationFrame(() => {
      standardTekstSearchInputRef.current?.focus();
      standardTekstSearchInputRef.current?.select();
      triggerGlow("standard");
    });
  }, [loading, selected]);

  const startEdit = () => {
    if (!selected) return;
    setDraftTitle(selected.title ?? "");
    setDraftCategory(selected.category ?? "");
    if (selected.title === "Ny standardtekst") {
      const base = selected.content ?? "";
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
    } else {
      setDraftContent(selected.content ?? "");
    }
    setDraftFollowUps((selected.followUps ?? []) as StandardTekstFollowUp[]);
    setFollowUpPick(null);
    setFollowUpLabel("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftTitle(selected?.title ?? "");
    setDraftCategory(selected?.category ?? "");
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
        category: draftCategory.trim() || undefined,
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
                category: draftCategory.trim() || undefined,
                content: draftContent,
                followUps: followUpsToSave,
                updatedAt: new Date(),
              }
            : it,
        ),
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
      setDraftCategory(localItem.category ?? "");
      const base = localItem.content ?? "";
      setDraftContent(base.trim().length ? base : DEFAULT_NEW_STANDARDTEKST_CONTENT);
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
    [],
  );

  const followUpOptions = useMemo(() => {
    // We only have access to the currently filtered list from the hook.
    // This is OK for now: users can search in the sidebar first, then add from the list.
    return (filtered ?? [])
      .filter((t) => t.id !== selected?.id)
      .map((t) => ({ id: t.id, title: t.title }));
  }, [filtered, selected?.id]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();

    for (const t of filtered ?? []) {
      const c = (t.category ?? "").trim();
      if (c) categories.add(c);
    }

    // Ensure selected category is included even if it isn't in the filtered list
    if (selected?.category?.trim()) {
      categories.add(selected.category.trim());
    }

    return Array.from(categories).sort((a, b) => a.localeCompare(b, "nb"));
  }, [filtered, selected?.category]);

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

  // Editor for follow-up texts
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

  // Preview for follow-up texts
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

    // If the user has marked (selected) text, do NOT auto-copy the full template.
    // This keeps normal text selection + Ctrl/Cmd+C working.
    const selectionText = window.getSelection?.()?.toString() ?? "";
    if (selectionText.trim().length > 0) {
      return;
    }

    // Prevent copying if the template requires a number and it hasn't been filled in.
    if (templateHasTallToken(selected.content)) {
      const indices = getTallTokenIndices(selected.content);
      const missing = indices.filter((i) => !(tallByIndex[i] ?? "").trim());
      if (missing.length) {
        const label = missing.map((i) => (i === 0 ? "TALL" : `TALL${i}`)).join(", ");
        setErrorLocal(`Fyll inn tallfeltet før du kopierer teksten: ${label}.`);
        return;
      }
    }
    if (templateHasDatoToken(selected.content)) {
      if (!normalizedDato && !normalizedDatoMnd) {
        setErrorLocal("Fyll inn dato eller måned (DATO) før du kopierer teksten.");
        return;
      }
    }

    if (templateHasDatoMndToken(selected.content)) {
      if (!normalizedDatoMnd) {
        setErrorLocal("Fyll inn måned/år (DATO_MND) før du kopierer teksten.");
        return;
      }
    }

    const text = (displayContent ?? "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (clearOnCopy) {
        clearPreparats();

        if (templateHasTallToken(selected.content)) {
          const indices = getTallTokenIndices(selected.content);
          if (indices.length) {
            const next: Record<number, string> = {};
            for (const i of indices) next[i] = "";
            setTallByIndex(next);
          } else {
            setTallByIndex({ 0: "" });
          }
        } else {
          setTallByIndex({ 0: "" });
        }

        setSearch("");
      }

      // Focus back to preparat search for fast next use
      requestAnimationFrame(() => {
        preparatSearchInputRef.current?.focus();
        preparatSearchInputRef.current?.select?.();
      });

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

        if (clearOnCopy) {
          clearPreparats();

          if (templateHasTallToken(selected.content)) {
            const indices = getTallTokenIndices(selected.content);
            if (indices.length) {
              const next: Record<number, string> = {};
              for (const i of indices) next[i] = "";
              setTallByIndex(next);
            } else {
              setTallByIndex({ 0: "" });
            }
          } else {
            setTallByIndex({ 0: "" });
          }

          setSearch("");
        }

        requestAnimationFrame(() => {
          preparatSearchInputRef.current?.focus();
          preparatSearchInputRef.current?.select?.();
        });
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
      setDraftCategory("");
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
          <Typography variant="h1">Standardtekster</Typography>
        </Box>

        <Box className={styles.headerActions}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <span className={styles.preparatHintKeys}>
              <span className={styles.preparatHintKeyLabel}>Søk tekst:</span> Ctrl+S ·{" "}
              <span className={styles.preparatHintKeyLabel}>Søk preparat:</span> Ctrl+Shift+F ·{" "}
              <span className={styles.preparatHintKeyLabel}>Tøm:</span> Escape
            </span>
          </Typography>
          <Tooltip title="Når dette er på, tømmes preparater, tallfelt og søk automatisk etter kopiering.">
            <FormControlLabel
              sx={{ ml: 1 }}
              control={
                <Switch
                  size="small"
                  checked={clearOnCopy}
                  onChange={(e) => setClearOnCopy(e.target.checked)}
                />
              }
              label={<Typography variant="caption">Tøm etter kopiering</Typography>}
            />
          </Tooltip>
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
            <li>Bruk "Søk etter preparat" for å erstatte {"PREPARAT"} automatisk.</li>
            <li>Legg til flere preparater (+). De settes inn med komma, og "og" før siste.</li>
            <li>Sjekk at navnet ditt står riktig i slutten.</li>
            <li>Klikk i teksten for å kopiere.</li>
            {isAdmin && <li>Som admin kan du opprette, redigere og slette standardtekster.</li>}
          </Box>
        </Paper>
      </Collapse>

      <Box className={styles.grid}>
        <Box
          className={[
            styles.sidebar,
            autoFocusGlowTarget === "standard" ? styles.autoFocusGlow : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <StandardTekstSidebar
            disabled={lockBeforeEdit}
            isAdmin={isAdmin}
            creating={creating}
            onCreate={createNewStandardTekst}
            search={search}
            setSearch={setSearch}
            loading={loading}
            filtered={filtered}
            selectedId={selectedId}
            setSelectedId={(id) => setSelectedId(id)}
            searchInputRef={standardTekstSearchInputRef}
          />
        </Box>

        <Box className={styles.main}>
          <Box sx={{ position: "relative" }}>
            {lockBeforeEdit && (
              <Box
                sx={{ position: "absolute", inset: 0, zIndex: 20 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}

            <Box
              ref={preparatSectionRef}
              className={autoFocusGlowTarget === "preparat" ? styles.autoFocusGlow : undefined}
            >
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

                {(() => {
                  const tallIndices = getTallTokenIndices(selected.content);

                  return (
                    <>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                          alignItems: "start",
                        }}
                      >
                        {tallIndices.map((idx) => {
                          const v = tallByIndex[idx] ?? "";
                          const tokenLabel = idx === 0 ? "Tall" : `Tall ${idx}`;

                          return (
                            <TextField
                              key={idx}
                              label={tokenLabel}
                              value={v}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                setTallByIndex((prev) => ({ ...prev, [idx]: nextValue }));

                                if (
                                  errorLocal?.startsWith(
                                    "Fyll inn tallfeltet før du kopierer teksten",
                                  )
                                ) {
                                  setErrorLocal(null);
                                }
                              }}
                              size="small"
                              type="number"
                              inputProps={{ inputMode: "numeric" }}
                              helperText={
                                v.trim()
                                  ? `Tallet settes inn der ${tokenLabel} står i teksten.`
                                  : " "
                              }
                            />
                          );
                        })}
                      </Box>
                    </>
                  );
                })()}
              </Paper>
            )}
            {selected &&
              (templateHasDatoToken(selected.content) ||
                templateHasDatoMndToken(selected.content)) && (
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
                    Dato i teksten
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 170px 170px" },
                      alignItems: "start",
                    }}
                  >
                    <TextField
                      label="Dato eller Måned"
                      value={datoInput}
                      onChange={(e) => {
                        const nextRaw = e.target.value;
                        const digits = nextRaw.replace(/\D/g, "");

                        if (
                          errorLocal?.startsWith("Fyll inn dato") ||
                          errorLocal?.startsWith("Fyll inn måned/år")
                        ) {
                          setErrorLocal(null);
                        }

                        if (digits.length === 8) {
                          const dd = digits.slice(0, 2);
                          const mm = digits.slice(2, 4);
                          const yyyy = digits.slice(4, 8);
                          setDatoInput(`${dd}.${mm}.${yyyy}`);
                          return;
                        }

                        if (digits.length === 6) {
                          const mm = digits.slice(0, 2);
                          const yyyy = digits.slice(2, 6);
                          setDatoInput(`${mm}.${yyyy}`);
                          return;
                        }

                        setDatoInput(nextRaw);
                      }}
                      placeholder="f.eks. 30.12.2025 eller 12.2025"
                      size="small"
                      inputProps={{ inputMode: "numeric" }}
                      helperText={"Tips: Skriv eller velg dato / måned."}
                    />
                    <TextField
                      label="Velg dato"
                      type="date"
                      size="small"
                      value={
                        normalizedDato
                          ? `${normalizedDato.slice(4, 8)}-${normalizedDato.slice(
                              2,
                              4,
                            )}-${normalizedDato.slice(0, 2)}`
                          : ""
                      }
                      onChange={(e) => handleDatoPicker(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Velg måned"
                      type="month"
                      size="small"
                      value={
                        formattedDatoMnd
                          ? `${formattedDatoMnd.slice(3, 7)}-${formattedDatoMnd.slice(0, 2)}`
                          : ""
                      }
                      onChange={(e) => {
                        const iso = e.target.value; // YYYY-MM
                        const m = (iso ?? "").match(/^(\d{4})-(\d{2})$/);
                        if (!m) return;
                        const [, yyyy, mm] = m;
                        setDatoInput(`${mm}.${yyyy}`);

                        if (
                          errorLocal?.startsWith("Fyll inn dato") ||
                          errorLocal?.startsWith("Fyll inn måned/år")
                        ) {
                          setErrorLocal(null);
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>

                  {!normalizedDato && !normalizedDatoMnd && datoInput.trim() ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.75 }}
                    >
                      Ugyldig datoformat. Bruk DDMMYYYY (8 siffer) eller MMYYYY (6 siffer).
                    </Typography>
                  ) : null}
                </Paper>
              )}
          </Box>

          {lockBeforeEdit && (
            <Alert severity="warning" sx={{ mb: 1.25, mt: 2 }}>
              Ny standardtekst kan ikke stå tom. Rediger eller slett før du kan fortsette.
            </Alert>
          )}

          <StandardTekstContent
            selected={selected}
            loading={loading}
            isAdmin={isAdmin}
            isEditing={isEditing}
            draftTitle={draftTitle}
            draftCategory={draftCategory}
            draftContent={draftContent}
            saving={saving || deleting}
            onDraftTitleChange={setDraftTitle}
            onDraftCategoryChange={setDraftCategory}
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
              {
                enableSecondaryHighlight: templateUsesPreparat1(selected?.content ?? ""),
                tallValues: getTallTokenIndices(selected?.content ?? "").map((i) => {
                  const v = (tallByIndex[i] ?? "").trim();
                  return v;
                }),
                datoValue: effectiveDato,
                datoMndValue: formattedDatoMnd,
              },
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
            categoryOptions={categoryOptions}
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
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopied(false)}
          severity="success"
          variant="filled"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{
            borderRadius: 999,
            px: 2,
            py: 0.75,
            alignItems: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          Standardtekst kopiert
        </Alert>
      </Snackbar>
    </Box>
  );
}
