import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ClickAwayListener,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

const SPREADSHEET_EDIT_URL =
  "https://docs.google.com/spreadsheets/d/1rBMivx3lHY4CKrFev_On__YVendKv6O7i_Zzcoy9QYg/edit?gid=1369769996#gid=1369769996";
import { festToSearchIndex } from "../mappers/festToSearchIndex";
import { pimToSearchIndex } from "../mappers/pimToSearchIndex";
import type { SearchIndexItem } from "../../../utils/types";
import { formatPreparatForTemplate } from "../../standardtekster/utils/preparat";

type Med = {
  // Unique key used by UI (prefix with source to avoid collisions)
  id: string;
  // Source for debugging / future UI labels
  source: "FEST" | "PIM" | "HV";

  // Display fields used by current UI
  varenavn: string | null;
  navnFormStyrke: string | null;

  // FEST fields (null for PIM/HV)
  atc: string | null;
  virkestoff: string | null;
  produsent: string | null;
  reseptgruppe: string | null;

  // PIM/HV only
  farmaloggNumber?: string | null;

  // Search backing text (normalized in mapper)
  searchText: string;

  normalizedName: string;
  normalizedVarenavn: string;
  normalizedSubstance: string;
  normalizedSearchText: string;
  nameTokens: string[];
  varenavnTokens: string[];
  substanceTokens: string[];
  hayTokens: string[];
  dedupKey: string;
};

type ScoredMed = {
  med: Med;
  score: number;
};

let medicationItemsPromise: Promise<Med[]> | null = null;

type Props = {
  maxResults?: number;
  onPick?: (med: Med) => void;
  onManualPick?: (payload: { name: string; query: string }) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoPasteNumericClipboard?: boolean;
  resetSignal?: string | number | null;
  accentColor?: string;
};

const NOISE_TOKENS = new Set([
  // packaging / form / filler words often present in pasted strings
  "stk",
  "stk.",
  "blister",
  "blisterpakning",
  "pakning",
  "blist", // sometimes pasted/abbreviated
  "modi",
  "modif",
  "modif.",
  "modifisert",
  "kap",
  "kaps",
  "kapsel",
  "tab",
  "tablett",
  "mikstur",
  "susp",
  "inj",
  "inf",
  "oppl",
  "pulv",
  "pulver",
  "væske",
  "aerosol",
  "inh",
  "spray",
  "dråper",
  "dr",
  "depot",
  "retard",
  "sr",
  "cr",
  "xr",
  "frisett",
  "fri",
]);

const SEARCH_UNIT_TOKENS = new Set([
  "mg",
  "g",
  "mcg",
  "ug",
  "µg",
  "mikrog",
  "mikrogram",
  "ml",
  "dose",
  "t",
  "time",
]);

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    // remove zero-width chars that may sneak in during copy/paste (breaks tokenization)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // keep decimals together: "0,4" -> "0.4"
    .replace(/(\d),(\d)/g, "$1.$2")
    // normalize "200 mg" -> "200mg" so it later becomes "200 mg" consistently
    .replace(/(\d)\s+(mg|g|mcg|ug|µg|mikrog|mikrogram|ml|mmol|iu|ie|i\.e\.|dose|t|time)\b/g, "$1$2")
    // Split digit/letter boundaries so "30mg" becomes "30 mg"
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    // Treat common punctuation as spaces (keep dot since we use it for decimals)
    .replace(/[\u00B5µ,;:()\[\]{}\/\\|+\-_*"'!?]/g, " ")
    // Collapse whitespace
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ")
    .trim();

const dedupe = (arr: string[]) => {
  const out: string[] = [];
  for (const t of arr) {
    if (!t) continue;
    if (out[out.length - 1] !== t) out.push(t);
  }
  return out;
};

const toTokens = (value: string) => {
  const tokens = normalizeForSearch(value)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    // remove noise tokens
    .filter((t) => !NOISE_TOKENS.has(t))
    // keep short tokens only if they are numbers/decimals
    .filter((t) => t.length >= 2 || /^\d+(?:\.\d+)?$/.test(t));

  return dedupe(tokens);
};

const isNumberToken = (t: string) => /^\d+(?:\.\d+)?$/.test(t);

const normalizeIdToken = (value: string) => {
  const trimmed = String(value ?? "").trim();
  const stripped = trimmed.replace(/^0+/, "");
  return stripped || "0";
};

const getNumericClipboardValue = (value: string): string => {
  const compact = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
  return /^\d{3,6}$/.test(compact) ? compact : "";
};

const normalizeStrengthComparable = (value: string) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\b(mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e)\b/g, "")
    .replace(/\s+/g, "")
    .replace(/\s*\/\s*/g, "/")
    .trim();

const getMedicationDisplayName = (med: Pick<Med, "varenavn" | "navnFormStyrke">) => {
  const varenavn = String(med.varenavn ?? "").replace(/\s+/g, " ").trim();
  const navnFormStyrke = String(med.navnFormStyrke ?? med.varenavn ?? "").replace(/\s+/g, " ").trim();
  if (!navnFormStyrke) return varenavn || "(uten navn)";
  if (!varenavn) return navnFormStyrke;

  const trailingStrengthMatch = navnFormStyrke.match(
    /(\d+(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e)(?:\s*\/\s*\d+(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ug|mikrog|mikrogram|iu|ie|i\.e\.|mmol|ml|e))*)\s*$/i,
  );
  const varenavnStrengthMatch = varenavn.match(
    /(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+|\d+(?:[.,]\d+)?)\s*$/i,
  );

  if (!trailingStrengthMatch || !varenavnStrengthMatch) return navnFormStyrke;

  const trailingComparable = normalizeStrengthComparable(trailingStrengthMatch[1]);
  const varenavnComparable = normalizeStrengthComparable(varenavnStrengthMatch[1]);
  if (!trailingComparable || trailingComparable !== varenavnComparable) return navnFormStyrke;
  if (!navnFormStyrke.toLowerCase().startsWith(varenavn.toLowerCase())) return navnFormStyrke;

  const suffixWithoutStrength = navnFormStyrke
    .slice(varenavn.length, trailingStrengthMatch.index)
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  return [varenavn, suffixWithoutStrength].filter(Boolean).join(" ").trim() || varenavn;
};

const buildDedupKeyFromFields = (nameText: string, substanceText: string) => {
  const rawTokens = normalizeForSearch(nameText)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !NOISE_TOKENS.has(t));

  if (rawTokens.length === 0) {
    return normalizeForSearch([nameText, substanceText].filter(Boolean).join(" ")) || "unknown";
  }

  const textTokens = rawTokens.filter((t) => !isNumberToken(t) && !SEARCH_UNIT_TOKENS.has(t));
  const strengthTokens: string[] = [];

  for (let i = 0; i < rawTokens.length - 1; i++) {
    const a = rawTokens[i];
    const b = rawTokens[i + 1];
    if (isNumberToken(a) && SEARCH_UNIT_TOKENS.has(b)) {
      strengthTokens.push(`${a}${b}`);
      i++;
    }
  }

  const substanceTokens = toTokens(substanceText).filter(
    (t) => !isNumberToken(t) && !SEARCH_UNIT_TOKENS.has(t),
  );

  const keyParts = dedupe([...textTokens, ...strengthTokens, ...substanceTokens.slice(0, 2)]);
  return (
    keyParts.length > 0
      ? keyParts.join("|")
      : normalizeForSearch([nameText, substanceText].filter(Boolean).join(" ")) || "unknown"
  );
};

