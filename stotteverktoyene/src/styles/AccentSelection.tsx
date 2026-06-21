import { GlobalStyles as MuiGlobalStyles } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Setter tekstmarkeringsfargen (::selection) til gjeldende temas aksentfarge.
 *
 * Plasseres inne i en sides <ThemeProvider> slik at markert tekst matcher
 * fargen på siden man er på. Mens siden er montert overstyrer denne regelen
 * den globale ::selection-regelen i GlobalStyles; ved navigasjon vekk
 * fjernes den og standardfargen gjelder igjen.
 */
export function AccentSelection() {
  return (
    <MuiGlobalStyles
      styles={(theme) => {
        const backgroundColor = alpha(
          theme.palette.primary.main,
          theme.palette.mode === "dark" ? 0.42 : 0.24,
        );
        return {
          "::selection": { backgroundColor },
          "::-moz-selection": { backgroundColor },
        };
      }}
    />
  );
}
