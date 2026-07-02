import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { ATC_PRODUCTS } from "../data/atcProducts";
import { useVnrAutoPaste } from "../../../shared/hooks/useVnrAutoPaste";

interface MedicationInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  autoPasteNumericClipboard?: boolean;
  onAutoPastedVnr?: () => void;
}

type SuggestionOption = {
  label: string;
  value: string;
};

const getProductLabel = (p: any, strength?: string, varenummer?: string) => {
  const base = p?.name ?? "";
  const f = p?.form ? ` ${p.form}` : "";
  const s = strength ? ` ${strength}` : "";
  const v = varenummer ? ` (${varenummer})` : "";
  return `${base}${f}${s}${v}`.trim();
};

const getFilteredOptions = (
  opts: SuggestionOption[],
  rawInput: string,
  productByVarenummer: Map<string, { product: any; strength?: string }>
) => {
  const raw = rawInput.trim();
  const numeric = raw.match(/^0*(\d+)$/)?.[1] ?? null;

  if (numeric) {
    const prefix = numeric;

    const matches = opts.filter((o) => {
      const m = o.label.match(/\((\d+)\)\s*$/);
      if (!m) return false;
      const vn = m[1];
      return vn.startsWith(prefix);
    });

    if (matches.length === 0) {
      const hit = productByVarenummer.get(prefix);
      if (!hit?.product) return [];
      const exactLabel = getProductLabel(hit.product, hit.strength, prefix);
      return opts.filter((o) => o.label === exactLabel).slice(0, 25);
    }

    const exactFirst = matches.sort((a, b) => {
      const av = a.label.match(/\((\d+)\)\s*$/)?.[1] ?? "";
      const bv = b.label.match(/\((\d+)\)\s*$/)?.[1] ?? "";

      const aExact = av === prefix ? 0 : 1;
      const bExact = bv === prefix ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      if (av.length !== bv.length) return av.length - bv.length;
      return a.label.localeCompare(b.label, "nb");
    });

    return exactFirst.slice(0, 25);
  }

  const q = raw.toLowerCase();
  if (!q) return opts.slice(0, 25);

  const starts = opts.filter((o) => o.label.toLowerCase().startsWith(q));
  const contains = opts.filter(
    (o) => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q)
  );

  return [...starts, ...contains].slice(0, 25);
};

const getNumericClipboardValue = (value: string): string => {
  const compact = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

  return /^\d{5,7}$/.test(compact) ? compact : "";
};

