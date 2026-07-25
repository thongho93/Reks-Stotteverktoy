/// <reference types="vite/client" />

// Bygg-versjon injisert av vite.config.ts (define). Brukes til å oppdage nye
// Netlify-deploys i produksjon. Se src/shared/hooks/useAppUpdate.ts.
declare const __APP_VERSION__: string;
