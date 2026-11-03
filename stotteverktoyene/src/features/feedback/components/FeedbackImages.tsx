import * as React from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import type { FeedbackAttachment } from "../types";

/** Miniatyrer av bilder som er lagt ved et innspill. Klikk åpner bildet stort. */
export default function FeedbackImages({ attachments }: { attachments: FeedbackAttachment[] }) {
  const [openUrl, setOpenUrl] = React.useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        {attachments.map((att, index) => (
          <Box
            key={att.path}
            component="button"
            type="button"
            aria-label={`Åpne vedlagt bilde ${index + 1}`}
            onClick={() => setOpenUrl(att.url)}
            sx={{
              p: 0,
              width: 120,
              height: 84,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              overflow: "hidden",
              cursor: "zoom-in",
              bgcolor: "action.hover",
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
            }}
          >
            <Box
              component="img"
              src={att.url}
              alt={`Vedlagt bilde ${index + 1}`}
              loading="lazy"
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>
        ))}
      </Box>

      <Dialog open={Boolean(openUrl)} onClose={() => setOpenUrl(null)} maxWidth="lg">
        <IconButton
          aria-label="Lukk"
          onClick={() => setOpenUrl(null)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
        {openUrl && (
          <Box
            component="img"
            src={openUrl}
            alt="Vedlagt bilde"
            sx={{ display: "block", maxWidth: "100%", maxHeight: "90vh", objectFit: "contain" }}
          />
        )}
      </Dialog>
    </>
  );
}
