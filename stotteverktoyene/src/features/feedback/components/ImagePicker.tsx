import * as React from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { FEEDBACK_IMAGE_MAX_BYTES, FEEDBACK_MAX_IMAGES, isImageFile } from "../utils/image";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

/**
 * Legg ved skjermbilder: lim inn (Ctrl/Cmd+V mens skjemaet er aktivt), dra og slipp
 * eller velg fra maskinen. Forhåndsvisning med mulighet for å fjerne før innsending.
 */
export default function ImagePicker({ files, onChange, onError, disabled }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const previews = React.useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );
  React.useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const addFiles = React.useCallback(
    (incoming: File[]) => {
      const images = incoming.filter(isImageFile);
      if (images.length === 0) return;

      const tooBig = images.find((f) => f.size > FEEDBACK_IMAGE_MAX_BYTES);
      if (tooBig) {
        onError("Bildet er for stort (maks 15 MB).");
        return;
      }
      const room = FEEDBACK_MAX_IMAGES - files.length;
      if (room <= 0) {
        onError(`Du kan legge ved maks ${FEEDBACK_MAX_IMAGES} bilder.`);
        return;
      }
      onError(images.length > room ? `Du kan legge ved maks ${FEEDBACK_MAX_IMAGES} bilder.` : null);
      onChange([...files, ...images.slice(0, room)]);
    },
    [files, onChange, onError]
  );

  // Innliming av skjermbilder fra utklippstavlen (Ctrl/Cmd+V) mens siden er åpen.
  // Vanlig tekst limes inn som før – vi griper bare inn når det ligger bilder der.
  React.useEffect(() => {
    if (disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []).filter(isImageFile);
      if (pasted.length === 0) return;
      event.preventDefault();
      addFiles(pasted);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, disabled]);

  const atLimit = files.length >= FEEDBACK_MAX_IMAGES;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        Skjermbilder (valgfritt)
      </Typography>

      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(Array.from(e.dataTransfer.files));
        }}
        sx={{
          border: "1.5px dashed",
          borderColor: dragOver ? "primary.main" : "divider",
          bgcolor: (theme) => (dragOver ? alpha(theme.palette.primary.main, 0.06) : "transparent"),
          borderRadius: 2,
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {previews.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {previews.map(({ file, url }, index) => (
              <Box
                key={`${file.name}-${file.size}-${index}`}
                sx={{
                  position: "relative",
                  width: 96,
                  height: 68,
                  borderRadius: 1.5,
                  overflow: "hidden",
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={`Valgt bilde ${index + 1}`}
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <IconButton
                  size="small"
                  aria-label={`Fjern bilde ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    p: 0.25,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<AddPhotoAlternateRoundedIcon />}
            disabled={disabled || atLimit}
            onClick={() => inputRef.current?.click()}
            sx={{ textTransform: "none" }}
          >
            Velg bilde
          </Button>
          <Typography variant="caption" color="text.secondary">
            Eller lim inn med Ctrl/Cmd + V, eller dra inn hit. Maks {FEEDBACK_MAX_IMAGES} bilder.
          </Typography>
        </Box>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </Box>

      <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.75 }}>
        Bildene er synlige for alle i appen. Dekk til navn, personnummer og andre personopplysninger
        før du legger ved.
      </Typography>
    </Box>
  );
}
