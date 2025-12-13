import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#d293acff",
    },
    secondary: {
      main: "#6B7280",
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#111827",
      secondary: "#4B5563",
    },
    error: {
      main: "#B91C1C",
    },
    warning: {
      main: "#D97706",
    },
    success: {
      main: "#047857",
    },
  },

  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),

    fontSize: 14,

    h1: {
      fontSize: "1.75rem",
      fontWeight: 600,
    },
    h2: {
      fontSize: "1.4rem",
      fontWeight: 600,
    },
    h3: {
      fontSize: "1.2rem",
      fontWeight: 600,
    },
    h4: {
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    body1: {
      fontSize: "0.95rem",
    },
    body2: {
      fontSize: "0.85rem",
    },
  },

  shape: {
    borderRadius: 12,
  },

  spacing: 8,

  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(17, 24, 39, 0.08)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F3F4F6",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        },
        body: {
          fontSize: "0.9rem",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "0.75rem",
        },
      },
    },
  },
});

export default theme;
