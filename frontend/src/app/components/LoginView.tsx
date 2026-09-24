import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import logoSrc from "../../imports/logo1-high-resolution.png";
import { useAuth } from "../../features/auth/AuthProvider";
import { AuthServiceError, authErrorCodes } from "../../features/auth/authService";
import { LanguageSwitcher, useI18n } from "../../i18n";

interface LoginViewProps {
  onLogin?: () => void;
  sessionExpired?: boolean;
  footerContent?: ReactNode;
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const icons = {
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
};

export default function LoginView({ onLogin, sessionExpired = false, footerContent }: LoginViewProps) {
  const { getAccountStatus, requestOtp, verifyOtp, loginWithPassword } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpId, setOtpId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sessionExpired) setNotice(t("auth.sessionExpired"));
  }, [sessionExpired]);

  function switchMode(nextMode: "otp" | "password") {
    setMode(nextMode);
    setError("");
    setNotice("");
    setOtpId(null);
    setOtp("");
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError(t("auth.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      if (!otpId) {
        const accountStatus = await getAccountStatus(email);
        if (accountStatus === "not_found") {
          setError(t("auth.accountNotFound"));
          return;
        }
        if (accountStatus === "pending_verification") {
          setError(t("auth.accountPendingVerification"));
          return;
        }
        if (accountStatus === "inactive") {
          setError(t("auth.accountInactive"));
          return;
        }
        const nextOtpId = await requestOtp(email);
        setOtpId(nextOtpId);
        setNotice(t("auth.codeSent"));
      } else if (otp.trim()) {
        await verifyOtp(otpId, otp);
        onLogin?.();
      } else {
        setError(t("auth.genericError"));
      }
    } catch (error) {
      if (error instanceof AuthServiceError && error.code === authErrorCodes.invalidEmail) setError(t("auth.invalidEmail"));
      else if (error instanceof AuthServiceError && error.code === authErrorCodes.otpAccountUnavailable) setError(t("auth.otpAccountUnavailable"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError(t("auth.genericError"));
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(email, password);
      onLogin?.();
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-full px-4 py-4 md:px-8 md:py-8"
      style={{
        background: "#f4f7f5",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
        <div className="flex justify-end text-[var(--foreground)]">
          <LanguageSwitcher />
        </div>
        <main className="grid flex-1 items-center gap-8 py-8 md:grid-cols-2 md:gap-12 lg:gap-20">
          <section className="flex min-h-72 flex-col justify-center rounded-xl bg-[#0f2d1a] p-8 text-white shadow-sm md:min-h-[31rem] md:p-12">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-1.5">
              <img src={logoSrc} alt={t("brand.logoAlt")} className="h-full w-full object-contain" />
            </div>
            <h1 className="page-title mt-6 max-w-sm tracking-tight">{t("brand.name")}</h1>
            <p className="mt-2 text-sm text-white/65">{t("brand.portal")}</p>
          </section>

          <div className="w-full max-w-md justify-self-center md:justify-self-start">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">{mode === "otp" ? t("auth.otpTitle") : t("auth.adminLogin")}</CardTitle>
                <CardDescription>{mode === "otp" ? t("auth.otpDescription") : t("auth.adminDescription")}</CardDescription>
              </CardHeader>
              <CardContent>

                <form onSubmit={mode === "otp" ? handleOtpSubmit : handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-identity" className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{mode === "otp" ? t("auth.email") : t("auth.identity")}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"><Icon d={icons.mail} size={15} /></span>
                  <Input
                    id="login-identity"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="h-11 pl-9 pr-3"
                  />
                </div>
              </div>

              {mode === "otp" && otpId && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-code" className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{t("auth.code")}</label>
                  <Input
                    id="login-code"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    autoComplete="one-time-code"
                    className="h-11"
                  />
                </div>
              )}

              {mode === "password" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-password" className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{t("auth.password")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"><Icon d={icons.lock} size={15} /></span>
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="h-11 pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-[var(--muted-foreground)]" aria-label={t("auth.togglePassword")}>
                      <Icon d={showPassword ? icons.eyeOff : icons.eye} size={15} />
                    </button>
                  </div>
                </div>
              )}

              {notice && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{notice}</p>}
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

              <Button type="submit" size="lg" className="w-full mt-1 gap-2" disabled={loading}>
                {loading ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{t("auth.signIn")} …</> : <>{mode === "otp" ? (otpId ? t("auth.verifyCode") : t("auth.sendCode")) : t("auth.passwordLogin")}<Icon d={icons.arrowRight} size={16} /></>}
              </Button>
                </form>

                <div className="mt-5 h-px w-full bg-[var(--border)]" />
                <button type="button" onClick={() => switchMode(mode === "otp" ? "password" : "otp")} className="mt-4 w-full text-center text-xs font-semibold text-[var(--primary)] hover:underline">
                  {mode === "otp" ? t("auth.switchPassword") : t("auth.switchOtp")}
                </button>
                {mode === "otp" && otpId && <button type="button" onClick={() => { setOtpId(null); setOtp(""); setNotice(""); setError(""); }} className="mt-3 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{t("auth.retry")}</button>}
                <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">{t("auth.noAccount")} <Link to="/register" className="font-semibold text-[var(--primary)] hover:underline">{t("auth.register")}</Link></p>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-[10px] text-[var(--muted-foreground)]">{t("brand.footer")}</p>
            {footerContent}
          </div>
        </main>
      </div>
    </div>
  );
}
