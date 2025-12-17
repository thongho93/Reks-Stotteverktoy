import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import styles from "../../styles/standardTekstPage.module.css";

export function useAuthUser() {
  const [user, setUser] = React.useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [firstName, setFirstName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setIsAdmin(false);
        setFirstName(null);
        setLoading(false);
        return;
      }

      try {
        // Always try to load the user's profile first (works for both admins and regular users)
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const data = userSnap.exists() ? (userSnap.data() as any) : null;
        const name = typeof data?.firstName === "string" ? data.firstName.trim() : "";
        setFirstName(name.length > 0 ? name : null);

        // Then determine admin. If rules deny reading /admins for non-admin users,
        // treat it as not-admin instead of failing the whole auth hydration.
        try {
          const adminSnap = await getDoc(doc(db, "admins", u.uid));
          setIsAdmin(adminSnap.exists());
        } catch {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
        setFirstName(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, loading, isAdmin, firstName };
}

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  if (loading) {
    return (
      <Box className={styles.authLoadingWrap}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

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
              createdAt: serverTimestamp(),
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
              (mode === "signup" && (!firstName.trim() || !confirmPassword || password !== confirmPassword))
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

export function ProfileMenu() {
  const { user, loading, isAdmin, firstName } = useAuthUser();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  if (loading || !user) return null;

  const roleLabel = isAdmin ? "Admin" : "Bruker";

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await signOut(auth);
    handleClose();
  };

  return (
    <>
      <Tooltip title={`${roleLabel} • ${user.email ?? ""}`.trim()}>
        <IconButton onClick={handleOpen} aria-label="Profil">
          <Avatar className={styles.authAvatar}>
            <AccountCircleIcon />
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disabled>{firstName ? `Hei, ${firstName}` : (user.email ?? "Innlogget")}</MenuItem>
        <MenuItem disabled>Rolle: {roleLabel}</MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>Logg ut</MenuItem>
      </Menu>
    </>
  );
}
