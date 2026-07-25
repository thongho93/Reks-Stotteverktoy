import "./firebase/appCheck";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { AppThemeProvider } from "./styles/colorMode";

// Etter en ny deploy finnes ikke lenger de gamle, hashede chunk-filene på Netlify.
// En åpen fane som prøver å laste en lazy side treffer da 404. Vite sender
// `vite:preloadError` – vi laster appen på nytt så den henter den nye bunten.
// Tidsvindu-vakt hindrer reload-loop hvis noe annet skulle feile vedvarende.
window.addEventListener("vite:preloadError", () => {
  const KEY = "reloaded-after-chunk-error-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </StrictMode>
);
