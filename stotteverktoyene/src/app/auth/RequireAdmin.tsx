import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import type { ReactNode } from "react";

import styles from "../../styles/standardTekstPage.module.css";
import { useAuthUser } from "./useAuthUser";

interface RequireAdminProps {
  children?: ReactNode;
}

/**
 * Gater ruter som kun skal være tilgjengelige for admin (og eier, som alltid er admin).
 * Speiler lesereglene i firestore.rules, der usage_daily kun kan leses av isAdmin().
 * Andre roller (rekspert, bruker) sendes til forsiden.
 */
export default function RequireAdmin({ children }: RequireAdminProps) {
  const { loading, isAdmin, isApproved } = useAuthUser();

  // Vent til auth + rolle er ferdig oppløst.
  if (loading) {
    return (
      <Box className={styles.authLoadingWrap}>
        <CircularProgress />
      </Box>
    );
  }

  if (isApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (isAdmin) {
    return children ? <>{children}</> : <Outlet />;
  }

  return <Navigate to="/" replace />;
}
