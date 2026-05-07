import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

type TabKey = "produktskjema" | "anbruddForm" | "anbruddOversikt";

const produktskjemaEmbedUrl = import.meta.env.VITE_OFFICE_FORM_URL as string | undefined;
const anbruddFormEmbedUrl = "https://forms.office.com/e/CC67JNYpcr?embed=true";
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
  const [tab, setTab] = useState<TabKey>("produktskjema");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState<Record<TabKey, number>>({
    produktskjema: 0,
    anbruddForm: 0,
    anbruddOversikt: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Record<TabKey, string | null>>({
    produktskjema: null,
    anbruddForm: null,
    anbruddOversikt: null,
  });
  const hasLoadedRef = useRef(false);

  const current = useMemo(() => {
    if (tab === "produktskjema") {
      return {
        title: "Produktskjema",
        src: withRefreshParam(produktskjemaEmbedUrl, refreshKeys.produktskjema),
        missing: "Office Form URL mangler (VITE_OFFICE_FORM_URL)",
        iframeTitle: "Produktskjema",
        height: 860,
      };
    }

    if (tab === "anbruddForm") {
      return {
        title: "Anbruddskjema",
        src: withRefreshParam(anbruddFormEmbedUrl, refreshKeys.anbruddForm),
        missing: "Office Form URL for anbruddskjema mangler",
        iframeTitle: "Anbruddskjema",
        height: 860,
      };
    }

    return {
      title: "Oversikt (SharePoint)",
      src: withRefreshParam(sharepointEmbedUrl, refreshKeys.anbruddOversikt),
      missing:
        "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      iframeTitle: "SharePoint Excel",
      height: 860,
    };
  }, [refreshKeys.anbruddForm, refreshKeys.anbruddOversikt, refreshKeys.produktskjema, tab]);

  useEffect(() => {
    if (!current.src) {
      hasLoadedRef.current = true;
      setIframeLoaded(true);
      setIsRefreshing(false);
      return;
    }

    hasLoadedRef.current = false;
    setIframeLoaded(false);

    const timer = setTimeout(() => {
      if (!hasLoadedRef.current) {
        setIsRefreshing(false);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [current.src]);

  const refreshCurrent = () => {
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

      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }} aria-label="Skjema tabs">
        <Tab value="produktskjema" label="Produktskjema" />
        <Tab value="anbruddForm" label="Anbruddskjema" />
        <Tab value="anbruddOversikt" label="Oversikt" />
      </Tabs>

      {current.src ? (
        <>
          <Box sx={{ position: "relative", minHeight: current.height }}>
            {!iframeLoaded && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  gap: 1.5,
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(180deg, rgba(16,22,32,0.96) 0%, rgba(12,18,27,0.98) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,252,0.98) 100%)",
                  zIndex: 1,
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <Box>
                  <CircularProgress size={28} />
                  <Typography sx={{ mt: 1.5, fontWeight: 600 }}>
                    {tab === "produktskjema"
                      ? "Laster produktskjema ..."
                      : tab === "anbruddForm"
                        ? "Laster anbruddskjema ..."
                        : "Laster anbruddsoversikt ..."}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tab === "anbruddOversikt"
                      ? "Oversikten hentes fra SharePoint."
                      : "Selve skjemaet hentes fra Microsoft Forms."}
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
                setIsRefreshing(false);
                setLastLoadedAt((prev) => ({
                  ...prev,
                  [tab]: new Date().toISOString(),
                }));
              }}
              onError={() => {
                hasLoadedRef.current = true;
                setIframeLoaded(true);
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
