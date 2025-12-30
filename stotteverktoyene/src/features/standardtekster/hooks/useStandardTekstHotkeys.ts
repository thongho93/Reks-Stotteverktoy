import { useEffect } from "react";
import type React from "react";

type UseStandardTekstHotkeysArgs = {
  preparatRows: Array<{ picked?: string | null }>;
  clearPreparats: () => void;
  clearNumbersAndDate?: () => void;
  preparatSearchInputRef: React.RefObject<HTMLInputElement | null>;
  standardTekstSearchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function useStandardTekstHotkeys({
  preparatRows,
  clearPreparats,
  clearNumbersAndDate,
  preparatSearchInputRef,
  standardTekstSearchInputRef,
}: UseStandardTekstHotkeysArgs) {
  // Escape -> clear picked preparats (if any) and optionally clear numbers/date
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const hadPickedPreparats = preparatRows.some((r) => r.picked);

      // Nothing to do
      if (!hadPickedPreparats && !clearNumbersAndDate) return;

      e.preventDefault();

      if (hadPickedPreparats) {
        clearPreparats();
      }

      clearNumbersAndDate?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearPreparats, clearNumbersAndDate, preparatRows]);

  // Ctrl/Cmd + F -> focus preparat search (override browser find)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCombo = (e.shiftKey && (e.ctrlKey || e.metaKey) && e.code === "KeyF");
      if (!isCombo) return;

      e.preventDefault();
      preparatSearchInputRef.current?.focus();
      preparatSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preparatSearchInputRef]);

  // Ctrl/Cmd + S -> focus "Søk i standardtekster" (prevent browser Save dialog)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCombo = (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");
      if (!isCombo) return;

      e.preventDefault();
      standardTekstSearchInputRef.current?.focus();
      standardTekstSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [standardTekstSearchInputRef]);
}