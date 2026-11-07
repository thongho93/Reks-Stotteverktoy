import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CalculateIcon from "@mui/icons-material/Calculate";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { Link as RouterLink } from "react-router-dom";
import { InnkjopIcon, InnspillIcon, ProduktOgRadIcon, StandardteksterIcon } from "./navIcons";
import { logUsage, type UsagePage } from "../shared/services/usage";

type Tool = {
  label: string;
  description: string;
  path: string;
  usagePage: UsagePage;
  Icon: React.ElementType;
  color: string; // samme farger som i sidemenyen
};

const TOOLS: Tool[] = [
  {
    label: "OMEQ-beregning",
    description: "Regn om opioider til oral morfinekvivalent og sjekk mot vedtaket.",
    path: "/omeq",
    usagePage: "omeq",
    Icon: CalculateIcon,
    color: "#29A1FF",
  },
  {
    label: "Lagerbeholdning",
    description: "Oversikt over lagerbeholdning.",
    path: "/lagerbeholdning",
    usagePage: "lagerbeholdning",
    Icon: Inventory2Icon,
    color: "#0E9F8E",
  },
  {
    label: "Standardtekster",
    description: "Søk og bruk ferdige tekster til kundekommunikasjon.",
    path: "/standardtekster",
    usagePage: "standardtekster",
    Icon: StandardteksterIcon,
    color: "#4BC76A",
  },
  {
    label: "Interaksjonssøk",
    description: "Sjekk interaksjoner, med standardtekst til kunden.",
    path: "/interaksjoner",
    usagePage: "interaksjoner",
    Icon: CompareArrowsIcon,
    color: "#FF5E5B",
  },
  {
    label: "Produkt og råd",
    description: "Produktinformasjon, faglig innhold og rutiner.",
    path: "/produkt-og-rad",
    usagePage: "produktograd",
    Icon: ProduktOgRadIcon,
    color: "#C93586",
  },
  {
    label: "Innkjøp og anbrudd",
    description: "Registrer anbrudd og send produktskjema til innkjøpsteamet.",
    path: "/anbrudd",
    usagePage: "anbrudd",
    Icon: InnkjopIcon,
    color: "#FFA726",
  },
  {
    label: "Notater og innspill",
    description: "Skriv egne notater, eller send oss et forslag til forbedring.",
    path: "/tilbakemelding",
    usagePage: "tilbakemelding",
    Icon: InnspillIcon,
    color: "#B648E8",
  },
];

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", py: { xs: 2, md: 5 }, px: { xs: 0, md: 2 } }}>
      <Box sx={{ maxWidth: 680, mb: { xs: 4, md: 6 } }}>
        <Box
          component="span"
          sx={(theme) => ({
            display: "inline-block",
            mb: 2,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#8F3F63",
            bgcolor: alpha(theme.palette.primary.main, 0.16),
          })}
        >
          Støtteverktøy for Farmasiet
        </Box>

        <Typography
          variant="h1"
          sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1, mb: 1.75 }}
        >
          Velkommen til REKS+
        </Typography>

        <Typography sx={{ fontSize: "1.125rem", lineHeight: 1.55, color: "text.secondary" }}>
          Verktøy som gjør farmasøytisk arbeid raskere, tryggere og mer oversiktlig. Velg et verktøy
          for å komme i gang.
        </Typography>
      </Box>

      <Typography component="h2" variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 2 }}>
        Verktøy
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 2,
        }}
      >
        {TOOLS.map(({ label, description, path, usagePage, Icon, color }) => (
          <Paper
            key={path}
            component={RouterLink}
            to={path}
            variant="outlined"
            onClick={() => logUsage("menu_click", { targetPage: usagePage })}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              p: 2.75,
              borderRadius: 3,
              textDecoration: "none",
              color: "text.primary",
              transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 10px 28px rgba(17, 24, 39, 0.08)",
                borderColor: alpha(color, 0.6),
              },
              "&:focus-visible": { outline: "2px solid", outlineColor: "text.primary", outlineOffset: 2 },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color,
                bgcolor: alpha(color, 0.14),
              }}
            >
              <Icon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.01em", mb: 0.75 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.5, color: "text.secondary" }}>
                {description}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <Typography variant="body2" sx={{ color: "text.secondary", mt: 5 }}>
        Tilgang og funksjonalitet kan variere basert på brukerrolle.
      </Typography>
    </Box>
  );
}
