import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { verifyMemberCardToken } from "../features/memberCard/api/memberCardApi";
import { useI18n } from "../i18n";

export default function MemberVerifyPage() {
  const { t, locale } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const verification = useMutation({ mutationFn: verifyMemberCardToken });

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setStarted(true);
    if (!/^[A-Za-z0-9]{48,256}$/.test(raw)) return;
    setToken(raw);
    verification.mutate(raw);
  }, []);

  const result = verification.data;
  const valid = result?.valid === true;
  const verifiedAt = result?.verifiedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.verifiedAt)) : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-8">
      <section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm">
        {!started || verification.isPending ? <p role="status" className="text-sm text-[var(--muted-foreground)]">{t("common.loading")}</p> : valid ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl" aria-hidden="true">✓</div>
            <h1 className="text-xl font-bold text-emerald-700">{t("memberVerify.valid")}</h1>
            <div className="w-full space-y-2 text-left text-sm">
              <p><span className="font-semibold">{t("memberVerify.member")}:</span> {result.member?.displayName}</p>
              <p><span className="font-semibold">{t("memberVerify.memberId")}:</span> {result.member?.id}</p>
              <p><span className="font-semibold">{t("memberVerify.groups")}:</span> {result.member?.groups.join(", ")}</p>
              <p><span className="font-semibold">{t("memberVerify.verifiedAt")}:</span> {verifiedAt}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl" aria-hidden="true">×</div>
            <h1 className="text-xl font-bold text-red-700">{t("memberVerify.invalid")}</h1>
            <button type="button" onClick={() => token && verification.mutate(token)} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]">{t("memberVerify.retry")}</button>
          </div>
        )}
      </section>
    </main>
  );
}
