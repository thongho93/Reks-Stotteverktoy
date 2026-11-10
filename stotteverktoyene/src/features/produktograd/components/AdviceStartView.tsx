import { Box, ButtonBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { AdviceProduct } from "../data/adviceProducts";
import AdviceBrowse from "./AdviceBrowse";

export type PopularAtc = { code: string; title: string; count: number };

type Props = {
  popular: PopularAtc[];
  products: AdviceProduct[];
  onPick: (code: string) => void;
};

export default function AdviceStartView({ popular, products, onPick }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const ink = isDark ? "#F2EDF0" : "#2D1727";
  const accent = isDark ? "#F09AC0" : "#A81F66";

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", display: "grid", gap: 1, pt: 0.5 }}>
      <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, color: ink }}>
        Vanlige virkestoff
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
        }}
      >
        {popular.map(({ code, title }) => (
          <ButtonBase
            key={code}
            onClick={() => onPick(code)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 1,
              px: 1.5,
              py: 0.75,
              minHeight: 46,
              textAlign: "left",
              borderRadius: "10px",
              bgcolor: isDark ? "#161B22" : "#FFFFFF",
              border: `1px solid ${isDark ? "rgba(140,80,120,0.3)" : "#EAD2E1"}`,
              transition: "background-color 120ms, border-color 120ms",
              "&:hover": {
                bgcolor: isDark ? "rgba(180,40,100,0.18)" : "#FCE7F2",
                borderColor: isDark ? "rgba(220,100,170,0.5)" : "#E6B5D0",
              },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.25 }}>{title}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: "0.03em", lineHeight: 1.25 }}>
                {code}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
      </Box>

      <AdviceBrowse products={products} onPick={onPick} />
    </Box>
  );
}
