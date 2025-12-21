import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { setDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuthUser } from "./useAuthUser";
import styles from "../../styles/standardTekstPage.module.css";
import { compressAvatarToDataUrl, estimateAvatarBytes } from "../../app/auth/avatarUtils";

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

  const [showStatsLink, setShowStatsLink] = React.useState(false);
  const adminTapCountRef = React.useRef(0);
  const adminTapTimerRef = React.useRef<number | null>(null);

  const handleAdminSecretTap = () => {
    // Triple-click within a short window reveals the stats button
    adminTapCountRef.current += 1;

    if (adminTapTimerRef.current) {
      window.clearTimeout(adminTapTimerRef.current);
    }

    adminTapTimerRef.current = window.setTimeout(() => {
      adminTapCountRef.current = 0;
      adminTapTimerRef.current = null;
    }, 700);

    if (adminTapCountRef.current >= 3) {
      adminTapCountRef.current = 0;
      if (adminTapTimerRef.current) {
        window.clearTimeout(adminTapTimerRef.current);
        adminTapTimerRef.current = null;
      }
      setShowStatsLink(true);
    }
  };

  React.useEffect(() => {
    return () => {
      if (adminTapTimerRef.current) {
        window.clearTimeout(adminTapTimerRef.current);
      }
    };
  }, []);

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
      const bytes = estimateAvatarBytes(dataUrl);

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isAdmin && showStatsLink && (
              <Button size="small" variant="outlined" onClick={() => navigate("/statistikk")}>
                Statistikk
              </Button>
            )}
            <Chip
              label={roleLabel}
              onClick={isAdmin ? handleAdminSecretTap : undefined}
              onMouseDown={(e) => {
                // Prevent focus/pressed visual state on click
                e.preventDefault();
              }}
              tabIndex={-1}
              sx={(theme) => ({
                cursor: "default",
                userSelect: "none",
                // Chip becomes MuiChip-clickable when onClick is provided. Lock its visual state.
                backgroundColor: theme.palette.action.selected,
                transition: "none",
                "& .MuiTouchRipple-root": {
                  display: "none",
                },
                "&.MuiChip-clickable": {
                  transition: "none",
                },
                "&.MuiChip-clickable:hover": {
                  backgroundColor: theme.palette.action.selected,
                },
                "&.MuiChip-clickable:active": {
                  backgroundColor: theme.palette.action.selected,
                  boxShadow: "none",
                },
                "&.MuiChip-clickable:focus": {
                  backgroundColor: theme.palette.action.selected,
                  boxShadow: "none",
                  outline: "none",
                },
                "&.Mui-focusVisible": {
                  backgroundColor: theme.palette.action.selected,
                  boxShadow: "none",
                  outline: "none",
                },
              })}
            />
          </Box>
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
