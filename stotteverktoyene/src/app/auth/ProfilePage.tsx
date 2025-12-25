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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TableContainer,
} from "@mui/material";
import {
  setDoc,
  doc,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  deleteDoc,
  getDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuthUser } from "./useAuthUser";
import styles from "../../styles/standardTekstPage.module.css";
import { compressAvatarToDataUrl, estimateAvatarBytes } from "../../app/auth/avatarUtils";

const OWNER_UID = (import.meta as any)?.env?.VITE_OWNER_UID || "uFRgce8mJjaVeDjqyJZ0wsiLqNo2";

type RegisteredUserRow = {
  uid: string;
  firstName: string;
  email: string;
  role: "Eier" | "Admin" | "Rekspert" | "Bruker";
  isRekspert: boolean;
  approved: boolean; // true if approved is true or missing; false if approved === false
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isOwner, firstName, avatarUrl } = useAuthUser();

  const [draftFirstName, setDraftFirstName] = React.useState<string>(firstName ?? "");
  const [draftAvatarUrl, setDraftAvatarUrl] = React.useState<string>(avatarUrl ?? "");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const [registeredUsers, setRegisteredUsers] = React.useState<RegisteredUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [usersError, setUsersError] = React.useState<string | null>(null);

  const [showStatsLink, setShowStatsLink] = React.useState(false);
  const adminTapCountRef = React.useRef(0);
  const adminTapTimerRef = React.useRef<number | null>(null);
  const [usersOpen, setUsersOpen] = React.useState(false);

  const [deleteUserTarget, setDeleteUserTarget] = React.useState<RegisteredUserRow | null>(null);
  const [deletingUser, setDeletingUser] = React.useState(false);
  const [deleteUserError, setDeleteUserError] = React.useState<string | null>(null);
  const [approvingUid, setApprovingUid] = React.useState<string | null>(null);
  const [approveError, setApproveError] = React.useState<string | null>(null);
  const [promotingUid, setPromotingUid] = React.useState<string | null>(null);
  const [promoteError, setPromoteError] = React.useState<string | null>(null);
  const [promotingRekspertUid, setPromotingRekspertUid] = React.useState<string | null>(null);
  const [rekspertError, setRekspertError] = React.useState<string | null>(null);
  const [demotingUid, setDemotingUid] = React.useState<string | null>(null);
  const [demoteError, setDemoteError] = React.useState<string | null>(null);
  const demoteFromAdmin = async (target: RegisteredUserRow) => {
    if (!user) return;
    if (!isOwner) return;

    setDemotingUid(target.uid);
    setDemoteError(null);

    try {
      await deleteDoc(doc(db, "admins", target.uid));

      setRegisteredUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, role: "Bruker" } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke fjerne admin-rollen.";
      setDemoteError(msg);
    } finally {
      setDemotingUid(null);
    }
  };

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

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isAdmin) return;
      setLoadingUsers(true);
      setUsersError(null);

      try {
        // Read from /users collection (requires Firestore rules to allow admin read)
        const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200));

        // admins collection: doc id == uid; owners collection: doc id == uid
        const [usersSnap, adminsSnap, ownersSnap, rootOwnerSnap] = await Promise.all([
          getDocs(usersQ),
          getDocs(collection(db, "admins")),
          getDocs(collection(db, "owners")),
          getDoc(doc(db, "owners", OWNER_UID)),
        ]);

        const adminIds = new Set<string>();
        const adminEmails = new Set<string>();
        const ownerIds = new Set<string>();

        const rolesMap: Record<string, string> =
          rootOwnerSnap.exists() && (rootOwnerSnap.data() as any)?.roles
            ? (rootOwnerSnap.data() as any).roles
            : {};

        adminsSnap.forEach((d) => {
          adminIds.add(d.id);
          const data = d.data() as any;

          if (typeof data?.uid === "string" && data.uid) {
            adminIds.add(data.uid);
          }

          if (typeof data?.email === "string" && data.email) {
            adminEmails.add(String(data.email).toLowerCase());
          }
        });

        ownersSnap.forEach((d) => {
          ownerIds.add(d.id);
        });

        const rows: RegisteredUserRow[] = usersSnap.docs.map((d) => {
          const data = d.data() as any;
          const firstName = typeof data.firstName === "string" ? data.firstName : "";
          const email = typeof data.email === "string" ? data.email : "";
          const emailLower = email ? email.toLowerCase() : "";
          const isOwnerRow = ownerIds.has(d.id);
          const isAdminRow = adminIds.has(d.id) || (emailLower && adminEmails.has(emailLower));
          const isRekspertRow = rolesMap?.[d.id] === "rekspert";

          const role: RegisteredUserRow["role"] = isOwnerRow
            ? "Eier"
            : isAdminRow
            ? "Admin"
            : isRekspertRow
            ? "Rekspert"
            : "Bruker";

          // Approval: approved === false => waiting; missing/true => active
          const approvedRaw = data?.approved;
          const approved = approvedRaw !== false;

          return { uid: d.id, firstName, email, role, isRekspert: isRekspertRow, approved };
        });

        // Sort by role priority (Eier, Admin, Bruker), then firstName, then email
        const roleRank = (r: RegisteredUserRow["role"]) =>
          r === "Eier" ? 0 : r === "Admin" ? 1 : r === "Rekspert" ? 2 : 3;

        rows.sort((a, b) => {
          const rr = roleRank(a.role) - roleRank(b.role);
          if (rr !== 0) return rr;
          const n = a.firstName.localeCompare(b.firstName, "nb");
          if (n !== 0) return n;
          return a.email.localeCompare(b.email, "nb");
        });

        if (!cancelled) setRegisteredUsers(rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Kunne ikke hente brukere.";
        if (!cancelled) setUsersError(msg);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

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

  const roleLabel = isOwner ? "Eier" : isAdmin ? "Admin" : null;

  const canDeleteUserRow = (target: RegisteredUserRow) => {
    // Safety: do not allow deleting yourself from the users collection
    if (target.uid === user.uid) return false;

    // Owner can delete any users-doc
    if (isOwner) return true;

    // Non-owner admins can only delete regular users
    return target.role === "Bruker";
  };

  const canOpenDeleteDialog = (target: RegisteredUserRow) => {
    // Only admins see the list, but keep the check explicit
    if (!isAdmin) return false;
    return canDeleteUserRow(target);
  };

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

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;

    // UI + security guard: prevent non-owner admins from deleting Owner/Admin or self
    if (!canDeleteUserRow(deleteUserTarget)) {
      setDeleteUserError("Du har ikke tilgang til å slette denne brukeren.");
      return;
    }

    setDeletingUser(true);
    setDeleteUserError(null);

    try {
      await deleteDoc(doc(db, "users", deleteUserTarget.uid));
      setRegisteredUsers((prev) => prev.filter((u) => u.uid !== deleteUserTarget.uid));
      setDeleteUserTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke slette brukeren.";
      setDeleteUserError(msg);
    } finally {
      setDeletingUser(false);
    }
  };

  const approveUser = async (target: RegisteredUserRow) => {
    if (!user) return;

    setApprovingUid(target.uid);
    setApproveError(null);

    try {
      await updateDoc(doc(db, "users", target.uid), {
        approved: true,
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
      });

      setRegisteredUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, approved: true } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke godkjenne brukeren.";
      setApproveError(msg);
    } finally {
      setApprovingUid(null);
    }
  };

  const promoteToAdmin = async (target: RegisteredUserRow) => {
    if (!user) return;

    setPromotingUid(target.uid);
    setPromoteError(null);

    try {
      await setDoc(
        doc(db, "admins", target.uid),
        {
          uid: target.uid,
          email: (target.email || "").toLowerCase(),
          promotedAt: serverTimestamp(),
          promotedBy: user.uid,
        },
        { merge: true }
      );

      setRegisteredUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, role: "Admin" } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke promotere brukeren til admin.";
      setPromoteError(msg);
    } finally {
      setPromotingUid(null);
    }
  };

  const promoteToRekspert = async (target: RegisteredUserRow) => {
    if (!user) return;
    if (!isOwner) return;

    setPromotingRekspertUid(target.uid);
    setRekspertError(null);

    try {
      await updateDoc(doc(db, "owners", OWNER_UID), {
        [`roles.${target.uid}`]: "rekspert",
      });
      setRegisteredUsers((prev) =>
        prev.map((u) =>
          u.uid === target.uid
            ? { ...u, role: u.role === "Eier" ? "Eier" : u.role, isRekspert: true }
            : u
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke gi rekspert-rollen.";
      setRekspertError(msg);
    } finally {
      setPromotingRekspertUid(null);
    }
  };

  const demoteFromRekspert = async (target: RegisteredUserRow) => {
    if (!user) return;
    if (!isOwner) return;

    setPromotingRekspertUid(target.uid);
    setRekspertError(null);

    try {
      await updateDoc(doc(db, "owners", OWNER_UID), {
        [`roles.${target.uid}`]: deleteField(),
      });
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, isRekspert: false } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunne ikke fjerne rekspert-rollen.";
      setRekspertError(msg);
    } finally {
      setPromotingRekspertUid(null);
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
            {roleLabel && (
              <Chip
                label={roleLabel}
                onClick={isAdmin ? handleAdminSecretTap : undefined}
                onMouseDown={(e) => {
                  // Prevent focus/pressed visual state on click
                  e.preventDefault();
                }}
                tabIndex={-1}
                sx={(theme) => {
                  const ownerBg = theme.palette.secondary.dark;
                  const adminBg = theme.palette.action.selected;
                  const bg = isOwner ? ownerBg : adminBg;
                  const fg = isOwner ? theme.palette.getContrastText(ownerBg) : "inherit";

                  return {
                    cursor: "default",
                    userSelect: "none",
                    backgroundColor: bg,
                    color: fg,
                    transition: "none",
                    "& .MuiTouchRipple-root": {
                      display: "none",
                    },
                    "&.MuiChip-clickable": {
                      transition: "none",
                    },
                    "&.MuiChip-clickable:hover": {
                      backgroundColor: bg,
                    },
                    "&.MuiChip-clickable:active": {
                      backgroundColor: bg,
                      boxShadow: "none",
                    },
                    "&.MuiChip-clickable:focus": {
                      backgroundColor: bg,
                      boxShadow: "none",
                      outline: "none",
                    },
                    "&.Mui-focusVisible": {
                      backgroundColor: bg,
                      boxShadow: "none",
                      outline: "none",
                    },
                  };
                }}
              />
            )}
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
      {isAdmin && (
        <Paper
          className={styles.authPaper}
          sx={{
            mt: 3,
            width: "100%",
            maxWidth: 980,
          }}
        >
          <Typography variant="h3" sx={{ mb: 2 }}>
            Registrerte brukere
          </Typography>

          <Accordion
            expanded={usersOpen}
            onChange={(_, expanded) => setUsersOpen(expanded)}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary sx={{ px: 2, py: 0.5 }}>
              <Typography variant="h5">Liste</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
              {usersError && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {usersError}
                </Alert>
              )}

              {loadingUsers ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : (
                <>
                  {approveError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      {approveError}
                    </Alert>
                  )}
                  {promoteError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      {promoteError}
                    </Alert>
                  )}
                  {demoteError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      {demoteError}
                    </Alert>
                  )}
                  {rekspertError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>
                      {rekspertError}
                    </Alert>
                  )}

                  <TableContainer
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      overflowX: "auto",
                    }}
                  >
                    <Table
                      size="small"
                      aria-label="registrerte brukere"
                      sx={{
                        tableLayout: "auto",
                        width: "max-content",
                        "& th, & td": { px: 1.25 },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 50, whiteSpace: "nowrap" }}>Fornavn</TableCell>
                          <TableCell sx={{ width: 260, whiteSpace: "nowrap" }}>E-post</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", minWidth: 30 }}>Rolle</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", minWidth: 30 }}>Status</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", minWidth: 150 }}>
                            Handling
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {registeredUsers.map((u) => (
                          <TableRow key={u.uid}>
                            <TableCell sx={{ width: 50, whiteSpace: "nowrap" }}>
                              {u.firstName || "-"}
                            </TableCell>
                            <TableCell sx={{ width: 260 }}>
                              <Typography
                                variant="body2"
                                noWrap
                                title={u.email || ""}
                                sx={{ width: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {u.email || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap", minWidth: 30 }}>
                              {u.role}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap", minWidth: 30 }}>
                              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: u.approved ? "success.main" : "warning.main",
                                  }}
                                />
                                <Typography variant="body2">
                                  {u.approved ? "Aktiv" : "Venter"}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap", minWidth: 150 }}>
                              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                {!u.approved && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => approveUser(u)}
                                    disabled={
                                      Boolean(approvingUid) || Boolean(promotingUid) || deletingUser
                                    }
                                  >
                                    {approvingUid === u.uid ? "Godkjenner..." : "Godkjenn"}
                                  </Button>
                                )}

                                {u.role === "Bruker" && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => promoteToAdmin(u)}
                                    disabled={
                                      Boolean(approvingUid) ||
                                      Boolean(promotingUid) ||
                                      Boolean(demotingUid) ||
                                      deletingUser
                                    }
                                  >
                                    {promotingUid === u.uid ? "Promoterer..." : "Gjør admin"}
                                  </Button>
                                )}

                                {isOwner && u.role === "Admin" && (
                                  <Button
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    onClick={() => demoteFromAdmin(u)}
                                    disabled={
                                      Boolean(approvingUid) ||
                                      Boolean(promotingUid) ||
                                      Boolean(demotingUid) ||
                                      deletingUser
                                    }
                                  >
                                    {demotingUid === u.uid ? "Fjerner..." : "Fjern admin"}
                                  </Button>
                                )}

                                {canOpenDeleteDialog(u) && (
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => {
                                      setDeleteUserError(null);
                                      setDeleteUserTarget(u);
                                    }}
                                    disabled={
                                      deletingUser ||
                                      Boolean(approvingUid) ||
                                      Boolean(promotingUid) ||
                                      Boolean(demotingUid)
                                    }
                                  >
                                    Slett
                                  </Button>
                                )}

                                {isOwner &&
                                  (u.role === "Bruker" || u.role === "Admin") &&
                                  !u.isRekspert && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => promoteToRekspert(u)}
                                      disabled={
                                        Boolean(approvingUid) ||
                                        Boolean(promotingUid) ||
                                        Boolean(demotingUid) ||
                                        Boolean(promotingRekspertUid) ||
                                        deletingUser
                                      }
                                    >
                                      {promotingRekspertUid === u.uid
                                        ? "Oppdaterer..."
                                        : "Gjør rekspert"}
                                    </Button>
                                  )}

                                {isOwner && u.isRekspert && u.role !== "Eier" && (
                                  <Button
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    onClick={() => demoteFromRekspert(u)}
                                    disabled={
                                      Boolean(approvingUid) ||
                                      Boolean(promotingUid) ||
                                      Boolean(demotingUid) ||
                                      Boolean(promotingRekspertUid) ||
                                      deletingUser
                                    }
                                  >
                                    {promotingRekspertUid === u.uid
                                      ? "Oppdaterer..."
                                      : "Fjern rekspert"}
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!usersError && registeredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography color="text.secondary">Ingen brukere funnet.</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                Kun administratorer kan se denne listen.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}
      <Dialog
        open={Boolean(deleteUserTarget)}
        onClose={() => {
          if (deletingUser) return;
          setDeleteUserTarget(null);
          setDeleteUserError(null);
        }}
      >
        <DialogTitle>Slett bruker</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Dette sletter kun brukerdokumentet i databasen (users/{"{uid}"}). Det sletter ikke selve
            innloggingen.
          </DialogContentText>

          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2">Bruker: {deleteUserTarget?.firstName || "-"}</Typography>
            <Typography variant="body2">E-post: {deleteUserTarget?.email || "-"}</Typography>
          </Box>

          {!deleteUserTarget ? null : !canDeleteUserRow(deleteUserTarget) ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Du kan ikke slette denne brukeren.
            </Alert>
          ) : null}

          {deleteUserError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {deleteUserError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (deletingUser) return;
              setDeleteUserTarget(null);
              setDeleteUserError(null);
            }}
            disabled={deletingUser}
          >
            Avbryt
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDeleteUser}
            disabled={deletingUser || !deleteUserTarget || !canDeleteUserRow(deleteUserTarget)}
          >
            {deletingUser ? "Sletter..." : "Slett"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
