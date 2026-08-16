import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import { useLocation, useNavigate } from "react-router-dom";

export const FEEDBACK_ROUTE = "/innspill";

const ACCENT = "#B648E8";

/**
 * Fane festet til høyre skjermkant som tar brukeren til innspillssiden.
 * Skjules på selve innspillssiden, der den ikke har noe å gjøre.
 */
export default function FeedbackLauncher() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === FEEDBACK_ROUTE) return null;

  return (
    <Tooltip title="Meld inn feil eller ønske" placement="left">
      <Box
        component="button"
        type="button"
        aria-label="Gå til innspill"
        onClick={() => navigate(FEEDBACK_ROUTE)}
        sx={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1,
          py: 1.75,
          border: "none",
          borderRadius: "8px 0 0 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.82rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#fff",
          bgcolor: ACCENT,
          writingMode: "vertical-rl",
          boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.common.black, 0.28)}`,
          transition: "background-color 150ms ease, padding-right 150ms ease",
          "&:hover": { bgcolor: "#9A35C8", pr: 1.5 },
          "&:focus-visible": { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
        }}
      >
        <FeedbackRoundedIcon sx={{ fontSize: 18, transform: "rotate(90deg)" }} />
        Innspill
      </Box>
    </Tooltip>
  );
}