const sourcePriority = (source: Med["source"]) => {
  switch (source) {
    case "PIM":
      return 3;
    case "HV":
      return 2;
    case "FEST":
    default:
      return 1;
  }
};

const collapseSimilarResults = (items: ScoredMed[]): ScoredMed[] => {
  const groups = new Map<string, ScoredMed[]>();

  for (const item of items) {
    const key = item.med.dedupKey;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).map((group) => {
    const ranked = [...group].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aHasFarmalogg = Boolean(a.med.farmaloggNumber);
      const bHasFarmalogg = Boolean(b.med.farmaloggNumber);
      if (aHasFarmalogg !== bHasFarmalogg) return aHasFarmalogg ? -1 : 1;

      const sourceDiff = sourcePriority(b.med.source) - sourcePriority(a.med.source);
      if (sourceDiff !== 0) return sourceDiff;

      const aName = a.med.navnFormStyrke ?? a.med.varenavn ?? "";
      const bName = b.med.navnFormStyrke ?? b.med.varenavn ?? "";
      return aName.localeCompare(bName, "nb");
    });

    const best = ranked[0];
    const firstWithFarmalogg = ranked.find((item) => item.med.farmaloggNumber)?.med ?? null;
    const firstWithVirkestoff = ranked.find((item) => item.med.virkestoff)?.med ?? null;
    const firstWithAtc = ranked.find((item) => item.med.atc)?.med ?? null;
    const firstWithProdusent = ranked.find((item) => item.med.produsent)?.med ?? null;
    const firstWithReseptgruppe = ranked.find((item) => item.med.reseptgruppe)?.med ?? null;

    return {
      score: best.score,
      med: {
        ...best.med,
        farmaloggNumber: best.med.farmaloggNumber ?? firstWithFarmalogg?.farmaloggNumber ?? null,
        virkestoff: best.med.virkestoff ?? firstWithVirkestoff?.virkestoff ?? null,
        atc: best.med.atc ?? firstWithAtc?.atc ?? null,
        produsent: best.med.produsent ?? firstWithProdusent?.produsent ?? null,
        reseptgruppe: best.med.reseptgruppe ?? firstWithReseptgruppe?.reseptgruppe ?? null,
      },
    };
  });
};

const finalizeMed = (input: {
  id: string;
  source: "FEST" | "PIM" | "HV";
  varenavn: string | null;
  navnFormStyrke: string | null;
  atc: string | null;
  virkestoff: string | null;
  produsent: string | null;
  reseptgruppe: string | null;
  farmaloggNumber?: string | null;
  searchText: string;
}): Med => {
  const nameText = input.navnFormStyrke ?? input.varenavn ?? "";
  const varenavnText = input.varenavn ?? input.navnFormStyrke ?? "";
  const substanceText = input.virkestoff ?? "";
  const searchText = input.searchText || nameText || varenavnText || substanceText;

  return {
    ...input,
    normalizedName: normalizeForSearch(nameText),
    normalizedVarenavn: normalizeForSearch(varenavnText),
    normalizedSubstance: normalizeForSearch(substanceText),
    normalizedSearchText: normalizeForSearch(searchText),
    nameTokens: toTokens(nameText),
    varenavnTokens: toTokens(varenavnText),
    substanceTokens: toTokens(substanceText),
    hayTokens: toTokens(searchText),
    dedupKey: input.farmaloggNumber
      ? `farmalogg:${normalizeIdToken(input.farmaloggNumber)}`
      : buildDedupKeyFromFields(nameText, substanceText),
  };
};

