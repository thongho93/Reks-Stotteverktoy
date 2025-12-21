import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuthUser } from "./useAuthUser";
import styles from "../../styles/standardTekstPage.module.css";

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