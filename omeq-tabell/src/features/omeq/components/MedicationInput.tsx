import { useEffect, useMemo, useRef } from "react";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { ATC_PRODUCTS } from "../data/atcProducts";

interface MedicationInputProps {
  value: string;
  onChange: (value: string) => void;
}

type SuggestionOption = {
  label: string;
  value: string;
};

const getProductLabel = (p: any) => (p?.manufacturer ? `${p.name} (${p.manufacturer})` : p?.name);

const parseStrengthString = (s?: string | null) => {
  if (!s) return null;
  const m = String(s).trim().match(/^([\d.,]+)\s*(.+)$/);
  if (!m) return null;
  return {
    value: m[1].replace(",", "."),
    unit: m[2].trim(),
  };
};

export const MedicationInput = ({ value, onChange }: MedicationInputProps) => {
  const productIndex = useMemo(() => buildProductIndex(), []);

  const options = useMemo<SuggestionOption[]>(() => {
    return Object.values(ATC_PRODUCTS)
      .flatMap((arr) => arr ?? [])
      .map((p) => {
        const label = p.manufacturer ? `${p.name} (${p.manufacturer})` : p.name;
        return { label, value: p.name };
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
  const resolvedStrength = parsed.strength ?? parseStrengthString(varenummerHit?.strength);

  const lastAutoConvertedRef = useRef<string | null>(null);

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

    const hit = productByVarenummer.get(numericQuery);
    if (!hit?.product) return;

    const strengthText = (hit.strength ?? "").trim();
    const base = `${hit.product.name}${strengthText ? ` ${strengthText}` : ""}`.trim();
    const next = `${base} (${numericQuery})`.trim();

    // Avoid rewriting if already in desired form
    if (next && value.trim() !== next) {
      lastAutoConvertedRef.current = numericQuery;
      onChange(next);
    }
  }, [isPureVarenummerInput, numericQuery, onChange, productByVarenummer, value]);

  return (
    <Box className="medicationInput">
      <Autocomplete
        freeSolo
        options={options}
        value={null}
        inputValue={value}
        onInputChange={(_, newInputValue) => onChange(newInputValue)}
        onChange={(_, selected) => {
          if (!selected) return;
          const opt = selected as SuggestionOption;
          onChange(opt.value);
        }}
        filterOptions={(opts, state) => {
          const raw = state.inputValue.trim();
          const numeric = raw.match(/^0*(\d+)$/)?.[1] ?? null;

          if (numeric) {
            const hit = productByVarenummer.get(numeric);
            if (!hit?.product) return [];
            const exactLabel = getProductLabel(hit.product);
            return opts.filter((o) => o.label === exactLabel).slice(0, 25);
          }

          const q = raw.toLowerCase();
          if (!q) return opts.slice(0, 25);

          const starts = opts.filter((o) => o.label.toLowerCase().startsWith(q));
          const contains = opts.filter(
            (o) => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q)
          );

          return [...starts, ...contains].slice(0, 25);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Preparat og styrke"
            placeholder='F.eks. "Tramagetic OD 200 mg"'
            fullWidth
          />
        )}
      />

      {resolvedProduct && (
        <Typography variant="body2" color="text.secondary">
          Preparat: {resolvedProduct.name}
        </Typography>
      )}
      {resolvedStrength && (
        <Typography variant="body2" color="text.secondary">
          Styrke: {resolvedStrength.value} {resolvedStrength.unit}
        </Typography>
      )}

      {!resolvedProduct && value.length > 3 && (
        <Typography variant="body2" color="error">
          Klarte ikke å gjenkjenne preparatnavn eller varenummer
        </Typography>
      )}
    </Box>
  );
};
