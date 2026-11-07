import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_COLOR,
  type Feedback,
  type FeedbackComment,
  type FeedbackStatus,
} from "../types";
import { FEEDBACK_ACCENT, formatDate, useReadableColor } from "./feedbackUtils";

/** Tre steg: sendt, under behandling, ferdig – med dato for når hvert steg ble nådd. */
export default function FeedbackProgress({
  item,
  comments,
}: {
  item: Feedback;
  comments: FeedbackComment[];
}) {
  const readable = useReadableColor();
  const currentIndex = FEEDBACK_STATUSES.findIndex((s) => s.value === item.status);

  const reachedAt = (status: FeedbackStatus, index: number): number | null => {
    const events = comments.filter((c) => c.kind === "status" && c.status === status);
    if (events.length > 0) return events[events.length - 1].createdAtMs;
    // Uten hendelse (eldre innspill): dagens status får siste oppdatering som dato.
    return index === currentIndex && index > 0 ? item.updatedAtMs : null;
  };

  return (
    <Box
      component="ol"
      aria-label="Fremdrift"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        px: 1.5,
        py: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 1.25,
        borderRadius: 2.5,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
      }}
    >
      {FEEDBACK_STATUSES.map((step, index) => {
        const reached = index <= currentIndex;
        const color = index === 0 ? FEEDBACK_ACCENT : FEEDBACK_STATUS_COLOR[step.value];
        const at = index === 0 ? item.createdAtMs : reachedAt(step.value, index);
        const label = index === 0 ? "Sendt inn" : index === 1 ? "Behandles" : "Ferdig";

        return (
          <Box component="li" key={step.value} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: reached ? color : (theme) => alpha(theme.palette.text.primary, 0.14),
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
                lineHeight: 1.2,
                fontWeight: reached ? 600 : 400,
                color: reached ? "text.primary" : "text.secondary",
              }}
            >
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
              {reached && at ? formatDate(at) : "–"}
              {reached && index === currentIndex && index > 0 ? (
                <Box component="span" sx={{ color: readable(color), fontWeight: 600 }}>
                  {" "}
                  · nå
                </Box>
              ) : null}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
