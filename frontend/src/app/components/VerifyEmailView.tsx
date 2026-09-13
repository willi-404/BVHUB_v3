import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n";
import { verifyEmail } from "../../features/auth/registrationService";
import { Card, CardContent } from "./ui/card";

export default function VerifyEmailView() {
  const { t } = useI18n(); const [params] = useSearchParams(); const [state, setState] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => { const token = params.get("token") || ""; if (!token) { setState("error"); return; } verifyEmail(token).then(() => setState("success")).catch(() => setState("error")); }, [params]);
  return <div className="flex min-h-full items-center justify-center bg-background p-6"><Card className="max-w-md text-center"><CardContent className="p-8">{state === "loading" && <p>{t("register.verifying")}</p>}{state === "success" && <><div className="mb-3 text-4xl text-emerald-600">✓</div><h1 className="mb-3 text-2xl font-bold">{t("register.verifiedTitle")}</h1><p className="text-muted-foreground">{t("register.verifiedMessage")}</p><Link className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90" to="/login">{t("register.goToLogin")}</Link></>}{state === "error" && <><h1 className="mb-3 text-2xl font-bold">{t("register.verifyErrorTitle")}</h1><p className="text-muted-foreground">{t("register.verifyError")}</p><Link className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90" to="/login">{t("register.goToLogin")}</Link></>}</CardContent></Card></div>;
}
