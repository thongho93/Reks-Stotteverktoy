import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { pageFrameSx } from "../../../app/pageLayout";
import { ReleaseItemList } from "../../../releaseNotes/ReleaseItems";
import { BUNDLED_RELEASES, formatReleaseDate } from "../../../releaseNotes/releases";

/** Arkiv over alle endringer i appen, nyeste først. Data: src/releaseNotes/releases.json. */
export default function HvaErNyttPage() {
  return (
    <Box sx={pageFrameSx}>
      <Box sx={{ maxWidth: 820 }}>
        <Typography component="h1" variant="h1" sx={{ mb: 0.75 }}>
          Hva er nytt
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 4, lineHeight: 1.55 }}>
          Endringer i Støtteverktøyet, nyeste først.
        </Typography>

        {BUNDLED_RELEASES.length === 0 && (
          <Typography sx={{ color: "text.secondary" }}>Ingen endringer er registrert ennå.</Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {BUNDLED_RELEASES.map((release, i) => (
            <Box
              component="section"
              key={release.id}
              aria-label={formatReleaseDate(release.date)}
              sx={{ display: "flex", gap: { xs: 1.5, sm: 3.5 }, flexDirection: { xs: "column", sm: "row" } }}
            >
              <Box sx={{ flexShrink: 0, width: { sm: 130 }, pt: 0.25 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{formatReleaseDate(release.date)}</Typography>
                {i === 0 && (
                  <Box
                    component="span"
                    sx={(theme) => ({
                      display: "inline-block",
                      mt: 1.25,
                      px: 1.1,
                      py: 0.4,
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#8A2F57",
                      backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.22),
                    })}
                  >
                    Siste versjon
                  </Box>
                )}
              </Box>
              <Paper
                variant="outlined"
                sx={{ flex: 1, minWidth: 0, borderRadius: "12px", px: { xs: 2, sm: 2.75 }, py: 0.5 }}
              >
                <ReleaseItemList items={release.items} />
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
