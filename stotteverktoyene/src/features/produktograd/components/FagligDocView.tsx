import type { RefObject } from "react";
import { Box, InputBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";

export type FagligDocViewDoc = {
  id: string;
  title: string;
  kind: "pdf" | "text";
  content: string;
  url: string | null;
};

type Props = {
  doc: FagligDocViewDoc;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onChangeText: (patch: { title?: string; content?: string }) => void;
};

// Visning av et eget dokument (innebygd side/PDF eller tekst) i full bredde og høyde.
export default function FagligDocView({ doc, titleInputRef, onChangeText }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const ink = isDark ? "#F2EDF0" : "#2D1727";
  const muted = isDark ? "#B79AAE" : "#6B5262";
  const accent = isDark ? "#F09AC0" : "#A81F66";
  const line = isDark ? "rgba(140,80,120,0.3)" : "#EAD2E1";

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2.5, py: 1.5, borderBottom: `1px solid ${line}` }}>
      {doc.kind === "pdf" ? (
        <PictureAsPdfRoundedIcon sx={{ color: accent, fontSize: 22 }} />
      ) : (
        <DescriptionRoundedIcon sx={{ color: accent, fontSize: 22 }} />
      )}
      {doc.kind === "text" ? (
        <InputBase
          inputRef={titleInputRef}
          value={doc.title}
          onChange={(event) => onChangeText({ title: event.target.value })}
          placeholder="Tittel"
          inputProps={{ "aria-label": "Tittel" }}
          sx={{ flex: 1, fontSize: 22, fontWeight: 800, color: ink }}
        />
      ) : (
        <Typography component="h2" noWrap sx={{ flex: 1, fontSize: 22, fontWeight: 800, color: ink }}>
          {doc.title}
        </Typography>
      )}
      <Typography sx={{ fontSize: 13.5, color: muted }}>{doc.kind === "pdf" ? "Innebygd dokument" : "Tekstdokument"}</Typography>
    </Box>
  );

  if (doc.kind === "pdf") {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ flex: 1, minHeight: 0, bgcolor: isDark ? "#161B22" : "#F1E6EE" }}>
          <iframe title={doc.title} src={doc.url ?? undefined} style={{ border: 0, width: "100%", height: "100%" }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {header}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2.5 }}>
        <InputBase
          multiline
          minRows={16}
          value={doc.content}
          onChange={(event) => onChangeText({ content: event.target.value })}
          placeholder="Skriv faglig innhold her..."
          inputProps={{ "aria-label": "Innhold" }}
          sx={{
            width: "100%",
            alignItems: "flex-start",
            color: ink,
            fontSize: 17,
            lineHeight: 1.6,
            "& textarea::placeholder": { color: muted, opacity: 1 },
          }}
        />
      </Box>
      <Box sx={{ px: 2.5, py: 1, borderTop: `1px solid ${line}`, display: "flex", justifyContent: "flex-end" }}>
        <Typography sx={{ fontSize: 12.5, color: muted }}>Endringer lagres automatisk</Typography>
      </Box>
    </Box>
  );
}
