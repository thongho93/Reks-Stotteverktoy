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
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalculateIcon from "@mui/icons-material/Calculate";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import FeedbackRoundedIcon from "@mui/icons-material/FeedbackRounded";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { RequireAuth } from "./auth/RequireAuth";
import { logUsage, type UsagePage } from "../shared/services/usage";
import { useAuthUser } from "./auth/useAuthUser";
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
const ProfilePage = React.lazy(() =>
  import("./auth/ProfilePage").then((module) => ({ default: module.ProfilePage }))
);
const StatistikkPage = React.lazy(() => import("../features/statistikk/pages/StatistikkPage"));
const OfficeFormRedirectPage = React.lazy(
  () => import("../features/produktskjema/pages/OfficeFormRedirectPage")
);
const AndbruddPage = React.lazy(() => import("../features/anbrudd/andbruddPage"));
const TilbakemeldingPage = React.lazy(
  () => import("../features/tilbakemelding/pages/TilbakemeldingPage")
);
const RekspertPage = React.lazy(() => import("../features/rekspert/RekspertPage"));
const LoginPage = React.lazy(() =>
  import("./auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const PendingApprovalPage = React.lazy(() => import("./auth/PendingApprovalPage"));
const OFFICE_FORM_URL = import.meta.env.VITE_OFFICE_FORM_URL as string | undefined;
const ANBRUDD_FORM_URL = "https://forms.office.com/e/CC67JNYpcr?embed=true";
const ANBRUDD_SHAREPOINT_URL = (import.meta.env.VITE_ANBRUDD_SHAREPOINT_EMBED_URL ??
  import.meta.env.VITE_ANBRUDD_SHAREPOINT_URL) as string | undefined;

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function pathToUsagePage(pathname: string): UsagePage {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/omeq")) return "omeq";
  if (pathname.startsWith("/standardtekster")) return "standardtekster";
  if (pathname.startsWith("/interaksjoner")) return "interaksjoner";
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

  const isSelected = (path: string) => {
    if (path === "/omeq") return location.pathname === "/" || location.pathname === "/omeq";
    return location.pathname === path;
  };

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const mainItems = [
    { label: "OMEQ-beregning", path: "/omeq", Icon: CalculateIcon, color: "#1E88E5" },
    {
      label: "Standardtekster",
      path: "/standardtekster",
      Icon: DescriptionIcon,
      color: "#43A047",
    },
    {
      label: "Interaksjonssøk",
      path: "/interaksjoner",
      Icon: CompareArrowsIcon,
      color: "#D32F2F",
    },
    {
      label: "Produktskjema",
      path: "/produktskjema",
      Icon: LocalShippingIcon,
      color: "#00897B",
    },
    {
      label: "Anbrudd",
      path: "/anbrudd",
      Icon: ChecklistRoundedIcon,
      color: "#FB8C00",
    },
    {
      label: "Innspill og notater",
      path: "/tilbakemelding",
      Icon: FeedbackRoundedIcon,
      color: "#8E24AA",
    },
  ];

  const adminItems =
    hasRekspertAccess
      ? [
          {
            label: "Rekspert",
            path: "/rekspert",
            Icon: ConstructionIcon,
            color: "#004b74ff",
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
            color: "#C05A7A", // mørk rosa
            letterSpacing: "0.04em",
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

      <List>
        {mainItems.map((item, index) => (
          <React.Fragment key={item.path}>
            <Tooltip title={collapsed ? item.label : ""} placement="right">
              <ListItemButton
                selected={isSelected(item.path)}
                onClick={() => {
                  logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                  navigate(item.path);
                }}
                sx={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  px: collapsed ? 1 : 2,
                  py: collapsed ? 1.8 : 1.2,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                    color: item.color,
                  }}
                >
                  <item.Icon sx={{ fontSize: collapsed ? 45 : 35 }} />
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
                  sx={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1 : 2,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: collapsed ? 0 : 2,
                      justifyContent: "center",
                      display: "flex",
                      alignItems: "center",
                      color: item.color,
                    }}
                  >
                    <item.Icon sx={{ fontSize: collapsed ? 45 : 35 }} />
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
          display: "flex",
          justifyContent: "center",
          py: 1.5,
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

  React.useEffect(() => {
    logUsage("app_open");
  }, []);

  React.useEffect(() => {
    warmConnection(OFFICE_FORM_URL);
    warmConnection(ANBRUDD_FORM_URL);
    warmConnection(ANBRUDD_SHAREPOINT_URL);
  }, []);

  React.useEffect(() => {
    const page = pathToUsagePage(location.pathname);
    logUsage("page_view", { page, pagePath: location.pathname });
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Box component="main" sx={{ flex: 1, p: 2 }}>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/omeq" element={<OMEQPage />} />
            <Route path="/standardtekster" element={<StandardTekstPage />} />
            <Route path="/interaksjoner" element={<InteraksjonerPage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/statistikk" element={<StatistikkPage />} />
            <Route path="/produktskjema" element={<OfficeFormRedirectPage />} />
            <Route path="/anbrudd" element={<AndbruddPage />} />
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
