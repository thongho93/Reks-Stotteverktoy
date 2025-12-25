import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "./firebase";

// Initialize Firebase App Check with reCAPTCHA v3
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(
    import.meta.env.VITE_RECAPTCHA_SITE_KEY
  ),
  isTokenAutoRefreshEnabled: true,
});
