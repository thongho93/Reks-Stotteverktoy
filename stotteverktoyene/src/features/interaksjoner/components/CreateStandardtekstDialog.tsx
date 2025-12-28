import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  createStandardtekstForInteraction,
  updateStandardtekst,
} from "../../standardtekster/services/standardTeksterApi";

type Props = {
  open: boolean;
  interactionId: string | null;
  prefillTitle?: string;
  onClose: () => void;
  onCreated?: (createdId: string) => void;
};

const FIXED_CATEGORY = "Interaksjon";

const TEMPLATE_TOP =
  "Hei, og takk for at du har valgt Farmasiet for levering av reseptbelagte medisiner.";

const TEMPLATE_BOTTOM =
  "Det er mulig at legen allerede har vurdert denne kombinasjonen. Derfor er det viktig at du følger legens forskrivning nøye, og ikke gjør endringer i behandlingen uten å ha avklart det med legen.\n\nTa gjerne kontakt med legen din hvis du er usikker eller ønsker å få videre vurdering.\n\nDenne meldingen er kun ment som informasjon og kan ikke besvares. For praktiske spørsmål, kontakt gjerne vår kundeservice.\n\nVennlig hilsen\nXX, farmasøyt\nFarmasiet";

function extractInteractionTextFromComposed(composed: string) {
  const raw = (composed ?? "").trim();
  if (!raw) return "";

  const top = TEMPLATE_TOP.trim();
  const bottom = TEMPLATE_BOTTOM.trim();

  const rawNorm = raw.replace(/\r\n/g, "\n");
  const topNorm = top.replace(/\r\n/g, "\n");
  const bottomNorm = bottom.replace(/\r\n/g, "\n");

  // If content is not in our composed format, just return it as-is for manual editing.
  if (!rawNorm.startsWith(topNorm)) return raw;
  if (!rawNorm.endsWith(bottomNorm)) return raw;

  const middle = rawNorm
    .slice(topNorm.length, rawNorm.length - bottomNorm.length)
    .trim();

  // Middle may include leading/trailing blank lines.
  return middle.replace(/^\n+/, "").replace(/\n+$/, "").trim();
}

