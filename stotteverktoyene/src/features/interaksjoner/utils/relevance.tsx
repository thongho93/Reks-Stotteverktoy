import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export type RelevanceKind = "avoid" | "caution";

const ACTIONABLE_RELEVANCE_CODES = new Set(["1", "2"]);

function normalizeRelevanceCode(relevansV: string | null, relevansDn: string | null): string | null {
  const code = String(relevansV ?? "").trim();
  if (code) return code;

  // Fallback for older data where only text might be present.
  const dn = String(relevansDn ?? "").toLowerCase();
  if (dn.includes("unngå")) return "1";
  if (dn.includes("forholdsregler")) return "2";
  if (dn.includes("ingen tiltak")) return "3";
  return null;
}

export function isActionableRelevance(relevansV: string | null, relevansDn: string | null): boolean {
  const code = normalizeRelevanceCode(relevansV, relevansDn);
  return !!code && ACTIONABLE_RELEVANCE_CODES.has(code);
}

export function relevanceKind(relevansV: string | null, relevansDn: string | null): RelevanceKind | null {
  const code = normalizeRelevanceCode(relevansV, relevansDn);
  if (code === "1") return "avoid";
  if (code === "2") return "caution";
  return null;
}

export function relevanceColor(kind: RelevanceKind) {
  if (kind === "avoid") return "error.main";
  return "warning.main";
}

export function RelevanceIcon({ kind }: { kind: RelevanceKind }) {
  if (kind === "avoid") {
    return <CancelRoundedIcon fontSize="small" sx={{ color: relevanceColor(kind) }} />;
  }
  return <WarningAmberRoundedIcon fontSize="small" sx={{ color: relevanceColor(kind) }} />;
}
