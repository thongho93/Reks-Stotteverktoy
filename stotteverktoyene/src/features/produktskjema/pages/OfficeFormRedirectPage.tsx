import { Box, CircularProgress, Typography } from "@mui/material";
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
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,252,0.98) 100%)",
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
        <div style={{ padding: 12, position: "relative", zIndex: 2 }}>
          Bruk knappen hvis skjemaet ikke lastes automatisk:
          <br />
          <button
            onClick={() => window.open(OFFICE_FORM_URL, "_blank", "noopener,noreferrer")}
            style={{
              appearance: "none",
              border: "1px solid #cfa3b3",
              backgroundColor: "#d28aa2ff",
              color: "#ffff",
              padding: "8px 15px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              marginTop: 8,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#d99aac";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#e6b6c6";
            }}
          >
            Åpne skjema
          </button>
        </div>
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
