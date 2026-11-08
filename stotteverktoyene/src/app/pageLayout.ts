// Felles sideramme: alle sider bruker samme maksbredde og sidemarg, slik at tittelraden
// (header) står på samme sted når man bytter mellom sidene.
//
// Endre bredden her, ikke i hver enkelt side.
export const PAGE_MAX_WIDTH = 1440;

/** Horisontal marg inni rammen (MUI spacing-enheter: 1.5 = 12 px, 2.5 = 20 px). */
export const PAGE_GUTTER_X = { xs: 1.5, md: 2.5 } as const;

/** Vertikal marg over og under innholdet. */
export const PAGE_GUTTER_Y = { xs: 1.5, md: 2.5 } as const;

/** Rammen som hele sidens innhold ligger i. */
export const pageFrameSx = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  mx: "auto",
  px: PAGE_GUTTER_X,
  py: PAGE_GUTTER_Y,
} as const;
