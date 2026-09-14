import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n";
import { verifyEmail } from "../../features/auth/registrationService";
import { Card, CardContent } from "./ui/card";

export default function VerifyEmailView() {
  const { t } = useI18n(); const [params] = useSearchParams(); const [state, setState] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => { const token = params.get("token") || ""; if (!token) { setState("error"); return; } verifyEmail(token).then(() => setState("success")).catch(() => setState("error")); }, [params]);
  return <div className="flex min-h-full items-center justify-center bg-background px-4 py-6"><Card className="min-w-0 max-w-md text-center"><CardContent className="p-5 md:p-8">{state === "loading" && <p>{t("register.verifying")}</p>}{state === "success" && <><div className="mb-3 text-4xl text-emerald-600">✓</div><h1 className="page-title mb-3">{t("register.verifiedTitle")}</h1><p className="break-words text-muted-foreground">{t("register.verifiedMessage")}</p><Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 md:min-h-9" to="/login">{t("register.goToLogin")}</Link></>}{state === "error" && <><h1 className="page-title mb-3">{t("register.verifyErrorTitle")}</h1><p className="break-words text-muted-foreground">{t("register.verifyError")}</p><Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 md:min-h-9" to="/login">{t("register.goToLogin")}</Link></>}</CardContent></Card></div>;
}
