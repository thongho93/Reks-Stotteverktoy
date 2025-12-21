import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Divider, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuthUser } from "./useAuthUser";
import styles from "../../styles/standardTekstPage.module.css";

export function ProfileMenu() {
  const { user, loading, isAdmin, isOwner, firstName, avatarUrl } = useAuthUser();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  if (loading || !user) return null;

  const roleLabel = isOwner ? "Eier" : isAdmin ? "Admin" : "Bruker";
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
