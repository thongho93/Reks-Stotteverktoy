import * as React from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { GlobalStyles } from "./GlobalStyles";
import { createAppTheme } from "./theme";
import { ColorModeContext, type ColorModeContextValue } from "./colorModeContext";

const THEME_STORAGE_KEY = "reks-theme-mode";

function getSystemPreferredMode(): PaletteMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialMode(): PaletteMode {
  if (typeof window === "undefined") return "light";
  const persisted = localStorage.getItem(THEME_STORAGE_KEY);
  if (persisted === "light" || persisted === "dark") {
    return persisted;
  }
  return getSystemPreferredMode();
}

type AppThemeProviderProps = {
  children: React.ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [mode, setMode] = React.useState<PaletteMode>(getInitialMode);

  React.useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.setAttribute("data-app-theme", mode);
  }, [mode]);

  const theme = React.useMemo(() => createAppTheme(mode), [mode]);

  const value = React.useMemo<ColorModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
