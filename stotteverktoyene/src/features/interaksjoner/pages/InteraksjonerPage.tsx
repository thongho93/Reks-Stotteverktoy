import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { arrayUnion, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import IndeterminateCheckBoxOutlinedIcon from "@mui/icons-material/IndeterminateCheckBoxOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { db } from "../../../firebase/firebase";

import { useInteractions } from "../services/useInteractions";
import {
  matchInteractionsBySelectedTerms,
  type InteractionEntity,
  type MatchResult,
} from "../../fest/mappers/interactionsToIndex";

function toDisplayDateIso(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy}`;
}

function relevanceKind(relevansDn: string | null) {
  const dn = (relevansDn ?? "").toLowerCase();
  if (dn.includes("unngå")) return "avoid" as const;
  if (dn.includes("forholdsreg")) return "caution" as const;
  return "ok" as const;
}

function relevanceColor(kind: "avoid" | "caution" | "ok") {
  if (kind === "avoid") return "error.main";
  if (kind === "caution") return "warning.main";
  return "success.main";
}

function RelevanceIcon({ kind }: { kind: "avoid" | "caution" | "ok" }) {
  const sx = { color: relevanceColor(kind) } as const;
  if (kind === "avoid") return <CancelRoundedIcon fontSize="small" sx={sx} />;
  if (kind === "caution") return <WarningAmberRoundedIcon fontSize="small" sx={sx} />;
  return <CheckCircleRoundedIcon fontSize="small" sx={sx} />;
}

type StandardtekstDoc = {
  id: string;
  title?: string;
  tittel?: string;
  navn?: string;
  updatedAt?: unknown;
  interactionIds?: string[];
};

function normalizeStandardtekstTitle(s: StandardtekstDoc) {
  return s.title?.trim() || s.tittel?.trim() || s.navn?.trim() || s.id;
}

export default function InteraksjonerPage() {
  const { index, loading, error, reload } = useInteractions();

  const [selected, setSelected] = React.useState<InteractionEntity[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [results, setResults] = React.useState<MatchResult[]>([]);
  const [activeResult, setActiveResult] = React.useState<number>(0);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

  // Standardtekst-linking dialog
  const [stdOpen, setStdOpen] = React.useState(false);
  const [stdLoading, setStdLoading] = React.useState(false);
  const [stdError, setStdError] = React.useState<string | null>(null);
  const [standardtekster, setStandardtekster] = React.useState<StandardtekstDoc[]>([]);
  const [chosenStd, setChosenStd] = React.useState<StandardtekstDoc | null>(null);
  const [savingLink, setSavingLink] = React.useState(false);

  const openLinkDialog = React.useCallback(() => {
    setStdError(null);
    setChosenStd(null);
    setStdOpen(true);
  }, []);

  const closeLinkDialog = React.useCallback(() => {
    setStdOpen(false);
    setStdError(null);
    setChosenStd(null);
  }, []);

  React.useEffect(() => {
    let alive = true;

    async function loadStandardtekster() {
      if (!stdOpen) return;
      setStdLoading(true);
      setStdError(null);
      try {
        const snap = await getDocs(collection(db, "Standardtekster"));
        const rows: StandardtekstDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        rows.sort((a, b) =>
          normalizeStandardtekstTitle(a).localeCompare(normalizeStandardtekstTitle(b), "no")
        );
        if (!alive) return;
        setStandardtekster(rows);
      } catch (e: any) {
        if (!alive) return;
        setStdError(e?.message ?? "Kunne ikke hente standardtekster.");
      } finally {
        if (!alive) return;
        setStdLoading(false);
      }
    }

    loadStandardtekster();

    return () => {
      alive = false;
    };
  }, [stdOpen]);

  const linkSelectedInteractionToStandardtekst = React.useCallback(
    async (interactionId: string) => {
      if (!chosenStd) return;
      setSavingLink(true);
      setStdError(null);
      try {
        const ref = doc(db, "Standardtekster", chosenStd.id);
        await updateDoc(ref, {
          interactionIds: arrayUnion(interactionId),
        });
        closeLinkDialog();
      } catch (e: any) {
        setStdError(e?.message ?? "Kunne ikke knytte standardtekst.");
      } finally {
        setSavingLink(false);
      }
    },
    [chosenStd, closeLinkDialog]
  );

  const labelByTerm = React.useMemo(() => {
    // Map both name-key and ATC to a nice display label (for "søkeinput ...")
    const map = new Map<string, string>();
    for (const s of selected) {
      map.set(s.key, s.label);
      if (s.atc) map.set(s.atc, `${s.label}`);
    }
    return map;
  }, [selected]);

  const handleReset = React.useCallback(() => {
    setSelected([]);
    setResults([]);
    setActiveResult(0);
    setExpanded({});
    setInputValue("");
  }, []);

  const handleSearch = React.useCallback(() => {
    if (!index) return;
    const terms = selected.flatMap((s) => (s.atc ? [s.key, s.atc] : [s.key]));
    const matches = matchInteractionsBySelectedTerms(index, terms);
    setResults(matches);
    setActiveResult(0);
  }, [index, selected]);

  const toggleExpanded = React.useCallback((interactionIndex: number) => {
    setExpanded((prev) => ({
      ...prev,
      [interactionIndex]: !prev[interactionIndex],
    }));
  }, []);

  const handleCopy = React.useCallback(
    async (interactionIndex: number) => {
      if (!index) return;
      const it = index.interactions[interactionIndex];
      const text = [
        `Klinisk konsekvens: ${it.kliniskKonsekvens ?? "-"}`,
        it.handtering ? `Håndtering: ${it.handtering}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // ignore
      }
    },
    [index]
  );

  // Auto-run search after data load if user already has selections
  React.useEffect(() => {
    if (!index) return;
    if (selected.length === 0) return;
    // keep UI stable: only auto-run if user already searched (results not empty)
    if (results.length === 0) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const today = React.useMemo(() => toDisplayDateIso(new Date()), []);

  return (
    <Box
      sx={{
        maxWidth: 1440,
        mx: "auto",
        mt: 4,
        px: 2,
        height: { xs: "auto", md: "calc(100vh - 32px)" },
        maxHeight: { xs: "none", md: "90vh" },
        overflow: { xs: "visible", md: "hidden" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" gutterBottom>
        Interaksjonssøk
      </Typography>

      <Box
        sx={{
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "480px minmax(0, 1fr)" },
          gap: 4,
          alignItems: "start",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left: Search */}
        <Paper
          sx={{
            p: 3,
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
          }}
        >
          {error ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={reload}>
                  Prøv igjen
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}

          <Stack spacing={2}>
            <Autocomplete
              multiple
              loading={loading}
              options={index?.entities ?? []}
              value={selected}
              inputValue={inputValue}
              onInputChange={(_, v) => setInputValue(v)}
              onChange={(_, values) => {
                // Dedupe by ATC if present, else by name key
                const seen = new Set<string>();
                const deduped: InteractionEntity[] = [];
                for (const e of values) {
                  const id = e.atc ? `atc:${e.atc}` : `name:${e.key}`;
                  if (seen.has(id)) continue;
                  seen.add(id);
                  deduped.push(e);
                }
                setSelected(deduped);
              }}
              isOptionEqualToValue={(a, b) => {
                const ida = a.atc ? `atc:${a.atc}` : `name:${a.key}`;
                const idb = b.atc ? `atc:${b.atc}` : `name:${b.key}`;
                return ida === idb;
              }}
              getOptionLabel={(o) => (o.atc ? `${o.label} (${o.atc})` : o.label)}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return options.slice(0, 12);
                const starts = options.filter((o) => o.label.toLowerCase().startsWith(q));
                const includes = options.filter(
                  (o) =>
                    !o.label.toLowerCase().startsWith(q) &&
                    (o.label.toLowerCase().includes(q) ||
                      (o.atc ? o.atc.toLowerCase().includes(q) : false))
                );
                return [...starts, ...includes].slice(0, 12);
              }}
              renderTags={() => null}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Velg legemiddel, virkestoff eller ATC-kode"
                  placeholder={selected.length === 0 ? "Søk etter preparat" : ""}
                />
              )}
            />
            {selected.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {selected.map((option) => {
                  const key = option.atc ? `atc:${option.atc}` : `name:${option.key}`;
                  const label = option.atc ? `${option.label} ${option.atc}` : option.label;

                  return (
                    <Chip
                      key={key}
                      label={label}
                      onDelete={() =>
                        setSelected((prev) =>
                          prev.filter((p) => (p.atc ? `atc:${p.atc}` : `name:${p.key}`) !== key)
                        )
                      }
                      size="medium"
                      sx={{
                        bgcolor: "action.selected",
                        borderRadius: 999,
                        px: 0.5,
                        "& .MuiChip-label": { px: 1 },
                        "& .MuiChip-deleteIcon": { opacity: 0.7 },
                        "& .MuiChip-deleteIcon:hover": { opacity: 1 },
                      }}
                    />
                  );
                })}
              </Box>
            ) : null}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1.5,
                pt: 1,
              }}
            >
              <Button variant="text" onClick={handleReset} disabled={selected.length === 0}>
                NULLSTILL
              </Button>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={!index || selected.length === 0}
              >
                SØK
              </Button>
            </Box>

            {/* Treff-liste (under søkekortet) */}
            {index && results.length > 0 ? (
              <Box sx={{ pt: 1 }}>
                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 800 }}>Treff</Typography>
                    <Chip size="small" label={`${results.length} treff`} sx={{ fontWeight: 700 }} />
                  </Stack>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                    Oppdatert: {today}
                  </Typography>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <List disablePadding>
                    {results.map((r, i) => {
                      const it = index.interactions[r.interactionIndex];
                      const titleA = it.substansgrupper?.[r.matchedGroups?.[0]]?.navn || "";
                      const titleB = it.substansgrupper?.[r.matchedGroups?.[1]]?.navn || "";
                      const label = [titleA, titleB].filter(Boolean).join(" × ") || "Vis treff";

                      return (
                        <React.Fragment key={`hit:${r.interactionIndex}:${i}`}>
                          <ListItemButton
                            selected={i === activeResult}
                            onClick={() => setActiveResult(i)}
                            sx={{
                              py: 1.25,
                              alignItems: "flex-start",
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                  {label}
                                </Typography>
                              }
                              secondary={
                                it.kliniskKonsekvens ? (
                                  <Typography
                                    color="text.secondary"
                                    sx={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      mt: 0.25,
                                    }}
                                  >
                                    {it.kliniskKonsekvens}
                                  </Typography>
                                ) : null
                              }
                            />
                          </ListItemButton>
                          {i !== results.length - 1 ? <Divider /> : null}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Paper>
              </Box>
            ) : null}

            {selected.length > 0 && results.length === 0 ? (
              <Typography color="text.secondary" sx={{ pt: 1 }}>
                Ingen treff.
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        {/* Right: Results + Details */}
        <Paper
          sx={{
            p: 3,
            minHeight: 360,
            height: { xs: "auto", md: "100%" },
            overflow: { xs: "visible", md: "auto" },
          }}
        >
          {selected.length === 0 ? (
            <Typography color="text.secondary">
              Velg minst to virkestoff/ATC fra ulike grupper for å få treff.
            </Typography>
          ) : null}

          {index && results.length > 0 ? (
            <Stack spacing={2}>
              {/* Active result details */}
              {(() => {
                const r = results[Math.min(activeResult, results.length - 1)];
                const it = index.interactions[r.interactionIndex];
                const kind = relevanceKind(it.relevansDn);

                const groupLines = r.matchedGroups.slice(0, 2).map((gi) => {
                  const group = it.substansgrupper[gi];
                  const name = group?.navn || group?.substanser?.[0]?.substans || "(Ukjent)";

                  const selectedTerms = (r.groupToSelectedTerms[gi] ?? [])
                    .map((t) => labelByTerm.get(t) ?? t)
                    .filter(Boolean);

                  const suffix =
                    selectedTerms.length > 0 ? `(søkeinput ${selectedTerms.join(", ")})` : "";

                  // Prefer to show ATC (first substans ATC) when available
                  // In our indexed JSON, `atc` may be either a string (code) or an object with `{ v }`.
                  const atcRaw = group?.substanser?.[0]?.atc as unknown;
                  const atcMaybe =
                    typeof atcRaw === "string"
                      ? atcRaw
                      : (atcRaw as { v?: string } | null | undefined)?.v;
                  const atcDisplay = atcMaybe ? ` ${atcMaybe}` : "";

                  return { gi, title: `${name}${atcDisplay}`, suffix };
                });

                const isOpen = !!expanded[r.interactionIndex];

                return (
                  <Card variant="outlined" sx={{ borderRadius: 1.5, borderColor: "divider" }}>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {groupLines.map((g) => (
                            <Typography
                              key={`g:${r.interactionIndex}:${g.gi}`}
                              sx={{ fontWeight: 800, mb: 0.5, lineHeight: 1.2 }}
                            >
                              {g.title}{" "}
                              {g.suffix ? (
                                <Typography
                                  component="span"
                                  sx={{ fontWeight: 500, opacity: 0.85 }}
                                >
                                  {g.suffix}
                                </Typography>
                              ) : null}
                            </Typography>
                          ))}

                          <Box sx={{ mt: 2 }}>
                            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                              Klinisk konsekvens
                            </Typography>
                            <Typography>{it.kliniskKonsekvens ?? "-"}</Typography>
                          </Box>

                          <Box
                            sx={{
                              mt: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            <Button
                              variant="text"
                              onClick={() => toggleExpanded(r.interactionIndex)}
                              startIcon={
                                isOpen ? (
                                  <IndeterminateCheckBoxOutlinedIcon />
                                ) : (
                                  <AddBoxOutlinedIcon />
                                )
                              }
                              sx={{ px: 0 }}
                            >
                              Vis detaljer
                            </Button>

                            <Button variant="contained" onClick={openLinkDialog}>
                              Knytt standardtekst
                            </Button>
                          </Box>
                        </Box>

                        <Stack spacing={1} alignItems="flex-end">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: "action.hover",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <RelevanceIcon kind={kind} />
                            <Typography sx={{ fontWeight: 700 }}>{it.relevansDn ?? ""}</Typography>
                          </Box>

                          <IconButton onClick={() => handleCopy(r.interactionIndex)}>
                            <ContentCopyIcon />
                          </IconButton>
                        </Stack>
                      </Box>

                      {isOpen ? (
                        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                          <Stack spacing={1.5}>
                            {it.interaksjonsmekanisme ? (
                              <Box>
                                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                  Interaksjonsmekanisme
                                </Typography>
                                <Typography>{it.interaksjonsmekanisme}</Typography>
                              </Box>
                            ) : null}

                            {it.handtering ? (
                              <Box>
                                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                  Håndtering
                                </Typography>
                                <Typography>{it.handtering}</Typography>
                              </Box>
                            ) : null}

                            <Box>
                              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                                Interaksjon-ID
                              </Typography>
                              <Typography color="text.secondary">
                                {it.interaksjonId ?? "-"}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })()}
            </Stack>
          ) : null}
        </Paper>
      </Box>
      {/* Dialog for linking standardtekst */}
      <Dialog open={stdOpen} onClose={closeLinkDialog} fullWidth maxWidth="sm">
        <DialogTitle>Knytt standardtekst</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Velg en standardtekst som skal få denne interaksjonens ID lagt til i feltet
            interactionIds.
          </Typography>

          {stdError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {stdError}
            </Alert>
          ) : null}

          {stdLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Henter standardtekster…</Typography>
            </Box>
          ) : (
            <Autocomplete
              options={standardtekster}
              value={chosenStd}
              onChange={(_, v) => setChosenStd(v)}
              getOptionLabel={(o) => normalizeStandardtekstTitle(o)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Standardtekst" placeholder="Søk etter tittel" />
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLinkDialog} disabled={savingLink}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            disabled={savingLink || !chosenStd || !index || results.length === 0}
            onClick={() => {
              if (!index || results.length === 0) return;
              const r = results[Math.min(activeResult, results.length - 1)];
              const it = index.interactions[r.interactionIndex];
              if (!it?.interaksjonId) {
                setStdError("Fant ingen interaksjonId for dette treffet.");
                return;
              }
              linkSelectedInteractionToStandardtekst(it.interaksjonId);
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