export function CreateStandardtekstDialog(props: Props) {
  const { open, interactionId, prefillTitle, onClose, onCreated } = props;

  const [title, setTitle] = React.useState("");
  const [interactionText, setInteractionText] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle((prev) => prev || prefillTitle || "");
    setInteractionText("");
    setSaving(false);
    setError(null);
    setCopied(false);
  }, [open, prefillTitle]);

  const canSave =
    !!interactionId &&
    title.trim().length > 0 &&
    interactionText.trim().length > 0 &&
    !saving;

  const previewText = React.useMemo(() => {
    const body = interactionText.trim();
    return `${TEMPLATE_TOP}\n\n${body}\n\n${TEMPLATE_BOTTOM}`;
  }, [interactionText]);

  const handleSave = React.useCallback(async () => {
    if (!interactionId) {
      setError("Mangler interaksjon-ID. Lukk dialogen og prøv igjen.");
      return;
    }

    const t = title.trim();

    if (!t || !interactionText.trim()) {
      setError("Tittel og innhold må fylles ut.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdId = await createStandardtekstForInteraction({
        title: t,
        category: FIXED_CATEGORY,
        content: previewText,
        interactionId,
        followUps: [],
      });

      onCreated?.(createdId);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Kunne ikke opprette standardtekst.");
    } finally {
      setSaving(false);
    }
  }, [interactionId, title, interactionText, previewText, onCreated, onClose]);

  const handleCopyPreview = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [previewText]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ fontSize: 34, fontWeight: 900, pb: 1 }}>
        Ny standardtekst
      </DialogTitle>

      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 16 }}>
          Denne standardteksten lagres i standardtekst-biblioteket og knyttes automatisk til interaksjonen.
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>
          Kategori settes automatisk til «{FIXED_CATEGORY}».
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Stack spacing={2}>
          {/* Title may be auto-prefilled based on provided props */}
          <TextField
            label="Tittel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            fullWidth
          />

          <TextField
            label="Interaksjonstekst"
            value={interactionText}
            onChange={(e) => setInteractionText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            placeholder="Skriv den delen som er spesifikk for denne interaksjonen (virkestoff × virkestoff)."
          />

          <Box sx={{ mt: 0.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography sx={{ fontWeight: 800 }}>Forhåndsvisning</Typography>
              <Button
                onClick={handleCopyPreview}
                variant="text"
                disabled={!interactionText.trim()}
                sx={{ px: 1, minWidth: 0 }}
              >
                Kopier
              </Button>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                width: "100%",
                userSelect: "text",
              }}
            >
              <Typography sx={{ whiteSpace: "pre-line" }}>{previewText}</Typography>
            </Box>

            {copied ? (
              <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                Kopiert.
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ mt: 0.5 }}>
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
              Interaksjon-ID: {interactionId ?? "-"}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          variant="text"
        >
          Avbryt
        </Button>

        <Button
          onClick={handleSave}
          disabled={!canSave}
          variant="contained"
        >
          {saving ? "Lagrer..." : "Lagre standardtekst"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type EditProps = {
  open: boolean;
  standardtekst: {
    id: string;
    title?: string;
    category?: string;
    content?: string;
    followUps?: any[];
  } | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function EditStandardtekstDialog(props: EditProps) {
  const { open, standardtekst, onClose, onSaved } = props;

  const [title, setTitle] = React.useState("");
  const [interactionText, setInteractionText] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const t = (standardtekst?.title ?? "").trim();
    const c = standardtekst?.content ?? "";
    setTitle(t);
    setInteractionText(extractInteractionTextFromComposed(c));
    setSaving(false);
    setError(null);
    setCopied(false);
  }, [open, standardtekst]);

  const canSave =
    !!standardtekst?.id &&
    title.trim().length > 0 &&
    interactionText.trim().length > 0 &&
    !saving;

  const previewText = React.useMemo(() => {
    const body = interactionText.trim();
    return `${TEMPLATE_TOP}\n\n${body}\n\n${TEMPLATE_BOTTOM}`;
  }, [interactionText]);

  const handleCopyPreview = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [previewText]);

  const handleSave = React.useCallback(async () => {
    if (!standardtekst?.id) return;

    const t = title.trim();
    const body = interactionText.trim();

    if (!t || !body) {
      setError("Tittel og interaksjonstekst må fylles ut.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateStandardtekst({
        standardtekstId: standardtekst.id,
        title: t,
        category: standardtekst.category || FIXED_CATEGORY,
        content: previewText,
        followUps: (standardtekst.followUps ?? []) as any,
      });

      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Kunne ikke lagre endringer.");
    } finally {
      setSaving(false);
    }
  }, [standardtekst, title, interactionText, previewText, onSaved, onClose]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ fontSize: 34, fontWeight: 900, pb: 1 }}>
        Rediger standardtekst
      </DialogTitle>

      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 16 }}>
          Endringene lagres i standardtekst-biblioteket.
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>
          Kategori er «{FIXED_CATEGORY}».
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Stack spacing={2}>
          <TextField
            label="Tittel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            fullWidth
          />

          <TextField
            label="Interaksjonstekst"
            value={interactionText}
            onChange={(e) => setInteractionText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
          />

          <Box sx={{ mt: 0.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography sx={{ fontWeight: 800 }}>Forhåndsvisning</Typography>
              <Button
                onClick={handleCopyPreview}
                variant="text"
                disabled={!interactionText.trim()}
                sx={{ px: 1, minWidth: 0 }}
              >
                Kopier
              </Button>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                width: "100%",
                userSelect: "text",
              }}
            >
              <Typography sx={{ whiteSpace: "pre-line" }}>{previewText}</Typography>
            </Box>

            {copied ? (
              <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                Kopiert.
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} variant="text">
          Avbryt
        </Button>

        <Button onClick={handleSave} disabled={!canSave} variant="contained">
          {saving ? "Lagrer..." : "Lagre endringer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}