const buildMedicationItems = (festRaw: any[], pimRaw: any[], hvRaw: any[]): Med[] => {
  const festIndex: SearchIndexItem[] = festToSearchIndex(
    festRaw.map((m) => ({
      id: String(m.id),
      name: String(m.navnFormStyrke ?? m.varenavn ?? ""),
      atc: m.atc ?? undefined,
      substance: m.virkestoff ?? undefined,
      prescriptionGroup: m.reseptgruppe ?? undefined,
    }))
  );

  const pimIndex: SearchIndexItem[] = pimToSearchIndex(
    pimRaw.map((p) => ({
      farmaloggNumber: String(p.farmaloggNumber),
      name: p.name ?? undefined,
      nameFormStrength:
        ((p as any).nameFormStrength && String((p as any).nameFormStrength).trim().length > 0
          ? (p as any).nameFormStrength
          : (p as any).name) ?? undefined,
      atc: (p as any).atc ?? undefined,
      substance:
        (p as any).virkestoff ??
        (p as any).virkestoffNavn ??
        (p as any).substance ??
        (p as any).activeSubstance ??
        (p as any).activeSubstanceName ??
        undefined,
      prescriptionGroup: (p as any).reseptgruppe ?? (p as any).prescriptionGroup ?? undefined,
      manufacturer: (p as any).produsent ?? (p as any).manufacturer ?? undefined,
      externalId: (p as any).id ?? undefined,
    }))
  );

  const hvIndex: SearchIndexItem[] = pimToSearchIndex(
    hvRaw.map((p) => ({
      farmaloggNumber: String(p.farmaloggNumber),
      name: p.name ?? undefined,
      nameFormStrength: p.name ?? undefined,
      atc: (p as any).atc ?? undefined,
      substance:
        (p as any).virkestoff ??
        (p as any).virkestoffNavn ??
        (p as any).substance ??
        (p as any).activeSubstance ??
        (p as any).activeSubstanceName ??
        undefined,
      prescriptionGroup: (p as any).reseptgruppe ?? (p as any).prescriptionGroup ?? undefined,
      manufacturer: (p as any).produsent ?? (p as any).manufacturer ?? undefined,
      externalId: (p as any).id ?? undefined,
    }))
  ).map((item) => ({
    ...item,
    source: "HV" as const,
    id: String(item.farmaloggNumber ?? item.id),
  }));

  const searchIndex: SearchIndexItem[] = [...festIndex, ...pimIndex, ...hvIndex];

  const festByKey = new Map<string, any>();
  for (const m of festRaw) {
    festByKey.set(`FEST:${String(m.id)}`, m);
  }

  const normalizeForKey = (s: string) =>
    normalizeForSearch(String(s ?? ""))
      .replace(/[\s\-]+/g, " ")
      .trim();

  const festVirkestoffByAtc = new Map<string, string>();
  for (const m of festRaw) {
    const atc = String((m as any)?.atc ?? "").trim();
    const v = String((m as any)?.virkestoff ?? "").trim();
    if (!atc || !v) continue;
    if (!festVirkestoffByAtc.has(atc)) festVirkestoffByAtc.set(atc, v);
  }

  const festMetaByNameKey = new Map<string, { virkestoff: string; atc: string; reseptgruppe: string }>();
  for (const m of festRaw) {
    const meta = {
      virkestoff: String((m as any)?.virkestoff ?? "").trim(),
      atc: String((m as any)?.atc ?? "").trim(),
      reseptgruppe: String((m as any)?.reseptgruppe ?? "").trim(),
    };
    if (!meta.virkestoff && !meta.atc && !meta.reseptgruppe) continue;

    const n1 = String((m as any)?.varenavn ?? "").trim();
    const n2 = String((m as any)?.navnFormStyrke ?? "").trim();
    const k1 = n1 ? normalizeForKey(n1) : "";
    const k2 = n2 ? normalizeForKey(n2) : "";
    if (k1 && !festMetaByNameKey.has(k1)) festMetaByNameKey.set(k1, meta);
    if (k2 && !festMetaByNameKey.has(k2)) festMetaByNameKey.set(k2, meta);
  }

  const fallbackMetaForPimHv = (item: SearchIndexItem) => {
    const atc = String((item as any)?.atc ?? "").trim();
    if (atc) {
      const virkestoff = festVirkestoffByAtc.get(atc) ?? "";
      if (virkestoff || atc) {
        return {
          virkestoff,
          atc,
          reseptgruppe: "",
        };
      }
    }

    const nameCandidates = [
      (item as any)?.nameFormStrength,
      (item as any)?.name,
      (item as any)?.displayName,
    ]
      .filter(Boolean)
      .map((s: any) => String(s).trim())
      .filter(Boolean);

    for (const n of nameCandidates) {
      const k = normalizeForKey(n);
      const meta = festMetaByNameKey.get(k);
      if (meta) return meta;
    }

    return {
      virkestoff: "",
      atc: "",
      reseptgruppe: "",
    };
  };

  return searchIndex.map((item) => {
    const key = `${item.source}:${item.id}`;

    if (item.source === "FEST") {
      const original = festByKey.get(key);

      return finalizeMed({
        id: key,
        source: "FEST",
        varenavn: original?.varenavn ?? null,
        navnFormStyrke: original?.navnFormStyrke ?? original?.varenavn ?? item.displayName ?? null,
        atc: original?.atc ?? item.atc ?? null,
        virkestoff: original?.virkestoff ?? item.substance ?? null,
        produsent: original?.produsent ?? null,
        reseptgruppe: original?.reseptgruppe ?? item.prescriptionGroup ?? null,
        searchText: item.searchText,
      });
    }

    const fallbackMeta = fallbackMetaForPimHv(item);
    return finalizeMed({
      id: key,
      source: item.source as "PIM" | "HV",
      farmaloggNumber: item.farmaloggNumber ?? String(item.id),
      varenavn: item.name ?? item.displayName ?? null,
      navnFormStyrke: item.nameFormStrength ?? item.displayName ?? item.name ?? null,
      atc: item.atc ?? fallbackMeta.atc ?? null,
      virkestoff: item.substance ?? fallbackMeta.virkestoff ?? null,
      produsent: item.manufacturer ?? null,
      reseptgruppe: item.prescriptionGroup ?? fallbackMeta.reseptgruppe ?? null,
      searchText: item.searchText,
    });
  });
};

