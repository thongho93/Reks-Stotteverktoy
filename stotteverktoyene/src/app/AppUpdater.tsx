import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Alert, Button, Snackbar } from "@mui/material";

import { useAppUpdate } from "../shared/hooks/useAppUpdate";

// Regnes som "midt i skriving" – da utsetter vi automatisk reload for å ikke
// slette utfylt tekst (standardtekster, kundemeldinger osv.).
function erSkriving(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

// Sikkerhetsnett mot reload-loop: hvis den nye bunten mot formodning ikke løser
// versjonsavviket (f.eks. CDN-propagering henger etter), skal vi ikke reloade om
// og om igjen. Etter et auto-reload venter vi minst så lenge før neste forsøk;
// "Oppdater nå"-knappen er alltid uten sperre. Overlever reload via sessionStorage.
const AUTO_RELOAD_COOLDOWN_MS = 30_000;
const LAST_AUTO_RELOAD_KEY = "app-updater-last-auto-reload";

function autoReload(reloadNow: () => void): void {
  if (erSkriving()) return;
  const last = Number(sessionStorage.getItem(LAST_AUTO_RELOAD_KEY) || 0);
  if (Date.now() - last < AUTO_RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(LAST_AUTO_RELOAD_KEY, String(Date.now()));
  reloadNow();
}

/**
 * Viser en diskré "Ny versjon"-linje når en ny deploy er oppdaget, og laster
 * appen på nytt automatisk ved trygge tidspunkt: når brukeren bytter side, eller
 * når fanen får fokus igjen – men aldri mens et tekstfelt er i fokus. Brukeren
 * kan også trykke "Oppdater nå" selv.
 */
export default function AppUpdater() {
  const { updateReady, reloadNow } = useAppUpdate();
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  // Sidebytte er et trygt tidspunkt: brukeren navigerer, skriver ikke.
  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;
    if (updateReady) autoReload(reloadNow);
  }, [location.pathname, updateReady, reloadNow]);

  // Når fanen får fokus igjen etter å ha vært borte.
  useEffect(() => {
    if (!updateReady) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") autoReload(reloadNow);
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [updateReady, reloadNow]);

  return (
    <Snackbar open={updateReady} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={reloadNow} sx={{ textTransform: "none" }}>
            Oppdater nå
          </Button>
        }
      >
        Ny versjon tilgjengelig – oppdaterer ved neste sidebytte.
      </Alert>
    </Snackbar>
  );
}
