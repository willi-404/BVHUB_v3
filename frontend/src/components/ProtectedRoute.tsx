import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useAuthUser } from "../features/auth/AuthProvider";
import { isAdminRole } from "../features/auth/policy";
import { pb } from "../lib/pocketbase";
import { useI18n } from "../i18n";
export default function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { status } = useAuth();
  const { data: user } = useAuthUser();
  const { t } = useI18n();
  const location = useLocation();
  const serverSession = useQuery({
    queryKey: ["auth", "server-session"],
    queryFn: async () => {
      const id = pb.authStore.record?.id;
      if (typeof id !== "string" || !id) throw new Error("Missing authenticated user");
      return pb.collection("users").getOne(id, { fields: "id" });
    },
    enabled: status === "authenticated" && pb.authStore.isValid,
    // 30 seconds reduces repeated session requests while keeping auth state reasonably fresh.
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (serverSession.isError) pb.authStore.clear();
  }, [serverSession.isError]);

  if (status === "loading") return <div className="min-h-full flex items-center justify-center">{t("common.loading")}</div>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  if (serverSession.isPending) return <div className="min-h-full flex items-center justify-center">{t("common.loading")}</div>;
  if (serverSession.isError) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  if (admin && !isAdminRole(user?.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
