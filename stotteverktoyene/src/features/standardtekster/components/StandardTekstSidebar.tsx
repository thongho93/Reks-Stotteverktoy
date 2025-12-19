import { useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
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
import IconButton from "@mui/material/IconButton";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { useAuthUser } from "../../../app/auth/Auth";

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

  const sortedItems = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.title.localeCompare(b.title, "nb");
    });
  }, [filtered, favorites]);

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
            onChange={(e) => setSearch(e.target.value)}
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
            {sortedItems.map((it) => (
              <ListItemButton
                key={it.id}
                selected={it.id === selectedId}
                onClick={() => setSelectedId(it.id)}
                className={styles.sidebarItem}
              >
                <ListItemText
                  primary={<TruncatedTitle title={it.title} />}
                  secondary={it.category ? it.category : undefined}
                  secondaryTypographyProps={{ noWrap: true }}
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
        )}
      </Box>
    </Paper>
  );
}
