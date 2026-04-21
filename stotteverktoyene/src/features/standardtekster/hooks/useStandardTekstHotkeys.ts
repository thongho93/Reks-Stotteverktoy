import { useEffect } from "react";
import type React from "react";

type UseStandardTekstHotkeysArgs = {
  preparatRows: Array<{ picked?: string | null }>;
  clearPreparats: () => void;
  clearNumbersAndDate?: () => void;
  preparatSearchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function useStandardTekstHotkeys({
  preparatRows,
  clearPreparats,
  clearNumbersAndDate,
  preparatSearchInputRef,
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

  // Ctrl/Cmd + S -> focus "Søk etter preparat" (prevent browser Save dialog)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCombo = (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");
      if (!isCombo) return;

      e.preventDefault();
      preparatSearchInputRef.current?.focus();
      preparatSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preparatSearchInputRef]);
}
