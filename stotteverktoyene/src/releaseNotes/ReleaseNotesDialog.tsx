import { Box, Button, Dialog, DialogActions, DialogContent, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { ReleaseItemList } from "./ReleaseItems";
import { formatReleaseDate, type Release } from "./releases";

type Props = {
  /** Endringene brukeren ikke har sett, nyeste først. Må ha minst ett innslag. */
  releases: Release[];
  /**
   * "update": ny versjon er deployet, men ikke lastet. Dialogen kan ikke lukkes, kun «Oppdater nå».
   * "seen": appen er allerede oppdatert; brukeren får oppsummeringen og trykker «Forstått».
   */
  mode: "update" | "seen";
  updating?: boolean;
  onUpdate: () => void;
  onClose: () => void;
  onOpenArchive?: () => void;
};

export default function ReleaseNotesDialog({ releases, mode, updating, onUpdate, onClose, onOpenArchive }: Props) {
  const newest = releases[0];
  const isUpdate = mode === "update";

  return (
    <Dialog
      open
      onClose={isUpdate ? undefined : onClose}
      disableEscapeKeyDown={isUpdate}
      maxWidth={false}
      aria-labelledby="release-notes-title"
      slotProps={{
        paper: {
          sx: (theme) => ({
            width: 640,
            maxWidth: "calc(100% - 32px)",
            maxHeight: "calc(100% - 64px)",
            borderRadius: "16px",
            backgroundImage: "none",
            boxShadow: theme.palette.mode === "dark" ? "0 24px 64px rgba(2, 6, 18, 0.7)" : "0 24px 64px rgba(17, 24, 39, 0.35)",
          }),
        },
      }}
    >
      <Box sx={{ px: { xs: 2.5, sm: 4 }, pt: 3.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
          <Box
            component="span"
            sx={(theme) => ({
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.2,
              color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#8A2F57",
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.22),
            })}
          >
            {isUpdate ? "Ny versjon" : "Appen er oppdatert"}
          </Box>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{formatReleaseDate(newest.date)}</Typography>
        </Box>
        <Typography id="release-notes-title" component="h2" sx={{ fontSize: 24, lineHeight: 1.25, fontWeight: 650, letterSpacing: "-0.01em", mb: 1 }}>
          Dette er nytt i Støtteverktøyet
        </Typography>
        <Typography sx={{ fontSize: 15, lineHeight: 1.55, color: "text.secondary" }}>{newest.summary}</Typography>
      </Box>

      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: 0.5 }}>
        {releases.map((release, i) => (
          <Box key={release.id}>
            {releases.length > 1 && (
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", pt: i === 0 ? 1.5 : 2.5 }}>
                {formatReleaseDate(release.date)}
              </Typography>
            )}
            <ReleaseItemList items={release.items} />
          </Box>
        ))}
      </DialogContent>

      <DialogActions
        sx={(theme) => ({
          display: "block",
          px: { xs: 2.5, sm: 4 },
          py: 2.25,
          borderTop: "1px solid",
          borderColor: "divider",
          backgroundColor: theme.palette.mode === "dark" ? alpha("#fff", 0.03) : "#F9FAFB",
        })}
      >
        {updating ? (
          <Box role="status">
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.25 }}>Laster siden på nytt …</Typography>
            <LinearProgress sx={{ borderRadius: 999, height: 6 }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              {onOpenArchive && (
                <Button
                  variant="text"
                  onClick={onOpenArchive}
                  sx={(theme) => ({
                    textTransform: "none",
                    fontWeight: 500,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    minHeight: 44,
                    // Mørkere rosa enn primærfargen i lys modus, for lesbar kontrast mot hvitt.
                    color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#8A2F57",
                  })}
                >
                  Se tidligere endringer
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                disableElevation
                onClick={isUpdate ? onUpdate : onClose}
                sx={{ height: 44, px: 3, borderRadius: 999, textTransform: "none", fontWeight: 700, color: "#111827" }}
              >
                {isUpdate ? "Oppdater nå" : "Forstått"}
              </Button>
            </Box>
            {isUpdate && (
              <Typography sx={{ mt: 1.5, fontSize: 12.5, lineHeight: 1.5, color: "text.secondary" }}>
                Siden lastes på nytt. Ulagrede endringer går tapt.
              </Typography>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
