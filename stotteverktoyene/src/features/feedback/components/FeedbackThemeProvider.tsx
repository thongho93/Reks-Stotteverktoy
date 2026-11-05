import * as React from "react";
import { alpha, createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

import { FEEDBACK_ACCENT } from "./feedbackUtils";

/**
 * Gir innspillssidene sin egen lilla aksentfarge (som «Innspill»-fanen), slik at fokus,
 * markering og knapper ikke får appens rosa grunnfarge.
 */
export default function FeedbackThemeProvider({ children }: { children: React.ReactNode }) {
  const baseTheme = useTheme();
  const theme = React.useMemo(
    () =>
      createTheme(baseTheme, {
        palette: {
          primary: baseTheme.palette.augmentColor({ color: { main: FEEDBACK_ACCENT } }),
        },
        // Mindre avrunding enn resten av appen: kort, felt og knapper får skarpere hjørner.
        shape: { borderRadius: 4 },
        components: {
          // Basistemaet hardkoder rosa hover/fokus på OutlinedInput. Overstyr til sidens lilla.
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(FEEDBACK_ACCENT, 0.6),
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: FEEDBACK_ACCENT,
                },
              },
            },
          },
        },
      }),
    [baseTheme]
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
