import LoginView from "../app/components/LoginView";
import { useLocation, useNavigate } from "react-router-dom";
import { PublicOnlyRoute } from "../routes/guards";
import { safeLoginRedirect } from "../routes/guardLogic";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: unknown } | null;
  const target = safeLoginRedirect(state?.from);
  const sessionExpired = typeof window !== "undefined" && window.sessionStorage.getItem("bvhub.sessionExpired") === "1";
  return <PublicOnlyRoute><LoginView sessionExpired={sessionExpired} onLogin={() => navigate(target, { replace: true })} /></PublicOnlyRoute>;
}