export const MedicationInput = ({
  value,
  onChange,
  autoFocus,
  autoPasteNumericClipboard = false,
  onAutoPastedVnr,
}: MedicationInputProps) => {
  const productIndex = useMemo(() => buildProductIndex(), []);
  const [open, setOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);
  const lastAutoFilledDigitsRef = useRef("");
  const pendingAutoPastedRef = useRef<{ digits: string; previousValue: string } | null>(null);

  const wireInputRef = useCallback((node: HTMLInputElement | null, muiInputRef?: any) => {
    inputElRef.current = node;

    // Preserve MUI/Autocomplete internal ref wiring
    if (!muiInputRef) return;
    if (typeof muiInputRef === "function") {
      muiInputRef(node);
    } else if (typeof muiInputRef === "object") {
      muiInputRef.current = node;
    }
  }, []);

  useEffect(() => {
    if (!autoFocus) return;

    // Autocomplete often re-renders; defer focus to the next frame
    requestAnimationFrame(() => {
      inputElRef.current?.focus();
      inputElRef.current?.select?.();
    });
  }, [autoFocus]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const options = useMemo<SuggestionOption[]>(() => {
    return Object.values(ATC_PRODUCTS)
      .flatMap((arr) => arr ?? [])
      .flatMap((p: any) => {
        if (Array.isArray(p.variants) && p.variants.length) {
          return p.variants.flatMap((v: any) => {
            const nums: number[] = Array.isArray(v.productNumbers) ? v.productNumbers : [];
            return nums.map((n) => ({
              label: getProductLabel(p, v.strength, String(n)),
              value: getProductLabel(p, v.strength, String(n)),
            }));
          });
        }

        // fallback (no variants)
        return [
          {
            label: getProductLabel(p),
            value: getProductLabel(p),
          },
        ];
      })
      .filter((opt, idx, all) => all.findIndex((o) => o.label === opt.label) === idx)
      .sort((a, b) => a.label.localeCompare(b.label, "nb"));
  }, []);

  const parsed = useMemo(() => parseMedicationInput(value, productIndex), [value, productIndex]);

  const productByVarenummer = useMemo(() => {
    const map = new Map<string, { product: any; strength?: string }>();

    Object.values(ATC_PRODUCTS)
      .flatMap((arr) => arr ?? [])
      .forEach((p: any) => {
        // Prefer the new variants structure
        if (Array.isArray(p.variants) && p.variants.length) {
          p.variants.forEach((v: any) => {
            const nums: number[] = Array.isArray(v?.productNumbers)
              ? v.productNumbers.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
              : [];

            nums.forEach((n) => map.set(String(n), { product: p, strength: v?.strength }));
          });
          return;
        }

        // Fallback legacy fields
        const rawNums = p.productNumbers ?? p.productNumber;
        const nums: number[] = Array.isArray(rawNums)
          ? rawNums.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
          : rawNums != null && Number.isFinite(Number(rawNums))
          ? [Number(rawNums)]
          : [];

        nums.forEach((n) => map.set(String(n), { product: p }));
      });

    return map;
  }, []);

  const numericQuery = value.trim().match(/^0*(\d+)/)?.[1] ?? null;
  const varenummerHit = numericQuery ? productByVarenummer.get(numericQuery) : null;
  const resolvedProduct = parsed.product ?? varenummerHit?.product ?? null;

  const trimmedValue = value.trim();
  const isExactOptionSelected = useMemo(() => {
    if (!trimmedValue) return false;
    return options.some((o) => o.value === trimmedValue);
  }, [options, trimmedValue]);

  const lastAutoConvertedRef = useRef<string | null>(null);
  const lastAutoSelectedRef = useRef<string | null>(null);

  const isPureVarenummerInput = useMemo(() => {
    const raw = value.trim();
    return /^0*\d+$/.test(raw);
  }, [value]);

  useEffect(() => {
    if (!isPureVarenummerInput) {
      lastAutoConvertedRef.current = null;
      return;
    }

    if (!numericQuery) return;
    if (lastAutoConvertedRef.current === numericQuery) return;

    // 1) Prefer exact lookup via map
    const hit = productByVarenummer.get(numericQuery);
    if (hit?.product) {
      const strengthText = (hit.strength ?? "").trim();
      const formText = hit.product?.form ? ` ${hit.product.form}` : "";
      const base = `${hit.product.name}${formText}${strengthText ? ` ${strengthText}` : ""}`.trim();
      const next = `${base} (${numericQuery})`.trim();

      if (next && value.trim() !== next) {
        lastAutoConvertedRef.current = numericQuery;
        onChange(next);
      }
      return;
    }

    // 2) Fallback: if options contain an exact varenummer match in parentheses, select it.
    // This makes "auto select" work even if the map doesn't have the varenummer.
    const exactOption = options.find((o) => {
      const m = o.label.match(/\((\d+)\)\s*$/);
      return m?.[1] === numericQuery;
    });

    if (exactOption && value.trim() !== exactOption.value) {
      lastAutoConvertedRef.current = numericQuery;
      onChange(exactOption.value);
    }
  }, [isPureVarenummerInput, numericQuery, onChange, productByVarenummer, value, options]);

  useEffect(() => {
    // Don't fight with the varenummer-only auto-convert effect.
    if (isPureVarenummerInput) return;

    if (isExactOptionSelected) {
      setOpen(false);
      return;
    }

    const raw = value.trim();
    if (!raw) {
      lastAutoSelectedRef.current = null;
      return;
    }

    // Avoid overly aggressive auto-fill on very short inputs.
    if (raw.length < 3) {
      lastAutoSelectedRef.current = null;
      return;
    }

    const filtered = getFilteredOptions(options, raw, productByVarenummer);

    if (filtered.length === 1) {
      const only = filtered[0];

      // Prevent loops: only auto-select if we are not already on that value
      if (only.value.trim() !== raw && lastAutoSelectedRef.current !== only.value) {
        lastAutoSelectedRef.current = only.value;
        onChange(only.value);
        setOpen(false);
      }
      return;
    }

    // Reset when there are multiple matches again.
    lastAutoSelectedRef.current = null;
  }, [isPureVarenummerInput, isExactOptionSelected, onChange, options, productByVarenummer, value]);

  // Apply a detected varenummer to the field (from ambient clipboard read or paste).
  const applyVnrDigits = useCallback(
    (digits: string) => {
      const normalizedDigits = digits.replace(/^0+/, "") || "0";
      const hasProductMatch = productByVarenummer.has(normalizedDigits);
      const hasOptionMatch = options.some((o) => {
        const m = o.label.match(/\((\d+)\)\s*$/);
        return m?.[1] === normalizedDigits;
      });

      if (!hasProductMatch && !hasOptionMatch) {
        // Ingen treff for kopiert varenummer: behold feltet uendret.
        pendingAutoPastedRef.current = null;
        setOpen(false);
        return;
      }

      // Ikke overstyr manuelt skrevet tekst.
      const currentValue = valueRef.current.trim();
      const canOverwrite =
        !currentValue || currentValue === lastAutoFilledDigitsRef.current || /^0*\d+$/.test(currentValue);
      if (!canOverwrite) return;

      lastAutoFilledDigitsRef.current = normalizedDigits;
      pendingAutoPastedRef.current = { digits: normalizedDigits, previousValue: currentValue };
      onChange(normalizedDigits);
      setOpen(false);
    },
    [onChange, options, productByVarenummer],
  );

  const { onPaste: onVnrPaste } = useVnrAutoPaste({
    enabled: autoPasteNumericClipboard,
    isFocused: isInputFocused,
    onVnr: applyVnrDigits,
    extract: getNumericClipboardValue,
  });

  useEffect(() => {
    const pending = pendingAutoPastedRef.current;
    if (!pending) return;

    // Verdien ble ikke oppdatert (f.eks. avvist av duplikat-sperre).
    if (value.trim() === pending.previousValue) {
      pendingAutoPastedRef.current = null;
      return;
    }

    // Hvis verdien ble avvist (f.eks. duplikat-sperre), dropp pending-flagget.
    if (!value.trim()) {
      pendingAutoPastedRef.current = null;
      return;
    }

    if (!resolvedProduct) return;

    const currentDigits = value.trim().match(/^0*(\d+)/)?.[1] ?? null;
    const hasPendingDigits =
      currentDigits === pending.digits || value.includes(`(${pending.digits})`);

    if (!hasPendingDigits) return;

    pendingAutoPastedRef.current = null;
    onAutoPastedVnr?.();
  }, [onAutoPastedVnr, resolvedProduct, value]);


  return (
    <Box className="medicationInput">
      <Autocomplete
        freeSolo
        options={options}
        value={null}
        inputValue={value}
        open={open && !isExactOptionSelected}
        onOpen={() => {
          if (!isExactOptionSelected) setOpen(true);
        }}
        onClose={() => setOpen(false)}
        onInputChange={(_, newInputValue) => onChange(newInputValue)}
        onChange={(_, selected) => {
          if (!selected) return;
          const opt = selected as SuggestionOption;
          onChange(opt.value);
        }}
        filterOptions={(opts, state) =>
          isExactOptionSelected
            ? []
            : getFilteredOptions(opts as SuggestionOption[], state.inputValue, productByVarenummer)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={(node) => wireInputRef(node, (params as any).inputProps?.ref)}
            label="Preparat og styrke"
            placeholder="Legg inn varenummer eller preparatnavn"
            fullWidth
            inputProps={{
              ...params.inputProps,
              onFocus: (e) => {
                setIsInputFocused(true);
                // @ts-expect-error: MUI inputProps typing doesn't always include onFocus
                params.inputProps?.onFocus?.(e);
              },
              onPaste: (e) => {
                // Når det som limes inn er et rent varenummer, håndterer vi det selv
                // (applyVnrDigits resolver til preparatnavn). Da må vi hindre nettleserens
                // native paste – ellers legges de rå sifrene på slutten av et allerede
                // utfylt felt, f.eks. "Norspan ... (24765)" + "24765" → "...(24765)24765".
                if (getNumericClipboardValue(e.clipboardData?.getData("text") ?? "")) {
                  e.preventDefault();
                }
                onVnrPaste(e);
                // @ts-expect-error: MUI inputProps typing doesn't always include onPaste
                params.inputProps?.onPaste?.(e);
              },
              onBlur: (e) => {
                setIsInputFocused(false);
                // @ts-expect-error: MUI inputProps typing doesn't always include onBlur
                params.inputProps?.onBlur?.(e);
              },
              onKeyDown: (e) => {
                // Prevent full page reload / form submit when pressing Enter in this field.
                // BUT allow Enter to select an option when the Autocomplete popup is open.
                if (e.key === "Enter") {
                  const expanded =
                    (e.currentTarget as HTMLElement).getAttribute("aria-expanded") === "true";

                  if (!expanded) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
                // Preserve any handler MUI provided
                // @ts-expect-error: MUI inputProps typing doesn't always include onKeyDown
                params.inputProps?.onKeyDown?.(e);
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "primary.main",
                },
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
            }}
          />
        )}
      />

      {!resolvedProduct && value.length > 3 && (
        <Typography variant="body2" color="error">
          Klarte ikke å gjenkjenne preparatnavn eller varenummer
        </Typography>
      )}
    </Box>
  );
};
