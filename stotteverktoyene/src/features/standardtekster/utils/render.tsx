import { Box } from "@mui/material";

export function renderContentWithPreparatHighlight(text: string, pickedPreparat: string | null) {
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

  if (pickedPreparat) {
    const lower = text.toLowerCase();
    const needle = pickedPreparat.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const hit = text.slice(idx, idx + pickedPreparat.length);
      const after = text.slice(idx + pickedPreparat.length);
      return (
        <>
          {before}
          <Box component="span" sx={pickedSx}>
            {hit}
          </Box>
          {after}
        </>
      );
    }
  }

  return text;
}