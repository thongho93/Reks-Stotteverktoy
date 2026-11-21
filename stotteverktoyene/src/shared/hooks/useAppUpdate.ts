import { useCallback, useEffect, useRef, useState } from "react";

import { parseReleases, type Release } from "../../releaseNotes/releases";

// Versjonen som er bakt inn i denne bunten (settes i vite.config via define).
// Lokalt i dev finnes ikke version.json, så sjekken under blir en no-op.
const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

// Hvor ofte vi spør serveren om det finnes en nyere deploy.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

type DeployedInfo = { version: string; releases: Release[] };

// Henter versjonen (og release notes) som ligger deployet nå. Returnerer null hvis
// filen ikke finnes (f.eks. i dev) eller ved nettverksfeil – da gjør vi ingenting.
async function fetchDeployed(): Promise<DeployedInfo | null> {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown; releases?: unknown };
    if (typeof data.version !== "string") return null;
    return { version: data.version, releases: parseReleases(data.releases) };
  } catch {
    return null;
  }
}

/**
 * Oppdager når en ny versjon er deployet til Netlify mens appen er åpen.
 * Poller version.json jevnlig og hver gang fanen får fokus igjen. Når den
 * deployede versjonen avviker fra bunten som kjører, settes `updateReady`, og
 * release notes fra den nye deployen ligger i `deployedReleases`.
 */
export function useAppUpdate(): {
  updateReady: boolean;
  deployedReleases: Release[];
  reloadNow: () => void;
} {
  const [updateReady, setUpdateReady] = useState(false);
  const [deployedReleases, setDeployedReleases] = useState<Release[]>([]);
  // Når vi først vet om en ny versjon trenger vi ikke sjekke mer.
  const knownRef = useRef(false);

  const check = useCallback(async () => {
    if (knownRef.current) return;
    const deployed = await fetchDeployed();
    if (deployed && deployed.version !== CURRENT_VERSION) {
      knownRef.current = true;
      setDeployedReleases(deployed.releases);
      setUpdateReady(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [check]);

  const reloadNow = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateReady, deployedReleases, reloadNow };
}
