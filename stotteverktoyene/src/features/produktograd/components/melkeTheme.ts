/**
 * Farger for Melkeerstatning som CSS-variabler. Verdiene byttes mellom lys og mørk modus,
 * slik at komponentene bare refererer til `MK.*` og ikke trenger å vite hvilken modus som er aktiv.
 *
 * Mørke verdier er valgt for WCAG 2.1 AA: tekst mot bakgrunn minst 4,5:1 (de fleste >7:1),
 * ikoner og kantlinjer rundt knapper minst 3:1.
 */
const LIGHT = {
  bg: "#FBF4F8",
  surface: "#FFFFFF",
  alt: "#FBF4F8",
  soft: "#FFFAFD",
  sel: "#FFF5FA",
  hover: "#F6E6EF",
  tile: "#F6EEF7",
  thumbBg: "transparent",
  border: "#EAD2E1",
  borderMed: "#E3C6D8",
  borderStrong: "#D9BCCD",
  borderAccent: "#D79BBB",
  hoverBorder: "#C9709F",
  lineSoft: "#F0DCE8",
  text: "#2D1727",
  sub: "#4A3342",
  muted: "#6B5262",
  accent: "#A81F66",
  accentBg: "#A81F66",
  onAccent: "#FFFFFF",
  pill: "#FCE7F2",
  pillText: "#8C1A59",
  pillBorder: "#F2CFE3",
  pillHover: "#F8D4E8",
  ok: "#1B6B3A",
  okBg: "#E6F4EA",
  warnBg: "#FFF8D6",
  warnBg2: "#FFF6DB",
  warnBorder: "#F1E3A0",
  warnText: "#7A5200",
  shadow: "rgba(94,21,71,0.18)",
  shadowSoft: "rgba(94,21,71,0.10)",
  shadowAccent: "rgba(168,31,102,0.12)",
  hit: "#FFEFA8",
  hitNow: "#FFD84D",
  hitRing: "#A81F66",
  hitText: "#1A1200",
  macro1: "#7C3AED",
  macro2: "#F97316",
  macro3: "#3B82F6",
  macro4: "#22C55E",
} as const;

type Tokens = { [K in keyof typeof LIGHT]: string };

const DARK: Tokens = {
  bg: "#0B1119",
  surface: "#0E1521",
  alt: "#151E2D",
  soft: "#111A28",
  sel: "#2B1A2A",
  hover: "#1C2738",
  tile: "#E9E3EE",
  thumbBg: "#F3EEF6",
  border: "#2F3A4E",
  borderMed: "#56657F",
  borderStrong: "#56657F",
  borderAccent: "#B0608A",
  hoverBorder: "#E08AB6",
  lineSoft: "#263145",
  text: "#EDF3FC",
  sub: "#C9D3E4",
  muted: "#A5B1C6",
  accent: "#F2A0C6",
  accentBg: "#B83A82",
  onAccent: "#FFFFFF",
  pill: "#3A1E32",
  pillText: "#F6BFD9",
  pillBorder: "#5A3350",
  pillHover: "#4A2640",
  ok: "#5FD18F",
  okBg: "#12301F",
  warnBg: "#3A2E10",
  warnBg2: "#33290E",
  warnBorder: "#6B5518",
  warnText: "#FFD98A",
  shadow: "rgba(0,0,0,0.55)",
  shadowSoft: "rgba(0,0,0,0.4)",
  shadowAccent: "rgba(242,160,198,0.18)",
  hit: "#FFE680",
  hitNow: "#FFD84D",
  hitRing: "#F2A0C6",
  hitText: "#1A1200",
  macro1: "#A78BFA",
  macro2: "#FB923C",
  macro3: "#60A5FA",
  macro4: "#4ADE80",
};

const cssName = (key: string) => `--mk-${key.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`)}`;

/** `MK.text` → `var(--mk-text)` */
export const MK = Object.fromEntries(Object.keys(LIGHT).map((key) => [key, `var(${cssName(key)})`])) as Tokens;

function toVars(tokens: Tokens): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => [cssName(key), value]));
}

export const MK_LIGHT_VARS = toVars(LIGHT);
export const MK_DARK_VARS = toVars(DARK);

const MACRO_MAP: Record<string, string> = {
  "#7C3AED": MK.macro1,
  "#F97316": MK.macro2,
  "#3B82F6": MK.macro3,
  "#22C55E": MK.macro4,
};

/** Diagramfargene i produktdataene er lyse-modus-farger; her byttes de til mørk-modus-varianter. */
export const macroColor = (hex: string) => MACRO_MAP[hex.toUpperCase()] ?? hex;
