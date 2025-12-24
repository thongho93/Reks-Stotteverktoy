import { useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, Tab, Tabs, Typography } from "@mui/material";

const officeFormUrl = import.meta.env.VITE_ANBRUDD_OFFICE_FORM_URL as string | undefined;
const sharepointEmbedUrl = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL) as string | undefined;

export default function AndbruddPage() {
  const [tab, setTab] = useState<"form" | "sharepoint">("form");
  const [iframeError, setIframeError] = useState(false);

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
      missing: "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      iframeTitle: "SharePoint Excel",
      height: 860,
    };
  }, [tab]);

  useEffect(() => {
    setIframeError(false);
  }, [tab]);

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
        <Typography variant="h1">{current.title}</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} aria-label="Anbrudd tabs">
        <Tab value="form" label="Skjema" />
        <Tab value="sharepoint" label="Oversikt" />
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
    </Paper>
  );
}
