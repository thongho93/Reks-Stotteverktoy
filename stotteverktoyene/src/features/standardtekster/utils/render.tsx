import { Box } from "@mui/material";

export function renderContentWithPreparatHighlight(
  text: string,
  pickedPreparats: Array<string | null | undefined>,
  opts?: {
    enableSecondaryHighlight?: boolean;
    tallValues?: string[];
    datoValue?: string;
    datoMndValue?: string;
  }
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
    bgcolor: "success.light",
    color: "success.contrastText",
    fontFamily: "monospace",
  } as const;

  const placeholderTallSx = {
    ...tokenSx,
    bgcolor: "info.light",
    color: "info.contrastText",
    fontFamily: "monospace",
  } as const;

  const placeholderDatoSx = {
    ...tokenSx,
    bgcolor: "secondary.light",
    color: "secondary.contrastText",
    fontFamily: "monospace",
  } as const;

  const pickedPrimarySx = {
    ...tokenSx,
    bgcolor: "warning.light",
    color: "warning.contrastText",
    fontWeight: 600,
  } as const;

  const pickedSecondarySx = {
    ...tokenSx,
    bgcolor: "success.light",
    color: "success.contrastText",
    fontWeight: 600,
  } as const;

  const renderTokensInText = (t: string) => {
    if (!t) return t;

    // Match both legacy {{...}} and plain tokens (no braces)
    // Supports: TALL, TALL1, TALL2... and DATO and DATO_MND
    const parts = t.split(
      /(\{\{\s*(?:TALL\d*|DATO_MND|DATO)\s*\}\}|\b(?:TALL\d*|DATO_MND|DATO)\b)/gi
    );
    if (parts.length <= 1) return t;

    return (
      <>
        {parts.map((part, i) => {
          // TALL / {{TALL}} / TALL1 / {{TALL1}} ...
          const tallMatch = part.match(/^(?:\{\{\s*)?TALL(\d*)(?:\s*\}\})?$/i);
          if (tallMatch) {
            const rawIdx = (tallMatch[1] ?? "").trim();
            const idx = rawIdx ? Number(rawIdx) : 0;

            const v = (opts?.tallValues?.[idx] ?? "").trim();
            const tokenLabel = idx === 0 ? "TALL" : `TALL${idx}`;
            const label = v || tokenLabel;

            return (
              <Box key={i} component="span" sx={placeholderTallSx}>
                {label}
              </Box>
            );
          }

          // DATO_MND / {{DATO_MND}}
          const datoMndMatch = part.match(/^(?:\{\{\s*)?DATO_MND(?:\s*\}\})?$/i);
          if (datoMndMatch) {
            const v = (opts?.datoMndValue ?? "").trim();
            const label = v || "DATO_MND";

            return (
              <Box key={i} component="span" sx={placeholderDatoSx}>
                {label}
              </Box>
            );
          }

          // DATO / {{DATO}}
          const datoMatch = part.match(/^(?:\{\{\s*)?DATO(?:\s*\}\})?$/i);
          if (datoMatch) {
            const v = (opts?.datoValue ?? "").trim();
            const label = v || "DATO";

            return (
              <Box key={i} component="span" sx={placeholderDatoSx}>
                {label}
              </Box>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  const placeholder0 = "PREPARAT1";
  const placeholder1 = "PREPARAT2";

  // Render placeholders with distinct colors.
  if (text.includes(placeholder0) || text.includes(placeholder1)) {
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(${escapeRegExp(placeholder1)}|${escapeRegExp(placeholder0)})`,
      "g"
    );
    const parts = text.split(pattern);

    const pickedList = (pickedPreparats ?? []).map((p) => (p ?? "").trim()).filter(Boolean);
    const picked0Value = pickedList[0] ?? "";
    const picked1Value = pickedList[1] ?? "";

    const hasPreparat1Token = text.includes(placeholder1);

    const renderChipList = (items: string[]) => {
      if (items.length === 0) return null;
      if (items.length === 1) {
        return (
          <Box component="span" sx={pickedPrimarySx}>
            {items[0]}
          </Box>
        );
      }

      return (
        <>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const isSecondLast = idx === items.length - 2;

            return (
              <span key={`${item}-${idx}`}>
                <Box component="span" sx={pickedPrimarySx}>
                  {item}
                </Box>
                {!isLast && (isSecondLast ? " og " : ", ")}
              </span>
            );
          })}
        </>
      );
    };

    return (
      <>
        {parts.map((part, i) => {
          if (part === placeholder0) {
            if (pickedList.length > 0) {
              // If the template only has PREPARAT, render all picked preparats as separate orange chips.
              if (!hasPreparat1Token && pickedList.length > 1) {
                return <span key={i}>{renderChipList(pickedList)}</span>;
              }

              // Otherwise, PREPARAT is the primary slot -> show first picked.
              return (
                <Box key={i} component="span" sx={pickedPrimarySx}>
                  {picked0Value}
                </Box>
              );
            }

            return (
              <Box key={i} component="span" sx={placeholderPreparatSx}>
                {part}
              </Box>
            );
          }

          if (part === placeholder1) {
            const picked1 = picked1Value;

            if (picked1) {
              return (
                <Box key={i} component="span" sx={pickedSecondarySx}>
                  {picked1}
                </Box>
              );
            }

            return (
              <Box key={i} component="span" sx={placeholderPreparat1Sx}>
                {part}
              </Box>
            );
          }

          return <span key={i}>{renderTokensInText(part)}</span>;
        })}
      </>
    );
  }

  const pickedList = (pickedPreparats ?? []).map((p) => (p ?? "").trim()).filter(Boolean);
  const needles = pickedList;
  if (needles.length > 0) {
    const enableSecondary = Boolean(opts?.enableSecondaryHighlight);
    // Use the second non-empty picked value as “secondary”. If there is only one picked value,
    // do NOT treat it as secondary (otherwise it becomes green and primary/orange never shows).
    const secondary = enableSecondary && pickedList.length > 1 ? pickedList[1] : "";

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
            return <span key={i}>{renderTokensInText(part)}</span>;
          })}
        </>
      );
    }
  }

  return renderTokensInText(text);
}
