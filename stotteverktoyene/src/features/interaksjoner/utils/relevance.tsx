import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

export type RelevanceKind = "avoid";

export function relevanceKind(relevansDn: string | null): RelevanceKind | null {
  const dn = (relevansDn ?? "").toLowerCase();
  if (dn.includes("unngå")) return "avoid";
  return null;
}

export function relevanceColor() {
  return "error.main";
}

export function RelevanceIcon() {
  return <CancelRoundedIcon fontSize="small" sx={{ color: relevanceColor() }} />;
}
