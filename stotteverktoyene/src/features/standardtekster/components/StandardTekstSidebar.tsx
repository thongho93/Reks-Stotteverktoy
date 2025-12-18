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
  Typography,
} from "@mui/material";
import type { StandardTekst } from "../types";
import styles from "../../../styles/standardTekstPage.module.css";

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
            {filtered.map((it) => (
              <ListItemButton
                key={it.id}
                selected={it.id === selectedId}
                onClick={() => setSelectedId(it.id)}
                className={styles.sidebarItem}
              >
                <ListItemText
                  primary={it.title}
                  secondary={it.category ? it.category : undefined}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
