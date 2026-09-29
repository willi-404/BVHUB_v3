import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../app/components/ui/button";
import { AuditLogPanel } from "../features/auditLog/components/AuditLogPanel";
import { useI18n } from "../i18n";
import { routes } from "../routes/paths";

export default function ProfileAuditLogPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)]">
    <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-4">
      <Button variant="ghost" size="icon" onClick={() => navigate(routes.profile)} aria-label={t("common.back")}><ArrowLeft size={18} /></Button>
      <h1 className="text-base font-semibold">{t("audit.title")}</h1>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="mx-auto w-full max-w-3xl"><AuditLogPanel /></div>
    </main>
  </div>;
}
