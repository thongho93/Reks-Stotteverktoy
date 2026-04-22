import "./firebase/appCheck";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { AppThemeProvider } from "./styles/colorMode";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </StrictMode>
);
