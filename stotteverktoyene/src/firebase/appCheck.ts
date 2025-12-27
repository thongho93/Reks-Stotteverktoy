// Enable App Check debug token in development to avoid reCAPTCHA/domain issues
// This must run BEFORE initializeAppCheck is called
if (import.meta.env.DEV) {
  // true = Firebase generates a debug token and logs it once in the console
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

export function initAppCheck(app: FirebaseApp) {
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

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info("[AppCheck] Debug token enabled (see console output above).");
  }
}
