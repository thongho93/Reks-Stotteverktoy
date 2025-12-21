import { useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import IconButton from "@mui/material/IconButton";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/Auth";
import { logUsage } from "../../../shared/services/usage";

type Props = {
  isAdmin: boolean;
  creating: boolean;
  onCreate: () => void;

  search: string;
  setSearch: (value: string) => void;

  loading: boolean;
  filtered: StandardTekst[];

  selectedId: string | null;
  setSelectedId: (id: string) => void;
};

const CATEGORY_COLOR_PALETTE = [
  "#1E88E5", // blue
  "#43A047", // green
  "#E53935", // red
  "#8E24AA", // purple
  "#00ACC1", // cyan
  "#FB8C00", // orange
  "#6D4C41", // brown
  "#546E7A", // blue grey
];

function hashStringToIndex(input: string, modulo: number) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return modulo === 0 ? 0 : h % modulo;
}

function getCategoryMarkerColor(category: string) {
  const c = (category ?? "").trim();
  if (!c) return "#9E9E9E";
  if (c.toLowerCase() === "favoritter") return "#F9A825";
  if (c.toLowerCase() === "uten kategori") return "#78909C";
  return CATEGORY_COLOR_PALETTE[hashStringToIndex(c.toLowerCase(), CATEGORY_COLOR_PALETTE.length)];
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
          sx: {
            backgroundColor: "rgba(32, 32, 32, 0.95)",
            color: "#fff",
            fontSize: 13,
            boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          },
        },
        arrow: {
          sx: {
            color: "rgba(32, 32, 32, 0.95)",
          },
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
  isAdmin,
  creating,
  onCreate,
  search,
  setSearch,
  loading,
  filtered,
  selectedId,
  setSelectedId,
}: Props) {
  const { user } = useAuthUser();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  // Category expand/collapse state (persisted locally)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedHydrated, setExpandedHydrated] = useState(false);

  // Hydrate expand/collapse state from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("standardtekster:categoryExpanded");
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
  }, []);

  const favoritesDocRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(db, "users", user.uid, "preferences", "standardtekster");
  }, [user?.uid]);

  // Load favorites for this user (fallback to localStorage if not logged in)
  useEffect(() => {
    let cancelled = false;

    setFavoritesHydrated(false);

    const load = async () => {
      try {
        if (!favoritesDocRef) {
          const stored = localStorage.getItem("standardtekster:favorites");
          if (!cancelled) setFavorites(stored ? JSON.parse(stored) : []);
          return;
        }

        const snap = await getDoc(favoritesDocRef);
        const data = snap.exists() ? (snap.data() as any) : null;
        const fav = Array.isArray(data?.favorites)
          ? data.favorites.filter((x: any) => typeof x === "string")
          : [];
        if (!cancelled) setFavorites(fav);
      } catch {
        if (!cancelled) setFavorites([]);
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

    if (!favoritesDocRef) {
      localStorage.setItem("standardtekster:favorites", JSON.stringify(favorites));
      return;
    }

    setDoc(favoritesDocRef, { favorites }, { merge: true }).catch(() => {
      // ignore
    });
  }, [favorites, favoritesDocRef, favoritesHydrated]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Sort items: favorites on top (alphabetically), then by category and title
  const sortedItems = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.title.localeCompare(b.title, "nb");
    });
  }, [filtered, favorites]);

  // Group items by category, with favorites as a separate group on top
  const groupedByCategory = useMemo(() => {
    const favoriteItems = sortedItems.filter((it) => favorites.includes(it.id));
    const nonFavoriteItems = sortedItems.filter((it) => !favorites.includes(it.id));

    const groups = new Map<string, StandardTekst[]>();

    for (const it of nonFavoriteItems) {
      const key = (it.category ?? "").trim() || "Uten kategori";
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }

    const categoryGroups = Array.from(groups.entries())
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => a.category.localeCompare(b.category, "nb"));

    // Favorites group always on top (if any)
    if (favoriteItems.length > 0) {
      return [{ category: "Favoritter", items: favoriteItems }, ...categoryGroups];
    }

    return categoryGroups;
  }, [sortedItems, favorites]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const isExpanded = prev[category] !== false; // default expanded
      return {
        ...prev,
        [category]: !isExpanded,
      };
    });
  };

  // Persist expand/collapse state
  useEffect(() => {
    if (!expandedHydrated) return;
    try {
      localStorage.setItem("standardtekster:categoryExpanded", JSON.stringify(expandedCategories));
    } catch {
      // ignore
    }
  }, [expandedCategories, expandedHydrated]);

  const prevSelectedIdRef = useRef<string | null>(null);

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
      if (g.items.some((x) => x.id === selectedId)) {
        setExpandedCategories((prev) => ({
          ...prev,
          [g.category]: true,
        }));
        break;
      }
    }
  }, [selectedId, groupedByCategory, expandedHydrated]);

  return (
    <Paper className={styles.sidebar}>
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

        <Typography variant="subtitle2" className={styles.sidebarSectionTitle}>
          Finn standardtekst
        </Typography>

        <Box className={styles.sidebarSearch}>
          <TextField
            fullWidth
            size="small"
            label="Søk i standardtekster"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);

              if (value.length === 1) {
                logUsage("search_standardtekster", {
                  searchLen: value.length,
                });
              }
            }}
          />
        </Box>

        {search.trim() && (
          <Typography variant="subtitle2" color="text.secondary" className={styles.sidebarCount}>
            {loading ? "Laster..." : `${filtered.length} treff`}
          </Typography>
        )}
      </Box>

      <Divider className={styles.sidebarDivider} />

      <Box className={styles.sidebarBody}>
        {loading ? (
          <Box className={styles.sidebarLoading}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box className={styles.sidebarEmpty}>
            <Typography variant="body2" color="text.secondary">
              Ingen treff.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding className={styles.sidebarList}>
            {groupedByCategory.map((group) => {
              const isExpanded = expandedCategories[group.category] !== false;

              return (
                <Box key={group.category}>
                  <ListItemButton
                    onClick={() => toggleCategory(group.category)}
                    sx={{
                      py: 0.75,
                      px: 1.25,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 8,
                        height: 22,
                        borderRadius: 1,
                        mr: 1,
                        bgcolor: getCategoryMarkerColor(group.category),
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={group.category}
                      primaryTypographyProps={{
                        variant: "subtitle2",
                        noWrap: true,
                      }}
                    />
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 120ms ease",
                        opacity: 0.8,
                      }}
                    />
                  </ListItemButton>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List dense disablePadding>
                      {group.items.map((it) => (
                        <ListItemButton
                          key={it.id}
                          selected={it.id === selectedId}
                          onClick={() => {
                            logUsage("standardtekst_open", { standardtekstId: it.id });
                            setSelectedId(it.id);
                          }}
                          className={styles.sidebarItem}
                          sx={{ pl: 2.25 }}
                        >
                          <ListItemText
                            primary={<TruncatedTitle title={it.title} />}
                            secondary={undefined}
                          />

                          <IconButton
                            size="small"
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(it.id);
                            }}
                          >
                            {favorites.includes(it.id) ? (
                              <StarIcon fontSize="small" color="warning" />
                            ) : (
                              <StarBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>

                  <Divider sx={{ opacity: 0.35 }} />
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
}
