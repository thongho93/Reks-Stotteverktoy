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

type Med = {
  id: string;
  varenavn: string | null;
  navnFormStyrke: string | null;
  atc: string | null;
  virkestoff: string | null;
  produsent: string | null;
  reseptgruppe: string | null;
};

type Props = {
  maxResults?: number;
  onPick?: (med: Med) => void;
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
    // keep decimals together: "0,4" -> "0.4"
    .replace(/(\d),(\d)/g, "$1.$2")
    // Split digit/letter boundaries so "30mg" becomes "30 mg"
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    // Treat common punctuation as spaces (keep dot since we use it for decimals)
    .replace(/[\u00B5µ,;:()\[\]{}\/\\|+\-_*"'!?]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
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

export default function MedicationSearch({ maxResults = 25, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const anchorRef = useRef<HTMLDivElement | null>(null);

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

    // Require up to 2 meaningful tokens (typically substance + brand/manufacturer),
    // but if we only have one, require that.
    const requiredTextTokens = meaningfulTextTokens.slice(0, Math.min(2, meaningfulTextTokens.length));

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

      // Case 4: single integer (e.g. "40")
      if (uniq.length === 1) return [uniq[0]];

      return [];
    })();

    const out: { med: Med; score: number }[] = [];

    const rawQueryLower = query.toLowerCase();
    const queryIndicatesCombo = rawQueryLower.includes("/") || rawQueryLower.includes(" og ");
    let hasNonComboMatch = false;

    const isComboMed = (med: Med) => {
      const name = (med.navnFormStyrke ?? med.varenavn ?? "").toLowerCase();
      const subst = (med.virkestoff ?? "").toLowerCase();
      return name.includes("/") || subst.includes(" og ");
    };

    for (const m of meds as Med[]) {
      const hayText = m.navnFormStyrke ?? m.varenavn ?? "";
      if (!hayText) continue;

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

    out.sort((a, b) => b.score - a.score);

    return out.slice(0, maxResults).map((x) => x.med);
  }, [query, maxResults]);

  const pickResult = (m: Med) => {
    const label = (m.navnFormStyrke ?? m.varenavn ?? "").trim();
    if (label) setQuery(label);
    onPick?.(m);
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
    // Auto-pick when the query yields exactly one result.
    // This avoids forcing the user to click/press Enter when the match is unambiguous.
    if (!query.trim()) return;
    if (results.length !== 1) return;

    const m = results[0];
    const label = (m.navnFormStyrke ?? m.varenavn ?? "").trim();

    // Prevent loops: if we've already set the input to the picked label, just close.
    if (label && query.trim() === label) {
      setOpen(false);
      return;
    }

    pickResult(m);
  }, [query, results]);

  return (
    <Box>
      <TextField
        ref={anchorRef}
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
                  <ListItemText
                    primary={m.navnFormStyrke ?? m.varenavn ?? "(uten navn)"}
                    secondary={[
                      m.virkestoff ? `Virkestoff: ${m.virkestoff}` : null,
                      m.atc ? `ATC: ${m.atc}` : null,
                      m.reseptgruppe ? `Reseptgruppe: ${m.reseptgruppe}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
