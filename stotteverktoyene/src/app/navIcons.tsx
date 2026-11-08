import { createSvgIcon } from "@mui/material/utils";

// Menyikoner som brukes både i sidemenyen og på startsiden.
// Linjeikoner fra Lucide (lucide.dev, ISC-lisens): 24 px, strek 1,75.
const line = (children: React.ReactNode) => (
  <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </g>
);

export const CalculatorIcon = createSvgIcon(
  line(
    <>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </>
  ),
  "Calculator"
);

export const WarehouseIcon = createSvgIcon(
  line(
    <>
      <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
      <path d="M6 18h12" />
      <path d="M6 14h12" />
      <rect width="12" height="12" x="6" y="10" />
    </>
  ),
  "Warehouse"
);

export const MessageSquareTextIcon = createSvgIcon(
  line(
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </>
  ),
  "MessageSquareText"
);

export const ShieldAlertIcon = createSvgIcon(
  line(
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  "ShieldAlert"
);

export const PillIcon = createSvgIcon(
  line(
    <>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </>
  ),
  "Pill"
);

export const PackageXIcon = createSvgIcon(
  line(
    <>
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
      <path d="m7.5 4.27 9 5.15" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
      <path d="m17 13 5 5m-5 0 5-5" />
    </>
  ),
  "PackageX"
);

export const SquarePenIcon = createSvgIcon(
  line(
    <>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </>
  ),
  "SquarePen"
);

export const WrenchIcon = createSvgIcon(
  line(
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  "Wrench"
);

export const ChartColumnIcon = createSvgIcon(
  line(
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  "ChartColumn"
);

export const InboxIcon = createSvgIcon(
  line(
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  "Inbox"
);

export const ChevronsLeftIcon = createSvgIcon(
  line(
    <>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </>
  ),
  "ChevronsLeft"
);

export const ChevronsRightIcon = createSvgIcon(
  line(
    <>
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </>
  ),
  "ChevronsRight"
);

export const ChevronDownIcon = createSvgIcon(line(<path d="m6 9 6 6 6-6" />), "ChevronDown");

export const ChevronUpIcon = createSvgIcon(line(<path d="m18 15-6-6-6 6" />), "ChevronUp");

export const UserIcon = createSvgIcon(
  line(
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  "User"
);

export const LogOutIcon = createSvgIcon(
  line(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  "LogOut"
);

export const SunIcon = createSvgIcon(
  line(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  "Sun"
);

export const MoonIcon = createSvgIcon(line(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />), "Moon");

// Menyfarger per side. `color` brukes til toning, `strong` til fylt flis og ikon i lys modus
// (mørkere, slik at ikonet har nok kontrast mot hvit bakgrunn).
export const NAV_COLORS = {
  omeq: { color: "#29A1FF", strong: "#1A8AE6" },
  lager: { color: "#0E9F8E", strong: "#0B8274" },
  standardtekster: { color: "#4BC76A", strong: "#2E9E4D" },
  interaksjoner: { color: "#FF5E5B", strong: "#E0403D" },
  produkt: { color: "#C93586", strong: "#C93586" },
  anbrudd: { color: "#FFA726", strong: "#C77700" },
  notater: { color: "#B648E8", strong: "#9A33C7" },
  innspill: { color: "#B648E8", strong: "#9A33C7" },
  rekspert: { color: "#00A3D7", strong: "#0782A8" },
  statistikk: { color: "#7C5CFF", strong: "#6544F0" },
} as const;
