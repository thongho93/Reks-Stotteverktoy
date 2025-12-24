import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Snackbar,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import IndeterminateCheckBoxOutlinedIcon from "@mui/icons-material/IndeterminateCheckBoxOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";

import { useInteractions } from "../services/useInteractions";
import { LinkStandardtekstDialog } from "../components/LinkStandardtekstDialog";
import { useStandardtekstLinking } from "../hooks/useStandardtekstLinking";
import {
  matchInteractionsBySelectedTerms,
  type InteractionEntity,
  type MatchResult,
} from "../../fest/mappers/interactionsToIndex";

import { toDisplayDateIso } from "../utils/date";
import { RelevanceIcon, relevanceKind } from "../utils/relevance";

export default function InteraksjonerPage() {
  const { index, loading, error, reload } = useInteractions();
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [selected, setSelected] = React.useState<InteractionEntity[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [results, setResults] = React.useState<MatchResult[]>([]);
  const [activeResult, setActiveResult] = React.useState<number>(0);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [activeLinkedStdId, setActiveLinkedStdId] = React.useState<string | null>(null);

  const [copySnackOpen, setCopySnackOpen] = React.useState(false);
  const [copySnackMsg, setCopySnackMsg] = React.useState<string>("Tekst kopiert");

  const {
    stdOpen,
    stdLoading,
    stdError,
    standardtekster,
    chosenStd,
    setChosenStd,
    savingLink,
    openLinkDialog,
    closeLinkDialog,
    saveLink,
  } = useStandardtekstLinking();

  const labelByTerm = React.useMemo(() => {
    // Map both name-key and ATC to a nice display label (for "søkeinput ...")
    const map = new Map<string, string>();
    for (const s of selected) {
      map.set(s.key, s.label);
      if (s.atc) map.set(s.atc, `${s.label}`);
    }
    return map;
  }, [selected]);

  const isExactAtc7 = (v: string) => {
    const s = v.trim().toUpperCase();
    // Eksakt ATC (7 tegn): f.eks. C09AA01 / N02AA03
    return /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/.test(s);
  };

  const normalizeAtcInput = (v: string) => {
    const raw = v ?? "";
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    // Only collapse whitespace if the result looks like an ATC code/prefix.
    // Examples users paste/type: "C03A A", "C03A B", "C03A B01".
    const collapsed = trimmed.replace(/\s+/g, "");
    const looksAtcPrefix = /^[A-Z][0-9]{2}[A-Z0-9]{1,4}$/.test(collapsed.toUpperCase());

    if (looksAtcPrefix && /\s/.test(trimmed)) {
      return collapsed;
    }

    return raw;
  };

  const handleReset = React.useCallback(() => {
    setSelected([]);
    setResults([]);
    setActiveResult(0);
    setExpanded({});
    setInputValue("");
    setActiveLinkedStdId(null);
  }, []);

  // Hotkey: Escape => reset search
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't interfere while dialogs are open
      if (stdOpen) return;

      e.preventDefault();
      handleReset();

      // Refocus search for fast re-entry
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleReset, stdOpen]);

  const handleSearch = React.useCallback(() => {
    if (!index) return;
    const terms = selected.flatMap((s) => (s.atc ? [s.key, s.atc] : [s.key]));

    const allMatches = matchInteractionsBySelectedTerms(index, terms);
    const matches = allMatches.filter((m) => {
      const it = index.interactions[m.interactionIndex];
      return !!relevanceKind(it.relevansDn);
    });

    setResults(matches);
    setActiveResult(0);
    setActiveLinkedStdId(null);
    setExpanded({});
  }, [index, selected]);

  const toggleExpanded = React.useCallback((interactionIndex: number) => {
    setExpanded((prev) => ({
      ...prev,
      [interactionIndex]: !prev[interactionIndex],
    }));
  }, []);

  const showCopySnack = React.useCallback((msg?: string) => {
    setCopySnackMsg(msg ?? "Tekst kopiert");
    setCopySnackOpen(true);
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
        showCopySnack("Interaksjonstekst kopiert");
      } catch {
        // ignore
      }
    },
    [index, showCopySnack]
  );

  const handleCopyStandardtekst = React.useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        showCopySnack("Standardtekst kopiert");
      } catch {
        // ignore
      }
    },
    [showCopySnack]
  );

  // Auto-run search when selected changes and at least 2 are selected
  React.useEffect(() => {
    if (!index) return;

    // Need at least 2 selections to search
    if (selected.length < 2) {
      setResults([]);
      setActiveResult(0);
      setExpanded({});
      setActiveLinkedStdId(null);
      return;
    }

    handleSearch();
  }, [index, selected, handleSearch]);

  React.useEffect(() => {
    // Ensure input is focused when the page mounts
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

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
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h2">Interaksjonssøk</Typography>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            Nullstill
          </Box>
          : Escape
        </Typography>
      </Box>

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
              open={inputValue.trim().length > 0}
              onInputChange={(_, v) => {
                const normalized = normalizeAtcInput(v);
                setInputValue(normalized);

                const q = normalized.trim().toUpperCase();
                // Auto-velg kun ved eksakt 7-tegns ATC. Ved kortere prefix (f.eks. C09AA)
                // skal vi la dropdownen være åpen slik at bruker kan velge riktig kode.
                if (!q || !isExactAtc7(q) || !index?.entities?.length) return;

                // Finn eksakt ATC-match
                const exactAtcMatches = index.entities.filter(
                  (e) => (e.atc ?? "").toUpperCase() === q
                );

                if (exactAtcMatches.length !== 1) return;

                const match = exactAtcMatches[0];

                // Legg til hvis ikke allerede valgt
                setSelected((prev) => {
                  const id = match.atc ? `atc:${match.atc}` : `name:${match.key}`;
                  const seen = new Set(prev.map((p) => (p.atc ? `atc:${p.atc}` : `name:${p.key}`)));
                  if (seen.has(id)) return prev;
                  return [...prev, match];
                });

                // Tøm input så det føles som et “valg”
                setInputValue("");
              }}
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
                if (!q) return [];
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
                  autoFocus
                  inputRef={searchInputRef}
                />
              )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
              Tips: Lim inn ATC-kode/virkestoff direkte i søkefeltet.
            </Typography>
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
                      const gA = it.substansgrupper?.[r.matchedGroups?.[0]];
                      const gB = it.substansgrupper?.[r.matchedGroups?.[1]];

                      const nameFromGroup = (g?: any) => {
                        if (!g) return "";
                        // Prioriter gruppenavn hvis det finnes
                        if (g.navn) return g.navn;
                        // Fallback: bruk substans-navn (første substans i gruppen)
                        const subst = g.substanser?.[0]?.substans;
                        return subst || "";
                      };

                      const titleA = nameFromGroup(gA);
                      const titleB = nameFromGroup(gB);

                      const label = [titleA, titleB].filter(Boolean).join(" × ") || "Interaksjon";

                      return (
                        <React.Fragment key={`hit:${r.interactionIndex}:${i}`}>
                          <ListItemButton
                            selected={i === activeResult}
                            onClick={() => {
                              setActiveResult(i);
                              setActiveLinkedStdId(null);
                            }}
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 360,
                px: 2,
              }}
            >
              <Box sx={{ width: "100%", maxWidth: 560 }}>
                <Typography
                  color="text.secondary"
                  sx={{ fontWeight: 600, textAlign: "center", fontSize: 23, mt: 1 }}
                >
                  Søk minst 2 ATC-koder/virkestoffer fra ulike grupper for å få treff.
                </Typography>
              </Box>
              <Box
                component="img"
                alt="Venter"
                src="/img/imwaiting.gif"
                sx={{
                  width: 340,
                  maxWidth: "85%",
                  mb: 2,
                  opacity: 0.95,
                  mt: 5,
                }}
              />
              <Box sx={{ width: "100%", maxWidth: 560 }}>
                <Typography color="text.secondary" sx={{ textAlign: "center", fontSize: 23 }}>
                  Kom igjen. Jeg har ikke hele dagen.{" "}
                </Typography>
              </Box>
            </Box>
          ) : null}

          {index && results.length > 0 ? (
            <Stack spacing={2}>
              {/* Active result details */}
              {(() => {
                const r = results[Math.min(activeResult, results.length - 1)];
                const it = index.interactions[r.interactionIndex];
                const kind = relevanceKind(it.relevansDn);
                // Compute linked standardtekster for the current interaction
                const linkedStandardtekster = it.interaksjonId
                  ? standardtekster.filter((s) =>
                      (s.interactionIds ?? []).includes(it.interaksjonId!)
                    )
                  : [];
                const activeLinkedStd = activeLinkedStdId
                  ? linkedStandardtekster.find((s) => s.id === activeLinkedStdId)
                  : null;

                const groupLines = r.matchedGroups.slice(0, 2).map((gi) => {
                  const group = it.substansgrupper?.[gi];
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
                  <Box sx={{ width: "100%" }}>
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

                              <Button
                                variant="contained"
                                onClick={() => {
                                  if (!it?.interaksjonId) return;
                                  openLinkDialog();
                                }}
                              >
                                Knytt standardtekst
                              </Button>
                            </Box>
                          </Box>

                          <Stack spacing={1} alignItems="flex-end">
                            {kind ? (
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
                                <RelevanceIcon />
                                <Typography sx={{ fontWeight: 700 }}>
                                  {it.relevansDn ?? ""}
                                </Typography>
                              </Box>
                            ) : null}
                            <IconButton onClick={() => handleCopy(r.interactionIndex)}>
                              <ContentCopyIcon />
                            </IconButton>
                          </Stack>
                        </Box>

                        {isOpen ? (
                          <Box
                            sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}
                          >
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

                    {it.interaksjonId ? (
                      <Box sx={{ width: "100%", mt: 2 }}>
                        <Box
                          sx={{
                            width: "100%",
                            p: 2,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "action.hover",
                          }}
                        >
                          <Box sx={{ mb: 1 }}>
                            <Typography sx={{ fontWeight: 800 }} variant="h3">
                              Knyttet standardtekst
                            </Typography>
                          </Box>

                          {linkedStandardtekster.length > 0 ? (
                            <Box sx={{ width: "100%" }}>
                              <Box
                                sx={{ display: "flex", flexWrap: "wrap", gap: 1, width: "100%" }}
                              >
                                {linkedStandardtekster.map((s) => {
                                  const isOpenStd = activeLinkedStdId === s.id;
                                  const label = s.title || "(Uten tittel)";

                                  return (
                                    <Tooltip
                                      key={s.id}
                                      title={
                                        isOpenStd ? "Skjul standardtekst" : "Vis standardtekst"
                                      }
                                      arrow
                                    >
                                      <Chip
                                        size="medium"
                                        icon={<DescriptionOutlinedIcon />}
                                        label={label}
                                        clickable
                                        onClick={() =>
                                          setActiveLinkedStdId((prev) =>
                                            prev === s.id ? null : s.id
                                          )
                                        }
                                        deleteIcon={
                                          isOpenStd ? (
                                            <ExpandLessRoundedIcon />
                                          ) : (
                                            <ExpandMoreRoundedIcon />
                                          )
                                        }
                                        onDelete={() =>
                                          setActiveLinkedStdId((prev) =>
                                            prev === s.id ? null : s.id
                                          )
                                        }
                                        sx={{
                                          borderRadius: 999,
                                          border: "1px solid",
                                          borderColor: isOpenStd ? "text.primary" : "divider",
                                          bgcolor: isOpenStd
                                            ? "action.selected"
                                            : "background.paper",
                                          height: 38,
                                          px: 0.5,
                                          maxWidth: "100%",
                                          cursor: "pointer",
                                          transition:
                                            "background-color 120ms ease, border-color 120ms ease, transform 120ms ease",
                                          "&:hover": {
                                            bgcolor: "action.hover",
                                            transform: "translateY(-1px)",
                                          },
                                          "& .MuiChip-label": {
                                            px: 1,
                                            fontWeight: 800,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          },
                                          "& .MuiChip-icon": {
                                            opacity: 0.9,
                                          },
                                          "& .MuiChip-deleteIcon": {
                                            opacity: 0.9,
                                          },
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                              {!activeLinkedStd ? (
                                <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>
                                  Trykk på en tittel for å vise standardteksten.
                                </Typography>
                              ) : null}

                              {activeLinkedStd
                                ? (() => {
                                    // Compute the text to copy for the standardtekst preview box
                                    const copyText =
                                      (activeLinkedStd as any).text ??
                                      (activeLinkedStd as any).content ??
                                      (activeLinkedStd as any).melding ??
                                      (activeLinkedStd as any).body ??
                                      (activeLinkedStd as any).template ??
                                      "";
                                    return (
                                      <Box
                                        sx={{
                                          mt: 1.5,
                                          p: 2,
                                          borderRadius: 2,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          bgcolor: "background.paper",
                                          width: "100%",
                                          cursor: "copy",
                                          userSelect: "text",
                                          "&:hover": {
                                            bgcolor: "action.hover",
                                          },
                                        }}
                                        onClick={() => handleCopyStandardtekst(copyText)}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                          }}
                                        >
                                          <Typography sx={{ fontWeight: 800, mb: 0.75 }}>
                                            {activeLinkedStd.title || "Standardtekst"}
                                          </Typography>
                                          <IconButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopyStandardtekst(copyText);
                                            }}
                                            size="small"
                                            sx={{ ml: 1 }}
                                          >
                                            <ContentCopyIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                        <Typography sx={{ whiteSpace: "pre-line" }}>
                                          {copyText}
                                        </Typography>
                                      </Box>
                                    );
                                  })()
                                : null}
                            </Box>
                          ) : (
                            <Typography color="text.secondary">
                              Ingen standardtekster knyttet til denne interaksjonen.
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : null}
                  </Box>
                );
              })()}
            </Stack>
          ) : null}
        </Paper>
      </Box>
      <Snackbar
        open={copySnackOpen}
        autoHideDuration={1800}
        onClose={() => setCopySnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopySnackOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {copySnackMsg}
        </Alert>
      </Snackbar>
      <LinkStandardtekstDialog
        open={stdOpen}
        loading={stdLoading}
        error={stdError}
        standardtekster={standardtekster}
        chosenStd={chosenStd}
        onChoose={setChosenStd}
        saving={savingLink}
        onClose={closeLinkDialog}
        onSave={() => {
          if (!index || results.length === 0) return;
          const r = results[Math.min(activeResult, results.length - 1)];
          const it = index.interactions[r.interactionIndex];
          if (!it?.interaksjonId) return;
          saveLink(it.interaksjonId);
        }}
      />
    </Box>
  );
}
