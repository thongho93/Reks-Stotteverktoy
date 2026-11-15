import { Box, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";

import { ITEM_TYPE_LABEL, type ReleaseItem, type ReleaseItemType } from "./releases";

// Fargene følger resten av appen (grønn/rosa/gul), med mørk tekst på lys bakgrunn
// og lys tekst i mørk modus. Typen står alltid som tekst, så fargen er ikke eneste skille.
function chipColors(theme: Theme, type: ReleaseItemType): { color: string; bg: string } {
  const dark = theme.palette.mode === "dark";
  switch (type) {
    case "nytt":
      return {
        color: dark ? theme.palette.success.main : "#065F46",
        bg: alpha(theme.palette.success.main, dark ? 0.16 : 0.14),
      };
    case "forbedret":
      return {
        color: dark ? theme.palette.primary.main : "#8A2F57",
        bg: alpha(theme.palette.primary.main, dark ? 0.16 : 0.22),
      };
    case "rettet":
      return {
        color: dark ? theme.palette.warning.main : "#7A3E06",
        bg: alpha(theme.palette.warning.main, dark ? 0.16 : 0.18),
      };
  }
}

export function ReleaseItemRow({ item, last }: { item: ReleaseItem; last?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        py: 1.75,
        borderBottom: last ? "none" : "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        component="span"
        sx={(theme) => {
          const c = chipColors(theme, item.type);
          return {
            flexShrink: 0,
            width: 76,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            fontSize: 12,
            fontWeight: 600,
            color: c.color,
            backgroundColor: c.bg,
          };
        }}
      >
        {ITEM_TYPE_LABEL[item.type]}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, mb: 0.25 }}>{item.title}</Typography>
        <Typography sx={{ fontSize: 14, lineHeight: 1.5, color: "text.secondary" }}>{item.text}</Typography>
      </Box>
    </Box>
  );
}

export function ReleaseItemList({ items }: { items: ReleaseItem[] }) {
  return (
    <Box>
      {items.map((item, i) => (
        <ReleaseItemRow key={`${item.title}-${i}`} item={item} last={i === items.length - 1} />
      ))}
    </Box>
  );
}
