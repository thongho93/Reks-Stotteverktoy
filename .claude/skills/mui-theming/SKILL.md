---
name: mui-theming
description: Styling and theming conventions for Reks Støtteverktøy — MUI 7 with a custom theme (light + dark), emotion `sx`, and CSS modules for page-level styles. Use when adding or restyling a component, picking a color, working with `Box`/`Paper`/`Typography`/`MuiTextField`, dealing with dark mode, or deciding whether new styles belong in `sx`, the theme, or a `*.module.css` file.
---

# MUI theming

Source of truth: `stotteverktoyene/src/styles/theme.ts` (`createAppTheme(mode)`), color-mode plumbing in `colorMode.tsx` + `colorModeContext.ts`, global element resets in `GlobalStyles.tsx`. Everything is MUI 7 + emotion.

## Where styles live

1. **Theme overrides (`theme.ts`)** — anything that should apply to every instance of an MUI component (button shadows, input borders, table head color, drawer gradient, tooltip palette). When you find yourself writing the same `sx` on every `<TextField>`, lift it here instead.
2. **`sx` prop on the component** — one-off layout, spacing, conditional styling. This is the default. Prefer `sx` over `styled()` for app code.
3. **CSS modules (`*.module.css`)** — page-level layouts and complex selectors that would be unreadable in `sx`. The big example is `standardTekstPage.module.css`. Reach for this when a page has > ~10 nested rules.
4. **`GlobalStyles.tsx`** — true global resets (scrollbars, focus rings, html/body level). Don't put feature styles here.

## Palette — don't hardcode colors

The theme defines `primary`, `secondary`, `background.{default,paper}`, `text.{primary,secondary}`, `divider`, `error`, `warning`, `success`, `action.{hover,selected}`. Always read from theme:

```tsx
sx={{
  color: "text.primary",
  bgcolor: "background.paper",
  borderColor: "divider",
}}
```

Or via callback when you need `alpha`:
```tsx
sx={(theme) => ({
  bgcolor: alpha(theme.palette.primary.main, 0.12),
})}
```

Sidebar accent colors (`#29A1FF`, `#4BC76A`, `#FF5E5B`, `#C93586`, `#B648E8`, `#FFA726`, `#00A3D7`) are intentionally hardcoded per item — that's the one place where literal hex is acceptable, because each tool has a deliberate identity color.

## Dark mode is real and shipped

Dark mode toggles `palette.mode` between `light` and `dark`. Test every change against both. The pattern in `theme.ts` is `const isDark = mode === "dark"; ...` and conditional values throughout. When a value differs between modes, branch in the theme file rather than at the call site whenever possible.

If you need to branch in a component, use the theme callback:
```tsx
sx={(theme) => ({
  boxShadow: theme.palette.mode === "dark" ? "0 8px 24px rgba(...)" : "none",
})}
```

## Spacing and shape

- `spacing: 8` — `sx={{ p: 2 }}` is 16px. Always use the spacing scale, not raw px.
- `borderRadius: 12` — surfaces inherit this. Use `borderRadius: 1` (= 4px) for chips/inline elements, the default for cards/inputs, and only override when the design truly demands it.

## Typography

Sizes are tuned (h1: 1.75rem / 600, h2: 1.55rem / 650, h3: 1.2rem / 600, h4: 1rem / 600, body1: 0.95rem, body2: 0.85rem). Use `<Typography variant="h2">…</Typography>`, not raw `<h2>`. Don't override `fontSize` ad hoc; if a heading needs a different size, that's a sign you need a new variant or a non-heading element.

## Components configured globally

Already overridden in `theme.ts`:

- `MuiPaper` — subtle border, `backgroundImage: "none"` (kill MUI's default gradient).
- `MuiDrawer` — gradient + border in dark mode.
- `MuiOutlinedInput` — border colors per state, hover/focus accent.
- `MuiTableHead` — colored bg.
- `MuiTableCell` head — uppercase + tracking; body — 0.9rem.
- `MuiListItemButton` — primary hover/selected backgrounds.
- `MuiMenu` — bordered + shadowed paper.
- `MuiButton` containedPrimary — soft shadow.
- `MuiTextField` — defaults to `size="small"`, `variant="outlined"`. Don't restate these in JSX.
- `MuiTooltip` — inverted palette (light tooltip in dark mode).

If you find yourself overriding any of these on a single instance, ask whether the override should move to the theme.

## Sidebar styling pattern

`Sidebar` in `App.tsx` shows the canonical styling pattern: `alpha(item.color, 0.12)` for hover, `alpha(item.color, 0.2)` for selected, with a 3px left border in the item color. Match this if you build a similar nav inside a feature.

## Don't

- Don't import emotion `css` directly — use `sx` or `styled` from `@mui/material/styles`.
- Don't use Tailwind classes — Tailwind isn't set up, and adding it would conflict with MUI.
- Don't reach into `theme.palette.<…>.main` from a CSS module — keep theme tokens in JS-styled code; CSS modules are for layout/structure, not theme colors.
- Don't reintroduce raw `<h1>`/`<button>`/`<input>` outside `GlobalStyles.tsx`. Use MUI components.
