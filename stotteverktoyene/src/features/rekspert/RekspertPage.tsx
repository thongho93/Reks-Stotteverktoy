import React from "react";
import { Box, Typography } from "@mui/material";

const SPREADSHEET_IFRAME_SRC = import.meta.env.VITE_REKSPERT_SPREADSHEET_IFRAME_SRC as
  | string
  | undefined;

const hasSpreadsheet = Boolean(SPREADSHEET_IFRAME_SRC);

function a11yProps(index: number) {
  return {
    id: `rekspert-tab-${index}`,
    "aria-controls": `rekspert-tabpanel-${index}`,
  };
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      style={{
        flex: 1,
        minHeight: 0,
        display: value === index ? "flex" : "none",
        flexDirection: "column",
      }}
      id={`rekspert-tabpanel-${index}`}
      aria-labelledby={`rekspert-tab-${index}`}
      {...other}
    >
      <Box sx={{ pt: 2, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </div>
  );
}

export default function RekspertPage() {
  const [tab, setTab] = React.useState(0);

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
