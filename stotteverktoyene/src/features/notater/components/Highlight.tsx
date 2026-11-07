import * as React from "react";
import { Box } from "@mui/material";
import { escapeRegExp } from "../utils/highlight";

export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0 || !text) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Box
            component="mark"
            key={i}
            sx={{ bgcolor: "rgba(255, 205, 60, 0.55)", color: "inherit", borderRadius: "3px", px: "1px" }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
