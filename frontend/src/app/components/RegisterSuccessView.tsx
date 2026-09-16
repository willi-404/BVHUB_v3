import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n";
import { Card, CardContent } from "./ui/card";

export default function RegisterSuccessView() {
  const { t } = useI18n();
  const email = (useLocation().state as { email?: string } | null)?.email;
  return <div className="flex min-h-full items-center justify-center bg-background px-4 py-6"><Card className="min-w-0 max-w-md text-center"><CardContent className="p-5 md:p-8"><div className="mb-3 text-4xl text-emerald-600">✓</div><h1 className="page-title mb-3">{t("register.successTitle")}</h1><p className="break-words text-muted-foreground">{t("register.successMessage")}</p>{email && <p className="mt-3 break-words text-sm font-semibold">{email}</p>}<Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 md:min-h-9" to="/login">{t("register.goToLogin")}</Link></CardContent></Card></div>;
}
