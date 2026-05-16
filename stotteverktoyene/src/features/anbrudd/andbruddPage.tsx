import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

type TabKey = "produktskjema" | "anbruddOversikt";
const ANBRUDD_SURFACE = "#FFF7EC";
const ANBRUDD_SURFACE_SOFT = "#FDF1E1";
const ANBRUDD_SURFACE_ELEVATED = "#FFFFFF";
const ANBRUDD_HOVER_SURFACE = "#F9E4CA";
const ANBRUDD_BORDER = "#E7C7A2";
const ANBRUDD_TEXT_PRIMARY = "#2E241A";
const ANBRUDD_TEXT_SECONDARY = "#584530";
const ANBRUDD_ACCENT_TEXT = "#8F5523";
const ANBRUDD_ACCENT_LINE = "#D07A35";
const ANBRUDD_TAB_ACTIVE_BG = "#FFE8CC";
const ANBRUDD_ICON = "#7A5331";

const produktskjemaEmbedUrl = import.meta.env.VITE_OFFICE_FORM_URL as string | undefined;
const anbruddSkjemaOpenUrl = (import.meta.env.VITE_ANBRUDD_OFFICE_FORM_URL ??
  "https://forms.office.com/Pages/ResponsePage.aspx?id=EBpY9iaKOUW1i_OqHf_YWc0bI6fKiXpNvMV5Lx0ZufhUNk1MNzBKWThBRU80WlY0VlozRFhTU1I0TyQlQCN0PWcu") as
  | string
  | undefined;
const anbruddEtikettOpenUrl = (import.meta.env.VITE_ANBRUDD_ETIKETT_OPEN_URL ??
  "https://farmasietno-my.sharepoint.com/:x:/g/personal/jenny_kvarme_farmasiet_no/IQAyYWdzIziXQL0xo7k1HsgOAWGFnpFU8u7fYaW1J5ELpis?e=85lDkh") as
  | string
  | undefined;
const anbruddOversiktOpenUrl = (import.meta.env.VITE_ANBRUDD_OVERSIKT_OPEN_URL ??
  "https://farmasietno.sharepoint.com/:x:/s/Reseptekspedisjon827/IQCQmy33FSXsRoKQnMZfFlFdATiJj8T-G2uqFjFWEnsrFvg?e=2CYbVq") as
  | string
  | undefined;
const sharepointEmbedUrl = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL ??
  "https://farmasietno.sharepoint.com/sites/Reseptekspedisjon827/_layouts/15/Doc.aspx?sourcedoc={f72d9b90-2515-46ec-8290-9cc65f16515d}&action=embedview&wdAllowInteractivity=False&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True&wdInConfigurator=True&edaebf=rslc0") as
  | string
  | undefined;

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

