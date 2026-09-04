import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n";
import { verifyEmail } from "../../features/auth/registrationService";

export default function VerifyEmailView() {
  const { t } = useI18n(); const [params] = useSearchParams(); const [state, setState] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => { const token = params.get("token") || ""; if (!token) { setState("error"); return; } verifyEmail(token).then(() => setState("success")).catch(() => setState("error")); }, [params]);
  return <div className="min-h-full flex items-center justify-center p-6 bg-[var(--background)]"><div className="max-w-md text-center bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] p-8">{state === "loading" && <p>{t("register.verifying")}</p>}{state === "success" && <><div className="text-emerald-600 text-4xl mb-3">✓</div><h1 className="text-2xl font-700 mb-3">{t("register.verifiedTitle")}</h1><p className="text-[var(--muted-foreground)]">{t("register.verifiedMessage")}</p><Link to="/login" className="inline-block mt-6 text-[var(--primary)] font-600 hover:underline">{t("register.goToLogin")}</Link></>}{state === "error" && <><h1 className="text-2xl font-700 mb-3">{t("register.verifyErrorTitle")}</h1><p className="text-[var(--muted-foreground)]">{t("register.verifyError")}</p><Link to="/login" className="inline-block mt-6 text-[var(--primary)] font-600 hover:underline">{t("register.goToLogin")}</Link></>}</div></div>;
}
