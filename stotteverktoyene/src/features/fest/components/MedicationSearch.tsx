import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ClickAwayListener,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
} from "@mui/material";

import meds from "../meds.json";
import hvProducts from "./hvProducts.json";

type Med = {
  id: string;
  varenavn: string | null;
  navnFormStyrke: string | null;
  atc: string | null;
  virkestoff: string | null;
  produsent: string | null;
  reseptgruppe: string | null;
  // Only set for HV products
  farmaloggNumber?: string | null;
};


type HvProduct = {
  farmaloggNumber: string;
  name: string;
};

const cleanHvProductName = (name: string) =>
  name
    .replace(/[\s\u00A0]+/g, " ") // collapse whitespace
    .trim()
    // remove specific trailing multipack patterns we want to hide, e.g. "... 4x200" / "... 4x120"
    .replace(/\s+(?:4x200|4x120)\s*$/i, "")
    // remove trailing integer token (typically pack size), e.g. "... 60x90 50" -> "... 60x90"
    // only when it's 2+ digits to avoid chopping dimension-style names
    .replace(/\s+\d{2,}\s*$/g, "")
    .trim();

type Props = {
  maxResults?: number;
  onPick?: (med: Med) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
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

const tokenMatches = (hayTokens: string[], needleRaw: string) => {
  const needle = needleRaw.replace(",", ".");

  if (isNumberToken(needle)) {
    // numbers (including decimals) must match exactly
    return hayTokens.includes(needle);
  }

  // text tokens can match as prefix of any token (so "xirom" matches "xiromed")
  return hayTokens.some((ht) => ht.startsWith(needle));
};

export default function MedicationSearch({ maxResults = 25, onPick, inputRef }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;

  const allItems: Med[] = useMemo(() => {
    const fest = (meds as Med[]) ?? [];

    const hv = ((hvProducts as unknown) as HvProduct[] | undefined) ?? [];
    const hvAsMeds: Med[] = hv
      .filter((p) => p && p.name)
      .map((p) => {
        const originalName = String(p.name);
        const cleanedName = cleanHvProductName(originalName);

        return {
          id: `hv:${p.farmaloggNumber}`,
          farmaloggNumber: String(p.farmaloggNumber),
          // Keep original for matching pasted queries (may include pack size)
          varenavn: originalName,
          // Use cleaned for display + chips
          navnFormStyrke: cleanedName || originalName,
          atc: null,
          virkestoff: null,
          produsent: null,
          reseptgruppe: null,
        };
      });

    return [...fest, ...hvAsMeds];
  }, []);

  const results = useMemo(() => {
    const tokens = toTokens(query);
    if (tokens.length === 0) return [];

    // number + unit pair like "75 mg" or "1.25 ml"
    const unitSet = new Set(["mg", "g", "mcg", "ug", "µg", "mikrog", "mikrogram", "ml", "dose", "t", "time"]);

    // Split into meaningful text vs number tokens
    const textTokens = tokens.filter((t) => !isNumberToken(t) && !unitSet.has(t));

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
      .filter((t) => t.length >= 5);

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
        if (isNumberToken(a) && unitSet.has(b)) return a;
      }
      return null;
    })();
    const isLikelyIdSearch = idNumberTokens.length > 0 && meaningfulTextTokens.length === 0 && !numberWithUnit;
    const restrictToHvOnly = isLikelyIdSearch;

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

    const out: { med: Med; score: number }[] = [];

    const rawQueryLower = query.toLowerCase();
    const queryIndicatesCombo = rawQueryLower.includes("/") || rawQueryLower.includes(" og ");
    let hasNonComboMatch = false;

    const isComboMed = (med: Med) => {
      const isHv = med.id.startsWith("hv:");
      const name = (isHv ? (med.varenavn ?? "") : (med.navnFormStyrke ?? med.varenavn ?? "")).toLowerCase();
      const subst = (med.virkestoff ?? "").toLowerCase();
      return name.includes("/") || subst.includes(" og ");
    };

    for (const m of allItems) {
      const isHv = m.id.startsWith("hv:");
      if (restrictToHvOnly && !isHv) continue;

      const hayText = isHv ? (m.varenavn ?? "") : (m.navnFormStyrke ?? m.varenavn ?? "");
      if (!hayText) continue;
      if (isHv && idNumberTokens.length > 0) {
        const id = String(m.farmaloggNumber ?? m.id.replace(/^hv:/, ""));
        const okId = idNumberTokens.every((t) => id.startsWith(t) || id === t);
        if (!okId) continue;
      }

      const hay = normalizeForSearch(hayText);
      const hayTokens = toTokens(hayText);

      // Må matche viktige tekst-tokens (typisk preparatnavn + ev. produsent/variant fra pasted tekst).
      if (requiredTextTokens.length > 0) {
        const okText = requiredTextTokens.every(
          (t) => tokenMatches(hayTokens, t) || hay.includes(t)
        );
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

      for (const t of tokens) {
        if (isNumberToken(t)) {
          if (hayTokens.includes(t)) score += 2;
        } else {
          if (hay.includes(t)) score += 1;
        }
      }

      for (const t of requiredTextTokens) {
        if (tokenMatches(hayTokens, t) || hay.includes(t)) score += 3;
      }

      for (const t of requiredStrengthTokens) {
        if (hayTokens.includes(t)) score += 3;
      }

      if (isHv && idNumberTokens.length > 0) {
        const id = String(m.farmaloggNumber ?? m.id.replace(/^hv:/, ""));
        for (const t of idNumberTokens) {
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
        if (combinedStrengthRe.test(hayText)) {
          score += 4;
        }
      }

      // Bonus when the candidate contains most of the (normalized) query text.
      // Helps when the user pastes a long product line.
      const qNorm = normalizeForSearch(query);
      if (qNorm.length >= 8 && hay.includes(qNorm)) score += 6;

      out.push({ med: m, score });
    }

    // If the user didn't indicate a combination search and we have at least one non-combo match,
    // hide combo products (e.g. "Candesartan/Hydrochlorothiazide") to avoid confusing 2-result dropdowns.
    if (!queryIndicatesCombo && hasNonComboMatch) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (isComboMed(out[i].med)) out.splice(i, 1);
      }
    }

    if (restrictToHvOnly && out.length === 0) return [];

    out.sort((a, b) => b.score - a.score);

    return out.slice(0, maxResults).map((x) => x.med);
  }, [query, maxResults, allItems]);

  const pickResult = (m: Med) => {
    onPick?.(m);

    // Clear search field after chip is added
    setQuery("");

    setOpen(false);
    setHighlightedIndex(-1);
  };

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
    if (!query.trim()) return;
    if (results.length !== 1) return;

    pickResult(results[0]);
  }, [query, results]);

  return (
    <Box>
      <TextField
        ref={anchorRef}
        inputRef={effectiveInputRef}
        fullWidth
        label="Søk etter preparat"
        placeholder="Søk på navn, f.eks. 'Arcoxia'"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(Boolean(next.trim()));
        }}
        onFocus={() => {
          // Clear the field on focus to make it ready for a new search
          if (query) {
            setQuery("");
          }
          setOpen(false);
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
            if (open && results.length > 1) {
              const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
              const m = results[idx];
              if (m) {
                e.preventDefault();
                pickResult(m);
              }
            }
          }
        }}
        InputProps={{}}
      />

      <Popper
        open={open && results.length > 1}
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
                >
                  {(() => {
                    const secondaryParts = [
                      m.virkestoff ? `Virkestoff: ${m.virkestoff}` : null,
                      m.atc ? `ATC: ${m.atc}` : null,
                      m.reseptgruppe ? `Reseptgruppe: ${m.reseptgruppe}` : null,
                    ].filter(Boolean) as string[];

                    return (
                      <ListItemText
                        primary={m.navnFormStyrke ?? m.varenavn ?? "(uten navn)"}
                        secondary={secondaryParts.length ? secondaryParts.join(" • ") : undefined}
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
