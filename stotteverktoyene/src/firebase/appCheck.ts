import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

export function initAppCheck(app: FirebaseApp) {
  const appCheckMode = String(import.meta.env.VITE_APPCHECK_MODE ?? "").toLowerCase();
  const isDev = import.meta.env.DEV;

  // Default behavior:
  // - Development: App Check off unless explicitly enabled (avoids localhost 403 noise)
  // - Production: App Check on
  const shouldEnable =
    appCheckMode === "on" ||
    (!isDev && appCheckMode !== "off");

  if (!shouldEnable) {
    // eslint-disable-next-line no-console
    console.info("[AppCheck] Skipped (mode off).");
    return;
  }

  // Enable debug token in dev before initializeAppCheck is called.
  // If VITE_FIREBASE_APPCHECK_DEBUG_TOKEN is set, we use that stable token.
  // Otherwise `true` tells Firebase to generate one and print it in console.
  if (isDev) {
    const explicitDebugToken = String(import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ?? "").trim();
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = explicitDebugToken || true;
  }

  // For local development, use a debug token to avoid reCAPTCHA/localhost issues.
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    // Avoid crashing the app if env is missing; App Check will fail when enforced.
    console.warn(
      "Missing VITE_RECAPTCHA_SITE_KEY. App Check will not work when enforcement is enabled."
    );
    return;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  if (isDev) {
    // eslint-disable-next-line no-console
    console.info("[AppCheck] Debug token enabled (see console output above).");
  }
}
