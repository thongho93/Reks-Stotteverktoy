import * as React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";

import { feedbackApi, FEEDBACK_MAX_LENGTH } from "../services/feedbackApi";
import { FEEDBACK_PAGES, type Feedback, type FeedbackCategory } from "../types";
import ImagePicker from "./ImagePicker";
import { StatusPill } from "./feedbackUi";
import { FEEDBACK_ACCENT, useReadableColor } from "./feedbackUtils";

type Props = {
  author: { uid: string; name: string; email: string } | null;
  /** Gir siden teksten mens brukeren skriver, til «Er det meldt før?». */
  onDraftChange: (message: string) => void;
  /** Eksisterende innspill som ligner det brukeren skriver. */
  similar: Feedback[];
  /** Åpner et av dem i lista, så brukeren kan kommentere der. */
  onOpenSimilar: (id: string) => void;
};

const TYPES: Array<{
  value: FeedbackCategory;
  title: string;
  hint: string;
  color: string;
  icon: React.ReactNode;
}> = [
  { value: "bug", title: "Feil", hint: "Noe virker ikke som det skal", color: "#DC2626", icon: <BugReportRoundedIcon /> },
  { value: "feature", title: "Ønske", hint: "Noe jeg savner eller vil ha bedre", color: "#F59E0B", icon: <LightbulbRoundedIcon /> },
];

/**
 * Nytt innspill. Står alltid øverst i lista som et felt med to store knapper; et trykk
 * åpner skjemaet på stedet.
 */
