import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

type ViewMode = "day" | "week" | "month";

type TotalsRow = {
  key: string;
  label: string;
  pageViews: number;
  copies: number;
  searches: number;
};

type UserAggRow = {
  uid: string;
  firstName?: string;
  email?: string;
  displayName?: string;
  pageViews: number;
  standardtekstOpens: number;
  copies: number;
  searches: number;
  lastPage?: string;
  lastStandardtekstId?: string;
  updatedAt?: { toMillis: () => number };
};

type PathUsageRow = {
  pathKey: string;
  path: string;
  views: number;
  uniqueUsers: number;
};

type PeriodTotals = {
  pageViews: number;
  copies: number;
  searches: number;
  standardtekstOpens: number;
  activeUsers: number;
  sessions: number;
};

const EMPTY_PERIOD_TOTALS: PeriodTotals = {
  pageViews: 0,
  copies: 0,
  searches: 0,
  standardtekstOpens: 0,
  activeUsers: 0,
  sessions: 0,
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

function atStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRangeForAnchor(anchorInput: Date, mode: ViewMode) {
  const anchor = atStartOfDay(anchorInput);
  const today = atStartOfDay(new Date());

  if (mode === "day") {
    return { from: anchor, to: anchor };
  }

  if (mode === "week") {
    const weekStart = startOfIsoWeekMonday(anchor);
    return { from: weekStart, to: anchor };
  }

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return { from: monthStart, to: isSameYearMonth(anchor, today) ? today : monthEnd };
}

function shiftAnchorByMode(anchorInput: Date, mode: ViewMode, direction: -1 | 1) {
  const anchor = atStartOfDay(anchorInput);

  if (mode === "day") return addDays(anchor, direction);
  if (mode === "week") return addDays(anchor, direction * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

function parseDateKey(input: string) {
  const s = String(input || "").trim();

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

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameYearMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getIsoWeekKey(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
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

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
}

function groupByMonths(dayRows: TotalsRow[]) {
  const map = new Map<
    string,
    {
      monthStart: Date;
      pageViews: number;
      copies: number;
      searches: number;
    }
  >();

  for (const r of dayRows) {
    const d = parseDateKey(r.key);
    if (!isValidDate(d)) continue;

    const monthKey = getMonthKey(d);
    const monthStart = startOfMonth(d);
    const prev = map.get(monthKey);

    if (!prev) {
      map.set(monthKey, {
        monthStart,
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
    .sort((a, b) => a[1].monthStart.getTime() - b[1].monthStart.getTime())
    .map(([monthKey, v]) => ({
      key: monthKey,
      label: getMonthLabel(v.monthStart),
      pageViews: v.pageViews,
      copies: v.copies,
      searches: v.searches,
    }));
}

function asCount(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}


function parsePathCounterMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};

  const entries = raw as Record<string, unknown>;
  const out: Record<string, number> = {};

  for (const [key, value] of Object.entries(entries)) {
    const count = asCount(value);
    if (!count) continue;
    out[key] = (out[key] ?? 0) + count;
  }

  return out;
}

function parsePathLabelMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};

  const entries = raw as Record<string, unknown>;
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== "string") continue;
    const label = value.trim();
    if (!label) continue;
    out[key] = label;
  }

  return out;
}

function pathFromCounterKey(pathKey: string): string {
  if (!pathKey || pathKey === "root") return "/";
  const reconstructed = pathKey.replace(/__/g, "/").replace(/_/g, "-");
  return reconstructed.startsWith("/") ? reconstructed : `/${reconstructed}`;
}

export default function StatistikkPage() {
  const [from, setFrom] = React.useState(() =>
    toDateKey(getRangeForAnchor(new Date(), "day").from)
  );
  const [to, setTo] = React.useState(() => toDateKey(getRangeForAnchor(new Date(), "day").to));
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [showAllUsers, setShowAllUsers] = React.useState(false);

  const [rows, setRows] = React.useState<TotalsRow[]>([]);
  const [pathRows, setPathRows] = React.useState<PathUsageRow[]>([]);
  const [topStandardtekster, setTopStandardtekster] = React.useState<
    { title: string; opens: number }[]
  >([]);
  const [topDialogOpen, setTopDialogOpen] = React.useState(false);
  const [aggregatedUsers, setAggregatedUsers] = React.useState<UserAggRow[]>([]);
  const [periodTotals, setPeriodTotals] = React.useState<PeriodTotals>(EMPTY_PERIOD_TOTALS);

  const [loadingTotals, setLoadingTotals] = React.useState(false);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [userTopDialogOpen, setUserTopDialogOpen] = React.useState(false);
  const [userTopDialogTitle, setUserTopDialogTitle] = React.useState<string>("");
  const [userTopLoading, setUserTopLoading] = React.useState(false);
  const [userTopError, setUserTopError] = React.useState<string | null>(null);
  const [userTopItems, setUserTopItems] = React.useState<{ title: string; opens: number }[]>([]);

  const numberFormatter = React.useMemo(() => new Intl.NumberFormat("nb-NO"), []);

  const applyPresetRangeForMode = React.useCallback((mode: ViewMode) => {
    const range = getRangeForAnchor(new Date(), mode);
    setFrom(toDateKey(range.from));
    setTo(toDateKey(range.to));
  }, []);

  const navigatePeriod = React.useCallback(
    (direction: -1 | 1) => {
      const toDate = parseDateKey(to);
      if (!isValidDate(toDate)) return;

      const shiftedAnchor = shiftAnchorByMode(toDate, viewMode, direction);
      const today = atStartOfDay(new Date());
      if (direction > 0 && shiftedAnchor > today) return;

      const range = getRangeForAnchor(shiftedAnchor, viewMode);
      setFrom(toDateKey(range.from));
      setTo(toDateKey(range.to));
    },
    [to, viewMode]
  );

  const getSelectedRange = React.useCallback(() => {
    const fromDate = parseDateKey(from);
    const toDate = parseDateKey(to);

    if (!isValidDate(fromDate) || !isValidDate(toDate)) return null;
    if (fromDate > toDate) return null;

    const rangeStart = fromDate;
    const rangeEnd = toDate;
    const dateKeys = listDateKeysInclusive(toDateKey(rangeStart), toDateKey(rangeEnd));

    return {
      fromDate,
      toDate,
      rangeStart,
      rangeEnd,
      dateKeys,
    };
  }, [from, to]);

  const getUserTopDateKeys = React.useCallback(() => {
    const range = getSelectedRange();
    if (!range) return [] as string[];
    return range.dateKeys;
  }, [getSelectedRange]);

  const openUserTopDialog = React.useCallback(
    async (uid: string, label: string) => {
      setUserTopDialogTitle(label);
      setUserTopItems([]);
      setUserTopError(null);
      setUserTopDialogOpen(true);

      const dateKeys = getUserTopDateKeys();
      if (dateKeys.length === 0) {
        setUserTopError("Ingen gyldig periode valgt.");
        return;
      }

      setUserTopLoading(true);
      try {
        const opensById = new Map<string, number>();

        await Promise.all(
          dateKeys.map(async (dateKey) => {
            const ref = collection(db, "usage_daily", dateKey, "users", uid, "standardtekster");
            const snap = await getDocs(ref);
            snap.forEach((d) => {
              const data = d.data() as Record<string, unknown>;
              const opens = asCount(data.opens);
              if (!opens) return;
              opensById.set(d.id, (opensById.get(d.id) ?? 0) + opens);
            });
          })
        );

        const topEntries = [...opensById.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const items = await Promise.all(
          topEntries.map(async ([id, opens]) => {
            try {
              const ref = doc(db, "Standardtekster", id);
              const s = await getDoc(ref);
              const data = s.exists() ? (s.data() as Record<string, unknown>) : null;
              const title = typeof data?.title === "string" ? data.title.trim() : "";
              return { title: title || id, opens };
            } catch {
              return { title: id, opens };
            }
          })
        );

        setUserTopItems(items);
      } catch (e: unknown) {
        const message =
          typeof e === "object" && e && "message" in e && typeof e.message === "string"
            ? e.message
            : "Kunne ikke hente topp 5.";
        setUserTopError(message);
        setUserTopItems([]);
      } finally {
        setUserTopLoading(false);
      }
    },
    [getUserTopDateKeys]
  );

  const fetchStats = React.useCallback(async () => {
    setLoadingTotals(true);
    setLoadingUsers(true);
    setError(null);

    try {
      if (!from || !to) {
        setRows([]);
        setPathRows([]);
        setAggregatedUsers([]);
        setTopStandardtekster([]);
        setPeriodTotals(EMPTY_PERIOD_TOTALS);
        setTopDialogOpen(false);
        setUserTopDialogOpen(false);
        setUserTopItems([]);
        setUserTopError(null);
        setUserTopLoading(false);
        setUserTopDialogTitle("");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      const fromDate = parseDateKey(from);
      const toDate = parseDateKey(to);

      if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        setRows([]);
        setPathRows([]);
        setAggregatedUsers([]);
        setTopStandardtekster([]);
        setPeriodTotals(EMPTY_PERIOD_TOTALS);
        setTopDialogOpen(false);
        setUserTopDialogOpen(false);
        setUserTopItems([]);
        setUserTopError(null);
        setUserTopLoading(false);
        setUserTopDialogTitle("");
        setError("Ugyldig datoformat. Bruk dato-velgeren (yyyy-mm-dd).");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      if (fromDate > toDate) {
        setRows([]);
        setPathRows([]);
        setAggregatedUsers([]);
        setTopStandardtekster([]);
        setPeriodTotals(EMPTY_PERIOD_TOTALS);
        setTopDialogOpen(false);
        setUserTopDialogOpen(false);
        setUserTopItems([]);
        setUserTopError(null);
        setUserTopLoading(false);
        setUserTopDialogTitle("");
        setError("Fra-dato kan ikke være etter til-dato.");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      const range = getSelectedRange();
      if (!range) {
        setRows([]);
        setPathRows([]);
        setAggregatedUsers([]);
        setTopStandardtekster([]);
        setPeriodTotals(EMPTY_PERIOD_TOTALS);
        setError("Ingen gyldig periode valgt.");
        setLoadingTotals(false);
        setLoadingUsers(false);
        return;
      }

      const { dateKeys } = range;

      const ownerSnap = await getDocs(collection(db, "owners"));
      const ownerUids = new Set<string>(ownerSnap.docs.map((d) => d.id));

      const standardtekstOpensById = new Map<string, number>();

      await Promise.all(
        dateKeys.map(async (dateKey) => {
          const stRef = collection(db, "usage_daily", dateKey, "standardtekster");
          const snap = await getDocs(stRef);
          snap.forEach((d) => {
            const data = d.data() as Record<string, unknown>;
            const opens = asCount(data.opens);
            if (!opens) return;
            standardtekstOpensById.set(d.id, (standardtekstOpensById.get(d.id) ?? 0) + opens);
          });
        })
      );

      const topEntries = [...standardtekstOpensById.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topItems = await Promise.all(
        topEntries.map(async ([id, opens]) => {
          try {
            const ref = doc(db, "Standardtekster", id);
            const s = await getDoc(ref);
            const data = s.exists() ? (s.data() as Record<string, unknown>) : null;
            const title = typeof data?.title === "string" ? data.title.trim() : "";
            return { title: title || id, opens };
          } catch {
            return { title: id, opens };
          }
        })
      );

      setTopStandardtekster(topItems);

      const userDateKeys = dateKeys;
      const dayTotals = new Map<string, TotalsRow>();
      const userAgg = new Map<string, UserAggRow>();

      const activeUsers = new Set<string>();
      const periodAccumulator: PeriodTotals = {
        pageViews: 0,
        copies: 0,
        searches: 0,
        standardtekstOpens: 0,
        activeUsers: 0,
        sessions: 0,
      };

      const pageViewsByPath = new Map<string, number>();
      const uniqueUsersByPath = new Map<string, Set<string>>();
      const pathLabelsByKey = new Map<string, string>();

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

            const data = d.data() as Record<string, unknown>;
            const pageViews = asCount(data.pageViews);
            const copies = asCount(data.copies);
            const searches = asCount(data.searches);
            const standardtekstOpens = asCount(data.standardtekstOpens);
            const sessions = asCount(data.sessions);

            dayRow.pageViews += pageViews;
            dayRow.copies += copies;
            dayRow.searches += searches;

            periodAccumulator.pageViews += pageViews;
            periodAccumulator.copies += copies;
            periodAccumulator.searches += searches;
            periodAccumulator.standardtekstOpens += standardtekstOpens;
            periodAccumulator.sessions += sessions;
            activeUsers.add(uid);

            const pathMap = parsePathCounterMap(data.pageViewsByPath);
            const pathLabels = parsePathLabelMap(data.pathLabels);
            for (const [pathKey, count] of Object.entries(pathMap)) {
              pageViewsByPath.set(pathKey, (pageViewsByPath.get(pathKey) ?? 0) + count);
              const usersForPath = uniqueUsersByPath.get(pathKey) ?? new Set<string>();
              usersForPath.add(uid);
              uniqueUsersByPath.set(pathKey, usersForPath);
              if (pathLabels[pathKey]) pathLabelsByKey.set(pathKey, pathLabels[pathKey]);
            }

          });

          dayTotals.set(dateKey, dayRow);
        })
      );
      setLoadingTotals(false);

      await Promise.all(
        userDateKeys.map(async (dateKey) => {
          const usersRef = collection(db, "usage_daily", dateKey, "users");
          const snap = await getDocs(usersRef);

          snap.forEach((d) => {
            const uid = d.id;
            if (ownerUids.has(uid)) return;

            const data = d.data() as Record<string, unknown>;

            const prev = userAgg.get(uid) ?? {
              uid,
              pageViews: 0,
              standardtekstOpens: 0,
              copies: 0,
              searches: 0,
            };

            prev.pageViews += asCount(data.pageViews);
            prev.standardtekstOpens += asCount(data.standardtekstOpens);
            prev.copies += asCount(data.copies);
            prev.searches += asCount(data.searches);

            const updatedAt = data.updatedAt;
            const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
            const email = typeof data.email === "string" ? data.email.trim() : "";
            const displayName = firstName || email || `${uid.slice(0, 6)}…${uid.slice(-4)}`;
            prev.displayName = displayName;

            const prevUpdatedAt = prev.updatedAt;
            const currentTs =
              updatedAt &&
              typeof updatedAt === "object" &&
              "toMillis" in updatedAt &&
              typeof (updatedAt as { toMillis?: unknown }).toMillis === "function"
                ? (updatedAt as { toMillis: () => number })
                : undefined;

            if (
              !prevUpdatedAt ||
              (currentTs &&
                typeof prevUpdatedAt.toMillis === "function" &&
                currentTs.toMillis() > prevUpdatedAt.toMillis())
            ) {
              prev.updatedAt = currentTs;
              if (typeof data.lastPage === "string") prev.lastPage = data.lastPage;
              if (typeof data.lastStandardtekstId === "string") {
                prev.lastStandardtekstId = data.lastStandardtekstId;
              }
              if (firstName) prev.firstName = firstName;
              if (email) prev.email = email;
            } else {
              if (!prev.lastPage && typeof data.lastPage === "string") prev.lastPage = data.lastPage;
              if (!prev.lastStandardtekstId && typeof data.lastStandardtekstId === "string") {
                prev.lastStandardtekstId = data.lastStandardtekstId;
              }
              if (!prev.firstName && firstName) prev.firstName = firstName;
              if (!prev.email && email) prev.email = email;
            }

            userAgg.set(uid, prev);
          });
        })
      );
      setLoadingUsers(false);

      const existingDayRows = dateKeys
        .map((key) => dayTotals.get(key))
        .filter((r): r is TotalsRow => Boolean(r))
        .filter((r) => r.pageViews !== 0 || r.copies !== 0 || r.searches !== 0);

      const viewRows =
        viewMode === "week"
          ? groupByIsoWeeks(existingDayRows)
          : viewMode === "month"
          ? groupByMonths(existingDayRows)
          : existingDayRows;
      setRows(viewRows);

      const users = [...userAgg.values()]
        .filter((u) => u.pageViews || u.standardtekstOpens || u.copies || u.searches)
        .sort(
          (a, b) =>
            b.pageViews +
            b.standardtekstOpens +
            b.copies +
            b.searches -
            (a.pageViews + a.standardtekstOpens + a.copies + a.searches)
        );

      setAggregatedUsers(users);

      periodAccumulator.activeUsers = activeUsers.size;
      setPeriodTotals(periodAccumulator);

      const pathUsageRows = [...pageViewsByPath.entries()]
        .map(([pathKey, views]) => {
          const uniqueUsers = uniqueUsersByPath.get(pathKey)?.size ?? 0;
          const path = pathLabelsByKey.get(pathKey) ?? pathFromCounterKey(pathKey);
          return {
            pathKey,
            path,
            views,
            uniqueUsers,
          } satisfies PathUsageRow;
        })
        .filter((r) => r.views > 0)
        .sort((a, b) => b.views - a.views || b.uniqueUsers - a.uniqueUsers)
        .slice(0, 15);

      setPathRows(pathUsageRows);

      return;
    } catch (e: unknown) {
      const message =
        typeof e === "object" && e && "message" in e && typeof e.message === "string"
          ? e.message
          : "Kunne ikke hente statistikk.";
      setError(message);
      setRows([]);
      setPathRows([]);
      setAggregatedUsers([]);
      setTopStandardtekster([]);
      setPeriodTotals(EMPTY_PERIOD_TOTALS);
      setTopDialogOpen(false);
      setUserTopDialogOpen(false);
      setUserTopItems([]);
      setUserTopError(null);
      setUserTopLoading(false);
      setUserTopDialogTitle("");
      setLoadingTotals(false);
      setLoadingUsers(false);
    } finally {
      setLoadingTotals(false);
      setLoadingUsers(false);
    }
  }, [from, to, getSelectedRange, viewMode]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const tableTotals = React.useMemo(() => {
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

  const kpiCards = [
    {
      title: "Aktive brukere",
      description: "Unike brukere i valgt periode",
      value: numberFormatter.format(periodTotals.activeUsers),
    },
    {
      title: "Sesjoner",
      description: "Antall brukerøkter (30 min inaktivitet = ny økt)",
      value: numberFormatter.format(periodTotals.sessions),
    },
    {
      title: "Sidevisninger",
      description: "Totalt antall sidevisninger",
      value: numberFormatter.format(periodTotals.pageViews),
    },
    {
      title: "Kopieringer",
      description: "Tekst kopiert fra appen",
      value: numberFormatter.format(periodTotals.copies),
    },
  ];

  const isLoading = loadingTotals || loadingUsers;
  const parsedFrom = parseDateKey(from);
  const parsedTo = parseDateKey(to);
  const hasValidHeaderRange = isValidDate(parsedFrom) && isValidDate(parsedTo);
  const periodRangeLabel = hasValidHeaderRange
    ? `${formatNorDate(parsedFrom)}–${formatNorDate(parsedTo)}`
    : "Ugyldig periode";
  const canNavigateForward = hasValidHeaderRange && parsedTo < atStartOfDay(new Date());

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          width: "100%",
          flex: "1 1 auto",
          display: "flex",
          overflow: "hidden",
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
        }}
      >
        <Paper
          sx={{
            width: "100%",
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h2" gutterBottom={false}>
                Statistikk
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Innsikt i bruk, verdi og hvilke sider som faktisk blir brukt
              </Typography>
            </Box>
          </Stack>

          {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}

          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                position: "sticky",
                top: 0,
                zIndex: 5,
                backgroundColor: "background.paper",
              }}
            >
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems="stretch">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flex: 1 }}>
                  <TextField
                    label="Fra"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 170 }}
                  />
                  <TextField
                    label="Til"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 170 }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={fetchStats}
                    disabled={isLoading}
                    sx={{ minWidth: 130 }}
                  >
                    Oppdater
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setTopDialogOpen(true)}
                    disabled={isLoading || topStandardtekster.length === 0}
                    sx={{ minWidth: 200 }}
                  >
                    Topp standardtekster
                  </Button>
                </Stack>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={viewMode}
                  onChange={(_, next) => {
                    if (!next) return;
                    setViewMode(next);
                    applyPresetRangeForMode(next);
                  }}
                >
                  <ToggleButton value="day">Dag</ToggleButton>
                  <ToggleButton value="week">Uke</ToggleButton>
                  <ToggleButton value="month">Måned</ToggleButton>
                </ToggleButtonGroup>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, px: 0.5 }}
                >
                  <IconButton
                    aria-label="Forrige periode"
                    size="small"
                    onClick={() => navigatePeriod(-1)}
                    disabled={isLoading}
                  >
                    <ChevronLeftRoundedIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 170, textAlign: "center", px: 0.5 }}>
                    {periodRangeLabel}
                  </Typography>
                  <IconButton
                    aria-label="Neste periode"
                    size="small"
                    onClick={() => navigatePeriod(1)}
                    disabled={isLoading || !canNavigateForward}
                  >
                    <ChevronRightRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            {!error && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  {kpiCards.map((card) => (
                    <Paper
                      key={card.title}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{ lineHeight: 1.15, fontWeight: 800, mt: 0.25 }}
                      >
                        {card.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                        {card.description}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </>
            )}

            <Box
              sx={{
                mt: 1,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 2,
                alignItems: "start",
              }}
            >
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6">
                    Aktivitet per {viewMode === "week" ? "uke" : viewMode === "month" ? "måned" : "dag"}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small" aria-label="statistikk" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {viewMode === "week" ? "Uke" : viewMode === "month" ? "Måned" : "Dato"}
                        </TableCell>
                        <TableCell align="center">Sidevisninger</TableCell>
                        <TableCell align="center">Tekst kopiert</TableCell>
                        <TableCell align="center">Tekst søkt</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.key} hover>
                          <TableCell>{r.label}</TableCell>
                          <TableCell align="center">{numberFormatter.format(r.pageViews)}</TableCell>
                          <TableCell align="center">{numberFormatter.format(r.copies)}</TableCell>
                          <TableCell align="center">{numberFormatter.format(r.searches)}</TableCell>
                        </TableRow>
                      ))}

                      {rows.length > 0 && (
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
                          <TableCell align="center">{numberFormatter.format(tableTotals.pageViews)}</TableCell>
                          <TableCell align="center">{numberFormatter.format(tableTotals.copies)}</TableCell>
                          <TableCell align="center">{numberFormatter.format(tableTotals.searches)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {!loadingTotals && !error && rows.length === 0 && (
                  <Typography color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                    Ingen data i valgt periode.
                  </Typography>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6">Mest brukte side-paths</Typography>
                </Box>
                <TableContainer>
                  <Table size="small" aria-label="mest brukte paths" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Path</TableCell>
                        <TableCell align="center">Sidevisninger</TableCell>
                        <TableCell align="center">Unike brukere</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pathRows.map((r) => (
                        <TableRow key={r.pathKey} hover>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 13 }}>{r.path}</TableCell>
                          <TableCell align="center">{numberFormatter.format(r.views)}</TableCell>
                          <TableCell align="center">{numberFormatter.format(r.uniqueUsers)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {!loadingTotals && !error && pathRows.length === 0 && (
                  <Typography color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                    Ingen path-data i valgt periode.
                  </Typography>
                )}
              </Paper>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mt: 0.5, flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: { xs: "flex-start", md: "center" },
                  justifyContent: "space-between",
                  mb: 1,
                  gap: 1,
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ mr: 1 }}>
                    Brukeratferd
                  </Typography>
                  <Chip
                    size="small"
                    label={`Visning: ${viewMode === "week" ? "Uke" : viewMode === "month" ? "Måned" : "Dag"}`}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: "100%", md: "auto" } }}>
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
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, flex: "1 1 auto" }}>
                <Table size="small" aria-label="statistikk per bruker" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bruker</TableCell>
                      <TableCell align="center">Sidevisninger</TableCell>
                      <TableCell align="center">Standardtekst åpnet</TableCell>
                      <TableCell align="center">Tekst kopiert</TableCell>
                      <TableCell align="center">Tekst søkt</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap", width: 72 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleUsers.map((u) => (
                      <TableRow key={u.uid} hover>
                        <TableCell>{u.displayName}</TableCell>
                        <TableCell align="center">{numberFormatter.format(u.pageViews)}</TableCell>
                        <TableCell align="center">{numberFormatter.format(u.standardtekstOpens)}</TableCell>
                        <TableCell align="center">{numberFormatter.format(u.copies)}</TableCell>
                        <TableCell align="center">{numberFormatter.format(u.searches)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap", width: 72 }}>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => openUserTopDialog(u.uid, u.displayName || "Bruker")}
                            sx={{ whiteSpace: "nowrap", minWidth: 0 }}
                          >
                            Topp 5
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loadingUsers && !error && visibleUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary">
                            Ingen brukerdata i valgt periode.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>

          <Dialog open={topDialogOpen} onClose={() => setTopDialogOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Topp 10 standardtekster</DialogTitle>
            <DialogContent dividers>
              {topStandardtekster.length === 0 ? (
                <Typography color="text.secondary">Ingen data i valgt periode.</Typography>
              ) : (
                <List dense>
                  {topStandardtekster.map((it, idx) => (
                    <ListItem key={`${idx}-${it.title}`} disableGutters>
                      <ListItemText primary={`${idx + 1}. ${it.title} (${numberFormatter.format(it.opens)})`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTopDialogOpen(false)}>Lukk</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={userTopDialogOpen}
            onClose={() => setUserTopDialogOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Topp 5 standardtekster – {userTopDialogTitle}</DialogTitle>
            <DialogContent dividers>
              {userTopLoading ? (
                <Typography color="text.secondary">Laster…</Typography>
              ) : userTopError ? (
                <Typography color="error">{userTopError}</Typography>
              ) : userTopItems.length === 0 ? (
                <Typography color="text.secondary">Ingen data i valgt periode.</Typography>
              ) : (
                <List dense>
                  {userTopItems.map((it, idx) => (
                    <ListItem key={`${idx}-${it.title}`} disableGutters>
                      <ListItemText primary={`${idx + 1}. ${it.title} (${numberFormatter.format(it.opens)})`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUserTopDialogOpen(false)}>Lukk</Button>
            </DialogActions>
          </Dialog>

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Kun administratorer kan lese disse dataene.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
