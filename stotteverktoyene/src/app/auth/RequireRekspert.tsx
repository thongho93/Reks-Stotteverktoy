import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthUser } from "./useAuthUser";
import type { ReactNode } from "react";

interface RequireRekspertProps {
  children?: ReactNode;
}

export default function RequireRekspert({ children }: RequireRekspertProps) {
  const location = useLocation();

  // Pull everything we might need for debugging.
  // (If some fields don't exist in your hook, TS will complain and we'll adjust.)
  const {
    loading,
    role,
    user,
    isOwner,
    isAdmin,
    isRekspert,
    isApproved,
    firstName,
  } = useAuthUser() as any;

  // Log when the resolved state changes
  React.useEffect(() => {
    if (loading) return;

    // eslint-disable-next-line no-console
    console.groupCollapsed("[RequireRekspert] access check");
    // eslint-disable-next-line no-console
    console.log("path:", location.pathname);
    // eslint-disable-next-line no-console
    console.log("loading:", loading);
    // eslint-disable-next-line no-console
    console.log("role:", role, "(note: role prioritizes admin over rekspert)");
    // eslint-disable-next-line no-console
    console.log("isOwner:", isOwner);
    // eslint-disable-next-line no-console
    console.log("isAdmin:", isAdmin);
    // eslint-disable-next-line no-console
    console.log("isRekspert:", isRekspert);
    // eslint-disable-next-line no-console
    console.log("isApproved:", isApproved);
    // eslint-disable-next-line no-console
    console.log("user:", {
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      firstName,
    });
    // eslint-disable-next-line no-console
    console.groupEnd();
  }, [
    loading,
    role,
    isOwner,
    isAdmin,
    isRekspert,
    isApproved,
    user?.uid,
    user?.email,
    firstName,
    location.pathname,
  ]);

  // Wait until auth + role is resolved
  if (loading) {
    return null;
  }

  // Optional: if you want to gate on approval, keep this. Otherwise remove.
  if (isApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Allow rekspert and owner (admin alone should NOT pass)
  // NOTE: `role` is a single string and can be "admin" even when the user is ALSO rekspert.
  // Therefore, rely on boolean flags, but keep a small safety net for `role === "rekspert"`.
  const hasRekspertAccess = Boolean(isRekspert) || role === "rekspert" || Boolean(isOwner);

  if (hasRekspertAccess) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Fallback: no access
  return <Navigate to="/" replace />;
}
