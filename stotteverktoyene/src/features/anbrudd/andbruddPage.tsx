import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

type TabKey = "produktskjema" | "anbruddOversikt";

const produktskjemaEmbedUrl = import.meta.env.VITE_OFFICE_FORM_URL as string | undefined;
const anbruddSkjemaOpenUrl = (import.meta.env.VITE_ANBRUDD_OFFICE_FORM_URL ??
  "https://forms.office.com/Pages/ResponsePage.aspx?id=EBpY9iaKOUW1i_OqHf_YWc0bI6fKiXpNvMV5Lx0ZufhUNk1MNzBKWThBRU80WlY0VlozRFhTU1I0TyQlQCN0PWcu") as
  | string
  | undefined;
const anbruddEtikettOpenUrl = (import.meta.env.VITE_ANBRUDD_ETIKETT_OPEN_URL ??
  "https://farmasietno.sharepoint.com/:x:/s/Reseptekspedisjon827-Farmasyter/IQA-XrifJGC2QKLZlwvgJE9lAcrp1P4NQBDiMeSzKSu2lYw?e=N2ZnkM") as
  | string
  | undefined;
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
  const [tab, setTab] = useState<TabKey>("anbruddOversikt");
  const [oversiktRefreshKey, setOversiktRefreshKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Record<TabKey, string | null>>({
    produktskjema: null,
    anbruddOversikt: null,
  });
  const hasLoadedRef = useRef(false);

  const current = useMemo(() => {
    if (tab === "produktskjema") {
      return {
        src: produktskjemaEmbedUrl,
        editUrl: produktskjemaEmbedUrl,
        missing: "Office Form URL mangler (VITE_OFFICE_FORM_URL)",
        iframeTitle: "Produktskjema",
        height: 860,
      };
    }

    return {
      src: withRefreshParam(sharepointEmbedUrl, oversiktRefreshKey),
      editUrl: sharepointEmbedUrl,
      missing:
        "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      iframeTitle: "SharePoint Excel",
      height: 860,
    };
  }, [oversiktRefreshKey, tab]);

  useEffect(() => {
    if (!current.src) {
      hasLoadedRef.current = true;
      setIframeLoaded(true);
      return;
    }

    hasLoadedRef.current = false;
    setIframeLoaded(false);
  }, [current.src]);

  const refreshOversikt = () => {
    setTab("anbruddOversikt");
    setOversiktRefreshKey(Date.now());
  };
  const showOversiktControls = tab === "anbruddOversikt";

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      {showOversiktControls && (
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
            {anbruddSkjemaOpenUrl && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open(anbruddSkjemaOpenUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddskjema
              </Button>
            )}
            {anbruddEtikettOpenUrl && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open(anbruddEtikettOpenUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddsetikett
              </Button>
            )}
            {current.editUrl && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open(current.editUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddsoversikt
              </Button>
            )}
          </Box>
        </Box>
      )}

      {showOversiktControls && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Sist oppdatert visning: {formatRefreshTime(lastLoadedAt[tab])}
          </Typography>
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }} aria-label="Skjema tabs">
        <Tab
          value="anbruddOversikt"
          label={
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <span>Anbruddsoversikt</span>
              <Tooltip title="Oppdater oversikten">
                <IconButton
                  size="small"
                  aria-label="Oppdater anbruddsoversikt"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    refreshOversikt();
                  }}
                >
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <Tab value="produktskjema" label="Produktskjema" />
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
                setLastLoadedAt((prev) => ({
                  ...prev,
                  [tab]: new Date().toISOString(),
                }));
              }}
              onError={() => {
                hasLoadedRef.current = true;
                setIframeLoaded(true);
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
