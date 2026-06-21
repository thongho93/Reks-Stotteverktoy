import * as React from "react";

// Default: a varenummer is a 5–7 digit number (matches the OMEQ preparat-field).
const DEFAULT_VNR_RE = /^\d{5,7}$/;

/** Returns the matched vnr digits from arbitrary clipboard/paste text, or "" if none. */
export function extractVnr(text: string, re: RegExp = DEFAULT_VNR_RE): string {
  const compact = String(text ?? "")
    .trim()
    .replace(/\s+/g, "");
  return re.test(compact) ? compact : "";
}

export type UseVnrAutoPasteOptions = {
  /** Master toggle ("Auto vnr"). Gates the ambient clipboard read on focus. */
  enabled: boolean;
  /** Only read the clipboard while the target field is focused. */
  isFocused: boolean;
  /** Called with the matched digit string when a varenummer is detected. */
  onVnr: (digits: string) => void;
  /** Custom matcher; defaults to a 5–7 digit number. Return "" for no match. */
  extract?: (text: string) => string;
};

/**
 * Shared "Auto vnr" mechanism. Two complementary triggers, no polling:
 *
 *  1. Ambient — reads the clipboard once on focus and on every window refocus
 *     (covers "copy vnr in fagsystem → alt-tab back → autofill"). Gated by
 *     `enabled` + `isFocused`. Uses `navigator.clipboard.readText()`, which the
 *     browser may block; failures back off silently until the next focus.
 *  2. Explicit — the returned `onPaste` handler reads `event.clipboardData`
 *     directly (no clipboard permission needed) and always fires on Ctrl+V.
 *
 * Replaces the previous per-field 650 ms `setInterval` polling.
 */
export function useVnrAutoPaste({ enabled, isFocused, onVnr, extract }: UseVnrAutoPasteOptions) {
  const onVnrRef = React.useRef(onVnr);
  onVnrRef.current = onVnr;
  const extractRef = React.useRef(extract);
  extractRef.current = extract;

  const inFlightRef = React.useRef(false);
  const blockedRef = React.useRef(false);
  const lastSeenRef = React.useRef<string | null>(null);

  const doExtract = React.useCallback(
    (text: string) => (extractRef.current ?? ((t: string) => extractVnr(t)))(text),
    [],
  );

  const readClipboard = React.useCallback(async () => {
    if (typeof navigator === "undefined") return;
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
    if (inFlightRef.current || blockedRef.current) return;

    inFlightRef.current = true;
    try {
      const raw = await navigator.clipboard.readText();
      const digits = doExtract(raw);
      if (!digits || digits === lastSeenRef.current) return;
      lastSeenRef.current = digits;
      onVnrRef.current(digits);
    } catch {
      // Clipboard read blocked by browser policy — stop retrying until next focus.
      blockedRef.current = true;
    } finally {
      inFlightRef.current = false;
    }
  }, [doExtract]);

  React.useEffect(() => {
    if (!enabled || !isFocused) return;

    // Fresh focus: let a previously-blocked read retry and the same vnr re-fill.
    blockedRef.current = false;
    lastSeenRef.current = null;

    void readClipboard();
    const onWindowFocus = () => void readClipboard();
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [enabled, isFocused, readClipboard]);

  const onPaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      const digits = doExtract(text);
      if (!digits) return;
      lastSeenRef.current = digits;
      onVnrRef.current(digits);
    },
    [doExtract],
  );

  return { onPaste };
}
