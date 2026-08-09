import React, { Suspense } from "react";
import {
  Box,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { createSvgIcon } from "@mui/material/utils";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppUpdater from "./AppUpdater";
import CalculateIcon from "@mui/icons-material/Calculate";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ConstructionIcon from "@mui/icons-material/Construction";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import { RequireAuth } from "./auth/RequireAuth";
import { logUsage, type UsagePage } from "../shared/services/usage";
import { useAuthUser } from "./auth/useAuthUser";
import { GlobalSearch } from "../features/commandpalette/GlobalSearch";
import { useGlobalSearchHotkey } from "../features/commandpalette/useGlobalSearchHotkey";
import RequireRekspert from "./auth/RequireRekspert";
import RequireAdmin from "./auth/RequireAdmin";
import { ProfileMenu } from "./auth/ProfileMenu";
import { FAGLIG_DOC_QUERY_KEY, ROUTINE_TAB_QUERY_KEY, ROUTINE_DOC_QUERY_KEY } from "../features/produktograd/queryKeys";
import { NavigationGuardProvider, useGuardedNavigate } from "../shared/hooks/useNavigationGuard";

const InnspillIcon = createSvgIcon(
  <>
    {/* Document outline — open at top-right where pencil overlaps */}
    <path
      d="M 14.3 2.7 L 2.5 2.7 C 1.7 2.7 1.1 3.3 1.1 4.1 L 1.1 21.5 C 1.1 22.3 1.7 22.9 2.5 22.9 L 17.7 22.9 C 18.4 22.9 19 22.3 19 21.6 L 19 11.5"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Pencil body with pointed tip */}
    <polygon
      points="12.8,13.8 8.3,15.8 10.2,11.2 20,1.5 22.5,4.1"
      fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Eraser cap separator */}
    <line x1="18.2" y1="3.2" x2="20.8" y2="5.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    {/* Tip separator */}
    <line x1="10.2" y1="11.2" x2="12.8" y2="13.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </>,
  "InnspillIcon"
);

const StandardteksterIcon = createSvgIcon(
  <path
    d="M 18 2 L 7 2 C 4.243 2 2 4.243 2 7 L 2 18 C 2 20.757 4.243 23 7 23 L 18 23 C 20.757 23 23 20.757 23 18 L 23 7 C 23 4.243 20.757 2 18 2 Z M 12.5 17.963 C 11.931 17.963 11.381 17.899 10.851 17.789 C 9.911 18.411 8.664 18.844 7.5 19.05 C 8.086 18.479 8.694 17.839 9.007 17.16 C 6.913 16.126 5.5 14.197 5.5 11.981 C 5.5 8.678 8.634 6 12.5 6 C 16.366 6 19.5 8.678 19.5 11.981 C 19.5 15.284 16.366 17.963 12.5 17.963 Z"
    fillRule="nonzero"
  />,
  "StandardteksterIcon"
);
const ProduktOgRadIcon = createSvgIcon(
  <>
    {/* Circle with horizontal bar (ring/planet) */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21 7C21 9.21 19.21 11 17 11C14.79 11 13 9.21 13 7C13 4.79 14.79 3 17 3C19.21 3 21 4.79 21 7ZM19.14 7.49C19.08 7.76 18.81 7.93 18.54 7.87L15.23 7.11C14.96 7.05 14.80 6.78 14.86 6.51C14.92 6.24 15.19 6.07 15.46 6.13L18.77 6.89C19.04 6.95 19.20 7.22 19.14 7.49Z"
    />
    {/* Triangle */}
    <path d="M8.39 4.62C8.07 3.86 6.98 3.78 6.55 4.49L3.15 10.06C2.75 10.70 3.19 11.52 3.96 11.57L9.89 12.00C10.66 12.05 11.21 11.30 10.92 10.61L8.39 4.62Z" />
    {/* Ring/donut shape */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.69 18.18C19.19 17.48 19.84 15.69 19.14 14.19C18.44 12.69 16.66 12.04 15.16 12.74L9.72 15.28C8.22 15.98 7.57 17.76 8.27 19.26C8.97 20.77 10.75 21.42 12.25 20.72L17.69 18.18ZM14.97 18.35L17.27 17.27C18.27 16.81 18.70 15.62 18.24 14.62C17.77 13.61 16.58 13.18 15.58 13.65L13.28 14.72L14.97 18.35Z"
    />
  </>,
  "ProduktOgRadIcon"
);

const InnkjopIcon = createSvgIcon(
  <>
    {/* Document body with dog-ear top-right */}
    <path
      d="M 14 2 L 5 2 C 3.9 2 3 2.9 3 4 L 3 20 C 3 21.1 3.9 22 5 22 L 17 22 C 18.1 22 19 21.1 19 20 L 19 7 Z"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Dog-ear fold */}
    <path
      d="M 14 2 L 14 7 L 19 7"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Bullet circles */}
    <circle cx="6.5" cy="11" r="1" fill="currentColor" />
    <circle cx="6.5" cy="15" r="1" fill="currentColor" />
    <circle cx="6.5" cy="19" r="1" fill="currentColor" />
    {/* Content lines */}
    <line x1="9" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </>,
  "InnkjopIcon"
);

