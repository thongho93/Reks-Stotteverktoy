import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

type StandardTekst = {
  id: string;
  title: string;
  category?: string;
  content: string;
  updatedAt?: Date | null;
};

function toDateMaybe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  // Firestore can also store millis or ISO strings depending on your implementation
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function pickFirstNonEmptyString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function mapDocToStandardTekst(id: string, data: Record<string, unknown>): StandardTekst {
  // Du kan endre feltnavnene her hvis databasen din bruker andre navn
  const title =
    pickFirstNonEmptyString(data["title"], data["Title"], data["tittel"]) ?? "Uten tittel";

  const category = pickFirstNonEmptyString(data["category"], data["kategori"]) ?? "";

  const content =
    pickFirstNonEmptyString(data["content"], data["Body"], data["tekst"], data["body"]) ?? "";

  const updatedAt = toDateMaybe(data["updatedAt"] ?? data["updated_at"] ?? data["sistOppdatert"]);

  return {
    id,
    title,
    category: category || undefined,
    content,
    updatedAt,
  };
}

export default function StandardTekstPage() {
  const [items, setItems] = useState<StandardTekst[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        collection(db, "Standardtekster");
        // Viktig: Bytt collection-navn hvis du bruker noe annet enn "standardtekster"
        // Hvis du har et felt du vil sortere på (f.eks. "title"), kan du endre orderBy.
        const q = query(collection(db, "Standardtekster"));

        const snap = await getDocs(q);
        const mapped = snap.docs.map((d) => mapDocToStandardTekst(d.id, d.data()));

        if (!isMounted) return;

        setItems(mapped);
        // Autovelg første hvis listen ikke er tom
        setSelectedId((prev) => prev ?? mapped[0]?.id ?? null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ukjent feil ved henting fra Firebase";
        if (!isMounted) return;
        setError(message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) => {
      const haystack = `${it.title} ${it.category ?? ""} ${it.content}`.toLowerCase();
      return haystack.includes(s);
    });
  }, [items, search]);

  const selected = useMemo(() => {
    return items.find((it) => it.id === selectedId) ?? null;
  }, [items, selectedId]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Standardtekster</Typography>
        <Typography variant="body2" color="text.secondary">
          Data hentes fra Firebase (Firestore).
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Søk i standardtekster"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper sx={{ p: 1 }}>
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {loading ? "Laster..." : `${filtered.length} treff`}
            </Typography>
          </Box>
          <Divider />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <List dense disablePadding>
              {filtered.map((it) => (
                <ListItemButton
                  key={it.id}
                  selected={it.id === selectedId}
                  onClick={() => setSelectedId(it.id)}
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

          {!loading && filtered.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ingen treff.
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2, minHeight: 280 }}>
          {!selected && !loading && (
            <Typography variant="body2" color="text.secondary">
              Velg en standardtekst fra listen.
            </Typography>
          )}

          {selected && (
            <>
              <Typography variant="h5" sx={{ mb: 0.5 }}>
                {selected.title}
              </Typography>
              {selected.category && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {selected.category}
                </Typography>
              )}

              {selected.updatedAt && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  Sist oppdatert: {selected.updatedAt.toLocaleString("nb-NO")}
                </Typography>
              )}

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {selected.content || "(Tom tekst)"}
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
