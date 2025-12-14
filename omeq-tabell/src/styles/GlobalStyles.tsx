import { GlobalStyles as MuiGlobalStyles } from "@mui/material";

export function GlobalStyles() {
  return (
    <MuiGlobalStyles
      styles={(theme) => ({
        ":root": {
          colorScheme: "light",
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
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
          color: theme.palette.text.primary,
        },
        "#root": {
          minHeight: "100%",
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
