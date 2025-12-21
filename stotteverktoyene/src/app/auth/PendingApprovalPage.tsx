import React from "react";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuthUser } from "./useAuthUser";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isApproved } = useAuthUser();

  React.useEffect(() => {
    // If not signed in, go to login.
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }

    // If approved (or admin), send into the app.
    if (!loading && user && (isAdmin || isApproved)) {
      navigate("/", { replace: true });
    }
  }, [loading, user, isAdmin, isApproved, navigate]);

  if (loading) {
    return (
      <Box
        sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // user can be null briefly; the effect above will redirect.
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper sx={{ width: "100%", maxWidth: 640, p: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Venter på godkjenning
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Kontoen din er opprettet, men må godkjennes av en administrator før du kan bruke appen.
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Du får tilgang så snart administrator har godkjent brukeren din.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            onClick={async () => {
              await signOut(getAuth());
              navigate("/login", { replace: true });
            }}
          >
            Logg ut
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
