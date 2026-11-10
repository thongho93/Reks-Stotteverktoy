import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  ButtonBase,
  IconButton,
  LinearProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, createTheme, useTheme, ThemeProvider, type Theme } from "@mui/material/styles";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import { AccentSelection } from "../../styles/AccentSelection";
import { PackageXIcon } from "../../app/navIcons";

type TabKey = "produktskjema" | "anbruddOversikt";

const ACCENT = "#FFA726";
// Excel for the web reserverer en tom stripe (px) over kolonneoverskriftene i embed-visningen.
// Vi klipper den bort. Justér hvis Microsoft endrer høyden.
const EXCEL_EMBED_TOP_CROP = 38;
// Nederst ligger en hvit stripe (ca. 18 px) og så den mørke statuslinjen (ca. 20 px). Begge klippes bort,
// så arkfanene ender helt nederst i rammen. Sett til 0 for å få statuslinjen tilbake.
const EXCEL_EMBED_BOTTOM_CROP = 38;

const produktskjemaEmbedUrl = import.meta.env.VITE_OFFICE_FORM_URL as string | undefined;
const anbruddSkjemaOpenUrl = (import.meta.env.VITE_ANBRUDD_OFFICE_FORM_URL ??
  "https://forms.office.com/Pages/ResponsePage.aspx?id=EBpY9iaKOUW1i_OqHf_YWc0bI6fKiXpNvMV5Lx0ZufhUNk1MNzBKWThBRU80WlY0VlozRFhTU1I0TyQlQCN0PWcu") as
  | string
  | undefined;
const anbruddEtikettOpenUrl = (import.meta.env.VITE_ANBRUDD_ETIKETT_OPEN_URL ??
  "ms-excel:ofe|u|https://farmasietno.sharepoint.com/:x:/s/Reseptekspedisjon827-Farmasyter/IQA-XrifJGC2QKLZlwvgJE9lAcrp1P4NQBDiMeSzKSu2lYw?e=XVGsU1") as
  | string
  | undefined;
const anbruddOversiktOpenUrl = (import.meta.env.VITE_ANBRUDD_OVERSIKT_OPEN_URL ??
  "https://farmasietno.sharepoint.com/:x:/s/Reseptekspedisjon827/IQCQmy33FSXsRoKQnMZfFlFdATiJj8T-G2uqFjFWEnsrFvg?e=2CYbVq") as
  | string
  | undefined;
const sharepointEmbedUrl = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL ??
  "https://farmasietno.sharepoint.com/sites/Reseptekspedisjon827/_layouts/15/Doc.aspx?sourcedoc={f72d9b90-2515-46ec-8290-9cc65f16515d}&action=embedview&AllowTyping=True&wdDownloadButton=True&wdInConfigurator=True&wdInConfigurator=True") as
  | string
  | undefined;

