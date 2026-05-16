import React, { Suspense } from "react";
import {
  Box,
  CircularProgress,
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
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalculateIcon from "@mui/icons-material/Calculate";
import DescriptionIcon from "@mui/icons-material/Description";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { RequireAuth } from "./auth/RequireAuth";
import { logUsage, type UsagePage } from "../shared/services/usage";
import { useAuthUser } from "./auth/useAuthUser";
import { GlobalSearch } from "../features/commandpalette/GlobalSearch";
import { useGlobalSearchHotkey } from "../features/commandpalette/useGlobalSearchHotkey";
import ConstructionIcon from "@mui/icons-material/Construction";
import RequireRekspert from "./auth/RequireRekspert";
import { ProfileMenu } from "./auth/ProfileMenu";

const HomePage = React.lazy(() => import("./HomePage"));
const OMEQPage = React.lazy(() => import("../features/omeq/pages/OMEQPage"));
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
  if (pathname.startsWith("/standardtekster")) return "standardtekster";
  if (pathname.startsWith("/interaksjoner")) return "interaksjoner";
  if (pathname.startsWith("/produkt-og-rad")) return "produktograd";
  if (pathname.startsWith("/profil")) return "profil";
  if (pathname.startsWith("/statistikk")) return "statistikk";
  if (pathname.startsWith("/produktskjema")) return "produktskjema";
  if (pathname.startsWith("/tilbakemelding")) return "tilbakemelding";
  if (pathname.startsWith("/anbrudd")) return "anbrudd";
  if (pathname.startsWith("/rekspert")) return "rekspert";
  if (pathname.startsWith("/intern-chat")) return "teamschat";
  if (pathname.startsWith("/teams-chat")) return "teamschat";
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
  const { isOwner, isRekspert, role } = useAuthUser() as any;
  const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);
  const navigate = useNavigate();
  const location = useLocation();
  const currentWeekNumber = React.useMemo(() => getIsoWeekNumber(new Date()), []);

  const isSelected = (path: string) => {
    if (path === "/omeq") return location.pathname === "/" || location.pathname === "/omeq";
    return location.pathname === path;
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
      label: "Standardtekster",
      path: "/standardtekster",
      Icon: DescriptionIcon,
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
      Icon: TipsAndUpdatesRoundedIcon,
      color: "#C93586",
    },
    {
      label: "Innspill og notater",
      path: "/tilbakemelding",
      Icon: FeedbackRoundedIcon,
      color: "#B648E8",
    },
    {
      label: "Innkjøp og anbrudd",
      path: "/anbrudd",
      Icon: ChecklistRoundedIcon,
      color: "#FFA726",
    },
  ];

  const adminItems: SidebarItem[] =
    hasRekspertAccess
      ? [
          {
            label: "Rekspert",
            path: "/rekspert",
            Icon: ConstructionIcon,
            color: "#00A3D7",
          },
        ]
      : [];

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
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: collapsed ? 20 : 35,
            color: "primary.main",
            letterSpacing: "0.04em",
            textShadow: (theme) =>
              theme.palette.mode === "dark" ? "0 4px 16px rgba(230, 165, 190, 0.22)" : "none",
          }}
        >
          REKS+
        </Typography>
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
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <item.Icon sx={{ fontSize: collapsed ? 38 : 32 }} />
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
            {index < mainItems.length - 1 && (
              <Divider
                sx={{
                  mx: collapsed ? 1.5 : 2,
                  opacity: 0.45,
                }}
              />
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
                    <item.Icon sx={{ fontSize: collapsed ? 38 : 32 }} />
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
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Box component="main" sx={{ flex: 1, p: 2 }}>
        {keepAnbruddMounted && (
          <Box sx={{ display: isAnbruddRoute ? "block" : "none" }}>
            <Suspense fallback={<RouteLoader />}>
              <AndbruddPage />
            </Suspense>
          </Box>
        )}

        <Box sx={{ display: isAnbruddRoute ? "none" : "block" }}>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/omeq" element={<OMEQPage />} />
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
              <Route path="/intern-chat" element={<Navigate to="/omeq" replace />} />
              <Route path="/teams-chat" element={<Navigate to="/omeq" replace />} />
              <Route path="*" element={<Navigate to="/omeq" replace />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
