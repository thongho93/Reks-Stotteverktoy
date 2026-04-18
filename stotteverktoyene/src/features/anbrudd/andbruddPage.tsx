import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

const officeFormEmbedUrl = "https://forms.office.com/e/CC67JNYpcr?embed=true";
const sharepointEmbedUrl = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL) as string | undefined;

const withRefreshParam = (src: string | undefined, refreshKey?: number) => {
  if (!src) return src;
  if (!refreshKey || refreshKey <= 0) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}reks_refresh=${refreshKey}`;
};

const formatRefreshTime = (value: string | null) => {
  if (!value) return "Ikke oppdatert ennå";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ikke oppdatert ennå";

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
};

export default function AndbruddPage() {
  const [tab, setTab] = useState<"form" | "sharepoint">("sharepoint");
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({ form: 0, sharepoint: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<{ form: string | null; sharepoint: string | null }>({
    form: null,
    sharepoint: null,
  });
  const hasLoadedRef = useRef(false);

  const current = useMemo(() => {
    if (tab === "form") {
      return {
        title: "Anbruddskjema",
        src: withRefreshParam(officeFormEmbedUrl, refreshKeys.form),
        missing: "Office Form embed URL mangler",
        iframeTitle: "Office Form",
        height: 780,
      };
    }

    return {
      title: "Oversikt (SharePoint)",
      src: withRefreshParam(sharepointEmbedUrl, refreshKeys.sharepoint),
      missing:
        "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      iframeTitle: "SharePoint Excel",
      height: 860,
    };
  }, [refreshKeys.form, refreshKeys.sharepoint, tab]);

  useEffect(() => {
    if (!current.src) {
      hasLoadedRef.current = true;
      setIframeLoaded(true);
      setIframeError(false);
      setIsRefreshing(false);
      return;
    }

    hasLoadedRef.current = false;
    setIframeLoaded(false);
    setIframeError(false);

    const timer = setTimeout(() => {
      if (!hasLoadedRef.current) {
        setIframeError(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [current.src]);

  const refreshCurrent = () => {
    setIframeError(false);
    setIsRefreshing(true);
    setRefreshKeys((prev) => ({
      ...prev,
      [tab]: Date.now(),
    }));
  };

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
          <Button size="small" variant="outlined" onClick={refreshCurrent}>
            Oppdater
          </Button>
          {current.src && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => window.open(current.src, "_blank", "noopener,noreferrer")}
            >
              Åpne for redigering
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Sist oppdatert visning: {formatRefreshTime(lastLoadedAt[tab])}
        </Typography>
        {isRefreshing && (
          <Typography variant="body2" color="text.secondary">
            Oppdaterer visningen...
          </Typography>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} aria-label="Anbrudd tabs">
        <Tab value="sharepoint" label="Oversikt" />
        <Tab value="form" label="Skjema" />
      </Tabs>

      {current.src ? (
        <>
          {iframeError && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Innholdet kunne ikke lastes stabilt i appen. Prøv `Oppdater`, eller bruk `Åpne for
              redigering`.
            </Alert>
          )}

          <Box sx={{ position: "relative", minHeight: current.height }}>
            {!iframeLoaded && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  gap: 1.5,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,252,0.98) 100%)",
                  zIndex: 1,
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <Box>
                  <CircularProgress size={28} />
                  <Typography sx={{ mt: 1.5, fontWeight: 600 }}>
                    {tab === "form" ? "Laster anbruddskjema ..." : "Laster anbruddsoversikt ..."}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tab === "form"
                      ? "Selve skjemaet hentes fra Microsoft Forms."
                      : "Oversikten hentes fra SharePoint."}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box
              key={current.src}
              component="iframe"
              title={current.iframeTitle}
              src={current.src}
              onLoad={() => {
                hasLoadedRef.current = true;
                setIframeLoaded(true);
                setIframeError(false);
                setIsRefreshing(false);
                setLastLoadedAt((prev) => ({
                  ...prev,
                  [tab]: new Date().toISOString(),
                }));
              }}
              onError={() => {
                hasLoadedRef.current = true;
                setIframeLoaded(true);
                setIframeError(true);
                setIsRefreshing(false);
              }}
              frameBorder={0}
              scrolling="no"
              allowFullScreen
              style={{ width: "100%", height: `${current.height}px`, border: 0 }}
            />
          </Box>
        </>
      ) : (
        <Typography color="error">{current.missing}</Typography>
      )}
    </Paper>
  );
}
