import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import styles from "../../styles/standardTekstPage.module.css";

type ImageEncodeFormat = "image/webp" | "image/jpeg";

function estimateDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Kunne ikke lese bildefilen."));
      img.src = url;
    });

    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawCoverSquare(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
}

async function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: ImageEncodeFormat,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
  if (!blob) return canvas.toDataURL(format, quality);

  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("Kunne ikke kode bildet."));
    r.readAsDataURL(blob);
  });
}

async function compressAvatarToDataUrl(file: File): Promise<string> {
  const img = await fileToImage(file);

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke starte bildekoding.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawCoverSquare(ctx, img, size);

  const TARGET = 70_000; // ca 70 KB
  const HARD = 140_000; // sikkerhetsgrense

  const formats: ImageEncodeFormat[] = ["image/webp", "image/jpeg"];

  for (const fmt of formats) {
    let q = fmt === "image/webp" ? 0.78 : 0.82;

    for (let i = 0; i < 7; i++) {
      const dataUrl = await canvasToDataUrl(canvas, fmt, q);
      const bytes = estimateDataUrlBytes(dataUrl);
      if (bytes <= TARGET) return dataUrl;
      if (bytes <= HARD && q <= 0.6) return dataUrl;
      q = Math.max(0.45, q - 0.07);
    }

    const last = await canvasToDataUrl(canvas, fmt, 0.5);
    if (estimateDataUrlBytes(last) <= HARD) return last;
  }

  // Siste utvei
  return canvas.toDataURL("image/jpeg", 0.5);
}

export function useAuthUser() {
  const [user, setUser] = React.useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setIsAdmin(false);
        setFirstName(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      try {
        // Always try to load the user's profile first (works for both admins and regular users)
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const data = userSnap.exists() ? (userSnap.data() as any) : null;
        const name = typeof data?.firstName === "string" ? data.firstName.trim() : "";
        setFirstName(name.length > 0 ? name : null);
        const avatar = typeof data?.avatarUrl === "string" ? data.avatarUrl.trim() : "";
        setAvatarUrl(avatar.length > 0 ? avatar : null);

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
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, loading, isAdmin, firstName, avatarUrl };
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
              avatarUrl: null,
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

export function ProfileMenu() {
  const { user, loading, isAdmin, firstName, avatarUrl } = useAuthUser();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  if (loading || !user) return null;

  const roleLabel = isAdmin ? "Admin" : "Bruker";
  const avatarLabel = (firstName?.trim()?.[0] || user.email?.trim()?.[0] || "?").toUpperCase();

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await signOut(auth);
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="Profil" className={styles.profileIconButton}>
        <Avatar className={styles.profileAvatar} src={avatarUrl ?? undefined}>
          {avatarLabel}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        className={styles.profileMenuRoot}
        slotProps={{
          paper: { className: styles.profileMenuPaper },
          list: { className: styles.profileMenuList },
        }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box className={styles.profileMenuHeader}>
          <Box className={styles.profileMenuHeaderRow}>
            <Avatar className={styles.profileMenuAvatarSmall} src={avatarUrl ?? undefined}>
              {avatarLabel}
            </Avatar>
            <Box className={styles.profileMenuHeaderText}>
              <Typography className={styles.profileMenuHello}>
                {firstName ? `Hei, ${firstName}` : "Hei"}
              </Typography>
              <Typography className={styles.profileMenuEmail}>{user.email ?? ""}</Typography>
            </Box>
          </Box>

          <Box className={styles.profileMenuRolePill}>{roleLabel}</Box>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/profil");
          }}
        >
          Min profil
        </MenuItem>

        <MenuItem onClick={handleLogout} className={styles.profileMenuLogout}>
          Logg ut
        </MenuItem>
      </Menu>
    </>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, firstName, avatarUrl } = useAuthUser();

  const [draftFirstName, setDraftFirstName] = React.useState<string>(firstName ?? "");
  const [draftAvatarUrl, setDraftAvatarUrl] = React.useState<string>(avatarUrl ?? "");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDraftFirstName(firstName ?? "");
  }, [firstName]);

  React.useEffect(() => {
    setDraftAvatarUrl(avatarUrl ?? "");
  }, [avatarUrl]);

  if (loading) {
    return (
      <Box className={styles.authLoadingWrap}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleLabel = isAdmin ? "Admin" : "Bruker";

  const onPickAvatarFile = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow re-selecting same file
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setError("Velg en bildefil (PNG/JPG/WebP). ");
      return;
    }

    // Tillat større originaler siden vi komprimerer uansett
    if (file.size > 5_000_000) {
      setError("Bildet er for stort. Velg et bilde under 5 MB. ");
      return;
    }

    setSaved(false);
    setError(null);
    setUploadingAvatar(true);

    try {
      const dataUrl = await compressAvatarToDataUrl(file);
      const bytes = estimateDataUrlBytes(dataUrl);

      // Ekstra sikkerhetsnett for å unngå store Firestore-dokumenter
      if (bytes > 160_000) {
        setError("Bildet ble fortsatt for stort etter komprimering. Prøv et annet bilde.");
        return;
      }

      setDraftAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke behandle bildet.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    setError(null);
    setSaved(false);

    const trimmed = draftFirstName.trim();
    if (!trimmed) {
      setError("Fornavn må fylles ut. Kun fornavn, ikke etternavn.");
      return;
    }

    setSaving(true);
    try {
      // Update profile in users/{uid}
      await updateDoc(doc(db, "users", user.uid), {
        firstName: trimmed,
        avatarUrl: draftAvatarUrl.trim() || null,
      });
      setSaved(true);
    } catch {
      // If document doesn't exist yet, create it
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email ?? "",
            firstName: trimmed,
            avatarUrl: draftAvatarUrl.trim() || null,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        setSaved(true);
      } catch {
        setError("Kunne ikke lagre profilen akkurat nå.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className={styles.authCenter}>
      <Paper className={styles.authPaper}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 5,
          }}
        >
          <Typography variant="h2">Min profil</Typography>
          <Chip label={roleLabel} />
        </Box>

        {error && (
          <Alert severity="error" className={styles.authError}>
            {error}
          </Alert>
        )}

        {saved && !error && (
          <Alert severity="success" className={styles.authError}>
            Profil oppdatert.
          </Alert>
        )}

        <Box className={styles.authForm}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Avatar
              src={draftAvatarUrl.trim() ? draftAvatarUrl.trim() : undefined}
              sx={{ width: 150, height: 150 }}
            >
              {(draftFirstName?.trim()?.[0] || user.email?.trim()?.[0] || "?").toUpperCase()}
            </Avatar>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={onPickAvatarFile}
                  disabled={saving || uploadingAvatar}
                >
                  Last opp bilde
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setSaved(false);
                    setDraftAvatarUrl("");
                  }}
                  disabled={saving || uploadingAvatar}
                >
                  Fjern
                </Button>
              </Box>
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onAvatarFileChange}
            />
          </Box>

          <TextField label="E-post" value={user.email ?? ""} InputProps={{ readOnly: true }} />

          <TextField
            label="Fornavn"
            value={draftFirstName}
            onChange={(e) => {
              setSaved(false);
              setDraftFirstName(e.target.value);
            }}
            helperText="Skriv kun fornavn (ikke etternavn)"
            autoComplete="given-name"
          />

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate(-1)} disabled={saving}>
              Tilbake
            </Button>
            <Button variant="contained" onClick={onSave} disabled={saving || uploadingAvatar}>
              {saving ? "Lagrer..." : "Lagre"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
