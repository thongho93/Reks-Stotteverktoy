import { useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import IconButton from "@mui/material/IconButton";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ClearIcon from "@mui/icons-material/Clear";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/Auth";
import { logUsage } from "../../../shared/services/usage";
import PinkSwitch from "./PinkSwitch";

const storageKey = (base: string, uid?: string | null) =>
  uid ? `standardtekster:${uid}:${base}` : `standardtekster:${base}`;

function readFavoritesBackup(uid?: string | null) {
  try {
    const perUserRaw = localStorage.getItem(storageKey("favoritesBackup", uid));
    if (perUserRaw) {
      const parsed = JSON.parse(perUserRaw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    }

    const legacyRaw = localStorage.getItem("standardtekster:favorites");
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore
  }

  return [];
}

function writeFavoritesBackup(favorites: string[], uid?: string | null) {
  try {
    localStorage.setItem(storageKey("favoritesBackup", uid), JSON.stringify(favorites));
    localStorage.setItem("standardtekster:favorites", JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

type Props = {
  disabled?: boolean;
  isAdmin: boolean;
  creating: boolean;
  onCreate: () => void;

  search: string;
  setSearch: (value: string) => void;

  loading: boolean;
  filtered: StandardTekst[];
  onToggleActive?: (id: string, isActive: boolean) => Promise<void> | void;

  selectedId: string | null;
  setSelectedId: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

function stableHash(input: string) {
  // djb2-ish hash for stable distribution
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function buildCategoryColorMap(categories: string[]) {
  const uniq = Array.from(
    new Set((categories ?? []).map((c) => (c ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "nb"));

  // Deterministic rotation offset so the whole palette doesn't always start at the same hue.
  const seed = stableHash(uniq.join("|"));
  const offset = seed % 360;

  const n = Math.max(uniq.length, 1);

  const map = new Map<string, string>();

  for (let i = 0; i < uniq.length; i++) {
    const name = uniq[i];

    // Evenly spaced hues -> maximum separation
    const hue = (offset + (i * 360) / n) % 360;

    // Alternate S/L for better adjacent contrast
    const variant: 0 | 1 = i % 2 === 1 ? 1 : 0;
    const saturation = variant === 0 ? 70 : 62;
    const lightness = variant === 0 ? 42 : 56;

    map.set(name.toLowerCase(), `hsl(${hue.toFixed(0)} ${saturation}% ${lightness}%)`);
  }

  return map;
}

function getCategoryMarkerColor(category: string, colorMap: Map<string, string>) {
  const c = (category ?? "").trim();
  if (!c) return "#9E9E9E";
  const lower = c.toLowerCase();
  if (lower === "favoritter") return "#F9A825";
  if (lower === "uten kategori") return "#78909C";
  return colorMap.get(lower) ?? "#9E9E9E";
}

function isUtenKategori(category: string) {
  return (category ?? "").trim().toLowerCase() === "uten kategori";
}

function getSearchRank(item: StandardTekst, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const category = (item.category ?? "").trim().toLowerCase();
  const title = (item.title ?? "").trim().toLowerCase();
  const content = (item.content ?? "").trim().toLowerCase();

  if (category.includes(query)) return 0;
  if (title.includes(query)) return 1;
  if (content.includes(query)) return 2;

  return 3;
}

// Component that shows a truncated title with ellipsis, and a tooltip on hover if truncated
function TruncatedTitle({ title }: { title: string }) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      // If scrollWidth > clientWidth, the text is visually truncated (ellipsis)
      setIsTruncated(el.scrollWidth > el.clientWidth);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => ro.disconnect();
  }, [title]);

  return (
    <Tooltip
      title={title}
      placement="right"
      arrow
      disableHoverListener={!isTruncated}
      slotProps={{
        tooltip: {
          sx: (theme) => ({
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(230, 237, 250, 0.95)"
                : "rgba(32, 32, 32, 0.95)",
            color: theme.palette.mode === "dark" ? "#0f1622" : "#fff",
            fontSize: 13,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 8px 22px rgba(2,6,18,0.38)"
                : "0 6px 18px rgba(0,0,0,0.45)",
          }),
        },
        arrow: {
          sx: (theme) => ({
            color:
              theme.palette.mode === "dark"
                ? "rgba(230, 237, 250, 0.95)"
                : "rgba(32, 32, 32, 0.95)",
          }),
        },
      }}
    >
      <span
        ref={textRef}
        style={{
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </Tooltip>
  );
}
export default function StandardTekstSidebar({
  disabled = false,
  isAdmin,
  creating,
  onCreate,
  search,
  setSearch,
  loading,
  filtered,
  onToggleActive,
  selectedId,
  setSelectedId,
  searchInputRef,
}: Props) {
  const { user } = useAuthUser();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  // Category expand/collapse state (persisted locally)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedHydrated, setExpandedHydrated] = useState(false);

  // Category hide/show state (persisted locally)
  const [hiddenCategories, setHiddenCategories] = useState<Record<string, boolean>>({});
  const [hiddenHydrated, setHiddenHydrated] = useState(false);
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [draggingFavoriteId, setDraggingFavoriteId] = useState<string | null>(null);
  const [favoriteDropTarget, setFavoriteDropTarget] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);

  // Hydrate expand/collapse state from localStorage on mount
  useEffect(() => {
    try {
      const key = storageKey("categoryExpanded", user?.uid);
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setExpandedCategories(parsed);
      }
    } catch {
      // ignore
    } finally {
      setExpandedHydrated(true);
    }
  }, [user?.uid]);

  // Hydrate hide/show state from localStorage on mount
  useEffect(() => {
    try {
      const key = storageKey("categoryHidden", user?.uid);
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setHiddenCategories(parsed);
      }
    } catch {
      // ignore
    } finally {
      setHiddenHydrated(true);
    }
  }, [user?.uid]);

  const favoritesDocRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(db, "users", user.uid, "preferences", "standardtekster");
  }, [user?.uid]);

  // Load favorites for this user (fallback to localStorage if not logged in)
  useEffect(() => {
    let cancelled = false;

    setFavoritesHydrated(false);

    const load = async () => {
      const backup = readFavoritesBackup(user?.uid);

      try {
        if (!favoritesDocRef) {
          if (!cancelled) setFavorites(backup);
          return;
        }

        const snap = await getDoc(favoritesDocRef);
        const data = snap.exists() ? (snap.data() as any) : null;
        const fav = Array.isArray(data?.favorites)
          ? data.favorites.filter((x: any) => typeof x === "string")
          : backup;
        writeFavoritesBackup(fav, user?.uid);
        if (!cancelled) setFavorites(fav);
      } catch {
        if (!cancelled) setFavorites(backup);
      } finally {
        if (!cancelled) {
          setFavoritesHydrated(true);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [favoritesDocRef]);

  // Persist favorites (Firestore per-user, localStorage fallback)
  useEffect(() => {
    // Do not write back until we've loaded existing favorites (prevents wiping on refresh)
    if (!favoritesHydrated) return;

    writeFavoritesBackup(favorites, user?.uid);

    if (!favoritesDocRef) {
      return;
    }

    setDoc(favoritesDocRef, { favorites }, { merge: true }).catch(() => {
      // ignore
    });
  }, [favorites, favoritesDocRef, favoritesHydrated, user?.uid]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveFavoriteTo = (
    draggedId: string,
    targetId: string,
    position: "before" | "after"
  ) => {
    setFavorites((prev) => {
      if (draggedId === targetId) return prev;

      const fromIndex = prev.indexOf(draggedId);
      const targetIndex = prev.indexOf(targetId);
      if (fromIndex === -1 || targetIndex === -1) return prev;

      const insertionBase = targetIndex - (fromIndex < targetIndex ? 1 : 0);
      const insertionIndex = position === "after" ? insertionBase + 1 : insertionBase;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);

      const clampedIndex = Math.max(0, Math.min(insertionIndex, next.length));
      next.splice(clampedIndex, 0, moved);
      return next;
    });
  };

  const isSearching = search.trim().length > 0;
  const visibleItems = useMemo(() => {
    if (isAdmin && showInactive) return filtered;
    return filtered.filter((it) => it.isActive !== false);
  }, [filtered, isAdmin, showInactive]);

  const favoritesIndex = useMemo(() => {
    const index = new Map<string, number>();
    favorites.forEach((id, i) => index.set(id, i));
    return index;
  }, [favorites]);

  // Sort items: favorites on top. Favorites follow manual user order.
  // Non-favorites are ordered by title.
  const sortedItems = useMemo(() => {
    const isSearchingNow = search.trim().length > 0;

    return [...visibleItems].sort((a, b) => {
      if (isSearchingNow) {
        const rankDiff = getSearchRank(a, search) - getSearchRank(b, search);
        if (rankDiff !== 0) return rankDiff;
      }

      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);

      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // If both are favorites, keep manual order (fallback to title for safety)
      if (aFav && bFav) {
        const aPos = favoritesIndex.get(a.id);
        const bPos = favoritesIndex.get(b.id);
        if (typeof aPos === "number" && typeof bPos === "number" && aPos !== bPos) {
          return aPos - bPos;
        }
        return a.title.localeCompare(b.title, "nb");
      }

      return a.title.localeCompare(b.title, "nb");
    });
  }, [visibleItems, favorites, search, favoritesIndex]);

  // Group items by category, with favorites as a separate group on top
  const groupedByCategory = useMemo(() => {
    const favoriteItems = isSearching ? [] : sortedItems.filter((it) => favorites.includes(it.id));
    const visibleItems = isSearching
      ? sortedItems
      : sortedItems.filter((it) => !favorites.includes(it.id));

    const groups = new Map<string, StandardTekst[]>();

    for (const it of visibleItems) {
      const key = (it.category ?? "").trim() || "Uten kategori";
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }

    const categoryGroups = Array.from(groups.entries())
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => {
        if (isSearching) {
          const aRank = Math.min(...a.items.map((item) => getSearchRank(item, search)));
          const bRank = Math.min(...b.items.map((item) => getSearchRank(item, search)));
          if (aRank !== bRank) return aRank - bRank;
        }

        const aIsUncat = isUtenKategori(a.category);
        const bIsUncat = isUtenKategori(b.category);
        if (aIsUncat && !bIsUncat) return 1;
        if (!aIsUncat && bIsUncat) return -1;
        return a.category.localeCompare(b.category, "nb");
      });

    // Favorites group always on top (if any)
    if (favoriteItems.length > 0) {
      return [{ category: "Favoritter", items: favoriteItems }, ...categoryGroups];
    }

    return categoryGroups;
  }, [sortedItems, favorites, isSearching, search]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const isExpanded = prev[category] !== false; // default expanded
      return {
        ...prev,
        [category]: !isExpanded,
      };
    });
  };

  const expandAllCategories = () => {
    setExpandedCategories((prev) => {
      const next = { ...prev };
      for (const g of groupedByCategory) {
        if (hiddenCategories[g.category]) continue;
        next[g.category] = true;
      }
      return next;
    });
  };

  const collapseAllCategories = () => {
    setExpandedCategories((prev) => {
      const next = { ...prev };
      for (const g of groupedByCategory) {
        if (hiddenCategories[g.category]) continue;
        next[g.category] = false;
      }
      return next;
    });
  };

  const hideCategory = (category: string) => {
    setHiddenCategories((prev) => ({
      ...prev,
      [category]: true,
    }));
  };

  const showCategory = (category: string) => {
    setHiddenCategories((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  // Persist expand/collapse state
  useEffect(() => {
    if (!expandedHydrated) return;
    try {
      const key = storageKey("categoryExpanded", user?.uid);
      localStorage.setItem(key, JSON.stringify(expandedCategories));
    } catch {
      // ignore
    }
  }, [expandedCategories, expandedHydrated, user?.uid]);

  // Persist hide/show state
  useEffect(() => {
    if (!hiddenHydrated) return;
    try {
      const key = storageKey("categoryHidden", user?.uid);
      localStorage.setItem(key, JSON.stringify(hiddenCategories));
    } catch {
      // ignore
    }
  }, [hiddenCategories, hiddenHydrated, user?.uid]);

  const prevSelectedIdRef = useRef<string | null>(null);

  const categoryColorMap = useMemo(() => {
    const cats = visibleItems.map((it) => (it.category ?? "").trim() || "Uten kategori");
    return buildCategoryColorMap(cats);
  }, [visibleItems]);

  const selectStandardTekst = (item: StandardTekst) => {
    logUsage("standardtekst_open", { standardtekstId: item.id });

    setSelectedId(item.id);
  };

  // Ensure the category containing the selected item is expanded
  // Only do this when selection changes due to user interaction, not on initial load.
  useEffect(() => {
    if (!expandedHydrated) return;

    // On initial mount, just record the current selection and do not auto-expand.
    if (prevSelectedIdRef.current === null) {
      prevSelectedIdRef.current = selectedId ?? null;
      return;
    }

    // Only auto-expand when the selectedId actually changes
    if (!selectedId || selectedId === prevSelectedIdRef.current) return;

    prevSelectedIdRef.current = selectedId;

    for (const g of groupedByCategory) {
      if (hiddenCategories[g.category]) continue;
      if (g.items.some((x) => x.id === selectedId)) {
        setExpandedCategories((prev) => ({
          ...prev,
          [g.category]: true,
        }));
        break;
      }
    }
  }, [selectedId, groupedByCategory, expandedHydrated, hiddenCategories]);

  return (
    <Paper className={styles.sidebar} sx={{ position: "relative" }}>
      {disabled && (
        <Box
          sx={{ position: "absolute", inset: 0, zIndex: 50 }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
      <Box className={styles.sidebarHeader}>
        {isAdmin && (
          <Box className={styles.sidebarCreateRow}>
            <Button
              variant="contained"
              size="small"
              onClick={onCreate}
              disabled={creating}
              className={styles.pillButton}
            >
              {creating ? "Oppretter..." : "Ny standardtekst"}
            </Button>
          </Box>
        )}

        <Box className={styles.sidebarSearch}>
          <TextField
            fullWidth
            size="small"
            label="Søk i standardtekster"
            value={search}
            inputRef={searchInputRef}
            onFocus={() => {
              // Reset search each time the field is re-activated.
              setSearch("");
            }}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);

              if (value.length === 1) {
                logUsage("search_standardtekster", {
                  searchLen: value.length,
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setSearch("");
                // Keep initial autofocus behavior, but allow Escape to dismiss focus.
                searchInputRef?.current?.blur();
                (e.currentTarget as HTMLInputElement | null)?.blur?.();
                return;
              }

              if (e.key !== "Enter") return;

              const topMatch = sortedItems[0];
              if (!topMatch) return;

              e.preventDefault();
              selectStandardTekst(topMatch);
            }}
            disabled={disabled}
            slotProps={{
              input: {
                endAdornment: search.trim() ? (
                  <InputAdornment position="end">
                    <Tooltip title="Tøm søk" placement="top" arrow>
                      <span>
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label="Tøm søk"
                          onClick={() => setSearch("")}
                          disabled={disabled}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
            Kategorier
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Kollaps alle" placement="top" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={collapseAllCategories}
                  disabled={disabled || groupedByCategory.length === 0}
                  sx={{
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(165, 177, 198, 0.34)"
                        : "rgba(15, 23, 42, 0.14)",
                    borderRadius: 999,
                    width: 30,
                    height: 30,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(24, 33, 46, 0.9)"
                        : "rgba(255,255,255,0.9)",
                    "&:hover": {
                      bgcolor: "rgba(92, 170, 126, 0.16)",
                      borderColor: "rgba(92, 170, 126, 0.42)",
                    },
                  }}
                >
                  <UnfoldLessIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Ekspander alle" placement="top" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={expandAllCategories}
                  disabled={disabled || groupedByCategory.length === 0}
                  sx={{
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(165, 177, 198, 0.34)"
                        : "rgba(15, 23, 42, 0.14)",
                    borderRadius: 999,
                    width: 30,
                    height: 30,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(24, 33, 46, 0.9)"
                        : "rgba(255,255,255,0.9)",
                    "&:hover": {
                      bgcolor: "rgba(92, 170, 126, 0.16)",
                      borderColor: "rgba(92, 170, 126, 0.42)",
                    },
                  }}
                >
                  <UnfoldMoreIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {isAdmin && (
          <FormControlLabel
            sx={{ m: 0, mt: 0.25 }}
            control={
              <PinkSwitch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                disabled={disabled}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Vis deaktiverte
              </Typography>
            }
          />
        )}

        {search.trim() && (
          <Typography variant="subtitle2" color="text.secondary" className={styles.sidebarCount}>
            {loading ? "Laster..." : `${sortedItems.length} treff`}
          </Typography>
        )}
      </Box>

      <Divider className={styles.sidebarDivider} />

      <Box className={styles.sidebarBody}>
        {loading ? (
          <Box className={styles.sidebarLoading}>
            <CircularProgress size={28} />
          </Box>
        ) : sortedItems.length === 0 ? (
          <Box className={styles.sidebarEmpty}>
            <Typography variant="body2" color="text.secondary">
              Ingen treff.
            </Typography>
          </Box>
        ) : (
          <>
            <List dense disablePadding className={styles.sidebarList}>
              {groupedByCategory.map((group) => {
                const isHidden = !!hiddenCategories[group.category];
                if (isHidden && !isSearching) return null;

                const isExpanded = isSearching
                  ? true
                  : expandedCategories[group.category] !== false;
                const isFirstGroup = groupedByCategory[0]?.category === group.category;

                return (
                  <Box key={group.category}>
                    <ListItemButton
                      onClick={() => toggleCategory(group.category)}
                      sx={(theme) => ({
                        py: 0.8,
                        px: 1.25,
                        mx: 1,
                        mt: 0.35,
                        borderRadius: 1.5,
                        position: "sticky",
                        top: 4,
                        zIndex: 3,
                        border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
                        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.92)} 100%)`,
                        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
                        borderTop: isFirstGroup ? `1px solid ${alpha(theme.palette.divider, 0.65)}` : undefined,
                        ...(isHidden
                          ? {
                              opacity: 0.85,
                            }
                          : {}),
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          background: "transparent",
                          zIndex: -1,
                        },
                        "&:hover": {
                          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                        },
                        "&:hover .hide-category-btn": { opacity: 1 },
                        "&.Mui-selected .hide-category-btn": { opacity: 1 },
                      })}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          width: 9,
                          height: 24,
                          borderRadius: 999,
                          mr: 1,
                          bgcolor: getCategoryMarkerColor(group.category, categoryColorMap),
                          flexShrink: 0,
                          boxShadow: (theme) =>
                            `0 0 0 1px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.22 : 0.06)} inset`,
                        }}
                      />
                      <ListItemText
                        primary={group.category}
                        primaryTypographyProps={{
                          variant: "body1",
                          fontWeight: 700,
                          noWrap: true,
                        }}
                      />

                      {isHidden ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mr: 0.75, whiteSpace: "nowrap" }}
                        >
                          Skjult
                        </Typography>
                      ) : (
                        group.category !== "Favoritter" && (
                          <Tooltip title="Skjul kategori" placement="top" arrow>
                            <IconButton
                              className="hide-category-btn"
                              size="small"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                hideCategory(group.category);
                              }}
                              sx={(theme) => ({
                                mr: 0.5,
                                opacity: 0,
                                transition: "opacity 120ms ease",
                                borderRadius: 999,
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.error.main, 0.12),
                                },
                              })}
                            >
                              <VisibilityOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      )}

                      <ExpandMoreIcon
                        fontSize="small"
                        sx={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 120ms ease",
                          opacity: 0.75,
                        }}
                      />
                    </ListItemButton>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List dense disablePadding>
                        {group.items.map((it) => {
                          const isFavoritesGroup = group.category === "Favoritter" && !isSearching;
                          const isDragTarget = favoriteDropTarget?.id === it.id;
                          const dropBefore = isDragTarget && favoriteDropTarget?.position === "before";
                          const dropAfter = isDragTarget && favoriteDropTarget?.position === "after";
                          const itemCategoryColor = getCategoryMarkerColor(
                            (it.category ?? "").trim() || "Uten kategori",
                            categoryColorMap,
                          );
                          return (
                          <ListItemButton
                            key={it.id}
                            selected={it.id === selectedId}
                            onClick={() => selectStandardTekst(it)}
                            draggable={isFavoritesGroup}
                            onDragStart={(e) => {
                              if (!isFavoritesGroup) return;
                              setDraggingFavoriteId(it.id);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", it.id);
                            }}
                            onDragOver={(e) => {
                              if (!isFavoritesGroup || !draggingFavoriteId || draggingFavoriteId === it.id) return;
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const position: "before" | "after" =
                                e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                              setFavoriteDropTarget({ id: it.id, position });
                            }}
                            onDrop={(e) => {
                              if (!isFavoritesGroup || !draggingFavoriteId || draggingFavoriteId === it.id) return;
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const position: "before" | "after" =
                                e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                              moveFavoriteTo(draggingFavoriteId, it.id, position);
                              setDraggingFavoriteId(null);
                              setFavoriteDropTarget(null);
                            }}
                            onDragEnd={() => {
                              setDraggingFavoriteId(null);
                              setFavoriteDropTarget(null);
                            }}
                            className={styles.sidebarItem}
                            sx={(theme) => {
                              const greenAccent =
                                theme.palette.mode === "dark" ? "#8fdab5" : "#8ecfad";

                              return {
                                pl: 2.15,
                                pr: 0.75,
                                py: 0.55,
                                position: "relative",
                                border: `1px solid ${alpha(
                                  itemCategoryColor,
                                  theme.palette.mode === "dark" ? 0.58 : 0.34,
                                )} !important`,
                                backgroundColor: `${alpha(
                                  itemCategoryColor,
                                  theme.palette.mode === "dark" ? 0.18 : 0.1,
                                )} !important`,
                                transition:
                                  "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  left: 0,
                                  top: 6,
                                  bottom: 6,
                                  width: 5,
                                  borderRadius: "0 999px 999px 0",
                                  backgroundColor: itemCategoryColor,
                                  boxShadow: `0 0 0 1px ${alpha(theme.palette.common.black, 0.08)}`,
                                },

                                "&.Mui-selected": {
                                  backgroundColor: `${alpha(
                                    greenAccent,
                                    theme.palette.mode === "dark" ? 0.28 : 0.16,
                                  )} !important`,
                                  borderColor: `${alpha(greenAccent, 0.72)} !important`,
                                  boxShadow: `0 2px 8px ${alpha(greenAccent, 0.28)}`,
                                },

                                "&.Mui-selected:hover": {
                                  backgroundColor: `${alpha(
                                    greenAccent,
                                    theme.palette.mode === "dark" ? 0.34 : 0.2,
                                  )} !important`,
                                },

                                "&:hover": {
                                  backgroundColor: `${alpha(
                                    greenAccent,
                                    theme.palette.mode === "dark" ? 0.22 : 0.12,
                                  )} !important`,
                                  borderColor: `${alpha(greenAccent, 0.66)} !important`,
                                  transform: "translateX(1px)",
                                },
                                ...(dropBefore
                                  ? {
                                      boxShadow: `inset 0 2px 0 ${alpha(itemCategoryColor, 0.9)}`,
                                    }
                                  : {}),
                                ...(dropAfter
                                  ? {
                                      boxShadow: `inset 0 -2px 0 ${alpha(itemCategoryColor, 0.9)}`,
                                    }
                                  : {}),
                              };
                            }}
                          >
                            <ListItemText
                              primary={<TruncatedTitle title={it.title} />}
                              secondary={it.isActive === false ? "Deaktivert" : undefined}
                            />

                            {isFavoritesGroup ? (
                              <Tooltip title="Dra for å endre rekkefølge" placement="top" arrow>
                                <Box
                                  aria-hidden
                                  sx={(theme) => ({
                                    display: "inline-flex",
                                    alignItems: "center",
                                    mr: 0.25,
                                    color: alpha(theme.palette.text.primary, 0.5),
                                    cursor: "grab",
                                  })}
                                >
                                  <DragIndicatorIcon fontSize="small" />
                                </Box>
                              </Tooltip>
                            ) : null}

                            {isAdmin && onToggleActive ? (
                              <Tooltip
                                title={it.isActive === false ? "Reaktiver standardtekst" : "Deaktiver standardtekst"}
                                placement="top"
                                arrow
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    edge="end"
                                    disabled={activatingId === it.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const nextActive = it.isActive === false;
                                      try {
                                        setActivatingId(it.id);
                                        await onToggleActive(it.id, nextActive);
                                      } finally {
                                        setActivatingId(null);
                                      }
                                    }}
                                  >
                                    {it.isActive === false ? (
                                      <VisibilityIcon fontSize="small" />
                                    ) : (
                                      <VisibilityOffIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : null}

                            <IconButton
                              size="small"
                              edge="end"
                              aria-label={
                                favorites.includes(it.id)
                                  ? `Fjern ${it.title} fra favoritter`
                                  : `Legg ${it.title} til favoritter`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(it.id);
                              }}
                              sx={(theme) => ({
                                borderRadius: 999,
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.warning.main, 0.16),
                                },
                              })}
                            >
                              {favorites.includes(it.id) ? (
                                <StarIcon fontSize="small" color="warning" />
                              ) : (
                                <StarBorderIcon fontSize="small" />
                              )}
                            </IconButton>
                          </ListItemButton>
                        )})}
                      </List>
                    </Collapse>

                    <Divider sx={{ opacity: 0.35, display: isExpanded ? "block" : "none" }} />
                  </Box>
                );
              })}
            </List>

            {(() => {
              const hidden = Object.keys(hiddenCategories).filter((k) => hiddenCategories[k]);
              if (hidden.length === 0) return null;

              return (
                <Box sx={{ px: 1.25, py: 1 }}>
                  <Divider sx={{ mb: 1, opacity: 0.35 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    Skjulte kategorier
                  </Typography>
                  <List dense disablePadding>
                    {hidden
                      .slice()
                      .sort((a, b) => a.localeCompare(b, "nb"))
                      .map((cat) => (
                        <ListItemButton
                          key={cat}
                          onClick={() => showCategory(cat)}
                          sx={{
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            aria-hidden
                            sx={{
                              width: 8,
                              height: 18,
                              borderRadius: 1,
                              mr: 1,
                              bgcolor: getCategoryMarkerColor(cat, categoryColorMap),
                              flexShrink: 0,
                            }}
                          />
                          <ListItemText
                            primary={cat}
                            primaryTypographyProps={{
                              variant: "body2",
                              noWrap: true,
                            }}
                          />
                        </ListItemButton>
                      ))}
                  </List>
                </Box>
              );
            })()}
          </>
        )}
      </Box>
    </Paper>
  );
}
