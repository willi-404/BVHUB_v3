import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useAuthUser } from "../features/auth/AuthProvider";
import { isSuperAdmin } from "../lib/policy";
export default function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { status } = useAuth();
  const { data: user } = useAuthUser();
  const location = useLocation();
  if (status === "loading") return <div className="min-h-full flex items-center justify-center">Loading…</div>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  if (admin && !isSuperAdmin(user as unknown as Record<string, unknown>)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
