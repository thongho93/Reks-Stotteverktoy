import * as React from "react";
import { Autocomplete, Box, Chip, CircularProgress, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import type { InteractionEntity } from "../../fest/mappers/interactionsToIndex";
import { getEntityId, PRODUCT_SUFFIX_RE } from "../utils/resolveSearchInput";

const MAX_OPTIONS = 20;

type Props = {
  entities: InteractionEntity[];
  loading: boolean;
  selected: InteractionEntity[];
  onSelectedChange: (next: InteractionEntity[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  /** Tolk og legg til tekst (Enter uten forslag, eller innliming). */
  onSubmitText: (text: string) => void;
  /** Kalles ved innliming. Returner true hvis teksten er håndtert (standard innliming stoppes). */
  onPasteText: (text: string) => boolean;
  inputRef: React.Ref<HTMLInputElement>;
  onFocus: () => void;
  onBlur: () => void;
  hero?: boolean;
};

function displayLabel(e: InteractionEntity): string {
  return e.label.replace(PRODUCT_SUFFIX_RE, "").trim();
}

function isExactAtc7(v: string) {
  return /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/.test(v.trim().toUpperCase());
}

// «C03A A» → «C03AA». Slår kun sammen når resultatet ser ut som en ATC-kode/-prefiks.
function collapseAtcSpaces(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const collapsed = trimmed.replace(/\s+/g, "");
  if (/\s/.test(trimmed) && /^[A-Z][0-9]{2}[A-Z0-9]{1,4}$/.test(collapsed.toUpperCase())) {
    return collapsed;
  }
  return raw;
}

function rank(label: string, atc: string, tokens: string[]): number {
  const l = label.toLowerCase();
  const a = atc.toLowerCase();
  if (tokens.length === 1) {
    const t = tokens[0];
    if (l === t || a === t) return 0;
    if (l.startsWith(t) || a.startsWith(t)) return 1;
    if (l.split(/[\s-]+/).some((w) => w.startsWith(t))) return 2;
  }
  return 3;
}

export default function InteractionSearchField({
  entities,
  loading,
  selected,
  onSelectedChange,
  inputValue,
  onInputValueChange,
  onSubmitText,
  onPasteText,
  inputRef,
  onFocus,
  onBlur,
  hero = false,
}: Props) {
  const optionCountRef = React.useRef(0);

  const filterOptions = React.useCallback(
    (options: InteractionEntity[], state: { inputValue: string }) => {
      // Alle ord i søket må treffe navn eller ATC (rekkefølgen er likegyldig).
      const tokens = state.inputValue.toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) {
        optionCountRef.current = 0;
        return [];
      }

      const hits: Array<{ e: InteractionEntity; r: number }> = [];
      for (const e of options) {
        const label = displayLabel(e);
        const hay = `${label} ${e.atc ?? ""}`.toLowerCase();
        if (!tokens.every((t) => hay.includes(t))) continue;
        hits.push({ e, r: rank(label, e.atc ?? "", tokens) });
      }

      // Virkestoff før preparat (grupperingen i listen krever sammenhengende grupper),
      // og best treff først innen hver gruppe.
      const kindOrder = (e: InteractionEntity) => (e.kind === "product" ? 1 : 0);
      hits.sort((a, b) => kindOrder(a.e) - kindOrder(b.e) || a.r - b.r);

      const result: InteractionEntity[] = [];
      const perKind = [0, 0];
      for (const h of hits) {
        const k = kindOrder(h.e);
        // Gi begge grupper plass, så ikke ett virkestoff med mange preparater tar alt.
        if (perKind[k] >= MAX_OPTIONS / 2 && hits.length > MAX_OPTIONS) continue;
        perKind[k]++;
        result.push(h.e);
        if (result.length >= MAX_OPTIONS) break;
      }
      optionCountRef.current = result.length;
      return result;
    },
    [],
  );

  const radius = hero ? "18px" : "14px";
  const iconGutter = hero ? 40 : 32;

  return (
    <Autocomplete<InteractionEntity, true, false, false>
      multiple
      autoHighlight
      forcePopupIcon={false}
      loading={loading}
      loadingText="Laster interaksjonsdata …"
      noOptionsText="Ingen forslag. Trykk Enter for å tolke teksten som ATC, varenummer eller liste."
      options={entities}
      value={selected}
      inputValue={inputValue}
      open={inputValue.trim().length > 0}
      filterOptions={filterOptions}
      groupBy={(o) => (o.kind === "product" ? "Legemiddel (preparatnavn)" : "Virkestoff og grupper")}
      getOptionLabel={(o) => (o.atc ? `${displayLabel(o)} (${o.atc})` : displayLabel(o))}
      isOptionEqualToValue={(a, b) => getEntityId(a) === getEntityId(b)}
      clearOnBlur={false}
      onInputChange={(_, raw, reason) => {
        if (reason !== "input") {
          // Valg, nullstilling osv.: MUI gir oss ferdig verdi (tom streng).
          onInputValueChange(raw);
          return;
        }
        const value = collapseAtcSpaces(raw);
        onInputValueChange(value);

        // Eksakt 7-tegns ATC legges til automatisk når det finnes én entydig kode.
        const q = value.trim().toUpperCase();
        if (isExactAtc7(q)) {
          const exact = entities.filter(
            (e) => e.kind !== "product" && (e.atc ?? "").toUpperCase() === q,
          );
          if (exact.length === 1) onSubmitText(q);
        }
      }}
      onChange={(_, values) => {
        const seen = new Set<string>();
        const deduped: InteractionEntity[] = [];
        for (const e of values) {
          const id = getEntityId(e);
          if (seen.has(id)) continue;
          seen.add(id);
          deduped.push(e);
        }
        onSelectedChange(deduped);
      }}
      renderTags={(value, getTagProps) =>
        value.map((option, i) => {
          const { key, ...tagProps } = getTagProps({ index: i });
          return (
            <Chip
              key={key}
              {...tagProps}
              size="small"
              label={
                <>
                  {displayLabel(option)}
                  {option.atc ? (
                    <Box
                      component="span"
                      sx={{ ml: 0.75, fontSize: 11, opacity: 0.65, fontVariantNumeric: "tabular-nums" }}
                    >
                      {option.atc}
                    </Box>
                  ) : null}
                </>
              }
              sx={(t) => ({
                height: 28,
                "&&": { m: "2px 6px 4px 2px" },
                borderRadius: 999,
                fontWeight: 600,
                color: t.palette.mode === "dark" ? "#F1B9B7" : "#8F2F2D",
                bgcolor: alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.18 : 0.1),
                border: `1px solid ${alpha(t.palette.primary.main, 0.35)}`,
                "& .MuiChip-deleteIcon": { color: "inherit", opacity: 0.55, "&:hover": { opacity: 1, color: "inherit" } },
              })}
            />
          );
        })
      }
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.9 }}
          >
            <Typography noWrap sx={{ fontWeight: 500 }}>
              {displayLabel(option)}
            </Typography>
            {option.atc ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}
              >
                {option.atc}
              </Typography>
            ) : null}
          </Box>
        );
      }}
      slotProps={{
        paper: { sx: { mt: 0.75, borderRadius: "14px", boxShadow: 6 } },
        listbox: { sx: { py: 0.5 } },
        clearIndicator: { sx: { visibility: "visible" } },
      }}
      renderInput={(params) => (
        <TextField
          id={params.id}
          disabled={params.disabled}
          fullWidth={params.fullWidth}
          size={params.size}
          autoFocus
          inputRef={inputRef}
          placeholder={
            selected.length === 0
              ? "Søk eller lim inn legemiddel, virkestoff, ATC eller varenummer"
              : "Legg til …"
          }
          aria-label="Søk etter interaksjoner"
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={(e) => {
            const text = e.clipboardData?.getData("text") ?? "";
            if (!text.trim()) return;
            if (onPasteText(text)) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && inputValue.trim().length === 0) {
              // Ikke la MUI slette siste valgte når feltet er tomt – chips fjernes med ×.
              e.stopPropagation();
              return;
            }
            if (e.key === "Enter" && inputValue.trim() && optionCountRef.current === 0) {
              e.preventDefault();
              onSubmitText(inputValue);
            }
          }}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <SearchRoundedIcon
                    sx={{
                      position: "absolute",
                      left: hero ? 18 : 15,
                      top: hero ? 19 : 11,
                      color: "text.secondary",
                      fontSize: hero ? 26 : 22,
                      pointerEvents: "none",
                    }}
                  />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
            htmlInput: params.inputProps,
            inputLabel: params.InputLabelProps,
          }}
        />
      )}
      sx={(t) => ({
        "& .MuiOutlinedInput-root": {
          borderRadius: radius,
          minHeight: hero ? 64 : 54,
          py: hero ? 0.75 : 0.5,
          pb: selected.length > 0 ? 1.5 : undefined,
          gap: 0,
          fontSize: hero ? "1.05rem" : "0.95rem",
          bgcolor: t.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          boxShadow:
            t.palette.mode === "dark"
              ? "0 1px 2px rgba(0,0,0,0.4)"
              : hero
                ? "0 6px 24px rgba(200,80,80,0.10), 0 1px 3px rgba(0,0,0,0.05)"
                : "0 1px 3px rgba(0,0,0,0.05)",
          transition: "box-shadow 160ms ease, border-color 160ms ease",
          "& fieldset": {
            borderColor: t.palette.mode === "dark" ? "rgba(220,90,90,0.28)" : "rgba(200,80,80,0.28)",
          },
          "&:hover fieldset": { borderColor: alpha(t.palette.primary.main, 0.6) },
          "&.Mui-focused": { boxShadow: `0 0 0 4px ${alpha(t.palette.primary.main, 0.16)}` },
          "&.Mui-focused fieldset": { borderColor: t.palette.primary.main, borderWidth: 1.5 },
        },
        // Søkelinjen ligger alltid øverst (egen rad); valgte chips legges på rader under.
        "& .MuiAutocomplete-input": {
          order: -1,
          flex: "1 0 100% !important",
          width: "100% !important",
          // Uten border-box blir feltet bredere enn boksen (bredde + padding) og gir sidelengs rulling.
          boxSizing: "border-box !important",
          // Fast høyde på selve søkelinjen, så den er like romslig med og uten chips under.
          height: hero ? "52px !important" : "44px !important",
          py: "0 !important",
          pl: `${iconGutter}px !important`,
          pr: "34px !important",
        },
        "& .MuiAutocomplete-endAdornment": { top: hero ? "18px" : "13px" },
      })}
    />
  );
}
