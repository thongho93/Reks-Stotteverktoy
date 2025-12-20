import { Box, Paper, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Velkommen 👋
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Dette er et internt støtteverktøy for Farmasiet, laget for å gjøre farmasøytisk arbeid
          raskere, tryggere og mer oversiktlig.
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          I denne appen kan du blant annet:
        </Typography>

        <ul>
          <li>
            <Typography variant="body1">Beregne OMEQ ved bruk av opioider</Typography>
          </li>
          <li>
            <Typography variant="body1">
              Bruke og administrere standardtekster til kundekommunikasjon
            </Typography>
          </li>
          <li>
            <Typography variant="body1">Sende produktskjema til innkjøpsteamet</Typography>
          </li>
        </ul>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Tilgang og funksjonalitet kan variere basert på brukerrolle.
        </Typography>
      </Paper>
    </Box>
  );
}