const toOrigin = (url: string | undefined) => {
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export default function AndbruddPage() {
  const [tab, setTab] = useState<TabKey>("anbruddOversikt");
  const [oversiktRefreshKey, setOversiktRefreshKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState<Record<TabKey, boolean>>({
    produktskjema: false,
    anbruddOversikt: false,
  });
  const [hasVisited, setHasVisited] = useState<Record<TabKey, boolean>>({
    produktskjema: false,
    anbruddOversikt: true,
  });
  const [lastLoadedAt, setLastLoadedAt] = useState<Record<TabKey, string | null>>({
    produktskjema: null,
    anbruddOversikt: null,
  });
  const produktskjemaSrc = produktskjemaEmbedUrl;
  const oversiktSrc = useMemo(
    () => withRefreshParam(sharepointEmbedUrl, oversiktRefreshKey),
    [oversiktRefreshKey]
  );

  useEffect(() => {
    const resources = [produktskjemaSrc, sharepointEmbedUrl]
      .map(toOrigin)
      .filter((origin): origin is string => Boolean(origin));
    const uniqueOrigins = Array.from(new Set(resources));
    const links: HTMLLinkElement[] = [];

    uniqueOrigins.forEach((origin) => {
      const dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      document.head.appendChild(dnsPrefetch);
      links.push(dnsPrefetch);

      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
      links.push(preconnect);
    });

    return () => {
      links.forEach((link) => link.remove());
    };
  }, [produktskjemaSrc]);

  useEffect(() => {
    if (!produktskjemaSrc || hasVisited.produktskjema) return;

    const warmupTimer = window.setTimeout(() => {
      setHasVisited((prev) => (prev.produktskjema ? prev : { ...prev, produktskjema: true }));
    }, 1200);

    return () => {
      window.clearTimeout(warmupTimer);
    };
  }, [hasVisited.produktskjema, produktskjemaSrc]);
  const current = tab === "produktskjema"
    ? {
        src: produktskjemaSrc,
        editUrl: produktskjemaSrc,
        missing: "Office Form URL mangler (VITE_OFFICE_FORM_URL)",
        iframeTitle: "Produktskjema",
        height: 860,
      }
    : {
        src: oversiktSrc,
        editUrl: anbruddOversiktOpenUrl,
        missing:
          "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
        iframeTitle: "SharePoint Excel",
        height: 860,
      };

  const activateTab = (nextTab: TabKey) => {
    setTab(nextTab);
    setHasVisited((prev) => (prev[nextTab] ? prev : { ...prev, [nextTab]: true }));
  };

  const refreshOversikt = () => {
    activateTab("anbruddOversikt");
    setOversiktRefreshKey(Date.now());
    setIframeLoaded((prev) => ({ ...prev, anbruddOversikt: false }));
  };
  const showOversiktControls = tab === "anbruddOversikt";
  const actionButtonSx = {
    textTransform: "none",
    fontWeight: 650,
    borderRadius: 999,
    borderColor: alpha(ANBRUDD_ACCENT_TEXT, 0.35),
    color: ANBRUDD_ACCENT_TEXT,
    backgroundColor: alpha(ANBRUDD_SURFACE_ELEVATED, 0.82),
    backdropFilter: "blur(2px)",
    px: 1.8,
    py: 0.65,
    transition: "all 180ms ease",
    "&:hover": {
      borderColor: ANBRUDD_ACCENT_TEXT,
      backgroundColor: ANBRUDD_HOVER_SURFACE,
      transform: "translateY(-1px)",
    },
  };
  const viewCardSx = (active: boolean) => ({
    width: "100%",
    textAlign: "left",
    p: { xs: 1.25, sm: 1.5 },
    borderRadius: 2.5,
    border: `1px solid ${active ? alpha(ANBRUDD_ACCENT_TEXT, 0.45) : alpha(ANBRUDD_ACCENT_TEXT, 0.2)}`,
    backgroundColor: active ? ANBRUDD_TAB_ACTIVE_BG : alpha(ANBRUDD_SURFACE_ELEVATED, 0.9),
    boxShadow: active
      ? `0 10px 18px ${alpha(ANBRUDD_ACCENT_TEXT, 0.15)}`
      : `0 4px 12px ${alpha(ANBRUDD_ACCENT_TEXT, 0.08)}`,
    transition: "all 180ms ease",
    "&:hover": {
      backgroundColor: active ? ANBRUDD_TAB_ACTIVE_BG : ANBRUDD_HOVER_SURFACE,
      borderColor: alpha(ANBRUDD_ACCENT_TEXT, 0.45),
      transform: "translateY(-1px)",
    },
    "&:focus-visible": {
      outline: `2px solid ${alpha(ANBRUDD_ACCENT_TEXT, 0.45)}`,
      outlineOffset: 2,
    },
  });

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.5, sm: 2.5 },
        color: ANBRUDD_TEXT_PRIMARY,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(ANBRUDD_ACCENT_LINE, 0.2)} 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: -140,
          left: -90,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(ANBRUDD_ACCENT_LINE, 0.13)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box role="tablist" aria-label="Skjema tabs" sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1,
              maxWidth: 760,
            }}
          >
            <ButtonBase
              role="tab"
              aria-selected={tab === "anbruddOversikt"}
              onClick={() => activateTab("anbruddOversikt")}
              sx={viewCardSx(tab === "anbruddOversikt")}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2.5 }}>
                <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.35rem", fontWeight: 400, color: ANBRUDD_TEXT_PRIMARY, lineHeight: 1.2 }}>
                  Anbruddsoversikt
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", pl: 2 }}>
                  <Tooltip title="Oppdater oversikten">
                    <IconButton
                      size="small"
                      aria-label="Oppdater anbruddsoversikt"
                      sx={{
                        color: ANBRUDD_ICON,
                        bgcolor: alpha(ANBRUDD_SURFACE_ELEVATED, 0.7),
                        "&:hover": { backgroundColor: ANBRUDD_HOVER_SURFACE },
                      }}
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
              </Box>
            </ButtonBase>

            <ButtonBase
              role="tab"
              aria-selected={tab === "produktskjema"}
              onClick={() => activateTab("produktskjema")}
              sx={viewCardSx(tab === "produktskjema")}
            >
              <Box sx={{ display: "flex", alignItems: "center", minHeight: 48 }}>
                <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.35rem", fontWeight: 400, color: ANBRUDD_TEXT_PRIMARY, lineHeight: 1.2 }}>
                  Produktskjema
                </Typography>
              </Box>
            </ButtonBase>
          </Box>
        </Box>

        {showOversiktControls && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 1.75 }}>
            {anbruddSkjemaOpenUrl && (
              <Button
                size="small"
                variant="outlined"
                sx={actionButtonSx}
                onClick={() => window.open(anbruddSkjemaOpenUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddskjema
              </Button>
            )}
            {anbruddEtikettOpenUrl && (
              <Button
                size="small"
                variant="outlined"
                sx={actionButtonSx}
                onClick={() => window.open(anbruddEtikettOpenUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddsetikett
              </Button>
            )}
            {current.editUrl && (
              <Button
                size="small"
                variant="outlined"
                sx={actionButtonSx}
                onClick={() => window.open(current.editUrl, "_blank", "noopener,noreferrer")}
              >
                Anbruddsoversikt
              </Button>
            )}
          </Box>
        )}

        {showOversiktControls && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.4,
                py: 0.7,
                borderRadius: 999,
                bgcolor: alpha(ANBRUDD_ACCENT_TEXT, 0.1),
                border: `1px solid ${alpha(ANBRUDD_ACCENT_TEXT, 0.22)}`,
              }}
            >
              <Typography variant="body2" sx={{ color: ANBRUDD_TEXT_SECONDARY, fontWeight: 600 }}>
                Sist oppdatert visning: {formatRefreshTime(lastLoadedAt[tab])}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {current.src ? (
        <>
          <Box
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${alpha(ANBRUDD_ACCENT_TEXT, 0.2)}`,
              bgcolor: ANBRUDD_SURFACE_ELEVATED,
              boxShadow: `0 18px 34px ${alpha(ANBRUDD_ACCENT_TEXT, 0.12)}`,
            }}
          >
            {!iframeLoaded[tab] && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  gap: 1.5,
                  background: `linear-gradient(180deg, ${alpha(ANBRUDD_SURFACE_ELEVATED, 0.96)} 0%, ${alpha(
                    ANBRUDD_SURFACE,
                    0.98
                  )} 100%)`,
                  backdropFilter: "blur(2px)",
                  zIndex: 1,
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <Box>
                  <CircularProgress size={28} sx={{ color: ANBRUDD_ACCENT_TEXT }} />
                  <Typography sx={{ mt: 1.5, fontWeight: 700, color: ANBRUDD_TEXT_PRIMARY }}>
                    {tab === "produktskjema"
                      ? "Laster produktskjema ..."
                      : "Laster anbruddsoversikt ..."}
                  </Typography>
                  <Typography variant="body2" sx={{ color: ANBRUDD_TEXT_SECONDARY }}>
                    {tab === "anbruddOversikt"
                      ? "Oversikten hentes fra SharePoint."
                      : "Selve skjemaet hentes fra Microsoft Forms."}
                  </Typography>
                </Box>
              </Box>
            )}

            {oversiktSrc && (
              <Box
                component="iframe"
                title="SharePoint Excel"
                src={oversiktSrc}
                onLoad={() => {
                  setIframeLoaded((prev) => ({ ...prev, anbruddOversikt: true }));
                  setLastLoadedAt((prev) => ({
                    ...prev,
                    anbruddOversikt: new Date().toISOString(),
                  }));
                }}
                onError={() => {
                  setIframeLoaded((prev) => ({ ...prev, anbruddOversikt: true }));
                }}
                frameBorder={0}
                scrolling="no"
                loading="eager"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  visibility: tab === "anbruddOversikt" ? "visible" : "hidden",
                  pointerEvents: tab === "anbruddOversikt" ? "auto" : "none",
                  position: tab === "anbruddOversikt" ? "relative" : "absolute",
                  inset: tab === "anbruddOversikt" ? "auto" : 0,
                }}
              />
            )}

            {hasVisited.produktskjema && produktskjemaSrc && (
              <Box
                component="iframe"
                title="Produktskjema"
                src={produktskjemaSrc}
                onLoad={() => {
                  setIframeLoaded((prev) => ({ ...prev, produktskjema: true }));
                  setLastLoadedAt((prev) => ({
                    ...prev,
                    produktskjema: new Date().toISOString(),
                  }));
                }}
                onError={() => {
                  setIframeLoaded((prev) => ({ ...prev, produktskjema: true }));
                }}
                frameBorder={0}
                scrolling="no"
                loading="eager"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                  visibility: tab === "produktskjema" ? "visible" : "hidden",
                  pointerEvents: tab === "produktskjema" ? "auto" : "none",
                  position: tab === "produktskjema" ? "relative" : "absolute",
                  inset: tab === "produktskjema" ? "auto" : 0,
                }}
              />
            )}
          </Box>
        </>
      ) : (
        <Typography color="error">{current.missing}</Typography>
      )}
    </Box>
  );
}
