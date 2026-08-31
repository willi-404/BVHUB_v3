import { useState } from "react";
import { Button } from "./ui/button";
import logoSrc from "../imports/logo1-high-resolution.png";

interface LoginViewProps {
  onLogin: () => void;
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
  shuttle: "M12 2L8 8H4l4 6-2 8 6-4 6 4-2-8 4-6h-4z",
};

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 900);
  }

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(160deg, #0a1f10 0%, #0f2d1a 40%, #14532d 80%, #1a6b38 100%)",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Decorative orbs */}
      <div style={{ position: "fixed", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-100px", left: "-60px", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

      <div className="w-full max-w-sm relative">
        {/* Logo + club name */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 overflow-hidden p-1.5 backdrop-blur-sm">
            <img src={logoSrc} alt="BV Erlangen Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-white font-700 text-xl tracking-tight text-center">Badminton Verein Erlangen</h1>
          <p className="text-white/50 text-xs mt-1">n.e.V. · Member Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius)] border border-white/10 shadow-2xl" style={{ background: "rgba(255,255,255,0.97)" }}>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-700 text-[var(--foreground)]">Sign in</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Welcome back — use your member credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-600 text-[var(--muted-foreground)] uppercase tracking-wide">
                  Email or Member ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    <Icon d={icons.mail} size={15} />
                  </span>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.chen@email.com"
                    autoComplete="username"
                    className="w-full h-11 pl-9 pr-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-600 text-[var(--muted-foreground)] uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-[var(--primary)] font-500 hover:underline"
                    tabIndex={-1}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    <Icon d={icons.lock} size={15} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 pl-9 pr-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    tabIndex={-1}
                  >
                    <Icon d={showPassword ? icons.eyeOff : icons.eye} size={15} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-[var(--radius-sm)] px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-1 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <Icon d={icons.arrowRight} size={16} />
                  </>
                )}
              </Button>
            </form>

            <Separator />

            <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
              Not a member yet?{" "}
              <button className="text-[var(--primary)] font-600 hover:underline">
                Contact the club
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/25 text-[10px] mt-6">
          Badminton Verein Erlangen n.e.V. · Est. 2025
        </p>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-px w-full bg-[var(--border)] mt-5" />;
}
