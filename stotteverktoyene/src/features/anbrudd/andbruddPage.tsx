import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const officeFormUrl = import.meta.env.VITE_ANBRUDD_OFFICE_FORM_URL as string | undefined;
const sharepointEmbedUrl = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL) as string | undefined;

export default function AndbruddPage() {
  const [tab, setTab] = useState<"form" | "sharepoint">("sharepoint");
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  const current = useMemo(() => {
    if (tab === "form") {
      return {
        title: "Anbruddskjema",
        src: officeFormUrl,
        missing: "Office Form URL mangler (VITE_ANBRUDD_OFFICE_FORM_URL)",
        iframeTitle: "Office Form",
        height: 780,
      };
    }

    return {
      title: "Oversikt (SharePoint)",
      src: sharepointEmbedUrl,
      missing:
        "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      iframeTitle: "SharePoint Excel",
      height: 860,
    };
  }, [tab]);

  useEffect(() => {
    setIframeError(false);
  }, [tab]);

  useEffect(() => {
    setShowLoginHelp(true);
  }, []);

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h1">{current.title}</Typography>
          {tab === "sharepoint" && (
            <Button size="small" variant="outlined" onClick={() => setIframeKey((k) => k + 1)}>
              Oppdater
            </Button>
          )}
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} aria-label="Anbrudd tabs">
        <Tab value="sharepoint" label="Oversikt" />
        <Tab value="form" label="Skjema" />
      </Tabs>

      {current.src ? (
        <>
          {iframeError && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => window.open(current.src, "_blank", "noopener,noreferrer")}
              >
                Åpne i ny fane
              </Button>
            </Box>
          )}

          <Box
            key={iframeKey}
            component="iframe"
            title={current.iframeTitle}
            src={current.src}
            onLoad={() => setIframeError(false)}
            onError={() => setIframeError(true)}
            frameBorder={0}
            scrolling="no"
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: `${current.height}px`, border: 0 }}
          />
        </>
      ) : (
        <Typography color="error">{current.missing}</Typography>
      )}

      <Dialog
        open={showLoginHelp}
        onClose={() => {
          setShowLoginHelp(false);
        }}
      >
        <DialogTitle>Innlogging til SharePoint</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Hvis innlogging kreves, fullfør dette før du bruker oversikten eller meldeskjema.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setShowLoginHelp(false);
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
