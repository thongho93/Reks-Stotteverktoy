import React, { Suspense } from "react";
import {
  Box,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  Paper,
  Popper,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppUpdater from "./AppUpdater";
import { RequireAuth } from "./auth/RequireAuth";
import { logUsage, type UsagePage } from "../shared/services/usage";
import { useAuthUser } from "./auth/useAuthUser";
import { GlobalSearch } from "../features/commandpalette/GlobalSearch";
import { useGlobalSearchHotkey } from "../features/commandpalette/useGlobalSearchHotkey";
import RequireRekspert from "./auth/RequireRekspert";
import RequireAdmin from "./auth/RequireAdmin";
import RequireOwner from "./auth/RequireOwner";
import { ProfileMenu } from "./auth/ProfileMenu";
import {
  CalculatorIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronUpIcon,
  InboxIcon,
  MessageSquareTextIcon,
  NAV_COLORS,
  PackageXIcon,
  PillIcon,
  ShieldAlertIcon,
  SquarePenIcon,
  WarehouseIcon,
  WrenchIcon,
} from "./navIcons";
import { FAGLIG_DOC_QUERY_KEY, ROUTINE_TAB_QUERY_KEY, ROUTINE_DOC_QUERY_KEY } from "../features/produktograd/queryKeys";
import { NavigationGuardProvider, useGuardedNavigate } from "../shared/hooks/useNavigationGuard";


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
const NotesPage = React.lazy(
  () => import("../features/notater/pages/NotesPage")
);
const RekspertPage = React.lazy(() => import("../features/rekspert/RekspertPage"));
const StandardtekstStatistikkPage = React.lazy(
  () => import("../features/statistikk/pages/StandardtekstStatistikkPage")
);
const FeedbackPage = React.lazy(() => import("../features/feedback/pages/FeedbackPage"));
const InnspillPage = React.lazy(() => import("../features/feedback/pages/InnspillPage"));
const FeedbackLauncher = React.lazy(
  () => import("../features/feedback/components/FeedbackLauncher")
);
const NoteReminderLauncher = React.lazy(
  () => import("../features/notater/components/NoteReminderLauncher")
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

type SidebarSubItem = { label: string; search: string };

type SidebarItem = {
  label: string;
  path: string;
  Icon: React.ElementType;
  color: string; // toning av flis og hover
  strong: string; // fylt flis (valgt side) og ikonfarge i lys modus
  subItems?: SidebarSubItem[];
};

const MAIN_ITEMS: SidebarItem[] = [
  { label: "OMEQ-beregning", path: "/omeq", Icon: CalculatorIcon, ...NAV_COLORS.omeq },
  { label: "Lagerbeholdning", path: "/lagerbeholdning", Icon: WarehouseIcon, ...NAV_COLORS.lager },
  {
    label: "Standardtekster",
    path: "/standardtekster",
    Icon: MessageSquareTextIcon,
    ...NAV_COLORS.standardtekster,
  },
  { label: "Interaksjonssøk", path: "/interaksjoner", Icon: ShieldAlertIcon, ...NAV_COLORS.interaksjoner },
  {
    label: "Produkt og råd",
    path: "/produkt-og-rad",
    Icon: PillIcon,
    ...NAV_COLORS.produkt,
    subItems: [
      { label: "Produkt og råd", search: "" },
      { label: "Faglig innhold", search: "?fagdoc=" },
      { label: "Rutiner", search: "?tab=rutiner" },
    ],
  },
  {
    label: "Innkjøp og anbrudd",
    path: "/anbrudd",
    Icon: PackageXIcon,
    ...NAV_COLORS.anbrudd,
    subItems: [
      { label: "Anbruddsoversikt", search: "" },
      { label: "Produktskjema", search: "?tab=produktskjema" },
    ],
  },
  { label: "Notater", path: "/tilbakemelding", Icon: SquarePenIcon, ...NAV_COLORS.notater },
];

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

  // Hvilken undermeny som er aktiv, ut fra søkeparametrene i adressen.
  const activeSubIndex = (path: string): number => {
    const params = new URLSearchParams(location.search);
    if (path === "/produkt-og-rad") {
      if (params.get(ROUTINE_TAB_QUERY_KEY) === "rutiner" || params.has(ROUTINE_DOC_QUERY_KEY)) return 2;
      if (params.has(FAGLIG_DOC_QUERY_KEY)) return 1;
      return 0;
    }
    if (path === "/anbrudd") return params.get("tab") === "produktskjema" ? 1 : 0;
    if (path === "/tilbakemelding") return params.get("tab") === "meldeskjema" ? 1 : 0;
    return 0;
  };

  // Undermenyer åpnes automatisk når man er på siden de hører til.
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>(() => ({
    [location.pathname]: true,
  }));
  React.useEffect(() => {
    if (MAIN_ITEMS.some((item) => item.subItems && item.path === location.pathname)) {
      setOpenMenus((open) => ({ ...open, [location.pathname]: true }));
    }
  }, [location.pathname]);

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const adminItems: SidebarItem[] = [
    ...(hasRekspertAccess
      ? [
          {
            label: "Rekspert",
            path: "/rekspert",
            Icon: WrenchIcon,
            ...NAV_COLORS.rekspert,
          } satisfies SidebarItem,
        ]
      : []),
    ...(hasAdminAccess
      ? [
          {
            label: "Tekststatistikk",
            path: "/rekspert/tekststatistikk",
            Icon: ChartColumnIcon,
            ...NAV_COLORS.statistikk,
          } satisfies SidebarItem,
        ]
      : []),
    // Innspill fra brukerne er kun eiers ansvar – admin skal ikke se dem.
    ...(isOwner
      ? [
          {
            label: "Innspill",
            path: "/rekspert/feedbacks",
            Icon: InboxIcon,
            ...NAV_COLORS.innspill,
          } satisfies SidebarItem,
        ]
      : []),
  ];

  // Ikonfargen: den mørkere varianten i lys modus gir nok kontrast mot hvit bakgrunn.
  const iconColor = (theme: Theme, item: SidebarItem) =>
    theme.palette.mode === "dark" ? item.color : item.strong;

  const goTo = (item: SidebarItem) => {
    logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
    navigate(item.path);
    setFlyout(null);
    if (item.subItems) setOpenMenus((open) => ({ ...open, [item.path]: true }));
  };

  // Kollapset meny: undermenyen vises som en liten flyout til høyre når man holder
  // musen over ikonet, slik at man kan gå rett til en undereside uten å utvide menyen.
  const [flyout, setFlyout] = React.useState<{ path: string; anchor: HTMLElement } | null>(null);
  const flyoutCloseTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const openFlyout = (path: string, anchor: HTMLElement) => {
    clearTimeout(flyoutCloseTimer.current);
    setFlyout({ path, anchor });
  };
  const scheduleFlyoutClose = () => {
    clearTimeout(flyoutCloseTimer.current);
    flyoutCloseTimer.current = setTimeout(() => setFlyout(null), 150);
  };
  React.useEffect(() => () => clearTimeout(flyoutCloseTimer.current), []);
  React.useEffect(() => {
    if (!collapsed) setFlyout(null);
  }, [collapsed]);

  const renderFlyout = (item: SidebarItem) => {
    if (!collapsed || !item.subItems || flyout?.path !== item.path) return null;
    const selected = isSelected(item.path);
    return (
      <Popper
        open
        anchorEl={flyout.anchor}
        placement="right-start"
        sx={{ zIndex: (theme) => theme.zIndex.tooltip }}
      >
        {/* Gjennomsiktig venstremarg gjør at musen kan flyttes fra ikonet til flyouten uten å miste hover. */}
        <Box
          onMouseEnter={() => clearTimeout(flyoutCloseTimer.current)}
          onMouseLeave={scheduleFlyoutClose}
          sx={{ pl: 0.5 }}
        >
          <Paper
            elevation={8}
            role="menu"
            aria-label={item.label}
            sx={{ minWidth: 190, p: 0.75, borderRadius: "14px", border: "1px solid", borderColor: "divider" }}
          >
            <Typography
              variant="caption"
              sx={(theme) => ({
                display: "block",
                px: 1.5,
                pt: 0.5,
                pb: 0.75,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: iconColor(theme, item),
              })}
            >
              {item.label}
            </Typography>
            {item.subItems.map((sub, i) => {
              const subActive = selected && activeSubIndex(item.path) === i;
              return (
                <ListItemButton
                  key={sub.label}
                  role="menuitem"
                  selected={subActive}
                  onClick={() => {
                    logUsage("menu_click", { targetPage: pathToUsagePage(item.path) });
                    navigate(`${item.path}${sub.search}`);
                    setFlyout(null);
                  }}
                  sx={(theme) => ({
                    height: 36,
                    minHeight: 0,
                    px: 1.5,
                    borderRadius: "10px",
                    "&:hover": { backgroundColor: alpha(item.color, 0.1) },
                    "&.Mui-selected, &.Mui-selected:hover": {
                      backgroundColor: alpha(item.color, 0.14),
                      color: iconColor(theme, item),
                    },
                  })}
                >
                  <Typography
                    noWrap
                    sx={{
                      fontSize: "0.86rem",
                      fontWeight: subActive ? 600 : 400,
                      color: subActive ? "inherit" : "text.primary",
                    }}
                  >
                    {sub.label}
                  </Typography>
                </ListItemButton>
              );
            })}
          </Paper>
        </Box>
      </Popper>
    );
  };

  const renderItem = (item: SidebarItem) => {
    const selected = isSelected(item.path);
    const hasSub = Boolean(item.subItems) && !collapsed;
    const hasFlyout = Boolean(item.subItems) && collapsed;
    const open = hasSub && Boolean(openMenus[item.path]);
    const ItemIcon = item.Icon;

    return (
      <Box key={item.path}>
        <Box
          onMouseEnter={hasFlyout ? (e) => openFlyout(item.path, e.currentTarget) : undefined}
          onMouseLeave={hasFlyout ? scheduleFlyoutClose : undefined}
          sx={{ position: "relative", px: collapsed ? 0 : 1.5, display: "flex", justifyContent: "center" }}
        >
          <Tooltip title={collapsed && !hasFlyout ? item.label : ""} placement="right">
            <ListItemButton
              selected={selected}
              onClick={() => goTo(item)}
              aria-label={collapsed ? item.label : undefined}
              aria-current={selected ? "page" : undefined}
              sx={(theme) =>
                collapsed
                  ? {
                      width: 48,
                      height: 48,
                      minHeight: 0,
                      p: 0,
                      borderRadius: "14px",
                      justifyContent: "center",
                      color: iconColor(theme, item),
                      transition: "background-color 160ms ease, color 160ms ease",
                      "&:hover": { backgroundColor: alpha(item.color, 0.14) },
                      "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: item.strong,
                        color: "#FFFFFF",
                      },
                    }
                  : {
                      flex: 1,
                      height: 44,
                      minHeight: 0,
                      px: 1.25,
                      pr: hasSub ? 5 : 1.25,
                      gap: 1.5,
                      borderRadius: "12px",
                      transition: "background-color 160ms ease",
                      "&:hover": { backgroundColor: alpha(item.color, 0.1) },
                      "&.Mui-selected": { backgroundColor: alpha(item.color, 0.12) },
                      "&.Mui-selected:hover": { backgroundColor: alpha(item.color, 0.16) },
                    }
              }
            >
              {collapsed ? (
                <ItemIcon sx={{ fontSize: 26 }} />
              ) : (
                <>
                  <Box
                    sx={(theme) => ({
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? item.strong : alpha(item.color, 0.16),
                      color: selected ? "#FFFFFF" : iconColor(theme, item),
                      transition: "background-color 160ms ease, color 160ms ease",
                    })}
                  >
                    <ItemIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography
                    noWrap
                    sx={{ fontSize: "0.9rem", fontWeight: selected ? 600 : 500, color: "text.primary" }}
                  >
                    {item.label}
                  </Typography>
                </>
              )}
            </ListItemButton>
          </Tooltip>
          {hasSub && (
            <IconButton
              size="small"
              aria-label={open ? "Skjul undermeny" : "Vis undermeny"}
              aria-expanded={open}
              onClick={() => setOpenMenus((o) => ({ ...o, [item.path]: !o[item.path] }))}
              sx={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                color: "text.secondary",
              }}
            >
              {open ? <ChevronUpIcon sx={{ fontSize: 18 }} /> : <ChevronDownIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          )}
          {renderFlyout(item)}
        </Box>

        {hasSub && (
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                ml: "38px",
                pl: 1.5,
                my: 0.25,
                borderLeft: "1.5px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
              }}
            >
              {item.subItems?.map((sub, i) => {
                const subActive = selected && activeSubIndex(item.path) === i;
                return (
                  <ListItemButton
                    key={sub.label}
                    selected={subActive}
                    onClick={() => navigate(`${item.path}${sub.search}`)}
                    sx={(theme) => ({
                      height: 34,
                      minHeight: 0,
                      px: 1.5,
                      mr: 1.5,
                      borderRadius: "10px",
                      "&:hover": { backgroundColor: "action.hover" },
                      "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: alpha(item.color, 0.12),
                        color: iconColor(theme, item),
                      },
                    })}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "0.84rem",
                        fontWeight: subActive ? 600 : 400,
                        color: subActive ? "inherit" : "text.secondary",
                      }}
                    >
                      {sub.label}
                    </Typography>
                  </ListItemButton>
                );
              })}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  const goHome = () => {
    logUsage("menu_click", { targetPage: "home" });
    navigate("/");
  };

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
      {/* Topp: logo og sammenslåing av menyen */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          justifyContent: collapsed ? "flex-start" : "space-between",
          gap: collapsed ? 0.5 : 0,
          pt: collapsed ? 1.5 : 1.25,
          pb: collapsed ? 0.5 : 1.25,
          pl: collapsed ? 0 : 2,
          pr: collapsed ? 0 : 1.25,
        }}
      >
        <Box
          onClick={goHome}
          sx={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          {collapsed ? (
            <Tooltip title="Reks+" placement="right">
              <Box component="img" src="/logo.svg" alt="REKS+ logo" sx={{ width: 44, height: 44 }} />
            </Tooltip>
          ) : (
            <>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 24,
                  color: "primary.main",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  textShadow: (theme) =>
                    theme.palette.mode === "dark" ? "0 4px 16px rgba(230, 165, 190, 0.22)" : "none",
                }}
              >
                REKS
              </Typography>
              <Box component="img" src="/logo.svg" alt="" sx={{ width: 48, height: 48, flexShrink: 0 }} />
            </>
          )}
        </Box>
        <Tooltip title={collapsed ? "Utvid meny" : "Skjul meny"} placement={collapsed ? "right" : "bottom"}>
          <IconButton
            onClick={onToggle}
            aria-label={collapsed ? "Utvid meny" : "Skjul meny"}
            sx={{ color: "text.secondary" }}
          >
            {collapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Menylisten ruller hvis den blir for høy; topp og bunn står fast. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 999,
            backgroundColor: (theme) =>
              alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.24 : 0.18),
          },
        }}
      >
      {collapsed ? (
        <Divider sx={{ mx: 2, my: 1 }} />
      ) : (
        <Typography
          variant="caption"
          component="div"
          sx={{
            px: 3,
            pt: 1.5,
            pb: 0.75,
            color: "text.secondary",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Verktøy
        </Typography>
      )}

      <Box component="nav" aria-label="Hovedmeny" sx={{ display: "flex", flexDirection: "column", gap: collapsed ? 0.75 : 0.25, pb: 1 }}>
        {MAIN_ITEMS.map(renderItem)}

        {adminItems.length > 0 && (
          <>
            {collapsed ? (
              <Divider sx={{ mx: 2, my: 1 }} />
            ) : (
              <Typography
                variant="caption"
                component="div"
                sx={{
                  px: 3,
                  pt: 2.5,
                  pb: 0.75,
                  color: "text.secondary",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Rekspert-verktøy
              </Typography>
            )}
            {adminItems.map(renderItem)}
          </>
        )}
      </Box>

      </Box>

      {/* Bunn: ukenummer og profil */}
      <Divider sx={{ mx: collapsed ? 2 : 1.5, flexShrink: 0 }} />
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: collapsed ? "column" : "row-reverse",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: collapsed ? 1 : 0,
          px: collapsed ? 0 : 2,
          py: 1.5,
          "& .MuiAvatar-root": { width: 44, height: 44 },
        }}
      >
        <Tooltip title={collapsed ? `Uke ${currentWeekNumber}` : ""} placement="right">
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.06),
            }}
          >
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary", lineHeight: 1.2 }}
            >
              {collapsed ? `${currentWeekNumber}` : `Uke ${currentWeekNumber}`}
            </Typography>
          </Box>
        </Tooltip>
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
        <Suspense fallback={null}>
          <FeedbackLauncher />
          <NoteReminderLauncher />
        </Suspense>
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
                <Route path="/tilbakemelding" element={<NotesPage />} />
                <Route path="/innspill" element={<InnspillPage />} />
                <Route element={<RequireRekspert />}>
                  <Route path="/rekspert" element={<RekspertPage />} />
                </Route>
                <Route element={<RequireAdmin />}>
                  <Route
                    path="/rekspert/tekststatistikk"
                    element={<StandardtekstStatistikkPage />}
                  />
                </Route>
                <Route element={<RequireOwner />}>
                  <Route path="/rekspert/feedbacks" element={<FeedbackPage />} />
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