function getIconFontSize(Icon: React.ElementType, collapsed: boolean): number {
  if (Icon === InnspillIcon) return collapsed ? 34 : 29;
  if (Icon === CalculateIcon) return collapsed ? 42 : 35;
  return collapsed ? 38 : 32;
}

const HomePage = React.lazy(() => import("./HomePage"));
const OMEQPage = React.lazy(() => import("../features/omeq/pages/OMEQPage"));
const LagerbeholdningPage = React.lazy(
  () => import("../features/lagerbeholdning/pages/LagerbeholdningPage")
);
const StandardTekstPage = React.lazy(
  () => import("../features/standardtekster/pages/StandardTekstPage")
);
const InteraksjonerPage = React.lazy(
  () => import("../features/interaksjoner/pages/InteraksjonerPage")
);
const ProduktOgRadPage = React.lazy(
  () => import("../features/produktograd/pages/ProduktOgRadPage")
);
const ProfilePage = React.lazy(() =>
  import("./auth/ProfilePage").then((module) => ({ default: module.ProfilePage }))
);
const StatistikkPage = React.lazy(() => import("../features/statistikk/pages/StatistikkPage"));
const AndbruddPage = React.lazy(() => import("../features/anbrudd/andbruddPage"));
const TilbakemeldingPage = React.lazy(
  () => import("../features/tilbakemelding/pages/TilbakemeldingPage")
);
const RekspertPage = React.lazy(() => import("../features/rekspert/RekspertPage"));
const StandardtekstStatistikkPage = React.lazy(
  () => import("../features/statistikk/pages/StandardtekstStatistikkPage")
);
const LoginPage = React.lazy(() =>
  import("./auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const PendingApprovalPage = React.lazy(() => import("./auth/PendingApprovalPage"));
const ANBRUDD_FORM_URL = "https://forms.office.com/e/CC67JNYpcr?embed=true";
const ANBRUDD_SHAREPOINT_URL = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL) as string | undefined;

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function getIsoWeekNumber(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

type SidebarItem = {
  label: string;
  path: string;
  Icon: React.ElementType;
  color: string;
};

function pathToUsagePage(pathname: string): UsagePage {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/omeq")) return "omeq";
  if (pathname.startsWith("/lagerbeholdning")) return "lagerbeholdning";
  if (pathname.startsWith("/standardtekster")) return "standardtekster";
  if (pathname.startsWith("/interaksjoner")) return "interaksjoner";
  if (pathname.startsWith("/produkt-og-rad")) return "produktograd";
  if (pathname.startsWith("/profil")) return "profil";
  if (pathname.startsWith("/statistikk")) return "statistikk";
  if (pathname.startsWith("/produktskjema")) return "produktskjema";
  if (pathname.startsWith("/tilbakemelding")) return "tilbakemelding";
  if (pathname.startsWith("/anbrudd")) return "anbrudd";
  if (pathname.startsWith("/rekspert")) return "rekspert";
  return "other";
}

function warmConnection(url?: string) {
  if (!url || typeof document === "undefined") return;

  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return;
  }

  const ensureLink = (rel: "preconnect" | "dns-prefetch") => {
    const selector = `link[rel="${rel}"][href="${origin}"]`;
    if (document.head.querySelector(selector)) return;

    const link = document.createElement("link");
    link.rel = rel;
    link.href = origin;

    if (rel === "preconnect") {
      link.crossOrigin = "anonymous";
    }

    document.head.appendChild(link);
  };

  ensureLink("dns-prefetch");
  ensureLink("preconnect");
}

function RouteLoader() {
  return (
    <Box
      sx={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { isOwner, isAdmin, isRekspert, role } = useAuthUser();
  const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
  // Tekststatistikk leser usage_daily, som firestore.rules kun åpner for isAdmin().
  const hasAdminAccess = Boolean(isAdmin) || Boolean(isOwner);
  // useGuardedNavigate: hvis en side (f.eks. standardtekster) har registrert en
  // sperre (ulagrede endringer), avbrytes navigasjonen og siden viser selv en
  // bekreftelsesdialog i stedet for at vi navigerer bort.
  const navigate = useGuardedNavigate();
  const location = useLocation();
  const [currentWeekNumber, setCurrentWeekNumber] = React.useState(() => getIsoWeekNumber(new Date()));

  // Keep the week number current while the app stays open: recompute at every local
  // midnight (it rolls over to the new ISO week at Monday 00:00), and also when the tab
  // regains focus in case the machine slept across a week boundary.
  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const update = () => setCurrentWeekNumber(getIsoWeekNumber(new Date()));
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeoutId = setTimeout(() => {
        update();
        scheduleNextMidnight();
      }, nextMidnight.getTime() - now.getTime());
    };
    scheduleNextMidnight();
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const isSelected = (path: string) => {
    if (path === "/omeq") return location.pathname === "/" || location.pathname === "/omeq";
    return location.pathname === path;
  };

  const isProduktOgRad = location.pathname === "/produkt-og-rad";
  const [produktOpen, setProduktOpen] = React.useState(isProduktOgRad);
  React.useEffect(() => { if (isProduktOgRad) setProduktOpen(true); }, [isProduktOgRad]);

  const produktSubItems = [
    { label: "Produkt og råd", search: "" },
    { label: "Faglig innhold", search: "?fagdoc=" },
    { label: "Rutiner", search: "?tab=rutiner" },
  ];

  const activeSubItem = () => {
    const params = new URLSearchParams(location.search);
    if (params.get(ROUTINE_TAB_QUERY_KEY) === "rutiner" || params.has(ROUTINE_DOC_QUERY_KEY)) return 2;
    if (params.has(FAGLIG_DOC_QUERY_KEY)) return 1;
    return 0;
  };

  const isAnbrudd = location.pathname === "/anbrudd";
  const [anbruddOpen, setAnbruddOpen] = React.useState(isAnbrudd);
  React.useEffect(() => { if (isAnbrudd) setAnbruddOpen(true); }, [isAnbrudd]);

  const anbruddSubItems = [
    { label: "Anbruddsoversikt", search: "" },
    { label: "Produktskjema", search: "?tab=produktskjema" },
  ];

  const activeAnbruddSubItem = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "produktskjema" ? 1 : 0;
  };

  const isInnspill = location.pathname === "/tilbakemelding";
  const [innspillOpen, setInnspillOpen] = React.useState(isInnspill);
  React.useEffect(() => { if (isInnspill) setInnspillOpen(true); }, [isInnspill]);

  const innspillSubItems = [
    { label: "Mine notater", search: "" },
    { label: "Innspill", search: "?tab=meldeskjema" },
  ];

  const activeInnspillSubItem = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "meldeskjema") return 1;
    return 0;
  };

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const navItemButtonSx = (item: SidebarItem) => ({
    justifyContent: collapsed ? "center" : "flex-start",
    px: collapsed ? 1 : 2,
    py: collapsed ? 0.85 : 0.95,
    minHeight: collapsed ? 58 : 48,
    borderLeft: "3px solid transparent",
    transition: "background-color 160ms ease, border-color 160ms ease, transform 120ms ease",
    "&:hover": {
      backgroundColor: alpha(item.color, 0.12),
      borderLeftColor: alpha(item.color, 0.6),
      transform: collapsed ? "none" : "translateX(1px)",
    },
    "&.Mui-selected": {
      backgroundColor: alpha(item.color, 0.2),
      borderLeftColor: item.color,
    },
    "&.Mui-selected:hover": {
      backgroundColor: alpha(item.color, 0.24),
    },
    "& .MuiListItemIcon-root": {
      color: item.color,
    },
  });

  const mainItems: SidebarItem[] = [
    { label: "OMEQ-beregning", path: "/omeq", Icon: CalculateIcon, color: "#29A1FF" },
    {
      label: "Lagerbeholdning",
      path: "/lagerbeholdning",
      Icon: Inventory2Icon,
      color: "#0E9F8E",
    },
    {
      label: "Standardtekster",
      path: "/standardtekster",
      Icon: StandardteksterIcon,
      color: "#4BC76A",
    },
    {
      label: "Interaksjonssøk",
      path: "/interaksjoner",
      Icon: CompareArrowsIcon,
      color: "#FF5E5B",
    },
    {
      label: "Produkt og råd",
      path: "/produkt-og-rad",
      Icon: ProduktOgRadIcon,
      color: "#C93586",
    },
    {
      label: "Innkjøp og anbrudd",
      path: "/anbrudd",
      Icon: InnkjopIcon,
      color: "#FFA726",
    },
    {
      label: "Notater og innspill",
      path: "/tilbakemelding",
      Icon: InnspillIcon,
      color: "#B648E8",
    },
  ];

  const adminItems: SidebarItem[] = [
    ...(hasRekspertAccess
      ? [
          {
            label: "Rekspert",
            path: "/rekspert",
            Icon: ConstructionIcon,
            color: "#00A3D7",
          } satisfies SidebarItem,
        ]
      : []),
    ...(hasAdminAccess
      ? [
          {
            label: "Tekststatistikk",
            path: "/rekspert/tekststatistikk",
            Icon: LeaderboardRoundedIcon,
            color: "#7C5CFF",
          } satisfies SidebarItem,
        ]
      : []),
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          overflowX: "hidden",
          overflowY: "hidden",
          transition: "width 180ms ease",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        onClick={() => {
          logUsage("menu_click", { targetPage: "home" });
          navigate("/");
        }}
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
          {collapsed ? (
            <Tooltip title="Reks+" placement="right">
              <Box
                component="img"
                src="/logo.svg"
                alt="REKS+ logo"
                sx={{ width: 52, height: 52, flexShrink: 0 }}
              />
            </Tooltip>
          ) : (
            <>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 28,
                  color: "primary.main",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  textShadow: (theme) =>
                    theme.palette.mode === "dark" ? "0 4px 16px rgba(230, 165, 190, 0.22)" : "none",
                }}
              >
                REKS
              </Typography>
              <Box
                component="img"
                src="/logo.svg"
                alt=""
                sx={{ width: 56, height: 56, flexShrink: 0 }}
              />
            </>
          )}
        </Box>
      </Box>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          px: 0.5,
        }}
      >
        <Tooltip title={collapsed ? "Utvid meny" : "Skjul meny"}>
          <IconButton onClick={onToggle} aria-label={collapsed ? "Utvid meny" : "Skjul meny"}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Divider />

      <List sx={{ py: 0.5 }}>
        {mainItems.map((item, index) => (
          <React.Fragment key={item.path}>
            {item.path === "/produkt-og-rad" ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Tooltip title={collapsed ? item.label : ""} placement="right">
                    <ListItemButton
                      selected={isProduktOgRad}
                      onClick={() => {
                        logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                        navigate(item.path);
                        if (!isProduktOgRad) setProduktOpen(true);
                      }}
                      sx={{ ...navItemButtonSx(item), flex: 1 }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: "center", display: "flex", alignItems: "center" }}
                      >
                        <item.Icon sx={{ fontSize: getIconFontSize(item.Icon, collapsed) }} />
                      </ListItemIcon>
                      {!collapsed && <ListItemText primary={item.label} />}
                    </ListItemButton>
                  </Tooltip>
                  {!collapsed && (
                    <IconButton
                      size="small"
                      aria-label={produktOpen ? "Skjul undermeny" : "Vis undermeny"}
                      onClick={() => setProduktOpen((o) => !o)}
                      sx={{ p: 0.5, flexShrink: 0 }}
                    >
                      {produktOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Box>
                {!collapsed && (
                  <Collapse in={produktOpen} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {produktSubItems.map((sub, i) => (
                        <ListItemButton
                          key={sub.label}
                          selected={isProduktOgRad && activeSubItem() === i}
                          onClick={() => navigate(`/produkt-og-rad${sub.search}`)}
                          sx={{
                            pl: 5,
                            py: 0.6,
                            fontSize: 13,
                            color: isProduktOgRad && activeSubItem() === i ? "primary.main" : "text.secondary",
                            fontWeight: isProduktOgRad && activeSubItem() === i ? 700 : 400,
                            "&.Mui-selected": {
                              bgcolor: "transparent",
                              color: "primary.main",
                            },
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <ListItemText
                            primary={sub.label}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: isProduktOgRad && activeSubItem() === i ? 700 : 400 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            ) : item.path === "/anbrudd" ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Tooltip title={collapsed ? item.label : ""} placement="right">
                    <ListItemButton
                      selected={isAnbrudd}
                      onClick={() => {
                        logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                        navigate(item.path);
                        if (!isAnbrudd) setAnbruddOpen(true);
                      }}
                      sx={{ ...navItemButtonSx(item), flex: 1 }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: "center", display: "flex", alignItems: "center" }}
                      >
                        <item.Icon sx={{ fontSize: getIconFontSize(item.Icon, collapsed) }} />
                      </ListItemIcon>
                      {!collapsed && <ListItemText primary={item.label} />}
                    </ListItemButton>
                  </Tooltip>
                  {!collapsed && (
                    <IconButton
                      size="small"
                      aria-label={anbruddOpen ? "Skjul undermeny" : "Vis undermeny"}
                      onClick={() => setAnbruddOpen((o) => !o)}
                      sx={{ p: 0.5, flexShrink: 0 }}
                    >
                      {anbruddOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Box>
                {!collapsed && (
                  <Collapse in={anbruddOpen} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {anbruddSubItems.map((sub, i) => (
                        <ListItemButton
                          key={sub.label}
                          selected={isAnbrudd && activeAnbruddSubItem() === i}
                          onClick={() => navigate(`/anbrudd${sub.search}`)}
                          sx={{
                            pl: 5,
                            py: 0.6,
                            color: isAnbrudd && activeAnbruddSubItem() === i ? "primary.main" : "text.secondary",
                            "&.Mui-selected": { bgcolor: "transparent", color: "primary.main" },
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <ListItemText
                            primary={sub.label}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: isAnbrudd && activeAnbruddSubItem() === i ? 700 : 400 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            ) : item.path === "/tilbakemelding" ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Tooltip title={collapsed ? item.label : ""} placement="right">
                    <ListItemButton
                      selected={isInnspill}
                      onClick={() => {
                        logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                        navigate(item.path);
                        if (!isInnspill) setInnspillOpen(true);
                      }}
                      sx={{ ...navItemButtonSx(item), flex: 1 }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: "center", display: "flex", alignItems: "center" }}
                      >
                        <item.Icon sx={{ fontSize: getIconFontSize(item.Icon, collapsed) }} />
                      </ListItemIcon>
                      {!collapsed && <ListItemText primary={item.label} />}
                    </ListItemButton>
                  </Tooltip>
                  {!collapsed && (
                    <IconButton
                      size="small"
                      aria-label={innspillOpen ? "Skjul undermeny" : "Vis undermeny"}
                      onClick={() => setInnspillOpen((o) => !o)}
                      sx={{ p: 0.5, flexShrink: 0 }}
                    >
                      {innspillOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Box>
                {!collapsed && (
                  <Collapse in={innspillOpen} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {innspillSubItems.map((sub, i) => (
                        <ListItemButton
                          key={sub.label}
                          selected={isInnspill && activeInnspillSubItem() === i}
                          onClick={() => navigate(`/tilbakemelding${sub.search}`)}
                          sx={{
                            pl: 5,
                            py: 0.6,
                            color: isInnspill && activeInnspillSubItem() === i ? "primary.main" : "text.secondary",
                            "&.Mui-selected": { bgcolor: "transparent", color: "primary.main" },
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <ListItemText
                            primary={sub.label}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: isInnspill && activeInnspillSubItem() === i ? 700 : 400 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            ) : (
              <Tooltip title={collapsed ? item.label : ""} placement="right">
                <ListItemButton
                  selected={isSelected(item.path)}
                  onClick={() => {
                    logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                    navigate(item.path);
                  }}
                  sx={navItemButtonSx(item)}
                >
                  <ListItemIcon
                    sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: "center", display: "flex", alignItems: "center" }}
                  >
                    <item.Icon sx={{ fontSize: getIconFontSize(item.Icon, collapsed) }} />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            )}
            {index < mainItems.length - 1 && (
              <Divider sx={{ mx: collapsed ? 1.5 : 2, opacity: 0.45 }} />
            )}
          </React.Fragment>
        ))}

        {adminItems.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  pb: 0.5,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Rekspert-verktøy
              </Typography>
            )}
            {adminItems.map((item) => (
              <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right">
                <ListItemButton
                  selected={isSelected(item.path)}
                  onClick={() => {
                    logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                    navigate(item.path);
                  }}
                  sx={navItemButtonSx(item)}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: collapsed ? 0 : 2,
                      justifyContent: "center",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <item.Icon sx={{ fontSize: getIconFontSize(item.Icon, collapsed) }} />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            ))}
          </>
        )}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box
        sx={{
          px: collapsed ? 0.6 : 1.4,
          pt: 1.1,
          pb: 0.7,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Tooltip title={collapsed ? `Uke ${currentWeekNumber}` : ""} placement="right">
          <Box
            sx={{
              minWidth: collapsed ? 44 : "100%",
              px: collapsed ? 0.75 : 1.1,
              py: 0.55,
              borderRadius: 999,
              textAlign: "center",
              border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.14)}`,
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
            }}
          >
            <Typography
              sx={{
                fontSize: collapsed ? "0.86rem" : "0.8rem",
                fontWeight: 700,
                color: "text.secondary",
                lineHeight: 1.2,
                letterSpacing: collapsed ? "0.02em" : "0.01em",
              }}
            >
              {collapsed ? `${currentWeekNumber}` : `Uke ${currentWeekNumber}`}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 0.75,
          "& .MuiAvatar-root": {
            width: collapsed ? 54 : 58,
            height: collapsed ? 54 : 58,
          },
        }}
      >
        <ProfileMenu />
      </Box>
    </Drawer>
  );
}

function Layout() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === "true";
  });
  React.useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const location = useLocation();
  const isAnbruddRoute = location.pathname === "/anbrudd" || location.pathname === "/produktskjema";
  const [keepAnbruddMounted, setKeepAnbruddMounted] = React.useState(isAnbruddRoute);

  React.useEffect(() => {
    logUsage("app_open");
  }, []);

  React.useEffect(() => {
    warmConnection(ANBRUDD_FORM_URL);
    warmConnection(ANBRUDD_SHAREPOINT_URL);
  }, []);

  React.useEffect(() => {
    const page = pathToUsagePage(location.pathname);
    logUsage("page_view", { page, pagePath: location.pathname });
  }, [location.pathname]);

  React.useEffect(() => {
    if (isAnbruddRoute) {
      setKeepAnbruddMounted(true);
    }
  }, [isAnbruddRoute]);

  const { open: searchOpen, closeSearch } = useGlobalSearchHotkey();

  return (
    <NavigationGuardProvider>
      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <Box component="main" sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {keepAnbruddMounted && (
            <Box sx={{ display: isAnbruddRoute ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0, mx: -2, my: -2, p: 2 }}>
              <Suspense fallback={<RouteLoader />}>
                <AndbruddPage />
              </Suspense>
            </Box>
          )}

          <Box sx={{ display: isAnbruddRoute ? "none" : "block", flex: 1, overflowY: "auto" }}>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/omeq" element={<OMEQPage />} />
                <Route path="/lagerbeholdning" element={<LagerbeholdningPage />} />
                <Route path="/standardtekster" element={<StandardTekstPage />} />
                <Route path="/interaksjoner" element={<InteraksjonerPage />} />
                <Route path="/produkt-og-rad" element={<ProduktOgRadPage />} />
                <Route path="/profil" element={<ProfilePage />} />
                <Route path="/statistikk" element={<StatistikkPage />} />
                <Route path="/produktskjema" element={<Navigate to="/anbrudd" replace />} />
                <Route path="/anbrudd" element={null} />
                <Route path="/tilbakemelding" element={<TilbakemeldingPage />} />
                <Route element={<RequireRekspert />}>
                  <Route path="/rekspert" element={<RekspertPage />} />
                </Route>
                <Route element={<RequireAdmin />}>
                  <Route
                    path="/rekspert/tekststatistikk"
                    element={<StandardtekstStatistikkPage />}
                  />
                </Route>
                <Route path="*" element={<Navigate to="/omeq" replace />} />
              </Routes>
            </Suspense>
          </Box>
        </Box>
      </Box>
    </NavigationGuardProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppUpdater />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
