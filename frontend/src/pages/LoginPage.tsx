import LoginView from "../app/components/LoginView";
import { useLocation, useNavigate } from "react-router-dom";
import { PublicOnlyRoute } from "../routes/guards";
import { safeLoginRedirect } from "../routes/guardLogic";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: unknown } | null;
  const target = safeLoginRedirect(state?.from);
  return <PublicOnlyRoute><LoginView onLogin={() => navigate(target, { replace: true })} /></PublicOnlyRoute>;
}
