import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const OFFICE_FORM_URL = import.meta.env.VITE_OFFICE_FORM_URL as string;

if (!OFFICE_FORM_URL) {
  throw new Error("VITE_OFFICE_FORM_URL is not defined");
}

export default function OfficeFormRedirectPage() {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoadedRef.current) {
        setIframeError(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {!iframeLoaded && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            gap: 1.5,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(180deg, rgba(16,22,32,0.96) 0%, rgba(12,18,27,0.98) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,252,0.98) 100%)",
            zIndex: 1,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Box>
            <CircularProgress size={28} />
            <Typography sx={{ mt: 1.5, fontWeight: 600 }}>Laster produktskjema ...</Typography>
            <Typography variant="body2" color="text.secondary">
              Selve skjemaet hentes fra Microsoft Forms.
            </Typography>
          </Box>
        </Box>
      )}

      {iframeError && (
        <Box sx={{ p: 1.5, position: "relative", zIndex: 2 }}>
          Bruk knappen hvis skjemaet ikke lastes automatisk:
          <br />
          <Button
            variant="contained"
            size="small"
            onClick={() => window.open(OFFICE_FORM_URL, "_blank", "noopener,noreferrer")}
            sx={{ mt: 1, borderRadius: 999, textTransform: "none", px: 2 }}
          >
            Åpne skjema
          </Button>
        </Box>
      )}

      <iframe
        src={OFFICE_FORM_URL}
        title="Produktskjema"
        style={{ flex: 1, border: 0 }}
        onLoad={() => {
          hasLoadedRef.current = true;
          setIframeLoaded(true);
          setIframeError(false);
        }}
        onError={() => {
          setIframeLoaded(true);
          setIframeError(true);
        }}
      />
    </div>
  );
}
