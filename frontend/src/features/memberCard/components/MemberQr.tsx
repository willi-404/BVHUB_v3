import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "../../../i18n";
import { useMemberCardQr } from "../hooks/useMemberCardQr";

function secondsUntil(value: string): number {
  return Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 1000));
}

export default function MemberQr() {
  const { t } = useI18n();
  const query = useMemberCardQr();
  const data = query.data;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const expired = Boolean(data && Date.parse(data.expiresAt) <= now);
  const refreshPending = Boolean(data && query.isFetching && !expired);

  if (query.isPending && !data) return <p role="status" className="text-xs text-white/60">{t("memberCard.qrLoading")}</p>;
  if ((query.isError && !data) || !data) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p role="alert" className="text-xs text-white/70">{t("memberCard.qrUnavailable")}</p>
        <button type="button" onClick={() => void query.refetch()} className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">{t("memberVerify.retry")}</button>
      </div>
    );
  }
  if (expired) return <p role="status" className="text-xs text-white/70">{t("memberCard.qrExpired")}</p>;

  const qrValue = `${window.location.origin}/member/verify#${data.token}`;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-4" data-testid="member-card-qr">
        <QRCodeSVG value={qrValue} size={160} level="M" marginSize={4} bgColor="#ffffff" fgColor="#0f2d1a" />
      </div>
      <p className="text-center text-[10px] font-medium leading-snug text-white/65">
        {refreshPending ? t("memberCard.qrRefresh") : t("memberCard.qrExpiresIn", { seconds: secondsUntil(data.expiresAt) })}
      </p>
      {query.isError && <p role="status" className="text-center text-[10px] text-white/50">{t("memberCard.qrRefresh")}</p>}
    </div>
  );
}