const withRefreshParam = (src: string | undefined, refreshKey?: number) => {
  if (!src) return src;
  if (!refreshKey || refreshKey <= 0) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}reks_refresh=${refreshKey}`;
};

const formatLoadedTime = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("nb-NO", { timeStyle: "short" }).format(date);
};

const toOrigin = (url: string | undefined) => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isWebUrl = (url: string) => /^https?:/i.test(url);

type ShortcutLinkProps = {
  label: string;
  href: string | undefined;
  icon: React.ReactNode;
  primary?: boolean;
};

/**
 * Snarvei til en ekstern fil i toppbaren. En ekte lenke, så den kan åpnes med høyreklikk/midtklikk.
 * Under «lg» vises bare ikonet (navnet står i hjelpeteksten), så toppbaren holder seg på én linje.
 */
function ShortcutLink({ label, href, icon, primary = false }: ShortcutLinkProps) {
  if (!href) return null;
  const web = isWebUrl(href);
  return (
    <Tooltip title={label}>
      <ButtonBase
        component="a"
        href={href}
        aria-label={label}
        {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        sx={(t) => ({
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          height: 38,
          width: { xs: 38, lg: "auto" },
          px: { xs: 0, lg: 2 },
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          whiteSpace: "nowrap",
          transition: "background-color 160ms ease, border-color 160ms ease",
          ...(primary
            ? { bgcolor: ACCENT, color: "#2A1A00", "&:hover": { bgcolor: "#FFB74D" } }
            : {
                bgcolor: t.palette.background.paper,
                color: t.palette.mode === "dark" ? "#FFC47A" : "#8F5523",
                border: `1px solid ${alpha(t.palette.mode === "dark" ? "#FFC47A" : "#8F5523", 0.3)}`,
                "&:hover": { bgcolor: alpha(ACCENT, 0.14), borderColor: alpha(ACCENT, 0.7) },
              }),
          "&:focus-visible": { outline: `2px solid ${alpha(ACCENT, 0.9)}`, outlineOffset: 2 },
          "& svg": { fontSize: 21 },
        })}
      >
        {icon}
        <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>
          {label}
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}

export default function AndbruddPage() {
  const baseTheme = useTheme();
  const theme = useMemo(
    () =>
      createTheme(baseTheme, {
        palette: {
          primary: baseTheme.palette.augmentColor({ color: { main: ACCENT } }),
          // Mørk modus: én varm, nøytral palett for hele siden (temaets blålige flater passer ikke med oransje aksent).
          ...(baseTheme.palette.mode === "dark"
            ? {
                background: { default: "#14110C", paper: "#1D1912" },
                text: { primary: "#F6EFE4", secondary: "#D2C5B0", disabled: "#A89A84" },
                divider: "rgba(255,196,122,0.18)",
              }
            : {}),
        },
      }),
    [baseTheme],
  );
  const accentText = (t: Theme) => (t.palette.mode === "dark" ? "#FFC47A" : "#8F5523");

  const location = useLocation();
  const navigate = useNavigate();
  // Produktskjema er standardvisningen (/anbrudd). Oversikten åpnes med ?tab=oversikt.
  const tabFromSearch = (search: string): TabKey =>
    new URLSearchParams(search).get("tab") === "oversikt" ? "anbruddOversikt" : "produktskjema";
  const [tab, setTab] = useState<TabKey>(() => tabFromSearch(location.search));

  const [refreshKey, setRefreshKey] = useState<Record<TabKey, number>>({ produktskjema: 0, anbruddOversikt: 0 });
  const [iframeLoaded, setIframeLoaded] = useState<Record<TabKey, boolean>>({
    produktskjema: false,
    anbruddOversikt: false,
  });
  const [hasVisited, setHasVisited] = useState<Record<TabKey, boolean>>({
    produktskjema: true,
    anbruddOversikt: false,
  });
  const [lastLoadedAt, setLastLoadedAt] = useState<Record<TabKey, string | null>>({
    produktskjema: null,
    anbruddOversikt: null,
  });

  // Adressen (?tab=…) er sannhetskilden, slik at sidemenyen og fanene alltid er i takt.
  useEffect(() => {
    const next = tabFromSearch(location.search);
    setTab(next);
    setHasVisited((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
  }, [location.search]);

  const oversiktSrc = useMemo(
    () => withRefreshParam(sharepointEmbedUrl, refreshKey.anbruddOversikt),
    [refreshKey.anbruddOversikt],
  );
  const produktskjemaSrc = useMemo(
    () => withRefreshParam(produktskjemaEmbedUrl, refreshKey.produktskjema),
    [refreshKey.produktskjema],
  );

  useEffect(() => {
    const origins = Array.from(
      new Set([produktskjemaEmbedUrl, sharepointEmbedUrl].map(toOrigin).filter((o): o is string => Boolean(o))),
    );
    const links: HTMLLinkElement[] = [];
    origins.forEach((origin) => {
      (["dns-prefetch", "preconnect"] as const).forEach((rel) => {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = origin;
        if (rel === "preconnect") link.crossOrigin = "anonymous";
        document.head.appendChild(link);
        links.push(link);
      });
    });
    return () => links.forEach((link) => link.remove());
  }, []);

  // Varm opp oversikten i bakgrunnen, så fanebyttet føles umiddelbart.
  useEffect(() => {
    if (!sharepointEmbedUrl || hasVisited.anbruddOversikt) return;
    const timer = window.setTimeout(() => {
      setHasVisited((prev) => (prev.anbruddOversikt ? prev : { ...prev, anbruddOversikt: true }));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [hasVisited.anbruddOversikt]);

  const refresh = useCallback((target: TabKey) => {
    setRefreshKey((prev) => ({ ...prev, [target]: Date.now() }));
    setIframeLoaded((prev) => ({ ...prev, [target]: false }));
  }, []);

  const selectTab = (next: TabKey) => {
    if (next === tab) return;
    navigate({ pathname: "/anbrudd", search: next === "anbruddOversikt" ? "?tab=oversikt" : "" });
  };

  const views: Record<
    TabKey,
    { label: string; src: string | undefined; missing: string; loading: string }
  > = {
    anbruddOversikt: {
      label: "Anbruddsoversikt",
      src: oversiktSrc,
      missing: "SharePoint URL mangler (VITE_ANBRUDD_SHAREPOINT_EMBED_URL / VITE_ANBRUDD_SHAREPOINT_URL)",
      loading: "Henter oversikten fra SharePoint …",
    },
    produktskjema: {
      label: "Produktskjema",
      src: produktskjemaSrc,
      missing: "Office Form URL mangler (VITE_OFFICE_FORM_URL)",
      loading: "Henter skjemaet fra Microsoft Forms …",
    },
  };
  const current = views[tab];
  const loaded = iframeLoaded[tab];
  const loadedTime = formatLoadedTime(lastLoadedAt[tab]);

  const renderFrame = (key: TabKey, src: string | undefined, title: string, cropTop = 0, cropBottom = 0) => (
    <Box
      component="iframe"
      key={`${key}-${refreshKey[key]}`}
      title={title}
      src={src}
      onLoad={() => {
        setIframeLoaded((prev) => ({ ...prev, [key]: true }));
        setLastLoadedAt((prev) => ({ ...prev, [key]: new Date().toISOString() }));
      }}
      onError={() => setIframeLoaded((prev) => ({ ...prev, [key]: true }))}
      frameBorder={0}
      scrolling="no"
      loading="eager"
      allowFullScreen
      style={{
        position: "absolute",
        // cropTop/cropBottom gjør iframen høyere enn rammen og klipper bort kantene av den innebygde visningen.
        top: -cropTop,
        left: 0,
        width: "100%",
        height: `calc(100% + ${cropTop + cropBottom}px)`,
        border: 0,
        display: "block",
        background: "#fff",
        visibility: tab === key ? "visible" : "hidden",
        pointerEvents: tab === key ? "auto" : "none",
      }}
    />
  );

  const segment = (key: TabKey) => {
    const active = tab === key;
    return (
      <ButtonBase
        key={key}
        role="tab"
        aria-selected={active}
        onClick={() => selectTab(key)}
        sx={(t) => ({
          height: 34,
          px: 2.25,
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          whiteSpace: "nowrap",
          color: active ? "#2A1A00" : t.palette.text.secondary,
          bgcolor: active ? ACCENT : "transparent",
          transition: "background-color 160ms ease, color 160ms ease",
          "&:hover": { bgcolor: active ? ACCENT : alpha(t.palette.primary.main, 0.12) },
          "&:focus-visible": { outline: `2px solid ${alpha(ACCENT, 0.9)}`, outlineOffset: 2 },
        })}
      >
        {views[key].label}
      </ButtonBase>
    );
  };

  const iconButtonSx = (t: Theme) => ({
    width: 38,
    height: 38,
    color: t.palette.text.secondary,
    "&:hover": { color: accentText(t), bgcolor: alpha(t.palette.primary.main, 0.12) },
  });

  return (
    <ThemeProvider theme={theme}>
      <AccentSelection />
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, color: "text.primary" }}>
        {/* Smal toppbar: tittel, faner, snarveier og verktøy på én linje */}
        <Box
          component="header"
          sx={(t) => ({
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            columnGap: 1.5,
            rowGap: 1,
            minHeight: 64,
            px: 2,
            py: 0.75,
            flexShrink: 0,
            boxSizing: "border-box",
            bgcolor: t.palette.mode === "dark" ? "#1D1912" : "#FFFBF5",
            borderBottom: `1px solid ${t.palette.mode === "dark" ? t.palette.divider : "#F0DFC8"}`,
          })}
        >
          <Box
            sx={(t) => ({
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: "12px",
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.18 : 0.14),
              border: `1px solid ${alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.32 : 0.34)}`,
            })}
          >
            <PackageXIcon sx={{ fontSize: 24, color: accentText }} />
          </Box>
          <Typography
            component="h1"
            sx={{
              // Tittelen vises bare når det er plass; sidemenyen viser allerede hvilken side du er på.
              display: "none",
              "@media (min-width: 1000px)": { display: "block" },
              fontWeight: 800,
              color: accentText,
              fontSize: 21,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            Innkjøp og anbrudd
          </Typography>

          <Box
            role="tablist"
            aria-label="Visning"
            sx={(t) => ({
              display: "flex",
              gap: 0.25,
              p: 0.375,
              borderRadius: 999,
              bgcolor: t.palette.background.paper,
              border: `1px solid ${alpha(t.palette.primary.main, 0.4)}`,
            })}
          >
            {segment("produktskjema")}
            {segment("anbruddOversikt")}
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Snarveiene hører til oversikten og vises bare der */}
          {tab === "anbruddOversikt" && (
            <>
              <ShortcutLink label="Meld anbrudd" href={anbruddSkjemaOpenUrl} primary icon={<EditNoteRoundedIcon />} />
              <ShortcutLink label="Etikett" href={anbruddEtikettOpenUrl} icon={<SellRoundedIcon />} />
              <ShortcutLink label="Hele oversikten" href={anbruddOversiktOpenUrl} icon={<TableChartRoundedIcon />} />

              <Box
                aria-hidden
                sx={(t) => ({ width: "1px", height: 20, flexShrink: 0, bgcolor: t.palette.mode === "dark" ? t.palette.divider : "#E6D8C3" })}
              />
            </>
          )}

          <Tooltip title={loadedTime ? `Last på nytt (oppdatert ${loadedTime})` : "Last på nytt"}>
            <IconButton size="small" aria-label="Last på nytt" sx={iconButtonSx} onClick={() => refresh(tab)}>
              <RefreshRoundedIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Excel-/skjemavisningen fyller alt som er igjen, helt ut til kantene */}
        <Box
          sx={(t) => ({
            position: "relative",
            flex: 1,
            minHeight: 320,
            overflow: "hidden",
            bgcolor: t.palette.background.paper,
          })}
        >
          {current.src ? (
            <>
              {!loaded && (
                <>
                  <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 2 }} />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 1,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "background.paper",
                      pointerEvents: "none",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {current.loading}
                    </Typography>
                  </Box>
                </>
              )}
              {hasVisited.produktskjema && produktskjemaSrc && renderFrame("produktskjema", produktskjemaSrc, "Produktskjema")}
              {hasVisited.anbruddOversikt && oversiktSrc && renderFrame("anbruddOversikt", oversiktSrc, "SharePoint Excel", EXCEL_EMBED_TOP_CROP, EXCEL_EMBED_BOTTOM_CROP)}
            </>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{current.missing}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
