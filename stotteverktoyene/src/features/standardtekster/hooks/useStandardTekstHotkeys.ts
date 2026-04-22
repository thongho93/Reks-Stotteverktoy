import { useEffect } from "react";
import type React from "react";

type UseStandardTekstHotkeysArgs = {
  preparatRows: Array<{ picked?: string | null }>;
  clearPreparats: () => void;
  clearNumbersAndDate?: () => void;
  preparatSearchInputRef: React.RefObject<HTMLInputElement | null>;
  standardTekstSearchInputRef: React.RefObject<HTMLInputElement | null>;
  isEditing?: boolean;
};

export function useStandardTekstHotkeys({
  preparatRows,
  clearPreparats,
  clearNumbersAndDate,
  preparatSearchInputRef,
  standardTekstSearchInputRef,
  isEditing = false,
}: UseStandardTekstHotkeysArgs) {
  const isTypingOrInteractiveTarget = (active: HTMLElement | null) => {
    const isTypingTarget =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      Boolean(active?.isContentEditable) ||
      active?.getAttribute("role") === "textbox";
    if (isTypingTarget) return true;

    const isInteractiveControl =
      active instanceof HTMLButtonElement ||
      active instanceof HTMLAnchorElement ||
      active?.getAttribute("role") === "button" ||
      active?.getAttribute("role") === "switch" ||
      active?.getAttribute("role") === "checkbox";
    return isInteractiveControl;
  };

  // Escape -> clear picked preparats (if any) and optionally clear numbers/date
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const hadPickedPreparats = preparatRows.some((r) => r.picked);
      const preparatInput = preparatSearchInputRef.current;
      const isPreparatSearchFocused =
        Boolean(preparatInput) && document.activeElement === preparatInput;

      // When there are no selected preparat chips, Escape should dismiss focus from
      // "Søk etter preparat" instead of keeping the field active.
      if (!hadPickedPreparats && isPreparatSearchFocused) {
        e.preventDefault();
        preparatInput?.blur();
        return;
      }

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

  // Space -> focus "Søk etter preparat" when no search field is active
  // and we are not in edit mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSpace = e.code === "Space" || e.key === " ";
      if (!isSpace) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditing) return;

      const preparatInput = preparatSearchInputRef.current;
      const standardInput = standardTekstSearchInputRef.current;
      const active = document.activeElement as HTMLElement | null;

      // Do nothing when one of the search inputs is already active.
      if (active === preparatInput || active === standardInput) return;

      // Never hijack Space when user is typing/using another interactive control.
      if (isTypingOrInteractiveTarget(active)) return;

      e.preventDefault();
      preparatInput?.focus();
      preparatInput?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, preparatSearchInputRef, standardTekstSearchInputRef]);

  // Ctrl+Space (Windows) / Cmd+Space (Mac) -> focus "Søk i standardtekster"
  // with the same guard logic as Space-to-search.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCombo = (e.ctrlKey || e.metaKey) && (e.code === "Space" || e.key === " ");
      if (!isCombo) return;
      if (isEditing) return;

      const preparatInput = preparatSearchInputRef.current;
      const standardInput = standardTekstSearchInputRef.current;
      const active = document.activeElement as HTMLElement | null;

      // Do nothing when one of the search inputs is already active.
      if (active === preparatInput || active === standardInput) return;

      // Never hijack combo while user is typing/using another control.
      if (isTypingOrInteractiveTarget(active)) return;

      e.preventDefault();
      standardInput?.focus();
      standardInput?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, preparatSearchInputRef, standardTekstSearchInputRef]);
}
