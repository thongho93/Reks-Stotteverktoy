import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

// Unik markør for dette bygget. På Netlify settes COMMIT_REF (git-SHA) automatisk;
// lokalt/annet CI faller vi tilbake til andre deploy-ider, til slutt et tidsstempel.
// Verdien bakes inn i bunten (define) og skrives til version.json, slik at åpne
// klienter kan oppdage at en ny versjon er deployet. Se useAppUpdate.ts.
const appVersion =
  process.env.COMMIT_REF ||
  process.env.BUILD_ID ||
  process.env.DEPLOY_ID ||
  String(Date.now());

// Skriver version.json til rota av bygget med den samme versjonsmarkøren, og
// release notes fra src/releaseNotes/releases.json. Åpne faner leser notatene
// herfra, så de kan vise hva som er nytt før de laster ny kode.
// Serveres uten cache (se public/_headers) så polling alltid får siste verdi.
function emitVersionJson(): Plugin {
  return {
    name: "emit-version-json",
    apply: "build",
    generateBundle() {
      let releases: unknown = [];
      try {
        releases = JSON.parse(readFileSync(path.resolve(__dirname, "src/releaseNotes/releases.json"), "utf8"));
      } catch (err) {
        this.warn(`Kunne ikke lese releases.json: ${String(err)}`);
      }
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: appVersion, releases }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emitVersionJson()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Honor the port assigned by the harness (PORT env) when present; fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
});
