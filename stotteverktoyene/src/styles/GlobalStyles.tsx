import { GlobalStyles as MuiGlobalStyles } from "@mui/material";
import { alpha } from "@mui/material/styles";

export function GlobalStyles() {
  return (
    <MuiGlobalStyles
      styles={(theme) => ({
        ":root": {
          colorScheme: theme.palette.mode,
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          "--app-accent": theme.palette.primary.main,
          "--app-accent-soft": alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.3 : 0.16),
          "--app-accent-soft-strong": alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.42 : 0.26
          ),
          "--app-border-soft": alpha(
            theme.palette.text.primary,
            theme.palette.mode === "dark" ? 0.2 : 0.12
          ),
          "--app-border-strong": alpha(
            theme.palette.text.primary,
            theme.palette.mode === "dark" ? 0.34 : 0.24
          ),
          "--app-surface-1": theme.palette.background.paper,
          "--app-surface-2":
            theme.palette.mode === "dark"
              ? "rgba(15, 21, 30, 0.92)"
              : "rgba(255, 255, 255, 0.98)",
          "--app-surface-3":
            theme.palette.mode === "dark"
              ? "rgba(24, 33, 46, 0.78)"
              : "rgba(247, 250, 252, 0.98)",
          "--app-surface-hover":
            theme.palette.mode === "dark"
              ? "rgba(165, 177, 198, 0.12)"
              : "rgba(15, 23, 42, 0.06)",
          "--app-shadow-card":
            theme.palette.mode === "dark"
              ? "0 14px 36px rgba(2, 6, 18, 0.45)"
              : "0 12px 28px rgba(15, 23, 42, 0.1)",
          "--app-text-strong": theme.palette.text.primary,
          "--app-text-muted": theme.palette.text.secondary,
          "--app-muted-fill":
            theme.palette.mode === "dark"
              ? "rgba(165, 177, 198, 0.18)"
              : "rgba(15, 23, 42, 0.08)",
        },
        "*": {
          boxSizing: "border-box",
        },
        "html, body": {
          height: "100%",
        },
        body: {
          margin: 0,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.fontSize,
          lineHeight: 1.5,
          backgroundColor: theme.palette.background.default,
          backgroundImage:
            theme.palette.mode === "dark"
              ? "radial-gradient(circle at 20% -20%, rgba(230, 165, 190, 0.16) 0%, rgba(230, 165, 190, 0) 38%), radial-gradient(circle at 90% 0%, rgba(96, 165, 250, 0.12) 0%, rgba(96, 165, 250, 0) 35%)"
              : "none",
          backgroundAttachment: "fixed",
          color: theme.palette.text.primary,
          transition: "background-color 180ms ease, color 180ms ease",
        },
        "#root": {
          minHeight: "100vh",
        },
        "img, picture, video, canvas, svg": {
          display: "block",
          maxWidth: "100%",
        },
        "input, button, textarea, select": {
          font: "inherit",
        },
        "p, h1, h2, h3, h4, h5, h6": {
          margin: 0,
          overflowWrap: "break-word",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        "a:hover": {
          textDecoration: "underline",
        },
        "::selection": {
          backgroundColor: theme.palette.action.selected,
        },
        "::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: alpha(
            theme.palette.text.primary,
            theme.palette.mode === "dark" ? 0.28 : 0.2
          ),
          borderRadius: 999,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: alpha(
            theme.palette.text.primary,
            theme.palette.mode === "dark" ? 0.08 : 0.04
          ),
        },

        ".ratioBox": {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing(0.5),
        },
        ".fieldLabel": {
          marginTop: theme.spacing(0.75),
        },
        ".medicationInput": {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing(1.5),
        },
      })}
    />
  );
}
