import { createSvgIcon } from "@mui/material/utils";

// Menyikoner som brukes både i sidemenyen og på startsiden.
export const InnspillIcon = createSvgIcon(
  <>
    {/* Document outline — open at top-right where pencil overlaps */}
    <path
      d="M 14.3 2.7 L 2.5 2.7 C 1.7 2.7 1.1 3.3 1.1 4.1 L 1.1 21.5 C 1.1 22.3 1.7 22.9 2.5 22.9 L 17.7 22.9 C 18.4 22.9 19 22.3 19 21.6 L 19 11.5"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Pencil body with pointed tip */}
    <polygon
      points="12.8,13.8 8.3,15.8 10.2,11.2 20,1.5 22.5,4.1"
      fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Eraser cap separator */}
    <line x1="18.2" y1="3.2" x2="20.8" y2="5.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    {/* Tip separator */}
    <line x1="10.2" y1="11.2" x2="12.8" y2="13.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </>,
  "InnspillIcon"
);

export const StandardteksterIcon = createSvgIcon(
  <path
    d="M 18 2 L 7 2 C 4.243 2 2 4.243 2 7 L 2 18 C 2 20.757 4.243 23 7 23 L 18 23 C 20.757 23 23 20.757 23 18 L 23 7 C 23 4.243 20.757 2 18 2 Z M 12.5 17.963 C 11.931 17.963 11.381 17.899 10.851 17.789 C 9.911 18.411 8.664 18.844 7.5 19.05 C 8.086 18.479 8.694 17.839 9.007 17.16 C 6.913 16.126 5.5 14.197 5.5 11.981 C 5.5 8.678 8.634 6 12.5 6 C 16.366 6 19.5 8.678 19.5 11.981 C 19.5 15.284 16.366 17.963 12.5 17.963 Z"
    fillRule="nonzero"
  />,
  "StandardteksterIcon"
);
export const ProduktOgRadIcon = createSvgIcon(
  <>
    {/* Circle with horizontal bar (ring/planet) */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21 7C21 9.21 19.21 11 17 11C14.79 11 13 9.21 13 7C13 4.79 14.79 3 17 3C19.21 3 21 4.79 21 7ZM19.14 7.49C19.08 7.76 18.81 7.93 18.54 7.87L15.23 7.11C14.96 7.05 14.80 6.78 14.86 6.51C14.92 6.24 15.19 6.07 15.46 6.13L18.77 6.89C19.04 6.95 19.20 7.22 19.14 7.49Z"
    />
    {/* Triangle */}
    <path d="M8.39 4.62C8.07 3.86 6.98 3.78 6.55 4.49L3.15 10.06C2.75 10.70 3.19 11.52 3.96 11.57L9.89 12.00C10.66 12.05 11.21 11.30 10.92 10.61L8.39 4.62Z" />
    {/* Ring/donut shape */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.69 18.18C19.19 17.48 19.84 15.69 19.14 14.19C18.44 12.69 16.66 12.04 15.16 12.74L9.72 15.28C8.22 15.98 7.57 17.76 8.27 19.26C8.97 20.77 10.75 21.42 12.25 20.72L17.69 18.18ZM14.97 18.35L17.27 17.27C18.27 16.81 18.70 15.62 18.24 14.62C17.77 13.61 16.58 13.18 15.58 13.65L13.28 14.72L14.97 18.35Z"
    />
  </>,
  "ProduktOgRadIcon"
);

export const InnkjopIcon = createSvgIcon(
  <>
    {/* Document body with dog-ear top-right */}
    <path
      d="M 14 2 L 5 2 C 3.9 2 3 2.9 3 4 L 3 20 C 3 21.1 3.9 22 5 22 L 17 22 C 18.1 22 19 21.1 19 20 L 19 7 Z"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Dog-ear fold */}
    <path
      d="M 14 2 L 14 7 L 19 7"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Bullet circles */}
    <circle cx="6.5" cy="11" r="1" fill="currentColor" />
    <circle cx="6.5" cy="15" r="1" fill="currentColor" />
    <circle cx="6.5" cy="19" r="1" fill="currentColor" />
    {/* Content lines */}
    <line x1="9" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </>,
  "InnkjopIcon"
);
