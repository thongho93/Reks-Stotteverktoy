import type { ElementType } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

export type HomeTile = {
  /** Nøkkelen fanen åpnes med (samme som i fanelinjen). */
  key: string;
  label: string;
  description: string;
  /** Liten tilleggslinje, f.eks. antall produkter. */
  meta?: string;
  Icon: ElementType;
};

// Forsiden til Produkt og råd: én flis per underfane, i samme rekkefølge som fanelinjen.
export default function ProduktOgRadHome({ tiles, onOpen }: { tiles: HomeTile[]; onOpen: (key: string) => void }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = {
    ink: isDark ? "#F1DAE9" : "#2D1727",
    muted: isDark ? "#BCA6B8" : "#6B5262",
    accent: isDark ? "#F09AC0" : "#A81F66",
    surface: isDark ? "#161B22" : "#FFFFFF",
    border: isDark ? "rgba(160,90,130,0.35)" : "#EAD2E1",
    hoverBorder: isDark ? "#E8609A" : "#C9709F",
    bubble: isDark ? "#3A1E32" : "#FCE7F2",
  };

  return (
    <Box sx={{ mt: 2.5, mb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography component="h1" sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, letterSpacing: "-0.02em", color: c.ink }}>
          Produkt og råd
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14.5, color: c.muted }}>Velg hva du vil slå opp.</Typography>
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        }}
      >
        {tiles.map(({ key, label, description, meta, Icon }) => (
          <Box component="li" key={key} sx={{ display: "flex" }}>
            <ButtonBase
              onClick={() => onOpen(key)}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                gap: 1.25,
                p: 2.25,
                borderRadius: "18px",
                border: `1px solid ${c.border}`,
                bgcolor: c.surface,
                color: c.ink,
                transition: "border-color .14s, transform .14s, box-shadow .14s",
                "&:hover": {
                  borderColor: c.hoverBorder,
                  transform: "translateY(-2px)",
                  boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.35)" : "0 10px 26px rgba(94,21,71,0.12)",
                },
                "&:focus-visible": { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 46,
                    height: 46,
                    borderRadius: "14px",
                    bgcolor: c.bubble,
                    color: c.accent,
                  }}
                >
                  <Icon sx={{ fontSize: 26 }} />
                </Box>
                <ArrowForwardRoundedIcon sx={{ fontSize: 20, color: c.muted }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{label}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 14, lineHeight: 1.5, color: c.muted }}>{description}</Typography>
              </Box>
              {meta ? (
                <Typography sx={{ mt: "auto", fontSize: 13, fontWeight: 600, color: c.accent }}>{meta}</Typography>
              ) : null}
            </ButtonBase>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
