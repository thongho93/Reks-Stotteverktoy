import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Snackbar } from "@mui/material";

import { useAppUpdate } from "../shared/hooks/useAppUpdate";
import ReleaseNotesDialog from "../releaseNotes/ReleaseNotesDialog";
import {
  BUNDLED_RELEASES,
  markReleaseSeen,
  readSeenReleaseId,
  releasesAfter,
} from "../releaseNotes/releases";

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

// Sider uten innlogget bruker: der skal ikke «Hva er nytt» vises.
const PAGES_WITHOUT_RELEASE_NOTES = ["/login", "/pending-approval"];

/**
 * Når en ny deploy er oppdaget:
 * - Har den nye versjonen release notes brukeren ikke har sett, vises en dialog med
 *   oppsummering og «Oppdater nå».
 * - Ellers vises en diskré "Ny versjon"-linje, og appen laster på nytt automatisk
 *   ved trygge tidspunkt: når brukeren bytter side, eller når fanen får fokus igjen
 *   – men aldri mens et tekstfelt er i fokus. Brukeren kan også trykke "Oppdater nå".
 *
 * Åpner brukeren appen først etter en deploy (eller lastes den på nytt automatisk),
 * vises oppsummeringen i etterkant med «Forstått». Se src/releaseNotes/README.md.
 */
export default function AppUpdater() {
  const { updateReady, deployedReleases, reloadNow } = useAppUpdate();
  const location = useLocation();
  const navigate = useNavigate();
  const prevPath = useRef(location.pathname);

  const bundledLatestId = BUNDLED_RELEASES[0]?.id ?? "";
  // Ny bruker (ingenting lagret) skal ikke møte hele historikken: da regnes alt i bunten som sett.
  const [seenId, setSeenId] = useState<string>(() => readSeenReleaseId() ?? bundledLatestId);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (bundledLatestId && readSeenReleaseId() === null) markReleaseSeen(bundledLatestId);
  }, [bundledLatestId]);

  const showNotes = !PAGES_WITHOUT_RELEASE_NOTES.includes(location.pathname);
  const afterNotes = useMemo(() => releasesAfter(BUNDLED_RELEASES, seenId), [seenId]);
  const updateNotes = useMemo(
    () => (updateReady ? releasesAfter(deployedReleases, seenId) : []),
    [updateReady, deployedReleases, seenId]
  );
  const dialogMode: "seen" | "update" | null =
    !showNotes ? null : afterNotes.length > 0 ? "seen" : updateNotes.length > 0 ? "update" : null;

  const closeSeen = () => {
    markReleaseSeen(bundledLatestId);
    setSeenId(bundledLatestId);
  };
  const updateWithNotes = () => {
    setUpdating(true);
    if (updateNotes[0]) markReleaseSeen(updateNotes[0].id);
    // Kort pause så «Laster siden på nytt» rekker å vises.
    window.setTimeout(reloadNow, 250);
  };

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

  const dialog =
    dialogMode === "seen" ? (
      <ReleaseNotesDialog
        mode="seen"
        releases={afterNotes}
        onUpdate={reloadNow}
        onClose={closeSeen}
        onOpenArchive={() => {
          closeSeen();
          navigate("/hva-er-nytt");
        }}
      />
    ) : dialogMode === "update" ? (
      <ReleaseNotesDialog mode="update" releases={updateNotes} updating={updating} onUpdate={updateWithNotes} onClose={() => {}} />
    ) : null;

  return (
    <>
      {dialog}
      <Snackbar open={updateReady && dialogMode === null} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
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
    </>
  );
}