const fetchJsonArray = async <T,>(url: string): Promise<T[]> => {
  // Let the browser cache per Cache-Control (see public/_headers). These data files
  // change only on deploy, so no-store just forced a redundant multi-MB re-download.
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Klarte ikke å hente ${url} (${response.status}).`);
  }

  const parsed: unknown = await response.json();
  return Array.isArray(parsed) ? (parsed as T[]) : [];
};

export const loadMedicationItems = () => {
  if (!medicationItemsPromise) {
    medicationItemsPromise = Promise.all([
      import("../meds.json"),
      fetchJsonArray<any>("/data/pimProducts.json"),
      import("./hvProducts.json"),
    ]).then(([festModule, pimRows, hvModule]) =>
      buildMedicationItems(
        Array.isArray(festModule.default) ? festModule.default : [],
        Array.isArray(pimRows) ? pimRows : [],
        Array.isArray(hvModule.default) ? hvModule.default : []
      )
    );
  }

  return medicationItemsPromise;
};

export type { Med };

const tokenMatches = (hayTokens: string[], needleRaw: string) => {
  const needle = needleRaw.replace(",", ".");

  if (isNumberToken(needle)) {
    // numbers (including decimals) must match exactly
    return hayTokens.includes(needle);
  }

  // text tokens can match as prefix of any token (so "xirom" matches "xiromed")
  return hayTokens.some((ht) => ht.startsWith(needle));
};

export default function MedicationSearch({
  maxResults = 25,
  onPick,
  onManualPick,
  inputRef,
  autoPasteNumericClipboard = false,
  resetSignal = null,
  accentColor,
}: Props) {
  const [query, setQuery] = useState("");
  const queryRef = useRef("");
  const [manualName, setManualName] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [allItems, setAllItems] = useState<Med[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const lastAutoPickedQueryRef = useRef("");
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const manualNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastObservedClipboardDigitsRef = useRef("");
  const lastAutoFilledQueryRef = useRef("");
  const clipboardReadBlockedRef = useRef(false);
  const clipboardReadInFlightRef = useRef(false);
  const pendingManualFocusDigitsRef = useRef("");

  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;

  useEffect(() => {
    setQuery("");
    queryRef.current = "";
    setManualName("");
    setOpen(false);
    setHighlightedIndex(-1);
    lastAutoFilledQueryRef.current = "";
    lastAutoPickedQueryRef.current = "";
  }, [resetSignal]);

  useEffect(() => {
    let cancelled = false;

    setIsLoadingData(true);
    loadMedicationItems()
      .then((items) => {
        if (cancelled) return;
        setAllItems(items);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Klarte ikke å laste preparatdata."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const maybeAutofillFromClipboard = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = Boolean(opts?.force);
      if (!autoPasteNumericClipboard) return;
      if (!force && !isInputFocused) return;
      if (typeof navigator === "undefined") return;
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
      if (clipboardReadInFlightRef.current || clipboardReadBlockedRef.current) return;

      clipboardReadInFlightRef.current = true;
      try {
        const raw = await navigator.clipboard.readText();
        const digits = getNumericClipboardValue(raw);
        if (!digits) return;
        if (digits === lastObservedClipboardDigitsRef.current) return;

        // Ikke overstyr manuelt skrevet søk.
        const currentQuery = queryRef.current;
        const canOverwrite = !currentQuery.trim() || currentQuery === lastAutoFilledQueryRef.current;
        if (!canOverwrite) return;

        lastObservedClipboardDigitsRef.current = digits;
        lastAutoFilledQueryRef.current = digits;
        pendingManualFocusDigitsRef.current = digits;
        setQuery(digits);
        setOpen(!isLoadingData && !loadError);
      } catch {
        // Clipboard-read kan være blokkert av browser policy.
        // Unngå spam av exceptions mens feltet er aktivt.
        clipboardReadBlockedRef.current = true;
      } finally {
        clipboardReadInFlightRef.current = false;
      }
    },
    [autoPasteNumericClipboard, isInputFocused, isLoadingData, loadError],
  );

  const results = useMemo(() => {
    const tokens = toTokens(deferredQuery);
    if (tokens.length === 0 || allItems.length === 0) return [];

    // number + unit pair like "75 mg" or "1.25 ml"
    // Split into meaningful text vs number tokens
    const textTokens = tokens.filter((t) => !isNumberToken(t) && !SEARCH_UNIT_TOKENS.has(t));

    // If the user pasted a long string, we want the match to be more specific.
    // Avoid short/partial tokens like "atin" from becoming required.
    const meaningfulTextTokens = textTokens
      .filter((t) => t.length >= 4) // drop partials
      .filter((t) => t !== "mg" && t !== "ml");

    // If the user typed a short, specific query (few meaningful tokens), require all of them
    // to avoid returning many near-identical variants (common for HV products).
    // For long pasted strings, keep the more forgiving "up to 2" rule.
    const requiredTextTokens =
      meaningfulTextTokens.length > 0 && meaningfulTextTokens.length <= 4
        ? meaningfulTextTokens
        : meaningfulTextTokens.slice(0, Math.min(2, meaningfulTextTokens.length));

    // Farmalogg numbers are long integers. Treat them as identifiers, not strength.
    const idNumberTokens = tokens
      .filter((t) => isNumberToken(t))
      .filter((t) => !t.includes("."))
      .filter((t) => t.length >= 4);
    const normalizedIdNumberTokens = idNumberTokens.map(normalizeIdToken);

    // (computed after `numberWithUnit` is defined)

    // Enforce meaningful strength tokens from the query (handles long pasted strings)
    // Important: ignore pack-size numbers like "120 doser" so they don't kill results.
    const packSizeTokens = new Set([
      "dose",
      "doser",
      "doses",
      "inhalasjoner",
      "inhalationer",
      "inh",
      "stk",
      "stk.",
      "pak",
      "pakning",
    ]);

    const numberWithUnit = (() => {
      for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];
        if (isNumberToken(a) && SEARCH_UNIT_TOKENS.has(b)) return a;
      }
      return null;
    })();
    const isLikelyIdSearch =
      idNumberTokens.length > 0 && meaningfulTextTokens.length === 0 && !numberWithUnit;
    const restrictToPimOnly = isLikelyIdSearch;
    const strictPrefixTextQuery =
      !isLikelyIdSearch &&
      meaningfulTextTokens.length === 1 &&
      meaningfulTextTokens[0].length >= 4
        ? meaningfulTextTokens[0]
        : null;
    const shortPrefixTextQuery =
      !isLikelyIdSearch &&
      meaningfulTextTokens.length === 0 &&
      textTokens.length === 1 &&
      textTokens[0].length >= 2 &&
      textTokens[0].length <= 3
        ? textTokens[0]
        : null;
    const normalizedQuery = normalizeForSearch(deferredQuery);
    const exactStrengthPhrase = (() => {
      for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];
        if (isNumberToken(a) && SEARCH_UNIT_TOKENS.has(b)) return `${a} ${b}`;
      }
      return null;
    })();

    // Collect "meaningful" number tokens until we hit pack-size indicators.
    // Also drop numbers that sit right next to pack-size tokens.
    const meaningfulNumberTokensInQuery: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const prev = tokens[i - 1];
      const next = tokens[i + 1];

      if (packSizeTokens.has(t)) break; // stop scanning once we reach pack-size part

      if (!isNumberToken(t)) continue;

      // Ignore numbers used for pack size (e.g. "120 doser")
      if ((prev && packSizeTokens.has(prev)) || (next && packSizeTokens.has(next))) continue;

      meaningfulNumberTokensInQuery.push(t);
    }

    const requiredStrengthTokens = (() => {
      // Case 1: explicit number+unit ("75 mg") -> require the number part
      if (numberWithUnit) return [numberWithUnit];

      // Case 2: ratios/combined strengths like "160/4,5" -> require first two meaningful numbers
      // so 160/4,5 won't match 80/4,5.
      const uniq = Array.from(new Set(meaningfulNumberTokensInQuery));
      if (uniq.length >= 2) return uniq.slice(0, 2);

      // Case 3: single decimal ("0,1")
      const decimalToken = tokens.find((t) => /^\d+\.\d+$/.test(t));
      if (decimalToken) return [decimalToken];

      // Case 4: single integer (e.g. "40").
      // If the query looks like an identifier search (e.g. Farmalogg number), don't treat it as strength.
      if (uniq.length === 1) {
        const only = uniq[0];
        if (isLikelyIdSearch && idNumberTokens.includes(only)) return [];
        return [only];
      }

      return [];
    })();

    const out: ScoredMed[] = [];

    const rawQueryLower = deferredQuery.toLowerCase();
    const queryIndicatesCombo = rawQueryLower.includes("/") || rawQueryLower.includes(" og ");
    let hasNonComboMatch = false;

    const comboNamePattern = /[a-zæøå]\s*\/\s*[a-zæøå]/i;
    const isComboMed = (med: Med) => {
      const name = (med.navnFormStyrke ?? med.varenavn ?? "").toLowerCase();
      const subst = (med.virkestoff ?? "").toLowerCase();
      return comboNamePattern.test(name) || subst.includes(" og ");
    };

    for (const m of allItems) {
      const isPimLike = m.source === "PIM" || m.source === "HV";
      if (restrictToPimOnly && !isPimLike) continue;

      // Ensure identifier-only matches work even if a row has missing/empty nameFormStrength/searchText
      const hayText =
        m.searchText ||
        (m.navnFormStyrke ?? m.varenavn ?? "") ||
        (isPimLike ? String(m.farmaloggNumber ?? "") : "");
      if (!hayText) continue;

      // If query looks like an identifier search, match against farmaloggNumber for PIM/HV
      if (isPimLike && idNumberTokens.length > 0) {
        const id = normalizeIdToken(String(m.farmaloggNumber ?? ""));
        const okId = normalizedIdNumberTokens.every((t) => id.startsWith(t) || id === t);
        if (!okId) continue;
      }

      const hay = m.normalizedSearchText;
      const hayTokens = m.hayTokens;
      const nameTokens = m.nameTokens;
      const varenavnTokens = m.varenavnTokens;
      const substanceTokens = m.substanceTokens;

      // Må matche viktige tekst-tokens (typisk preparatnavn + ev. produsent/variant fra pasted tekst).
      if (shortPrefixTextQuery) {
        const okShortText =
          tokenMatches(nameTokens, shortPrefixTextQuery) ||
          tokenMatches(varenavnTokens, shortPrefixTextQuery) ||
          tokenMatches(substanceTokens, shortPrefixTextQuery) ||
          tokenMatches(hayTokens, shortPrefixTextQuery);
        if (!okShortText) continue;
      }

      if (requiredTextTokens.length > 0) {
        const okText = requiredTextTokens.every((t) => {
          if (strictPrefixTextQuery && t === strictPrefixTextQuery) {
            return (
              tokenMatches(nameTokens, t) ||
              tokenMatches(varenavnTokens, t) ||
              tokenMatches(substanceTokens, t) ||
              tokenMatches(hayTokens, t)
            );
          }

          return tokenMatches(hayTokens, t) || hay.includes(t);
        });
        if (!okText) continue;
      }

      // Må også matche relevant styrke hvis den finnes i query.
      if (requiredStrengthTokens.length > 0) {
        const okStrength = requiredStrengthTokens.every((t) => tokenMatches(hayTokens, t));
        if (!okStrength) continue;
      }

      if (!queryIndicatesCombo && !isComboMed(m)) {
        hasNonComboMatch = true;
      }

      // Score = hvor godt den matcher query. Tall teller mer. "required" teksttokens teller ekstra.
      let score = 0;
      const nameNorm = m.normalizedName;
      const varenavnNorm = m.normalizedVarenavn;
      const substanceNorm = m.normalizedSubstance;

      for (const t of tokens) {
        if (isNumberToken(t)) {
          if (nameTokens.includes(t)) score += 4;
          else if (varenavnTokens.includes(t)) score += 3;
          else if (hayTokens.includes(t)) score += 2;
        } else {
          if (tokenMatches(nameTokens, t) || nameNorm.includes(t)) score += 3;
          else if (tokenMatches(varenavnTokens, t) || varenavnNorm.includes(t)) score += 2.5;
          else if (tokenMatches(substanceTokens, t) || substanceNorm.includes(t)) score += 1.5;
          else if (hay.includes(t)) score += 1;
        }
      }

      for (const t of requiredTextTokens) {
        if (tokenMatches(nameTokens, t) || nameNorm.includes(t)) score += 8;
        else if (tokenMatches(varenavnTokens, t) || varenavnNorm.includes(t)) score += 6;
        else if (tokenMatches(substanceTokens, t) || substanceNorm.includes(t)) score += 4;
        else if (tokenMatches(hayTokens, t) || hay.includes(t)) score += 2;
      }

      for (const t of requiredStrengthTokens) {
        if (nameTokens.includes(t)) score += 6;
        else if (varenavnTokens.includes(t)) score += 5;
        else if (hayTokens.includes(t)) score += 3;
      }

      // Favor actual product names over indirect substance-only matches.
      if (
        !isLikelyIdSearch &&
        normalizedQuery &&
        (meaningfulTextTokens.length > 0 || Boolean(shortPrefixTextQuery))
      ) {
        if (nameNorm === normalizedQuery) score += 20;
        else if (nameNorm.startsWith(normalizedQuery)) score += 14;
        else if (varenavnNorm.startsWith(normalizedQuery)) score += 10;
        else if (substanceNorm.startsWith(normalizedQuery)) score += 5;
      }

      // Stronger boost when the first meaningful query token matches the beginning of the product name.
      const firstMeaningfulTextToken = meaningfulTextTokens[0] ?? shortPrefixTextQuery;
      if (!isLikelyIdSearch && firstMeaningfulTextToken) {
        if ((nameTokens[0] ?? "").startsWith(firstMeaningfulTextToken)) score += 10;
        else if ((varenavnTokens[0] ?? "").startsWith(firstMeaningfulTextToken)) score += 7;
        else if ((substanceTokens[0] ?? "").startsWith(firstMeaningfulTextToken)) score += 3;
      }

      // Stronger boost for exact strength matches in the visible product name.
      if (requiredStrengthTokens.length > 0) {
        const allStrengthsInName = requiredStrengthTokens.every((t) => nameTokens.includes(t));
        const allStrengthsInVarenavn = requiredStrengthTokens.every((t) =>
          varenavnTokens.includes(t),
        );

        if (allStrengthsInName) score += 10;
        else if (allStrengthsInVarenavn) score += 8;
      }

      if (exactStrengthPhrase) {
        if (nameNorm.includes(exactStrengthPhrase)) score += 8;
        else if (varenavnNorm.includes(exactStrengthPhrase)) score += 6;
        else if (hay.includes(exactStrengthPhrase)) score += 3;
      }

      if (isPimLike && idNumberTokens.length > 0) {
        const id = normalizeIdToken(String(m.farmaloggNumber ?? ""));
        for (const t of normalizedIdNumberTokens) {
          if (id === t) score += 20;
          else if (id.startsWith(t)) score += 10;
        }
      }

      // Bonus: if the query only contains a single strength number (e.g. "32 mg")
      // and the candidate is a combined strength like "32 mg/12,5 mg", rank it higher.
      // This helps when pasted texts omit the second component strength.
      if (requiredStrengthTokens.length === 1 && numberWithUnit) {
        const t = requiredStrengthTokens[0];
        const unitPattern = "mg|g|mcg|ug|µg|mikrog|mikrogram|ml";
          const combinedStrengthRe = new RegExp(`\\b${t}\\s*(?:${unitPattern})\\s*/`, "i");
          if (combinedStrengthRe.test(m.searchText)) {
            score += 4;
          }
        }

        // Bonus when the candidate contains most of the (normalized) query text.
        // Helps when the user pastes a long product line.
      const qNorm = normalizeForSearch(deferredQuery);
      if (qNorm.length >= 8 && hay.includes(qNorm)) score += 6;

      out.push({ med: m, score });
    }

    // If the user didn't indicate a combination search and we have at least one non-combo match,
    // hide combo products (e.g. "Candesartan/Hydrochlorothiazide") to avoid confusing 2-result dropdowns.
    // IMPORTANT: Don't apply this when the user is doing an identifier-only search (farmaloggNumber),
    // because some products have "/" in the name (e.g. strengths like "80/4,5") and would be wrongly removed.
    if (!restrictToPimOnly && !queryIndicatesCombo && hasNonComboMatch) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (isComboMed(out[i].med)) out.splice(i, 1);
      }
    }

    const collapsedOut = collapseSimilarResults(out);

    // Identifier-only searches: show prefix matches while the user is still typing.
    // Only prefer exact farmaloggNumber matches once the input looks like a *full* id
    // (so short prefixes like "8446" don't immediately collapse to the exact "8446" hit).
    if (restrictToPimOnly && idNumberTokens.length > 0) {
      const qNormDigits = normalizeIdToken(normalizeForSearch(deferredQuery).replace(/\s+/g, ""));
      const looksLikeFullId = /^\d{5,}$/.test(qNormDigits);

      if (looksLikeFullId) {
        const exact = collapsedOut.filter(({ med }) => {
          if (med.source !== "PIM" && med.source !== "HV") return false;
          const id = normalizeIdToken(String(med.farmaloggNumber ?? ""));
          return normalizedIdNumberTokens.some((t) => id === t);
        });

        if (exact.length > 0) {
          return exact
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map((x) => x.med);
        }
      }
    }

    if (restrictToPimOnly && collapsedOut.length === 0) return [];

    collapsedOut.sort((a, b) => b.score - a.score);

    return collapsedOut.slice(0, maxResults).map((x) => x.med);
  }, [deferredQuery, maxResults, allItems]);

  const pickResult = (m: Med) => {
    onPick?.(m);

    // Clear search field after chip is added
    setQuery("");

    setOpen(false);
    setHighlightedIndex(-1);
  };

  // Auto-pick when a VNR search yields exactly one result
  useEffect(() => {
    if (results.length !== 1) return;
    if (!open) return;
    const digits = normalizeForSearch(deferredQuery).replace(/\s+/g, "");
    if (!/^\d{4,}$/.test(digits)) return;
    if (deferredQuery === lastAutoPickedQueryRef.current) return;
    lastAutoPickedQueryRef.current = deferredQuery;
    onPick?.(results[0]);
    setQuery("");
    setOpen(false);
    setHighlightedIndex(-1);
  }, [results, deferredQuery, open, onPick]);

  const normalizedQueryDigits = normalizeForSearch(deferredQuery).replace(/\s+/g, "");
  const noHitsForLikelyIdSearch =
    !isLoadingData &&
    !loadError &&
    open &&
    results.length === 0 &&
    deferredQuery.trim().length >= 2 &&
    /^\d{4,}$/.test(normalizedQueryDigits);

  useEffect(() => {
    setManualName("");
  }, [deferredQuery]);

  useEffect(() => {
    if (!noHitsForLikelyIdSearch) return;
    if (!open) return;

    const queryDigits = getNumericClipboardValue(deferredQuery);
    if (!queryDigits) return;
    if (pendingManualFocusDigitsRef.current !== queryDigits) return;

    const raf = window.requestAnimationFrame(() => {
      manualNameInputRef.current?.focus();
    });

    pendingManualFocusDigitsRef.current = "";
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [noHitsForLikelyIdSearch, open, deferredQuery]);


  useEffect(() => {
    if (!open || results.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    // Default highlight to first item when opening
    setHighlightedIndex((prev) => {
      if (prev >= 0 && prev < results.length) return prev;
      return 0;
    });
  }, [open, results.length]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    if (results.length !== 1) return;

    // Auto-pick for numeric searches when the typed digits are an unambiguous prefix.
    // This keeps the old behavior (auto-pick) for cases like "7424" when only one product matches,
    // while preventing the "8446" problem when longer ids like "84465" also exist.
    const qNorm = normalizeForSearch(q).replace(/\s+/g, "");
    const isNumeric = /^\d{4,}$/.test(qNorm);
    if (!isNumeric) return;

    const only = results[0];
    const id = normalizeIdToken(String(only.farmaloggNumber ?? ""));
    if (!id) return;
    const normalizedQueryId = normalizeIdToken(qNorm);
    if (!(id === normalizedQueryId || id.startsWith(normalizedQueryId))) return;

    const isPimLike = (m: Med) => m.source === "PIM" || m.source === "HV";

    // If ANY other PIM/HV id starts with the same prefix, don't auto-pick (user may be typing a longer id).
    const hasOtherWithSamePrefix = allItems.some((m) => {
      if (!isPimLike(m)) return false;
      const mid = normalizeIdToken(String(m.farmaloggNumber ?? ""));
      if (!mid) return false;
      if (mid === id) return false;
      return mid.startsWith(normalizedQueryId);
    });

    if (hasOtherWithSamePrefix) return;

    pickResult(only);
  }, [query, results, allItems]);

  useEffect(() => {
    if (!autoPasteNumericClipboard) return;
    if (!isInputFocused) return;

    let cancelled = false;
    const safeAttempt = () => {
      if (cancelled) return;
      void maybeAutofillFromClipboard();
    };

    safeAttempt();
    const intervalId = window.setInterval(() => {
      safeAttempt();
    }, 650);

    const onWindowFocus = () => {
      safeAttempt();
    };

    window.addEventListener("focus", onWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [autoPasteNumericClipboard, isInputFocused, maybeAutofillFromClipboard]);

  return (
    <Box>
      <TextField
        ref={anchorRef}
        inputRef={effectiveInputRef}
        fullWidth
        label="Søk etter preparat"
        placeholder={isLoadingData ? "Laster preparatdata..." : "Søk på navn eller varenummer"}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(Boolean(next.trim()) && !isLoadingData && !loadError);
        }}
        onPaste={(e) => {
          const digits = getNumericClipboardValue(e.clipboardData?.getData("text") ?? "");
          pendingManualFocusDigitsRef.current = digits;
        }}
        onFocus={() => {
          setIsInputFocused(true);
          // Clear the field on focus to make it ready for a new search
          if (query) {
            setQuery("");
            queryRef.current = "";
          }
          setOpen(false);
          // Allow same clipboard digits to auto-fill again after re-focusing the field.
          lastObservedClipboardDigitsRef.current = "";
          // New user action: retry clipboard-read even if previous attempt was blocked.
          clipboardReadBlockedRef.current = false;
          void maybeAutofillFromClipboard({ force: true });
        }}
        onBlur={() => {
          setIsInputFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setHighlightedIndex(-1);
            return;
          }

          if (e.key === "ArrowDown") {
            if (results.length <= 1) return;
            e.preventDefault();
            setOpen(true);
            setHighlightedIndex((prev) => {
              const next = prev < 0 ? 0 : Math.min(prev + 1, results.length - 1);
              return next;
            });
            return;
          }

          if (e.key === "ArrowUp") {
            if (results.length <= 1) return;
            e.preventDefault();
            setOpen(true);
            setHighlightedIndex((prev) => {
              const next = prev < 0 ? results.length - 1 : Math.max(prev - 1, 0);
              return next;
            });
            return;
          }

          if (e.key === "Enter") {
            if (open && results.length > 0) {
              const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
              const m = results[idx] ?? results[0];
              if (m) {
                e.preventDefault();
                pickResult(m);
              }
            }
          }
        }}
        InputProps={{}}
      />

      {loadError && (
        <Typography variant="body2" color="error" sx={{ mt: 0.5, display: "block" }}>
          Klarte ikke å laste preparatdata. Prøv å laste siden på nytt.
        </Typography>
      )}

      {isLoadingData && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Laster preparatdata...
        </Typography>
      )}

      {!isLoadingData && !loadError && open && results.length === 0 && deferredQuery.trim().length >= 2 && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: "block" }}>
            <strong>Ingen treff.</strong>{" "}
            Mangler preparatet?{" "}
            <Link href={SPREADSHEET_EDIT_URL} target="_blank" rel="noopener noreferrer">
              Legg det til i regnearket
            </Link>
            .
          </Typography>

          {noHitsForLikelyIdSearch && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1, maxWidth: 520 }}>
              <TextField
                size="small"
                fullWidth
                inputRef={manualNameInputRef}
                label="Manuelt preparatnavn"
                placeholder="Skriv preparatnavn for å overstyre PREPARAT1"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const name = manualName.trim();
                  if (!name) return;
                  e.preventDefault();
                  onManualPick?.({ name, query: deferredQuery.trim() });
                  setManualName("");
                  setQuery("");
                  setOpen(false);
                  setHighlightedIndex(-1);
                }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  const name = manualName.trim();
                  if (!name) return;
                  onManualPick?.({ name, query: deferredQuery.trim() });
                  setManualName("");
                  setQuery("");
                  setOpen(false);
                  setHighlightedIndex(-1);
                }}
                disabled={!manualName.trim()}
                sx={{ whiteSpace: "nowrap" }}
              >
                Bruk navn
              </Button>
            </Stack>
          )}
        </Box>
      )}

      <Popper
        open={!isLoadingData && !loadError && open && results.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        modifiers={[
          { name: "offset", options: { offset: [0, 8] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
      >
        <ClickAwayListener
          onClickAway={() => {
            setOpen(false);
            setHighlightedIndex(-1);
          }}
        >
          <Paper
            elevation={6}
            sx={{
              width: anchorRef.current?.clientWidth ?? 420,
              maxWidth: 520,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
              {results.map((m, index) => (
                <ListItemButton
                  key={m.id}
                  onClick={() => pickResult(m)}
                  selected={index === highlightedIndex}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  sx={(theme) => {
                    const color = accentColor ?? theme.palette.primary.main;
                    return {
                      "&.Mui-selected": {
                        bgcolor: alpha(color, 0.13),
                        "&:hover": { bgcolor: alpha(color, 0.18) },
                      },
                      "&:hover": { bgcolor: alpha(color, 0.07) },
                    };
                  }}
                >
                  {(() => {
                    const secondaryParts = [
                      `Virkestoff: ${m.virkestoff?.trim() || "-"}`,
                      `ATC: ${m.atc?.trim() || "-"}`,
                      `Produsent: ${m.produsent?.trim() || "-"}`,
                      `Reseptgruppe: ${m.reseptgruppe?.trim() || "-"}`,
                    ];

                    return (
                      <ListItemText
                        primary={`${formatPreparatForTemplate(m) || getMedicationDisplayName(m)}${
                          m.farmaloggNumber ? ` (${m.farmaloggNumber})` : ""
                        }`}
                        secondary={secondaryParts.join(" • ")}
                      />
                    );
                  })()}
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
