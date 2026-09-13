import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../i18n";
import { Card, CardContent } from "./ui/card";

export default function RegisterSuccessView() {
  const { t } = useI18n();
  const email = (useLocation().state as { email?: string } | null)?.email;
  return <div className="flex min-h-full items-center justify-center bg-background p-6"><Card className="max-w-md text-center"><CardContent className="p-8"><div className="mb-3 text-4xl text-emerald-600">✓</div><h1 className="mb-3 text-2xl font-bold">{t("register.successTitle")}</h1><p className="text-muted-foreground">{t("register.successMessage")}</p>{email && <p className="mt-3 text-sm font-semibold">{email}</p>}<Link className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90" to="/login">{t("register.goToLogin")}</Link></CardContent></Card></div>;
}
