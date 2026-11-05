import * as React from "react";
import { darken, lighten, useTheme } from "@mui/material/styles";

/** Aksentfargen på innspillssiden (samme lilla som «Innspill»-fanen). */
export const FEEDBACK_ACCENT = "#8F3BC9";

export function formatDateTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("nb-NO", { dateStyle: "short" });
}

/** Lesbar tekstfarge for en farge som også brukes som bakgrunn/prikk. */
export function useReadableColor() {
  const theme = useTheme();
  return React.useCallback(
    (color: string) => (theme.palette.mode === "dark" ? lighten(color, 0.35) : darken(color, 0.4)),
    [theme.palette.mode]
  );
}
