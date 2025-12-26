import React from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";

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
      hidden={value !== index}
      id={`rekspert-tabpanel-${index}`}
      aria-labelledby={`rekspert-tab-${index}`}
      {...other}
    >
      {value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null}
    </div>
  );
}

export default function RekspertPage() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Rekspert
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        aria-label="Rekspert faner"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTabs-indicator": {
            backgroundColor: "primary.main",
          },
          "& .MuiTab-root": {
            textTransform: "uppercase",
            letterSpacing: 0.5,
            minHeight: 48,
          },
          "& .MuiTab-root.Mui-selected": {
            color: "primary.main",
          },
        }}
      >
        <Tab label="Skjema" disabled={!hasSpreadsheet} {...a11yProps(0)} />
        <Tab label="Oversikt" disabled {...a11yProps(1)} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        {hasSpreadsheet ? (
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 240px)",
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
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Spreadsheet er ikke konfigurert. Sett VITE_REKSPERT_SPREADSHEET_IFRAME_SRC i
            miljøvariablene.
          </Typography>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Typography variant="body2" color="text.secondary">
          Kommer senere.
        </Typography>
      </TabPanel>
    </Box>
  );
}
