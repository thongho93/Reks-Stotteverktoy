import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#E6A5BE" : "#D293AC",
      },
      secondary: {
        main: isDark ? "#96A6BF" : "#6B7280",
      },
      background: {
        default: isDark ? "#060B12" : "#F9FAFB",
        paper: isDark ? "#0E1521" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#EDF3FC" : "#111827",
        secondary: isDark ? "#A5B1C6" : "#4B5563",
      },
      divider: isDark ? "rgba(165, 177, 198, 0.34)" : "rgba(17, 24, 39, 0.1)",
      error: {
        main: isDark ? "#F07178" : "#B91C1C",
      },
      warning: {
        main: isDark ? "#F2AA4C" : "#D97706",
      },
      success: {
        main: isDark ? "#42C18D" : "#047857",
      },
      action: {
        hover: isDark ? "rgba(165, 177, 198, 0.11)" : "rgba(17, 24, 39, 0.04)",
        selected: isDark ? "rgba(230, 165, 190, 0.24)" : "rgba(210, 147, 172, 0.18)",
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
        fontSize: "1.55rem",
        fontWeight: 650,
      },
      h3: {
        fontSize: "1.2rem",
        fontWeight: 600,
      },
      h4: {
        fontSize: "1rem",
        fontWeight: 600,
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
            border: `1px solid ${alpha(isDark ? "#C7D2E6" : "#111827", isDark ? 0.2 : 0.08)}`,
            backgroundImage: "none",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isDark
              ? "linear-gradient(180deg, rgba(11, 18, 29, 0.99) 0%, rgba(8, 14, 24, 0.99) 100%)"
              : undefined,
            borderRight: isDark
              ? "1px solid rgba(165, 177, 198, 0.34)"
              : "1px solid rgba(17, 24, 39, 0.1)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha("#0C1118", 0.7) : "#FFFFFF",
            borderRadius: 12,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(isDark ? "#C7D2E6" : "#111827", isDark ? 0.22 : 0.16),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(isDark ? "#E6A5BE" : "#D293AC", 0.6),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "#E6A5BE" : "#D293AC",
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#1A2230" : "#F3F4F6",
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
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: isDark
                ? alpha("#E6A5BE", 0.12)
                : alpha("#D293AC", 0.1),
            },
            "&.Mui-selected": {
              backgroundColor: isDark
                ? alpha("#E6A5BE", 0.22)
                : alpha("#D293AC", 0.2),
            },
            "&.Mui-selected:hover": {
              backgroundColor: isDark
                ? alpha("#E6A5BE", 0.3)
                : alpha("#D293AC", 0.27),
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${alpha(isDark ? "#C7D2E6" : "#111827", isDark ? 0.2 : 0.08)}`,
            boxShadow: isDark
              ? "0 16px 42px rgba(3, 6, 11, 0.55)"
              : "0 12px 30px rgba(15, 23, 42, 0.12)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            boxShadow: isDark
              ? "0 8px 24px rgba(230, 165, 190, 0.24)"
              : "0 8px 18px rgba(210, 147, 172, 0.18)",
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
            backgroundColor: isDark ? "rgba(230, 237, 250, 0.95)" : "rgba(17, 24, 39, 0.92)",
            color: isDark ? "#0F1622" : "#F8FAFC",
            boxShadow: isDark
              ? "0 8px 20px rgba(2, 6, 23, 0.35)"
              : "0 8px 20px rgba(2, 6, 23, 0.2)",
          },
          arrow: {
            color: isDark ? "rgba(230, 237, 250, 0.95)" : "rgba(17, 24, 39, 0.92)",
          },
        },
      },
    },
  });
}

export default createAppTheme("light");
