import { initializeApp, getApps } from "firebase/app";
import { getAI, getGenerativeModel, getTemplateGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initAppCheck } from "./appCheck";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const app =
  getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// App Check must be initialized before calling services that require it (e.g. Firebase AI).
initAppCheck(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Gemini (Firebase AI Logic)
export const ai = getAI(app, { backend: new GoogleAIBackend() });

// Default Gemini model instance
export const geminiModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
});

export const geminiGroundedModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
  tools: [{ googleSearch: {} }],
});

// Server-side prompt templates (Firebase AI Logic)
export const geminiTemplateModel = getTemplateGenerativeModel(ai);
