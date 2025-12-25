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
}
