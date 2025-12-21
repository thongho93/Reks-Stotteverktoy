import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Paper, Alert } from "@mui/material";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import { useAuthUser } from "./useAuthUser";
import styles from "../../styles/standardTekstPage.module.css";

export function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [confirmPassword, setConfirmPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [firstName, setFirstName] = React.useState<string>("");

  const { user, loading } = useAuthUser();

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const trimmedEmail = email.trim();

    const trimmedFirstName = firstName.trim();

    if (mode === "signup" && !trimmedFirstName) {
      setError("Fornavn må fylles ut. Kun fornavn, ikke etternavn.");
      setBusy(false);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passordene er ikke like.");
      setBusy(false);
      return;
    }

    if (mode === "signup" && !trimmedEmail.toLowerCase().endsWith("@farmasiet.no")) {
      setError("Du må bruke e-postadresse som slutter på @farmasiet.no for å opprette konto.");
      setBusy(false);
      return;
    }

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

        try {
          await setDoc(
            doc(db, "users", cred.user.uid),
            {
              email: cred.user.email ?? trimmedEmail,
              firstName: trimmedFirstName,
              avatarUrl: null,
              createdAt: serverTimestamp(),
              approved: false, 
            },
            { merge: true }
          );
        } catch {
          // ignore
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Kunne ikke logge inn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className={styles.authCenter}>
      <Paper className={styles.authPaper}>
        <Typography variant="h5">{mode === "login" ? "Logg inn" : "Opprett konto"}</Typography>
        <Typography className={styles.authSubtitle} color="text.secondary">
          {mode === "login"
            ? "Logg inn med e-post og passord."
            : "Opprett ny bruker med e-post og passord."}
        </Typography>

        {error && (
          <Alert severity="error" className={styles.authError}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} className={styles.authForm}>
          {mode === "signup" && (
            <TextField
              label="Fornavn"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              helperText="Skriv kun fornavn (ikke etternavn)"
              autoComplete="given-name"
            />
          )}
          <TextField
            label="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            helperText={
              mode === "signup"
                ? "Du må bruke e-postadresse som slutter på @farmasiet.no"
                : undefined
            }
          />
          <TextField
            label="Passord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" && (
            <TextField
              label="Bekreft passord"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={
              busy ||
              (mode === "signup" &&
                (!firstName.trim() || !confirmPassword || password !== confirmPassword))
            }
          >
            {mode === "login" ? "Logg inn" : "Opprett konto"}
          </Button>
          <Button
            type="button"
            variant="text"
            disabled={busy}
            onClick={() => {
              setError(null);
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setFirstName("");
              setMode((m) => (m === "login" ? "signup" : "login"));
            }}
          >
            {mode === "login" ? "Ny bruker? Opprett konto" : "Har du konto? Logg inn"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
