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

  const placeholderSx = {
    ...tokenSx,
    bgcolor: "warning.light",
    color: "warning.contrastText",
    fontFamily: "monospace",
  } as const;

  const pickedSx = {
    ...tokenSx,
    bgcolor: "success.light",
    color: "success.contrastText",
    fontWeight: 600,
  } as const;

  const placeholder = "{{PREPARAT}}";

  if (text.includes(placeholder)) {
    const parts = text.split(placeholder);
    return (
      <>
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 ? (
              <Box component="span" sx={placeholderSx}>
                {placeholder}
              </Box>
            ) : null}
          </span>
        ))}
      </>
    );
  }

  const needles = (pickedPreparats ?? []).map((p) => (p ?? "").trim()).filter(Boolean);
  if (needles.length > 0) {
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
              return (
                <Box key={i} component="span" sx={pickedSx}>
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