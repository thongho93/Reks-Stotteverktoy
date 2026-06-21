import { Navigate, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthUser } from "./useAuthUser";

interface RequireOwnerProps {
  children?: ReactNode;
}

/**
 * Gater ruter som kun skal være tilgjengelige for Eier-profilen (isOwner).
 * Andre roller (admin, rekspert, bruker) sendes til forsiden.
 */
export default function RequireOwner({ children }: RequireOwnerProps) {
  const { loading, isOwner, isApproved } = useAuthUser() as any;

  // Vent til auth + rolle er ferdig oppløst.
  if (loading) {
    return null;
  }

  if (isApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (isOwner) {
    return children ? <>{children}</> : <Outlet />;
  }

  return <Navigate to="/" replace />;
}