export default function NewFeedbackForm({ author, onDraftChange, similar, onOpenSimilar }: Props) {
  const readable = useReadableColor();
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<FeedbackCategory>("bug");
  const [pagePath, setPagePath] = React.useState("__annet");
  const [message, setMessage] = React.useState("");
  const [images, setImages] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= 3 && !submitting && Boolean(author);

  const start = (next: FeedbackCategory) => {
    setCategory(next);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setError(null);
    onDraftChange("");
  };

  const submit = async () => {
    if (!canSubmit || !author) return;
    setSubmitting(true);
    setError(null);
    try {
      await feedbackApi.submit({ message: trimmed, category, pagePath, images }, author);
      setMessage("");
      setImages([]);
      setOpen(false);
      setSent(true);
      onDraftChange("");
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code ?? "";
      setError(
        code === "permission-denied"
          ? "Du mangler tilgang til å sende innspill. Kontakt eier."
          : "Kunne ikke sende innspillet. Prøv igjen."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!open ? (
        <Paper
          component="section"
          aria-label="Nytt innspill"
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 4,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
            borderWidth: 2,
            borderColor: FEEDBACK_ACCENT,
            boxShadow: `0 6px 20px ${alpha(FEEDBACK_ACCENT, 0.14)}`,
          }}
        >
          <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
            <Typography sx={{ fontSize: 19, lineHeight: 1.3, fontWeight: 600 }}>
              Noe som ikke fungerer, eller noe du savner?
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              disableElevation
              size="large"
              startIcon={<BugReportRoundedIcon />}
              onClick={() => start("bug")}
              sx={{ textTransform: "none", fontWeight: 600, bgcolor: FEEDBACK_ACCENT, "&:hover": { bgcolor: "#7A2FB0" } }}
            >
              Meld en feil
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<LightbulbRoundedIcon />}
              onClick={() => start("feature")}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderWidth: 2,
                color: readable(FEEDBACK_ACCENT),
                borderColor: FEEDBACK_ACCENT,
                "&:hover": { borderWidth: 2, borderColor: FEEDBACK_ACCENT },
              }}
            >
              Foreslå noe
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper
          component="section"
          aria-labelledby="nytt-innspill"
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            borderWidth: 2,
            borderColor: FEEDBACK_ACCENT,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography id="nytt-innspill" variant="h3" sx={{ m: 0, fontSize: 20, fontWeight: 600 }}>
              Nytt innspill
            </Typography>
            <IconButton aria-label="Lukk" onClick={close} disabled={submitting}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Box component="fieldset" sx={{ border: 0, m: 0, p: 0 }}>
            <Typography component="legend" sx={{ fontSize: 14, fontWeight: 600, mb: 1.25, p: 0 }}>
              Hva gjelder det?
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              {TYPES.map((t) => {
                const selected = category === t.value;
                return (
                  <Box
                    key={t.value}
                    component="label"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: "pointer",
                      borderRadius: 3,
                      border: selected ? 2 : 1,
                      borderColor: selected ? FEEDBACK_ACCENT : "divider",
                      bgcolor: selected ? alpha(FEEDBACK_ACCENT, 0.1) : "transparent",
                    }}
                  >
                    <Radio
                      checked={selected}
                      onChange={() => setCategory(t.value)}
                      name="type"
                      value={t.value}
                      sx={{ p: 0, color: "text.secondary", "&.Mui-checked": { color: FEEDBACK_ACCENT } }}
                    />
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: readable(t.color),
                        bgcolor: alpha(t.color, 0.16),
                      }}
                    >
                      {t.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t.hint}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <TextField
            select
            size="small"
            label="Hvilken side gjelder det?"
            value={pagePath}
            onChange={(e) => setPagePath(e.target.value)}
            sx={{ maxWidth: 420 }}
          >
            {FEEDBACK_PAGES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            multiline
            minRows={5}
            fullWidth
            autoFocus
            label={category === "bug" ? "Beskriv feilen" : "Beskriv ønsket"}
            placeholder={
              category === "bug"
                ? "Hva skjedde, og hva forventet du skulle skje?"
                : "Hva savner du, og hva ville det hjulpet deg med?"
            }
            value={message}
            onChange={(e) => {
              const next = e.target.value.slice(0, FEEDBACK_MAX_LENGTH);
              setMessage(next);
              onDraftChange(next);
            }}
            helperText={`${message.length}/${FEEDBACK_MAX_LENGTH}`}
          />

          {similar.length > 0 && (
            <Box
              role="status"
              sx={{
                borderRadius: 3,
                p: 1.75,
                border: 1,
                borderColor: alpha(FEEDBACK_ACCENT, 0.35),
                bgcolor: alpha(FEEDBACK_ACCENT, 0.07),
              }}
            >
              <Typography sx={{ fontWeight: 600, mb: 0.25 }}>Er det meldt før?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                Disse ligner. Kommenter heller der enn å lage et nytt innspill.
              </Typography>
              <Stack spacing={1}>
                {similar.map((item) => (
                  <Box
                    key={item.id}
                    component="button"
                    type="button"
                    onClick={() => onOpenSimilar(item.id)}
                    sx={{
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      color: "text.primary",
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2.5,
                      px: 1.5,
                      py: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      "&:hover": { bgcolor: alpha(FEEDBACK_ACCENT, 0.1) },
                    }}
                  >
                    <StatusPill status={item.status} small />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.message}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <ImagePicker files={images} onChange={setImages} onError={setError} disabled={submitting} />

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
              Sendes som <strong>{author?.name ?? "deg"}</strong> og er synlig for alle, slik at samme sak
              ikke meldes inn to ganger. Du får varsel når eier svarer.
            </Typography>
            <Stack direction="row" spacing={1.25}>
              <Button onClick={close} disabled={submitting} color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
                Avbryt
              </Button>
              <Button
                variant="contained"
                disableElevation
                disabled={!canSubmit}
                onClick={() => void submit()}
                sx={{ textTransform: "none", fontWeight: 600, bgcolor: FEEDBACK_ACCENT, "&:hover": { bgcolor: "#7A2FB0" } }}
              >
                {submitting ? "Sender…" : "Send innspill"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Snackbar
        open={sent}
        autoHideDuration={4000}
        onClose={() => setSent(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSent(false)} variant="filled">
          Takk! Innspillet er sendt.
        </Alert>
      </Snackbar>
    </>
  );
}
