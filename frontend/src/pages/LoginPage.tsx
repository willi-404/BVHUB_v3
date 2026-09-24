import LoginView from "../app/components/LoginView";
import { useLocation, useNavigate } from "react-router-dom";
import { PublicOnlyRoute } from "../components/ProtectedRoute";
import { safeLoginRedirect } from "../routes/guardLogic";
import BuildVersionNotice from "../features/version/BuildVersionNotice";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: unknown } | null;
  const target = safeLoginRedirect(state?.from);
  const sessionExpired = typeof window !== "undefined" && window.sessionStorage.getItem("bvhub.sessionExpired") === "1";
  return <PublicOnlyRoute><LoginView sessionExpired={sessionExpired} onLogin={() => navigate(target, { replace: true })} footerContent={<BuildVersionNotice />} /></PublicOnlyRoute>;
}
