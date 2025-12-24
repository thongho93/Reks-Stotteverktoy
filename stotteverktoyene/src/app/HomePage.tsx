import { Box, Paper, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h1" gutterBottom>
          Velkommen til REKS+ 👋
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Dette er et internt støtteverktøy for Farmasiet, laget for å gjøre farmasøytisk arbeid
          raskere, tryggere og mer oversiktlig.
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          I denne appen kan du:
        </Typography>

        <ul>
          <li>
            <Typography variant="body1">Beregne OMEQ (opioid-omregning)</Typography>
          </li>
          <li>
            <Typography variant="body1">
              Søke og bruke standardtekster til kundekommunikasjon.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Gjøre interaksjonssøk, som også inkluderer standardtekst til kunden.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">Sende produktskjema til innkjøpsteamet</Typography>
          </li>
          <li>
            <Typography variant="body1">Registrere anbrudd (skjema og oversikt)</Typography>
          </li>
        </ul>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Tilgang og funksjonalitet kan variere basert på brukerrolle.
        </Typography>
      </Paper>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          component="img"
          src="/img/letscook.gif"
          alt="Let’s cook"
          sx={{
            maxWidth: 420,
            width: "100%",
            borderRadius: 2,
          }}
        />
      </Box>
    </Box>
  );
}
