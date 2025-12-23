import { useEffect, useRef, useState } from "react";

const OFFICE_FORM_URL = import.meta.env.VITE_OFFICE_FORM_URL as string;

if (!OFFICE_FORM_URL) {
  throw new Error("VITE_OFFICE_FORM_URL is not defined");
}

export default function OfficeFormRedirectPage() {
  const [iframeError, setIframeError] = useState(false);
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {iframeError && (
        <div style={{ padding: 12 }}>
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
          setIframeError(false);
        }}
        onError={() => setIframeError(true)}
      />
    </div>
  );
}
