import React from "react";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalculateIcon from "@mui/icons-material/Calculate";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentIcon from "@mui/icons-material/Assignment";
import OMEQPage from "../features/omeq/pages/OMEQPage";
import StandardTekstPage from "../features/standardtekster/pages/StandardTekstPage";
import OfficeFormRedirectPage from "../features/produktskjema/pages/OfficeFormRedirectPage";
import HomePage from "./HomePage";
import { RequireAuth, LoginPage, ProfileMenu, ProfilePage } from "./auth/Auth";
import PendingApprovalPage from "./auth/PendingApprovalPage";
import { logUsage } from "../shared/services/usage";
import StatistikkPage from "../features/statistikk/pages/StatistikkPage";

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isSelected = (path: string) => {
    if (path === "/omeq") return location.pathname === "/" || location.pathname === "/omeq";
    return location.pathname === path;
  };

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const items = [
    { label: "OMEQ-beregning", path: "/omeq", Icon: CalculateIcon, color: "#1E88E5" },
    { label: "Standardtekster", path: "/standardtekster", Icon: DescriptionIcon, color: "#43A047" },
    { label: "Produktskjema", path: "/produktskjema", Icon: AssignmentIcon, color: "#8E24AA" },
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
          transition: "width 180ms ease",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          px: 1,
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
        {items.map((item) => (
          <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right">
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => navigate(item.path)}
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
                  color: item.color,
                }}
              >
                <item.Icon sx={{ fontSize: collapsed ? 45 : 35 }} />
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
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

  // Log one app_open per successful authenticated app load
  React.useEffect(() => {
    logUsage("app_open");
  }, []);

  // Log page views on route changes
  React.useEffect(() => {
    const pathname = location.pathname;
    const page = pathname.startsWith("/standardtekster")
      ? "standardtekster"
      : pathname.startsWith("/omeq") || pathname === "/"
      ? "omeq"
      : pathname.startsWith("/profil")
      ? "profil"
      : pathname.startsWith("/produktskjema")
      ? "produktskjema"
      : "other";

    logUsage("page_view", { page });
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Box component="main" sx={{ flex: 1, p: 2 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/omeq" element={<OMEQPage />} />
          <Route path="/standardtekster" element={<StandardTekstPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/statistikk" element={<StatistikkPage />} />
          <Route path="/produktskjema" element={<OfficeFormRedirectPage />} />
          <Route path="*" element={<Navigate to="/omeq" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
