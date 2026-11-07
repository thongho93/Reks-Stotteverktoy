import * as React from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";

import {
  FEEDBACK_STATUS_COLOR,
  feedbackCategoryLabel,
  feedbackStatusLabel,
  type FeedbackCategory,
  type FeedbackStatus,
} from "../types";
import { useReadableColor } from "./feedbackUtils";

/** Statusmerke: farget prikk og tekst på lys flate. */
export function StatusPill({ status, small }: { status: FeedbackStatus; small?: boolean }) {
  const color = FEEDBACK_STATUS_COLOR[status];
  const readable = useReadableColor();

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 999,
        px: small ? 1.25 : 1.5,
        py: small ? 0.375 : 0.625,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: readable(color),
        bgcolor: alpha(color, 0.16),
      }}
    >
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
      {feedbackStatusLabel(status)}
    </Box>
  );
}

/** Type innspill: feil eller ønske. */
export function CategoryChip({ category }: { category: FeedbackCategory }) {
  const isBug = category === "bug";
  const color = isBug ? "#DC2626" : "#F59E0B";
  const readable = useReadableColor();

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: 26,
        px: 1.25,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: readable(color),
        bgcolor: alpha(color, 0.14),
      }}
    >
      {isBug ? <BugReportRoundedIcon sx={{ fontSize: 15 }} /> : <LightbulbRoundedIcon sx={{ fontSize: 15 }} />}
      {feedbackCategoryLabel(category).replace("Feil / bug", "Feil").replace("Ny funksjon", "Ønske")}
    </Box>
  );
}

/** Liten omrisset merkelapp, f.eks. hvilken side innspillet gjelder. */
export function OutlineTag({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        px: 1.25,
        borderRadius: 999,
        border: 1,
        borderColor: "divider",
        fontSize: 13,
        color: "text.secondary",
      }}
    >
      {children}
    </Typography>
  );
}
