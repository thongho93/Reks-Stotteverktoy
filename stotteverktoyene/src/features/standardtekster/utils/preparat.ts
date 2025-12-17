import { useCallback, useState } from "react";
import type { PreparatRow } from "../types";

export function formatPreparatForTemplate(med: {
  varenavn: string | null;
  navnFormStyrke: string | null;
}): string {
  const nfsRaw = (med.navnFormStyrke ?? "").trim();
  const nfs = nfsRaw.replace(/\s+/g, " ").trim();

  // Try to extract the first strength-like fragment.
  // Supports: "0,1 mg/dose", "40 mg", "50 mikrog/500 mikrog", "1,25 mg/2,5 ml"
  // We stop at comma+space (", ") which is used as field separators in many FEST strings.
  const unit = "mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\\.e\\.|mmol|ml";
  const m = nfs.match(
    new RegExp(`(\\d+[.,]?\\d*\\s*(?:${unit})(?:\\s*\\/\\s*[^;\\)\\n]+?)?)(?=,\\s|$)`, "i")
  );

  const strength = m?.[1]
    ? m[1]
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  // Prefer name extracted from navnFormStyrke (this typically avoids manufacturer tokens like “Viatris/xiromed”).
  // 1) remove trailing metadata after comma (often pack info)
  const head = nfs.replace(/,.*$/, "").trim();

  // 2) take everything before a common dosage-form keyword
  const formWords = [
    "tab",
    "tablett",
    "kaps",
    "kapsel",
    "inj",
    "mikst",
    "mikstur",
    "inh",
    "aerosol",
    "pulv",
    "plaster",
    "spray",
    "oppl",
    "susp",
    "granulat",
    "krem",
    "salve",
    "gel",
    "liniment",
    "drasj",
    "supp",
    "stikkpille",
    "mikrog",
    "mikrogram",
  ].join("|");

  const beforeForm = head.split(new RegExp(`\\b(?:${formWords})\\b`, "i"))[0]?.trim() ?? "";
  const nameFromNfs = beforeForm.replace(/\s+/g, " ").trim();

  const fallbackName = (med.varenavn ?? "").trim();
  const name = nameFromNfs || fallbackName;

  if (name && strength) return `${name} ${strength}`.replace(/\s+/g, " ").trim();
  if (name) return name;
  return nfs || "";
}


export function replaceNextPreparatToken(text: string, value: string) {
  // Replace ONLY the next (first) placeholder occurrence
  return text.replace(/\{\{\s*PREPARAT\s*\}\}/, value);
}

export function usePreparatRows() {
  const [preparatRows, setPreparatRows] = useState<PreparatRow[]>([{ id: 0, picked: null }]);

  const addPreparatRow = useCallback(() => {
    setPreparatRows((prev) => {
      const nextId = (prev[prev.length - 1]?.id ?? 0) + 1;
      return [...prev, { id: nextId, picked: null }];
    });
  }, []);

  const removePreparatRow = useCallback((id: number) => {
    setPreparatRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [{ id: 0, picked: null }];
    });
  }, []);

  const setPickedForRow = useCallback((id: number, picked: string | null) => {
    setPreparatRows((prev) => prev.map((r) => (r.id === id ? { ...r, picked } : r)));
  }, []);

  const resetPreparatRows = useCallback(() => {
    setPreparatRows([{ id: 0, picked: null }]);
  }, []);

  return {
    preparatRows,
    addPreparatRow,
    removePreparatRow,
    setPickedForRow,
    resetPreparatRows,
  };
}