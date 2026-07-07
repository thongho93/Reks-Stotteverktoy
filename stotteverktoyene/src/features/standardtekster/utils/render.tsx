import type { ChangeEvent, KeyboardEvent, MouseEvent, WheelEvent } from "react";
import { Box } from "@mui/material";
import type { Theme } from "@mui/material/styles";

import { isReservedBraceToken, pakkeWordForValue } from "./preparat";

export function renderContentWithPreparatHighlight(
  text: string,
  pickedPreparats: Array<string | null | undefined>,
  opts?: {
    enableSecondaryHighlight?: boolean;
    tallValues?: string[];
    datoValue?: string;
    datoMndValue?: string;
    klokkeslettDagValue?: string;
    virkestoffValue?: string;
    formuleringValue?: string;
    formuleringValues?: string[];
    formuleringOccurrenceValues?: string[];
    /** Når satt gjøres TALL-tokens til inline redigerbare input-felter i teksten. */
    onTallChange?: (idx: number, value: string) => void;
    /** Valgt segment-indeks per alternativ-gruppe-forekomst (null = ikke valgt ennå). */
    altSelections?: Array<number | null>;
    /** Kalles med (forekomst, segment) når bruker velger; (forekomst, null) for å angre valget. */
    onAltSelect?: (occurrenceIndex: number, segmentIndex: number | null) => void;
    /** true per valgfri-setning-forekomst som er valgt bort (default: tas med). */
    optionalRemoved?: boolean[];
    /** Kalles med forekomst-indeks når bruker klikker en valgfri setning av/på. */
    onOptionalToggle?: (occurrenceIndex: number) => void;
  }
) {
  let formuleringOccurrenceIdx = 0;
  // Forekomst-tellere for alternativ-grupper og valgfrie setninger. Ligger på
  // ytre nivå (som formuleringOccurrenceIdx) så indeksene teller riktig videre
  // på tvers av tekstdelene som PREPARAT-splittingen deler brødteksten i.
  let altOccurrenceIdx = 0;
  let optionalOccurrenceIdx = 0;

  const tokenSx = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    px: 0.85,
    py: 0.18,
    lineHeight: 1.25,
    fontSize: "0.9em",
    fontWeight: 650,
    letterSpacing: "0.01em",
    border: "1px solid transparent",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 2px rgba(2, 6, 18, 0.45)"
        : "0 1px 2px rgba(15, 23, 42, 0.12)",
    whiteSpace: "nowrap",
    verticalAlign: "baseline",
    textShadow: (theme: Theme) =>
      theme.palette.mode === "dark" ? "0 1px 0 rgba(2, 6, 18, 0.45)" : "none",
  } as const;

  const tokenPlaceholderSx = {
    ...tokenSx,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    fontWeight: 600,
    letterSpacing: "0.025em",
    borderStyle: "dashed",
  } as const;

  const placeholderPreparatSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(180, 83, 9, 0.52)" : "rgba(234, 179, 8, 0.18)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#FFE7C2" : "#7A3F00"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(251, 191, 36, 0.82)" : "rgba(217, 119, 6, 0.55)",
  } as const;

  const placeholderPreparat1Sx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(6, 95, 70, 0.48)" : "rgba(16, 185, 129, 0.16)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#D1FAE5" : "#065F46"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.8)" : "rgba(5, 150, 105, 0.5)",
  } as const;

  const placeholderTallSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(3, 105, 161, 0.5)" : "rgba(14, 165, 233, 0.16)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#D6F4FF" : "#075985"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.82)" : "rgba(2, 132, 199, 0.5)",
  } as const;

  // Inline redigerbart TALL-felt: samme blå token-utseende som placeholderTallSx,
  // men som et faktisk input. Stiplet kant når tomt, heltrukket når utfylt.
  const inlineTallInputSx = (filled: boolean) =>
    ({
      ...placeholderTallSx,
      borderStyle: filled ? "solid" : "dashed",
      font: "inherit",
      fontSize: "0.9em",
      fontWeight: 650,
      textAlign: "center",
      minWidth: "2.6em",
      appearance: "none",
      outline: "none",
      cursor: "text",
      "&:focus": {
        borderStyle: "solid",
        boxShadow: (theme: Theme) =>
          `0 0 0 2px ${theme.palette.mode === "dark" ? "rgba(56,189,248,0.5)" : "rgba(2,132,199,0.35)"}`,
      },
      "&::placeholder": {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
        letterSpacing: "0.025em",
        opacity: 0.85,
      },
    }) as const;

  // PAKKE er avledet (ikke redigerbar): viser "pakke"/"pakker" ut fra tallet foran.
  // Nøytral grå pille – heltrukket når tallet er kjent, stiplet ellers.
  const pakkeSx = (known: boolean) =>
    ({
      ...(known ? tokenSx : tokenPlaceholderSx),
      bgcolor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(100, 116, 139, 0.4)" : "rgba(100, 116, 139, 0.16)",
      color: (theme: Theme) => (theme.palette.mode === "dark" ? "#E2E8F0" : "#334155"),
      borderColor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.7)" : "rgba(100, 116, 139, 0.45)",
    }) as const;

  // Alternativ-gruppe: ett klikkbart segment per alternativ før valg (stiplet,
  // lilla), én heltrukket "valgt"-pille etter valg (klikkbar for å velge om igjen).
  const altChoiceSx = {
    ...tokenPlaceholderSx,
    cursor: "pointer",
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(109, 40, 217, 0.42)" : "rgba(139, 92, 246, 0.16)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#E9D8FD" : "#5B21B6"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(196, 181, 253, 0.8)" : "rgba(124, 58, 237, 0.5)",
    "&:hover": {
      bgcolor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(109, 40, 217, 0.6)" : "rgba(139, 92, 246, 0.28)",
    },
  } as const;

  const altPickedSx = {
    ...tokenSx,
    cursor: "pointer",
    fontWeight: 650,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(109, 40, 217, 0.55)" : "rgba(139, 92, 246, 0.22)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#F3E8FF" : "#5B21B6"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(196, 181, 253, 0.85)" : "rgba(124, 58, 237, 0.55)",
    "&:hover": {
      bgcolor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(109, 40, 217, 0.72)" : "rgba(139, 92, 246, 0.34)",
    },
  } as const;

  // Valgfri setning ({{...}} uten "/"): tas med som standard. Prikket
  // understrek + ✕ viser at den kan velges bort; bortvalgt = gjennomstreket.
  const optionalIncludedSx = {
    display: "inline",
    cursor: "pointer",
    borderRadius: "4px",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
    textDecorationColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.75)" : "rgba(100, 116, 139, 0.6)",
    "&:hover": {
      bgcolor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.08)",
    },
  } as const;

  const optionalRemovedSx = {
    display: "inline",
    cursor: "pointer",
    borderRadius: "4px",
    color: "text.disabled",
    opacity: 0.7,
    textDecorationLine: "line-through",
    textDecorationThickness: "2px",
    textDecorationColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(248, 113, 113, 0.85)" : "rgba(220, 38, 38, 0.6)",
    "&:hover": {
      bgcolor: (theme: Theme) =>
        theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.1)",
    },
  } as const;

  const optionalMarkSx = {
    fontSize: "0.72em",
    fontWeight: 700,
    ml: 0.4,
    verticalAlign: "super",
    color: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(248, 113, 113, 0.9)" : "rgba(220, 38, 38, 0.7)",
  } as const;

  const placeholderDatoSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(157, 23, 77, 0.44)" : "rgba(236, 72, 153, 0.14)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#FFE0EF" : "#9D174D"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(244, 114, 182, 0.8)" : "rgba(219, 39, 119, 0.45)",
  } as const;

  const placeholderVirkestoffSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(131, 24, 67, 0.44)" : "rgba(236, 72, 153, 0.14)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#FFE2F0" : "#861657"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(236, 72, 153, 0.78)" : "rgba(190, 24, 93, 0.45)",
  } as const;

  const pickedVirkestoffSx = {
    ...tokenSx,
    background: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(190, 24, 93, 0.62) 0%, rgba(157, 23, 77, 0.56) 100%)"
        : "linear-gradient(180deg, #f5bfd9 0%, #e8a7c8 100%)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#FFE9F4" : "#321223"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(244, 114, 182, 0.78)" : "rgba(165, 28, 97, 0.35)",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 1px 2px rgba(30, 7, 20, 0.42)"
        : "0 1px 0 rgba(255, 255, 255, 0.55) inset, 0 1px 2px rgba(70, 19, 45, 0.14)",
  } as const;

  const placeholderFormuleringSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(71, 85, 105, 0.52)" : "rgba(148, 163, 184, 0.18)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#E2E8F0" : "#334155"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.82)" : "rgba(100, 116, 139, 0.45)",
  } as const;

  const pickedFormuleringSx = {
    ...tokenSx,
    background: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(100, 116, 139, 0.78) 0%, rgba(71, 85, 105, 0.72) 100%)"
        : "linear-gradient(180deg, #94a3b8 0%, #7b8799 100%)",
    color: "#F8FAFC",
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.84)" : "rgba(71, 85, 105, 0.45)",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 0 rgba(255, 255, 255, 0.14) inset, 0 1px 2px rgba(15, 23, 42, 0.35)"
        : "0 1px 0 rgba(255, 255, 255, 0.28) inset, 0 1px 2px rgba(30, 41, 59, 0.2)",
  } as const;

  const placeholderFormuleringNumberedSx = {
    ...tokenPlaceholderSx,
    bgcolor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(67, 56, 202, 0.5)" : "rgba(99, 102, 241, 0.14)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#E2E7FF" : "#3730A3"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(129, 140, 248, 0.82)" : "rgba(79, 70, 229, 0.45)",
  } as const;

  const pickedFormuleringNumberedSx = {
    ...tokenSx,
    background: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(79, 70, 229, 0.56) 0%, rgba(67, 56, 202, 0.5) 100%)"
        : "linear-gradient(180deg, #7f8ba3 0%, #697487 100%)",
    color: "#F8FAFC",
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(129, 140, 248, 0.8)" : "rgba(71, 85, 105, 0.48)",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 0 rgba(255, 255, 255, 0.14) inset, 0 1px 2px rgba(30, 41, 59, 0.36)"
        : "0 1px 0 rgba(255, 255, 255, 0.25) inset, 0 1px 2px rgba(30, 41, 59, 0.22)",
  } as const;

  const pickedPrimarySx = {
    ...tokenSx,
    background: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(180, 83, 9, 0.92) 0%, rgba(146, 64, 14, 0.9) 100%)"
        : "linear-gradient(180deg, #ecae4d 0%, #df9124 100%)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#FFF7ED" : "#FFFDFA"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(252, 211, 77, 0.92)" : "rgba(146, 64, 14, 0.35)",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 1px 2px rgba(120, 53, 15, 0.42)"
        : "0 1px 0 rgba(255, 255, 255, 0.3) inset, 0 1px 2px rgba(120, 53, 15, 0.22)",
  } as const;

  const pickedSecondarySx = {
    ...tokenSx,
    background: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(6, 95, 70, 0.9) 0%, rgba(4, 120, 87, 0.88) 100%)"
        : "linear-gradient(180deg, #45bca2 0%, #29957b 100%)",
    color: (theme: Theme) => (theme.palette.mode === "dark" ? "#ECFDF5" : "#F7FFFC"),
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(110, 231, 183, 0.88)" : "rgba(6, 95, 70, 0.45)",
    boxShadow: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? "0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 1px 2px rgba(6, 78, 59, 0.42)"
        : "0 1px 0 rgba(255, 255, 255, 0.26) inset, 0 1px 2px rgba(6, 78, 59, 0.2)",
  } as const;

  const renderTokensInText = (t: string) => {
    if (!t) return t;

    // Match both legacy {{...}} and plain tokens (no braces), samt alternativ-
    // grupper {{seg1 / seg2 / ...}} (sjekkes først – tokens under inneholder aldri "/").
    // Supports: TALL, TALL1, TALL2... and KLOKKESLETT_DAG and DATO and DATO_MND and VIRKESTOFF and FORMULERING1, FORMULERING2...
    const parts = t.split(
      /(\{\{[^{}]*\/[^{}]*\}\}|\{\{[^{}]+\}\}|\b(?:TALL\d*|PAKKE|KLOKKESLETT_DAG|DATO_MND|DATO|VIRKESTOFF|FORMULERING\d*)\b)/g
    );
    if (parts.length <= 1) return t;

    // Nærmeste foranstående TALL-verdi – styrer PAKKE-tokenets entall/flertall.
    let lastTallValue = "";

    return (
      <>
        {parts.map((part, i) => {
          // Alternativ-gruppe: {{seg1 / seg2 / seg3}}. Sjekkes før TALL/PAKKE/osv.
          const altGroupMatch = part.match(/^\{\{([^{}]*\/[^{}]*)\}\}$/);
          if (altGroupMatch) {
            const segments = altGroupMatch[1]
              .split("/")
              .map((s) => s.trim())
              .filter(Boolean);

            if (segments.length >= 2) {
              const occurrenceIdx = altOccurrenceIdx;
              altOccurrenceIdx += 1;
              const selected = opts?.altSelections?.[occurrenceIdx] ?? null;
              const onAltSelect = opts?.onAltSelect;

              if (!onAltSelect) {
                // Ingen interaksjon koblet inn – vis rå gruppe uendret.
                return <span key={i}>{part}</span>;
              }

              if (selected != null && segments[selected] != null) {
                return (
                  <Box
                    key={i}
                    component="span"
                    role="button"
                    tabIndex={0}
                    title="Klikk for å velge et annet alternativ"
                    sx={altPickedSx}
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onAltSelect(occurrenceIdx, null);
                    }}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onAltSelect(occurrenceIdx, null);
                      }
                    }}
                  >
                    {renderTokensInText(segments[selected])}
                  </Box>
                );
              }

              return (
                <Box
                  key={i}
                  component="span"
                  sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.4, verticalAlign: "middle" }}
                >
                  {segments.map((seg, si) => (
                    <Box
                      key={si}
                      component="span"
                      role="button"
                      tabIndex={0}
                      title="Klikk for å velge dette alternativet"
                      sx={altChoiceSx}
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        onAltSelect(occurrenceIdx, si);
                      }}
                      onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onAltSelect(occurrenceIdx, si);
                        }
                      }}
                    >
                      {seg}
                    </Box>
                  ))}
                </Box>
              );
            }
          }

          // TALL / {{TALL}} / TALL1 / {{TALL1}} ...
          const tallMatch = part.match(/^(?:\{\{\s*)?TALL(\d*)(?:\s*\}\})?$/i);
          if (tallMatch) {
            const rawIdx = (tallMatch[1] ?? "").trim();
            const idx = rawIdx ? Number(rawIdx) : 0;

            const rawValue = opts?.tallValues?.[idx] ?? "";
            const v = rawValue.trim();
            lastTallValue = rawValue;
            const tokenLabel = idx === 0 ? "TALL" : `TALL${idx}`;

            if (opts?.onTallChange) {
              const onTallChange = opts.onTallChange;
              return (
                <Box
                  key={i}
                  component="input"
                  type="text"
                  inputMode="decimal"
                  value={rawValue}
                  placeholder={tokenLabel}
                  size={Math.max(rawValue.length, tokenLabel.length, 2)}
                  aria-label={tokenLabel}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onTallChange(idx, e.target.value)
                  }
                  // Ikke la klikk/markering i feltet trigge klikk-for-kopi på kortet.
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                  onMouseDown={(e: MouseEvent) => e.stopPropagation()}
                  onWheel={(e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
                  sx={inlineTallInputSx(Boolean(v))}
                />
              );
            }

            const label = v || tokenLabel;

            return (
              <Box key={i} component="span" sx={placeholderTallSx}>
                {label}
              </Box>
            );
          }

          // PAKKE / {{PAKKE}} – avledet av nærmeste foranstående TALL-verdi.
          const pakkeMatch = part.match(/^(?:\{\{\s*)?PAKKE(?:\s*\}\})?$/i);
          if (pakkeMatch) {
            const known = lastTallValue.trim() !== "";
            const label = known ? pakkeWordForValue(lastTallValue) : "pakke(r)";

            return (
              <Box key={i} component="span" sx={pakkeSx(known)}>
                {label}
              </Box>
            );
          }

          // KLOKKESLETT_DAG / {{KLOKKESLETT_DAG}}
          const klokkeslettMatch = part.match(/^(?:\{\{\s*)?KLOKKESLETT_DAG(?:\s*\}\})?$/i);
          if (klokkeslettMatch) {
            const v = (opts?.klokkeslettDagValue ?? "").trim();
            const label = v || "KLOKKESLETT_DAG";

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

          // VIRKESTOFF / {{VIRKESTOFF}}
          const virkestoffMatch = part.match(/^(?:\{\{\s*)?VIRKESTOFF(?:\s*\}\})?$/);
          if (virkestoffMatch) {
            const v = (opts?.virkestoffValue ?? "").trim();
            const label = v || "VIRKESTOFF";

            return (
              <Box
                key={i}
                component="span"
                sx={v ? pickedVirkestoffSx : placeholderVirkestoffSx}
              >
                {label}
              </Box>
            );
          }

          // FORMULERING / {{FORMULERING}} / FORMULERING1 / {{FORMULERING1}} ...
          const formuleringMatch = part.match(/^(?:\{\{\s*)?FORMULERING(\d*)(?:\s*\}\})?$/i);
          if (formuleringMatch) {
            const rawIdx = (formuleringMatch[1] ?? "").trim();
            const idx = rawIdx ? Number(rawIdx) : 0;

            const occurrenceValue =
              idx === 0
                ? (opts?.formuleringOccurrenceValues?.[formuleringOccurrenceIdx] ?? "").trim()
                : "";
            if (idx === 0) formuleringOccurrenceIdx += 1;

            const listValue = (opts?.formuleringValues?.[idx] ?? "").trim();
            const singleValue = idx === 0 ? (opts?.formuleringValue ?? "").trim() : "";
            const v = occurrenceValue || listValue || singleValue;

            const tokenLabel = idx === 0 ? "FORMULERING" : `FORMULERING${idx}`;
            const label = v || tokenLabel;

            const isNumbered = idx > 0;

            const sx = isNumbered
              ? v
                ? pickedFormuleringNumberedSx
                : placeholderFormuleringNumberedSx
              : v
              ? pickedFormuleringSx
              : placeholderFormuleringSx;

            return (
              <Box key={i} component="span" sx={sx}>
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

          // Valgfri setning: {{setning uten skråstrek}} – tas med som standard,
          // klikk for å velge bort / ta med igjen. Sjekkes ETTER token-branchene
          // over, så {{TALL}} o.l. aldri havner her.
          const optionalMatch = part.match(/^\{\{([^{}/]+)\}\}$/);
          if (optionalMatch && !isReservedBraceToken(optionalMatch[1]) && optionalMatch[1].trim()) {
            const inner = optionalMatch[1].trim();
            const occurrenceIdx = optionalOccurrenceIdx;
            optionalOccurrenceIdx += 1;
            const onOptionalToggle = opts?.onOptionalToggle;

            if (!onOptionalToggle) {
              // Ingen interaksjon koblet inn (f.eks. i lister) – vis som vanlig tekst.
              return <span key={i}>{renderTokensInText(inner)}</span>;
            }

            const removed = Boolean(opts?.optionalRemoved?.[occurrenceIdx]);
            return (
              <Box
                key={i}
                component="span"
                role="button"
                tabIndex={0}
                title={
                  removed
                    ? "Valgt bort – klikk for å ta med setningen igjen"
                    : "Klikk for å velge bort denne setningen før kopiering"
                }
                sx={removed ? optionalRemovedSx : optionalIncludedSx}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onOptionalToggle(occurrenceIdx);
                }}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onOptionalToggle(occurrenceIdx);
                  }
                }}
              >
                {removed ? inner : renderTokensInText(inner)}
                <Box component="span" sx={optionalMarkSx}>
                  {removed ? "+" : "✕"}
                </Box>
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
