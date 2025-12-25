import "./firebase/appCheck";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import App from "./app/App";
import theme from "./styles/theme";
import { GlobalStyles } from "./styles/GlobalStyles";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <App />
    </ThemeProvider>
  </StrictMode>
);
