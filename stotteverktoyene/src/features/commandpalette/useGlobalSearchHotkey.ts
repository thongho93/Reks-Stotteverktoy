import { useEffect, useState } from "react";

export function useGlobalSearchHotkey() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Ctrl/Cmd + Space åpner globalt søk. Vanlig mellomrom er ledig for sidene (f.eks. søk i Melkeerstatning).
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;

      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => !v);
    };

    // Capture phase: runs before page-level keydown handlers (e.g. page-level Space handlers)
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return {
    open,
    openSearch: () => setOpen(true),
    closeSearch: () => setOpen(false),
  };
}
