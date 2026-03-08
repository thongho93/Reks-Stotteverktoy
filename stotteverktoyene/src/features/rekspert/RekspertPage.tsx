import { Box, Typography } from "@mui/material";

const SPREADSHEET_IFRAME_SRC = import.meta.env.VITE_REKSPERT_SPREADSHEET_IFRAME_SRC as
  | string
  | undefined;

const hasSpreadsheet = Boolean(SPREADSHEET_IFRAME_SRC);

export default function RekspertPage() {
  return (
    <Box
      sx={{
        width: "100%",
        height: "95vh",
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {hasSpreadsheet ? (
        <Box
          sx={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <iframe
            title="Rekspert spreadsheet"
            src={SPREADSHEET_IFRAME_SRC}
            style={{ width: "100%", flex: 1, border: 0 }}
          />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Spreadsheet er ikke konfigurert. Sett VITE_REKSPERT_SPREADSHEET_IFRAME_SRC i
          miljøvariablene.
        </Typography>
      )}
    </Box>
  );
}
