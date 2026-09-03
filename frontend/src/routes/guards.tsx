import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useAuthUser } from "../features/auth/AuthProvider";
import { isAdminRole, type Role } from "../features/auth/policy";
import { canAccessRole, publicRouteDecision, protectedRouteDecision } from "./guardLogic";

function LoadingView() {
  return (
    <div className="min-h-full flex items-center justify-center bg-[var(--background)] text-sm text-[var(--muted-foreground)]">
      Anmeldung wird geprüft …
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  const decision = protectedRouteDecision(status);
  if (decision === "loading") return <LoadingView />;
  if (decision === "login") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const decision = publicRouteDecision(status);
  if (decision === "loading") return <LoadingView />;
  if (decision === "dashboard") return <Navigate to="/dashboard" replace />;
  return children;
}

export function RoleGuard({ roles }: { roles: readonly Role[] }) {
  const { data: user } = useAuthUser();
  if (!user || !canAccessRole(user.role, roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function AdminGuard() {
  const { data: user } = useAuthUser();
  if (!user || !isAdminRole(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
