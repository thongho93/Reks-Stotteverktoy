import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

type TotalsRow = {
  key: string; // dateKey (daily) or weekKey (weekly)
  label: string; // shown in table
  pageViews: number;
  copies: number;
  searches: number;
};

type UserAggRow = {
  uid: string;
  firstName?: string;
  email?: string;
  pageViews: number;
  standardtekstOpens: number;
  copies: number;
  searches: number;
  lastPage?: string;
  lastStandardtekstId?: string;
  updatedAt?: any;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateKey(input: string) {
  const s = String(input || "").trim();

  // Accept both yyyy-mm-dd and dd.mm.yyyy
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const nor = /^\d{2}\.\d{2}\.\d{4}$/;

  if (iso.test(s)) {
    const [y, m, d] = s.split("-").map((x) => Number(x));
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  if (nor.test(s)) {
    const [d, m, y] = s.split(".").map((x) => Number(x));
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  return new Date(NaN);
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime());
}

function listDateKeysInclusive(fromKey: string, toKey: string) {
  const start = parseDateKey(fromKey);
  const end = parseDateKey(toKey);

  if (!isValidDate(start) || !isValidDate(end)) {
    return [];
  }

  const keys: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function startOfIsoWeekMonday(date: Date) {
  const d = new Date(date);
  // getDay(): 0=Sun,1=Mon,...6=Sat. Convert so Mon=0,...Sun=6
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function endOfIsoWeekSunday(date: Date) {
  const start = startOfIsoWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getIsoWeekKey(date: Date) {
  // ISO week: week starts Monday; week-year can differ near year boundaries.
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7; // Mon=1..Sun=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum); // move to Thursday
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${pad2(weekNo)}`;
}

function formatNorDate(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatDashDateKey(dateKey: string) {
  const d = parseDateKey(dateKey);
  if (!isValidDate(d)) return dateKey;
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function groupByIsoWeeks(dayRows: TotalsRow[]) {
  const map = new Map<
    string,
    {
      weekStart: Date;
      weekEnd: Date;
      pageViews: number;
      copies: number;
      searches: number;
    }
  >();

  for (const r of dayRows) {
    // r.key is the ISO dateKey: yyyy-mm-dd
    const d = parseDateKey(r.key);
    if (!isValidDate(d)) continue;

    const weekKey = getIsoWeekKey(d);
    const weekStart = startOfIsoWeekMonday(d);

    const prev = map.get(weekKey);
    if (!prev) {
      map.set(weekKey, {
        weekStart,
        weekEnd: endOfIsoWeekSunday(d),
        pageViews: r.pageViews,
        copies: r.copies,
        searches: r.searches,
      });
    } else {
      prev.pageViews += r.pageViews;
      prev.copies += r.copies;
      prev.searches += r.searches;
    }
  }

  return [...map.entries()]
    .sort((a, b) => a[1].weekStart.getTime() - b[1].weekStart.getTime())
    .map(([weekKey, v]) => {
      const label = `${formatNorDate(v.weekStart)}–${formatNorDate(v.weekEnd)}`;
      return {
        key: weekKey,
        label,
        pageViews: v.pageViews,
        copies: v.copies,
        searches: v.searches,
      } satisfies TotalsRow;
    });
}

export default function StatistikkPage() {
  const [from, setFrom] = React.useState(() => {
    // default: last 7 days
    return toDateKey(addDays(new Date(), -6));
  });
  const [to, setTo] = React.useState(() => toDateKey(new Date()));
  const [viewMode, setViewMode] = React.useState<"day" | "week">("day");
  const [userViewMode, setUserViewMode] = React.useState<"day" | "total">("total");
  const [showAllUsers, setShowAllUsers] = React.useState(false);

  const [rows, setRows] = React.useState<TotalsRow[]>([]);
  const [aggregatedUsers, setAggregatedUsers] = React.useState<UserAggRow[]>([]);
  const [loadingTotals, setLoadingTotals] = React.useState(false);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    setLoadingTotals(true);
    setLoadingUsers(true);
    setError(null);

    try {
      if (!from || !to) {
        setRows([]);
        setAggregatedUsers([]);
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      if (from > to) {
        setRows([]);
        setAggregatedUsers([]);
        setError("Fra-dato kan ikke være etter til-dato.");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      const fromDate = parseDateKey(from);
      const toDate = parseDateKey(to);

      if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        setRows([]);
        setAggregatedUsers([]);
        setError("Ugyldig datoformat. Bruk dato-velgeren (yyyy-mm-dd).");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      const rangeStart = viewMode === "week" ? startOfIsoWeekMonday(fromDate) : fromDate;
      const rangeEnd = viewMode === "week" ? endOfIsoWeekSunday(toDate) : toDate;

      const dateKeys = listDateKeysInclusive(toDateKey(rangeStart), toDateKey(rangeEnd));

      // Per-user aggregation can be either the full selected range (total) or only the selected "Til" day.
      const userDayKey = toDateKey(toDate);
      const userDateKeys = userViewMode === "day" ? [userDayKey] : dateKeys;

      // Hent eier(e) og ekskluder fra statistikken (både totals og per bruker).
      const ownerSnap = await getDocs(collection(db, "owners"));
      const ownerUids = new Set<string>(ownerSnap.docs.map((d) => d.id));

      const dayTotals = new Map<string, TotalsRow>();
      const userAgg = new Map<string, UserAggRow>();

      // 1) Build main per-day totals (for the day/week table)
      await Promise.all(
        dateKeys.map(async (dateKey) => {
          const usersRef = collection(db, "usage_daily", dateKey, "users");
          const snap = await getDocs(usersRef);

          const dayRow: TotalsRow = {
            key: dateKey,
            label: formatDashDateKey(dateKey),
            pageViews: 0,
            copies: 0,
            searches: 0,
          };

          snap.forEach((d) => {
            const uid = d.id;
            if (ownerUids.has(uid)) return;
            const data = d.data() as any;

            dayRow.pageViews += Number(data.pageViews ?? 0);
            dayRow.copies += Number(data.copies ?? 0);
            dayRow.searches += Number(data.searches ?? 0);
          });

          dayTotals.set(dateKey, dayRow);
        })
      );
      setLoadingTotals(false);

      // 2) Build per-user aggregation (either day or total)
      await Promise.all(
        userDateKeys.map(async (dateKey) => {
          const usersRef = collection(db, "usage_daily", dateKey, "users");
          const snap = await getDocs(usersRef);

          snap.forEach((d) => {
            const uid = d.id;
            if (ownerUids.has(uid)) return;
            const data = d.data() as any;

            const prev = userAgg.get(uid) ?? {
              uid,
              pageViews: 0,
              standardtekstOpens: 0,
              copies: 0,
              searches: 0,
            };

            prev.pageViews += Number(data.pageViews ?? 0);
            prev.standardtekstOpens += Number(data.standardtekstOpens ?? 0);
            prev.copies += Number(data.copies ?? 0);
            prev.searches += Number(data.searches ?? 0);

            // Prefer most recent firstName and email metadata.
            const updatedAt = data.updatedAt;
            const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
            const email = typeof data.email === "string" ? data.email.trim() : "";
            if (
              !prev.updatedAt ||
              (updatedAt &&
                prev.updatedAt?.toMillis &&
                updatedAt?.toMillis &&
                updatedAt.toMillis() > prev.updatedAt.toMillis())
            ) {
              prev.updatedAt = updatedAt;
              if (typeof data.lastPage === "string") prev.lastPage = data.lastPage;
              if (typeof data.lastStandardtekstId === "string")
                prev.lastStandardtekstId = data.lastStandardtekstId;
              if (firstName) prev.firstName = firstName;
              if (email) prev.email = email;
            } else {
              if (!prev.lastPage && typeof data.lastPage === "string")
                prev.lastPage = data.lastPage;
              if (!prev.lastStandardtekstId && typeof data.lastStandardtekstId === "string")
                prev.lastStandardtekstId = data.lastStandardtekstId;
              if (!prev.firstName && firstName) prev.firstName = firstName;
              if (!prev.email && email) prev.email = email;
            }

            userAgg.set(uid, prev);
          });
        })
      );
      setLoadingUsers(false);

      const existingDayRows = [...dayTotals.values()].filter(
        (r) => r.pageViews !== 0 || r.copies !== 0 || r.searches !== 0
      );

      const viewRows = viewMode === "week" ? groupByIsoWeeks(existingDayRows) : existingDayRows;
      setRows(viewRows);

      const aggregatedUsers = [...userAgg.values()]
        .filter((u) => u.pageViews || u.standardtekstOpens || u.copies || u.searches)
        .sort(
          (a, b) =>
            b.pageViews +
            b.standardtekstOpens +
            b.copies +
            b.searches -
            (a.pageViews + a.standardtekstOpens + a.copies + a.searches)
        );

      setAggregatedUsers(aggregatedUsers);
      return;
    } catch (e: any) {
      const message = typeof e?.message === "string" ? e.message : "Kunne ikke hente statistikk.";
      setError(message);
      setRows([]);
      setAggregatedUsers([]);
      setLoadingTotals(false);
      setLoadingUsers(false);
    } finally {
      // If we returned early, these might already be false.
      // Keep safe: turn both off.
      setLoadingTotals(false);
      setLoadingUsers(false);
    }
  }, [from, to, viewMode, userViewMode]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totals = React.useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.pageViews += r.pageViews;
        acc.copies += r.copies;
        acc.searches += r.searches;
        return acc;
      },
      { pageViews: 0, copies: 0, searches: 0 }
    );
  }, [rows]);

  const visibleUsers = React.useMemo(() => {
    return showAllUsers ? aggregatedUsers : aggregatedUsers.slice(0, 5);
  }, [showAllUsers, aggregatedUsers]);

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          width: "100%",
          flex: "1 1 auto",
          display: "flex",
          overflow: "hidden",
          p: 2,
        }}
      >
        <Paper
          sx={{
            p: 3,
            flex: "1 1 auto",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h2" gutterBottom>
            Statistikk
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Fra"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Til"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              onClick={fetchStats}
              disabled={loadingTotals || loadingUsers}
              sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
            >
              Oppdater
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={viewMode}
                onChange={(_, next) => {
                  if (next) setViewMode(next);
                }}
              >
                <ToggleButton value="day">Dag</ToggleButton>
                <ToggleButton value="week">Uke</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Table size="small" aria-label="statistikk">
            <TableHead>
              <TableRow>
                <TableCell>{viewMode === "week" ? "Uke" : "Dato"}</TableCell>
                <TableCell align="center">Sider vist</TableCell>
                <TableCell align="center">Tekst kopiert</TableCell>
                <TableCell align="center">Tekst søkt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell align="center">{r.pageViews}</TableCell>
                  <TableCell align="center">{r.copies}</TableCell>
                  <TableCell align="center">{r.searches}</TableCell>
                </TableRow>
              ))}

              {viewMode === "week" && (
                <TableRow
                  sx={{
                    backgroundColor: "rgba(0,0,0,0.03)",
                    "& td": {
                      fontWeight: 700,
                      borderTop: "2px solid rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <TableCell>Sum</TableCell>
                  <TableCell align="center">{totals.pageViews}</TableCell>
                  <TableCell align="center">{totals.copies}</TableCell>
                  <TableCell align="center">{totals.searches}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!loadingTotals && !error && rows.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Ingen data i valgt periode.
            </Typography>
          )}

          <Box
            sx={{
              mt: 2,
              flex: "1 1 auto",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
                mt: 4,
              }}
            >
              {" "}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={userViewMode}
                  onChange={(_, next) => {
                    if (next) setUserViewMode(next);
                  }}
                >
                  <ToggleButton value="day">Dag</ToggleButton>
                  <ToggleButton value="total">Totalt</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>
                  {showAllUsers ? "Per bruker (alle)" : "Per bruker (topp 5)"}
                </Typography>
                <FormControlLabel
                  sx={{ ml: 1 }}
                  control={
                    <Switch
                      size="small"
                      checked={showAllUsers}
                      onChange={(e) => setShowAllUsers(e.target.checked)}
                    />
                  }
                  label={showAllUsers ? "Alle" : "Topp 5"}
                />
              </Box>{" "}
            </Box>

            <Box sx={{ flex: "1 1 auto", overflow: "hidden" }}>
              <Table size="small" aria-label="statistikk per bruker">
                <TableHead>
                  <TableRow>
                    <TableCell>Bruker</TableCell>
                    <TableCell align="center">Sider vist</TableCell>
                    <TableCell align="center">Standardtekst åpnet</TableCell>
                    <TableCell align="center">Tekst kopiert</TableCell>
                    <TableCell align="center">Tekst søkt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleUsers.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell>
                        {u.firstName ?? u.email ?? `${u.uid.slice(0, 6)}…${u.uid.slice(-4)}`}
                      </TableCell>
                      <TableCell align="center">{u.pageViews}</TableCell>
                      <TableCell align="center">{u.standardtekstOpens}</TableCell>
                      <TableCell align="center">{u.copies}</TableCell>
                      <TableCell align="center">{u.searches}</TableCell>
                    </TableRow>
                  ))}

                  {!loadingUsers && !error && visibleUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">
                          Ingen brukerdata i valgt periode.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Kun administratorer kan lese disse dataene.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
