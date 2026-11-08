import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuthUser } from "./useAuthUser";
import { useColorMode } from "../../styles/colorModeContext";
import { LogOutIcon, MoonIcon, SunIcon, UserIcon } from "../navIcons";
import styles from "../../styles/standardTekstPage.module.css";

const menuItemSx = {
  height: 44,
  minHeight: 0,
  px: 1.25,
  gap: 1.5,
  borderRadius: "12px",
} as const;

const menuIconSx = { minWidth: 0, color: "text.secondary" } as const;

const menuTextSx = { fontSize: "0.92rem", fontWeight: 500 } as const;

export function ProfileMenu() {
  const { user, loading, isAdmin, isOwner, firstName, avatarUrl } = useAuthUser();
  const { mode, toggleMode } = useColorMode();
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
        // Åpnes til høyre for avataren, nederst på linje med den, slik at den ikke dekker sidemenyen.
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: (theme) => ({
              ml: 1,
              width: 288,
              p: 0.75,
              borderRadius: "18px",
              border: "1px solid",
              borderColor: "divider",
              backgroundImage: "none",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 24px 48px rgba(2, 6, 18, 0.6)"
                  : "0 12px 40px rgba(17, 24, 39, 0.14), 0 2px 6px rgba(17, 24, 39, 0.06)",
            }),
          },
          list: { disablePadding: true },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.25, pt: 1.25, pb: 1.5 }}>
          <Avatar
            src={avatarUrl ?? undefined}
            sx={(theme) => ({
              width: 44,
              height: 44,
              fontSize: 17,
              fontWeight: 700,
              color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#9C4F6D",
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.22),
            })}
          >
            {avatarLabel}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Typography noWrap sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>
                {firstName ? firstName : "Min konto"}
              </Typography>
              <Box
                component="span"
                sx={(theme) => ({
                  flexShrink: 0,
                  px: 0.9,
                  py: 0.2,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color: theme.palette.mode === "dark" ? theme.palette.primary.main : "#9C4F6D",
                  backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.2),
                })}
              >
                {roleLabel}
              </Box>
            </Box>
            <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.4 }}>
              {user.email ?? ""}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 1.25, mb: 0.75 }} />

        <MenuItem
          sx={menuItemSx}
          onClick={() => {
            handleClose();
            navigate("/profil");
          }}
        >
          <ListItemIcon sx={menuIconSx}>
            <UserIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Min profil" slotProps={{ primary: { sx: menuTextSx } }} />
        </MenuItem>

        <MenuItem
          sx={menuItemSx}
          role="menuitemcheckbox"
          aria-checked={mode === "dark"}
          onClick={toggleMode}
        >
          <ListItemIcon sx={menuIconSx}>
            {mode === "dark" ? <MoonIcon sx={{ fontSize: 20 }} /> : <SunIcon sx={{ fontSize: 20 }} />}
          </ListItemIcon>
          <ListItemText primary="Mørk modus" slotProps={{ primary: { sx: menuTextSx } }} />
          <Switch
            size="small"
            checked={mode === "dark"}
            tabIndex={-1}
            // Raden håndterer klikket, så bryteren skal ikke utløse det en gang til.
            onClick={(e) => e.stopPropagation()}
            onChange={toggleMode}
            slotProps={{ input: { "aria-label": "Bytt mellom lys og mørk modus" } }}
          />
        </MenuItem>

        <Divider sx={{ mx: 1.25, my: 0.75 }} />

        <MenuItem
          onClick={handleLogout}
          sx={(theme) => ({
            ...menuItemSx,
            color: "error.main",
            "&:hover": { backgroundColor: alpha(theme.palette.error.main, 0.08) },
          })}
        >
          <ListItemIcon sx={{ ...menuIconSx, color: "inherit" }}>
            <LogOutIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Logg ut" slotProps={{ primary: { sx: { ...menuTextSx, color: "inherit" } } }} />
        </MenuItem>
      </Menu>
    </>
  );
}
