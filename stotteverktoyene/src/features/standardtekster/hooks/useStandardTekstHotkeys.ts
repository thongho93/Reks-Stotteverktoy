

import { useEffect } from "react";

type UseStandardTekstHotkeysArgs = {
  preparatRows: Array<{ picked?: string | null }>;
  clearPreparats: () => void;
  preparatSearchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function useStandardTekstHotkeys({
  preparatRows,
  clearPreparats,
  preparatSearchInputRef,
}: UseStandardTekstHotkeysArgs) {
  // Escape -> clear all picked preparats (if any)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!preparatRows.some((r) => r.picked)) return;

      e.preventDefault();
      clearPreparats();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearPreparats, preparatRows]);

  // Alt / Option + F -> focus preparat search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.code !== "KeyF") return;

      e.preventDefault();
      preparatSearchInputRef.current?.focus();
      preparatSearchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preparatSearchInputRef]);
}