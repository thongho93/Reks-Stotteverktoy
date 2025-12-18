import { Box } from "@mui/material";

export function renderContentWithPreparatHighlight(
  text: string,
  pickedPreparats: Array<string | null | undefined>
) {
  const tokenSx = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 0.75,
    px: 0.75,
    py: 0.15,
    lineHeight: 1.2,
    fontSize: "0.95em",
    whiteSpace: "nowrap",
  } as const;

  const placeholderPreparatSx = {
    ...tokenSx,
    bgcolor: "warning.light",
    color: "warning.contrastText",
    fontFamily: "monospace",
  } as const;

  const placeholderPreparat1Sx = {
    ...tokenSx,
    bgcolor: "info.light",
    color: "info.contrastText",
    fontFamily: "monospace",
  } as const;

  const pickedPrimarySx = {
    ...tokenSx,
    bgcolor: "success.light",
    color: "success.contrastText",
    fontWeight: 600,
  } as const;

  const pickedSecondarySx = {
    ...tokenSx,
    bgcolor: "info.light",
    color: "info.contrastText",
    fontWeight: 600,
  } as const;

    const placeholder0 = "{{PREPARAT}}";
    const placeholder1 = "{{PREPARAT1}}";

    // Render placeholders with distinct colors.
    if (text.includes(placeholder0) || text.includes(placeholder1)) {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `(${escapeRegExp(placeholder1)}|${escapeRegExp(placeholder0)})`,
        "g"
      );
      const parts = text.split(pattern);

      return (
        <>
          {parts.map((part, i) => {
            if (part === placeholder0) {
              return (
                <Box key={i} component="span" sx={placeholderPreparatSx}>
                  {part}
                </Box>
              );
            }
            if (part === placeholder1) {
              return (
                <Box key={i} component="span" sx={placeholderPreparat1Sx}>
                  {part}
                </Box>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </>
      );
    }

    const needles = (pickedPreparats ?? []).map((p) => (p ?? "").trim()).filter(Boolean);
    if (needles.length > 0) {
      const secondary = (pickedPreparats?.[1] ?? "").trim();

      // Prefer longest first to avoid partial matches (e.g. "Ventoline" inside "Ventoline 0,1 mg/dose").
      const uniq = Array.from(new Set(needles)).sort((a, b) => b.length - a.length);

      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(${uniq.map(escapeRegExp).join("|")})`, "gi");

      const parts = text.split(pattern);

      // If we didn't actually split, return original text
      if (parts.length > 1) {
        return (
          <>
            {parts.map((part, i) => {
              const matched = uniq.find((u) => u.toLowerCase() === part.toLowerCase());
              if (matched) {
                const sx =
                  secondary && matched.toLowerCase() === secondary.toLowerCase()
                    ? pickedSecondarySx
                    : pickedPrimarySx;

                return (
                  <Box key={i} component="span" sx={sx}>
                    {part}
                  </Box>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </>
        );
      }
    }

    return text;
  }
