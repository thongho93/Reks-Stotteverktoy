import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { MK } from "./melkeTheme";
import {
  HIT_BG,
  SUGGESTION_EXAMPLES,
  SUGGESTION_GROUPS,
  findRanges,
  parseTokens,
  type ProductMatch,
  type SearchMode,
  type SearchProductInfo,
} from "./melkeSearchCore";

// ─── Brukergrensesnitt for søk i Melkeerstatning ─────────────────────────────

const SEARCH = {
  ink: MK.text,
  sub: MK.sub,
  muted: MK.muted,
  accent: MK.accent,
  accentBg: MK.accentBg,
  line: MK.border,
  lineSoft: MK.lineSoft,
  border: MK.borderMed,
  soft: MK.soft,
  pill: MK.pill,
  pillText: MK.pillText,
  hit: MK.hit,
  hitNow: MK.hitNow,
} as const;

/** Tekst med treffene uthevet. Hver utheving har `data-hit`, slik at de kan navigeres. */
export function Hl({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const ranges = findRanges(text, terms);
  if (ranges.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  ranges.forEach(([start, end], i) => {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={i} data-hit="true" style={{ background: HIT_BG, color: MK.hitText, borderRadius: 3, padding: "0 2px" }}>
        {text.slice(start, end)}
      </mark>
    );
    last = end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

type SearchHeaderProps = {
  tokens: string[];
  pending: string;
  mode: SearchMode;
  inputRef: RefObject<HTMLInputElement | null>;
  onPendingChange: (value: string) => void;
  onCommit: () => void;
  onRemoveToken: (index: number) => void;
  onBackspaceEmpty: () => void;
  onClear: () => void;
  onClose: () => void;
  onModeChange: (mode: SearchMode) => void;
  onBack?: () => void;
  hint?: string;
};

export function SearchHeader({
  tokens, pending, mode, inputRef, onPendingChange, onCommit, onRemoveToken, onBackspaceEmpty, onClear, onClose, onModeChange, onBack, hint,
}: SearchHeaderProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    } else if (event.key === "Backspace" && pending === "") {
      onBackspaceEmpty();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };
  const hasContent = tokens.length > 0 || pending !== "";

  return (
    <Box sx={{ px: 2.5, py: 1.75, bgcolor: SEARCH.soft, borderBottom: `1px solid ${SEARCH.lineSoft}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
      {onBack ? (
        <ButtonBase
          onClick={onBack}
          sx={{ gap: 0.5, minHeight: 40, px: 1.5, borderRadius: "10px", border: `1px solid ${SEARCH.border}`, bgcolor: MK.surface, fontSize: 13.5, fontWeight: 600, color: SEARCH.sub, "&:hover": { bgcolor: SEARCH.pill, borderColor: SEARCH.accent } }}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: 18, color: SEARCH.accent }} />
          Tilbake til resultater
        </ButtonBase>
      ) : null}
      <Box
        sx={{
          flex: "1 1 320px", minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1,
          minHeight: onBack ? 44 : 54, px: 1.75, py: 0.75, bgcolor: MK.surface, borderRadius: "12px",
          border: `${onBack ? 1.5 : 2}px solid ${onBack ? MK.borderAccent : SEARCH.accent}`,
          boxShadow: onBack ? "none" : `0 6px 24px ${MK.shadowAccent}`,
          "&:focus-within": { borderColor: SEARCH.accent },
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 22, color: SEARCH.accent }} />
        {tokens.map((token, i) => (
          <Box key={`${token}-${i}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, height: 32, pl: 1.5, pr: 0.5, borderRadius: "8px", bgcolor: SEARCH.pill, color: SEARCH.pillText, fontSize: 14.5, fontWeight: 700 }}>
            {token}
            <ButtonBase aria-label={`Fjern ${token}`} onClick={() => onRemoveToken(i)} sx={{ width: 22, height: 22, borderRadius: "6px", "&:hover": { bgcolor: MK.pillBorder } }}>
              <CloseRoundedIcon sx={{ fontSize: 14 }} />
            </ButtonBase>
          </Box>
        ))}
        <InputBase
          autoFocus
          inputRef={inputRef}
          value={pending}
          onChange={(event) => onPendingChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tokens.length > 0 ? "legg til ord …" : "Søk i melkeerstatning – ett eller flere ord, f.eks. laktosefri sonde"}
          inputProps={{ "aria-label": "Søk i melkeerstatning" }}
          sx={{ flex: 1, minWidth: 120, fontSize: 16, color: SEARCH.ink, "& input::placeholder": { color: SEARCH.muted, opacity: 1 } }}
        />
        <ButtonBase
          aria-label={hasContent ? "Tøm søket" : "Lukk søket"}
          onClick={hasContent ? onClear : onClose}
          sx={{ width: 32, height: 32, borderRadius: "8px", color: SEARCH.muted, "&:hover": { bgcolor: SEARCH.pill } }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </ButtonBase>
        <Box role="group" aria-label="Søkemåte" sx={{ display: "flex", p: "3px", gap: "2px", bgcolor: MK.alt, border: `1px solid ${SEARCH.border}`, borderRadius: "10px" }}>
          {([["all", "Alle ord"], ["any", "Minst ett"]] as const).map(([value, label]) => (
            <ButtonBase
              key={value}
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              sx={{ px: 1.5, minHeight: 30, borderRadius: "7px", fontSize: 13, fontWeight: 600, color: mode === value ? MK.onAccent : SEARCH.sub, bgcolor: mode === value ? SEARCH.accentBg : "transparent" }}
            >
              {label}
            </ButtonBase>
          ))}
        </Box>
      </Box>
      {hint ? <Typography sx={{ flexBasis: "100%", pl: 0.5, fontSize: 13, color: SEARCH.muted }}>{hint}</Typography> : null}
    </Box>
  );
}

const groupLabelSx = { fontSize: 12.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SEARCH.muted } as const;

/** Forslag – vises bare ord som faktisk gir treff i minst ett produkt. */
export function SuggestionsPanel({ hasHit, onPick }: { hasHit: (term: string) => boolean; onPick: (tokens: string[]) => void }) {
  const examples = SUGGESTION_EXAMPLES.filter((example) => parseTokens(example).every(hasHit));
  const groups = SUGGESTION_GROUPS.map((group) => ({ ...group, words: group.words.filter((w) => hasHit(w)) })).filter((g) => g.words.length > 0);
  const chipSx = {
    px: 1.5, minHeight: 34, borderRadius: "8px", border: `1px solid ${SEARCH.border}`, bgcolor: MK.surface, fontSize: 13.5, fontWeight: 600, color: SEARCH.sub,
    "&:hover": { bgcolor: SEARCH.pill, borderColor: MK.hoverBorder },
  } as const;
  return (
    <Box sx={{ p: 2.5, display: "grid", gap: 2.25, alignContent: "start" }}>
      {examples.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography sx={{ ...groupLabelSx, mr: 0.5 }}>Prøv</Typography>
          {examples.map((example) => (
            <ButtonBase key={example} onClick={() => onPick(parseTokens(example))} sx={{ px: 1.5, minHeight: 36, borderRadius: "8px", bgcolor: SEARCH.pill, color: SEARCH.pillText, fontSize: 14, fontWeight: 600, "&:hover": { bgcolor: MK.pillHover } }}>
              {example}
            </ButtonBase>
          ))}
        </Box>
      ) : null}
      <Box sx={{ height: "1px", bgcolor: SEARCH.lineSoft }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", columnGap: 2, rowGap: 1.5, alignItems: "start" }}>
        {groups.map((group) => (
          <Box key={group.label} sx={{ display: "contents" }}>
            <Typography sx={{ ...groupLabelSx, pt: 1 }}>{group.label}</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {group.words.map((word) => (
                <ButtonBase key={word} onClick={() => onPick([word])} sx={chipSx}>
                  {word}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 0.75, pt: 1.5, borderTop: `1px solid ${SEARCH.lineSoft}`, fontSize: 13, color: SEARCH.muted }}>
        {[
          { keys: ["Enter", "Space"], text: "legger til ordet" },
          { keys: ["Backspace"], text: "fjerner siste ord" },
          { keys: ["Esc"], text: "lukker" },
        ].map((item) => (
          <Box key={item.text} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            {item.keys.map((key, i) => (
              <Box key={key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                {i > 0 ? <span>eller</span> : null}
                <Box component="kbd" sx={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, px: "7px", py: "2px", borderRadius: "6px", border: `1px solid ${SEARCH.border}`, bgcolor: MK.alt, color: SEARCH.sub }}>{key}</Box>
              </Box>
            ))}
            {item.text}
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        <span>Forslagene viser bare ord som finnes i produktene</span>
      </Box>
    </Box>
  );
}

type ResultsProps = {
  matches: ProductMatch[];
  info: Record<string, SearchProductInfo>;
  terms: string[];
  mode: SearchMode;
  onOpen: (id: string) => void;
};

function ProductThumb({ info, size }: { info: SearchProductInfo; size: "lg" | "sm" }) {
  const w = size === "lg" ? 72 : 52;
  const h = size === "lg" ? 88 : 60;
  return (
    <Box sx={{ flex: `0 0 ${w}px`, height: h, borderRadius: size === "lg" ? "12px" : "10px", bgcolor: MK.tile, display: "grid", placeItems: "center" }}>
      {info.image ? <Box component="img" src={info.image} alt="" sx={{ width: w - 16, height: h - 18, objectFit: "contain" }} /> : null}
    </Box>
  );
}

export function SearchResults({ matches, info, terms, mode, onOpen }: ResultsProps) {
  const full = matches.filter((m) => m.missing.length === 0);
  const partial = matches.filter((m) => m.missing.length > 0);
  const shownPartial = mode === "all" ? partial : [];
  const openButton = (id: string) => (
    <ButtonBase
      onClick={() => onOpen(id)}
      sx={{ gap: 0.5, minHeight: 40, px: 1.75, borderRadius: "10px", border: `1px solid ${SEARCH.border}`, bgcolor: MK.surface, fontSize: 14, fontWeight: 700, color: SEARCH.accent, whiteSpace: "nowrap", "&:hover": { bgcolor: SEARCH.pill, borderColor: SEARCH.accent } }}
    >
      Åpne <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
    </ButtonBase>
  );

  if (matches.length === 0) {
    return (
      <Box sx={{ p: 3, display: "grid", gap: 0.5 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: SEARCH.ink }}>Ingen produkter matcher</Typography>
        <Typography sx={{ fontSize: 14.5, color: SEARCH.muted }}>Prøv færre eller andre ord, eller fjern et av ordene over.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5, display: "grid", gap: 1.75, alignContent: "start" }}>
      <Typography sx={{ fontSize: 15, color: SEARCH.sub }}>
        <Box component="b" sx={{ color: SEARCH.accent }}>
          {mode === "all" ? `${full.length} av ${Object.keys(info).length} produkter` : `${matches.length} av ${Object.keys(info).length} produkter`}
        </Box>
        {mode === "all" ? ` treffer alle ordene${shownPartial.length > 0 ? ` · ${shownPartial.length} treffer delvis` : ""}` : " treffer minst ett ord"}
      </Typography>

      {(mode === "all" ? full : matches).length > 0 ? <Typography sx={groupLabelSx}>{mode === "all" ? "Treffer alle ordene" : "Treff"}</Typography> : null}
      {(mode === "all" ? full : matches).map((match) => {
        const product = info[match.id];
        if (!product) return null;
        return (
          <Box key={match.id} sx={{ display: "flex", gap: 2.25, p: 2, alignItems: "flex-start", bgcolor: MK.surface, border: `1px solid ${SEARCH.line}`, borderRadius: "14px", "&:hover": { borderColor: MK.hoverBorder, boxShadow: `0 8px 20px ${MK.shadowSoft}` } }}>
            <ProductThumb info={product} size="lg" />
            <Box sx={{ flex: 1, minWidth: 0, display: "grid", gap: 1.25 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
                <Typography sx={{ fontSize: 19, fontWeight: 800, color: SEARCH.ink }}>{product.name}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: SEARCH.muted }}>{product.meta}</Typography>
                {mode === "all" && terms.length > 1 ? (
                  <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: "6px", bgcolor: MK.okBg, color: MK.ok, fontSize: 12.5, fontWeight: 700 }}>
                    Treffer alle {terms.length} ord
                  </Box>
                ) : null}
                {mode === "any" && match.missing.length > 0 ? (
                  <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: "6px", bgcolor: MK.hover, color: SEARCH.muted, fontSize: 12.5, fontWeight: 700 }}>
                    {match.matched.length} av {terms.length} ord
                  </Box>
                ) : null}
              </Box>
              {match.snippets.map((snippet) => (
                <Box key={snippet.term} sx={{ display: "flex", gap: 1.5 }}>
                  <Typography sx={{ flex: "0 0 118px", pt: "2px", fontSize: 12.5, fontWeight: 600, color: SEARCH.muted }}>{snippet.label}</Typography>
                  <Typography sx={{ fontSize: 14.5, lineHeight: 1.5, color: SEARCH.ink }}>
                    <Hl text={snippet.text} terms={terms} />
                  </Typography>
                </Box>
              ))}
              {match.snippets.some((s) => s.negated) ? (
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, alignSelf: "flex-start", px: 1.25, py: 0.6, borderRadius: "8px", bgcolor: MK.warnBg2, color: MK.warnText, fontSize: 13, fontWeight: 600 }}>
                  <WarningAmberRoundedIcon sx={{ fontSize: 17 }} />
                  Treffet står sammen med «ikke» – les teksten
                </Box>
              ) : null}
            </Box>
            {openButton(match.id)}
          </Box>
        );
      })}

      {shownPartial.length > 0 ? (
        <Typography sx={{ ...groupLabelSx, mt: 1 }}>
          Treffer delvis – mangler {Array.from(new Set(shownPartial.flatMap((m) => m.missing))).map((t) => `«${t}»`).join(", ")}
        </Typography>
      ) : null}
      {shownPartial.map((match) => {
        const product = info[match.id];
        if (!product) return null;
        return (
          <Box key={match.id} sx={{ display: "flex", gap: 2, px: 2, py: 1.5, alignItems: "center", bgcolor: SEARCH.soft, border: `1px solid ${SEARCH.line}`, borderRadius: "14px", "&:hover": { borderColor: MK.hoverBorder } }}>
            <ProductThumb info={product} size="sm" />
            <Box sx={{ flex: 1, minWidth: 0, display: "grid", gap: 0.75 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
                <Typography sx={{ fontSize: 16.5, fontWeight: 800, color: SEARCH.ink }}>{product.name}</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: SEARCH.muted }}>{product.meta}</Typography>
                {match.matched.map((t) => (
                  <Box key={t} component="span" sx={{ px: 1, py: 0.25, borderRadius: "6px", bgcolor: MK.okBg, color: MK.ok, fontSize: 12.5, fontWeight: 700 }}>✓ {t}</Box>
                ))}
                {match.missing.map((t) => (
                  <Box key={t} component="span" sx={{ px: 1, py: 0.25, borderRadius: "6px", bgcolor: MK.hover, color: SEARCH.muted, fontSize: 12.5, fontWeight: 700, textDecoration: "line-through" }}>{t}</Box>
                ))}
              </Box>
              {match.snippets[0] ? (
                <Typography sx={{ fontSize: 14, lineHeight: 1.45, color: SEARCH.sub }}>
                  <Hl text={match.snippets[0].text} terms={terms} />
                </Typography>
              ) : null}
            </Box>
            {openButton(match.id)}
          </Box>
        );
      })}
    </Box>
  );
}

type BannerProps = {
  productName: string;
  total: number;
  termCounts: { term: string; count: number }[];
  position: number;
  onPrev: () => void;
  onNext: () => void;
};

export function MatchBanner({ productName, total, termCounts, position, onPrev, onNext }: BannerProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.75, px: 2.5, py: 1.1, bgcolor: MK.warnBg, borderBottom: `1px solid ${MK.warnBorder}`, fontSize: 14, flexShrink: 0 }}>
      <Box component="span" sx={{ fontWeight: 700 }}>{total === 1 ? "1 treff" : `${total} treff`} i {productName}</Box>
      <Box component="span" sx={{ color: SEARCH.sub }}>
        {termCounts.map((t, i) => (
          <span key={t.term}>
            {i > 0 ? " · " : ""}
            <mark style={{ background: HIT_BG, color: MK.hitText, borderRadius: 3, padding: "0 3px" }}>{t.term}</mark> {t.count}
          </span>
        ))}
      </Box>
      <Box sx={{ flex: 1 }} />
      {total > 0 ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: SEARCH.sub }}>
          <Box component="span" sx={{ fontWeight: 600 }}>Treff {Math.min(position, total)} av {total}</Box>
          {[{ label: "Forrige treff", action: onPrev, icon: <KeyboardArrowUpRoundedIcon sx={{ fontSize: 20 }} /> }, { label: "Neste treff", action: onNext, icon: <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20 }} /> }].map((b) => (
            <ButtonBase key={b.label} aria-label={b.label} onClick={b.action} sx={{ width: 32, height: 30, borderRadius: "8px", border: `1px solid ${SEARCH.border}`, bgcolor: MK.surface, "&:hover": { bgcolor: SEARCH.pill, borderColor: SEARCH.accent } }}>
              {b.icon}
            </ButtonBase>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

/** Liten, dempet knapp som åpner søket. */
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="Søk i melkeerstatning"
      sx={{
        gap: 1, height: 40, px: 1.75, flexShrink: 0, borderRadius: "10px", border: `1px dashed ${MK.borderStrong}`, color: SEARCH.muted, fontSize: 14, fontWeight: 600,
        "&:hover": { borderStyle: "solid", borderColor: SEARCH.accent, color: SEARCH.accent, bgcolor: MK.surface },
      }}
    >
      <SearchRoundedIcon sx={{ fontSize: 20 }} />
      Søk
      <Box component="kbd" sx={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, px: 0.75, py: "1px", borderRadius: "6px", border: `1px solid ${MK.borderStrong}`, bgcolor: MK.alt }}>Space</Box>
    </ButtonBase>
  );
}
