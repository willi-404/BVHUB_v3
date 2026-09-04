import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n";

export default function RegisterSuccessView() {
  const { t } = useI18n();
  const email = (useLocation().state as { email?: string } | null)?.email;
  return <div className="min-h-full flex items-center justify-center p-6 bg-[var(--background)]"><div className="max-w-md text-center bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] p-8"><div className="text-emerald-600 text-4xl mb-3">✓</div><h1 className="text-2xl font-700 mb-3">{t("register.successTitle")}</h1><p className="text-[var(--muted-foreground)]">{t("register.successMessage")}</p>{email && <p className="text-sm mt-3 font-600">{email}</p>}<Link to="/login" className="inline-block mt-6 text-[var(--primary)] font-600 hover:underline">{t("register.goToLogin")}</Link></div></div>;
}
