import { Navigate, Outlet } from "react-router-dom";
import { useAuthUser } from "./useAuthUser";

export default function RequireRekspert() {
  const { loading, role } = useAuthUser();

  // Wait until auth + role is resolved
  if (loading) {
    return null;
  }

  // Allow rekspert and owner
  if (role === "rekspert" || role === "owner") {
    return <Outlet />;
  }

  // Fallback: no access
  return <Navigate to="/" replace />;
}
