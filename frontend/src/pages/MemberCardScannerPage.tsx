import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Home, RotateCcw, ScanLine, ShieldAlert, StopCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../app/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../app/components/ui/breadcrumb";
import { Button } from "../app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../app/components/ui/card";
import { Separator } from "../app/components/ui/separator";
import { Skeleton } from "../app/components/ui/skeleton";
import { MemberDetailContent } from "../app/components/shared/MemberDetailContent";
import { useI18n } from "../i18n";
import { verifyAdminMemberCard } from "../features/memberCardScanner/api/adminMemberCardApi";
import { defaultScannerFactory, parseMemberCardToken, type ScannerFactory, type ScannerInstance } from "../features/memberCardScanner/hooks/qrScannerAdapter";
import type { AdminMemberCardScanResult } from "../features/memberCardScanner/types";

type Phase = "idle" | "camera-starting" | "scanning" | "verifying" | "result" | "camera-error" | "network-error";

export default function MemberCardScannerPage({ scannerFactory = defaultScannerFactory }: { scannerFactory?: ScannerFactory }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const submittedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AdminMemberCardScanResult | null>(null);
  const [cameraMessage, setCameraMessage] = useState("");

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  const verify = useCallback(async (rawValue: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopScanner();
    const token = parseMemberCardToken(rawValue);
    if (!token) {
      setResult({ status: "INVALID", reason: "MALFORMED_TOKEN" });
      setPhase("result");
      return;
    }
    setPhase("verifying");
    try {
      setResult(await verifyAdminMemberCard(token));
      setPhase("result");
    } catch {
      setPhase("network-error");
      submittedRef.current = false;
    }
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    stopScanner();
    submittedRef.current = false;
    setResult(null);
    setCameraMessage("");
    setPhase("camera-starting");
    if (!videoRef.current || !navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(t("admin.memberCardScanner.browserUnsupported"));
      setPhase("camera-error");
      return;
    }
    try {
      const scanner = scannerFactory(videoRef.current, (value) => void verify(value));
      scannerRef.current = scanner;
      await scanner.start();
      if (!submittedRef.current) setPhase("scanning");
    } catch (error) {
      stopScanner();
      const message = error instanceof DOMException && error.name === "NotAllowedError" ? t("admin.memberCardScanner.cameraPermissionDenied") : t("admin.memberCardScanner.cameraUnavailable");
      setCameraMessage(message);
      setPhase("camera-error");
    }
  }, [scannerFactory, stopScanner, t, verify]);

  useEffect(() => {
    void startScanner();
    return stopScanner;
  }, [startScanner, stopScanner]);

  const reset = () => { stopScanner(); setResult(null); submittedRef.current = false; void startScanner(); };
  const status = result?.status;
  const statusVariant = status === "VALID_MEMBER" ? "success" : status === "GUEST_NON_MEMBER" ? "warning" : "destructive";

  return (
    <main className="min-h-full bg-background px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/dashboard">{t("nav.home")}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{t("admin.memberCardScanner.breadcrumb")}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-2xl font-semibold tracking-tight">{t("admin.memberCardScanner.title")}</h1><p className="text-sm text-muted-foreground">{t("admin.memberCardScanner.subtitle")}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate("/dashboard")}><Home data-icon="inline-start" />{t("admin.memberCardScanner.backDashboard")}</Button>{phase === "scanning" && <Button variant="outline" onClick={() => { stopScanner(); setPhase("idle"); }}><StopCircle data-icon="inline-start" />{t("admin.memberCardScanner.stop")}</Button>}</div>
        </header>

        {phase === "result" && result ? (
          <ResultView result={result} variant={statusVariant} onRetry={reset} />
        ) : phase === "network-error" ? (
          <Alert variant="destructive"><AlertTitle>{t("admin.memberCardScanner.networkError")}</AlertTitle><AlertDescription className="mt-3 flex flex-wrap items-center gap-3"><span>{t("common.retry")}</span><Button variant="destructive" size="sm" onClick={reset}><RotateCcw data-icon="inline-start" />{t("admin.memberCardScanner.retry")}</Button></AlertDescription></Alert>
        ) : phase === "camera-error" ? (
          <Alert variant="destructive"><AlertTitle>{t("admin.memberCardScanner.cameraError")}</AlertTitle><AlertDescription className="mt-2">{cameraMessage}</AlertDescription><Button className="mt-4" onClick={reset}><RotateCcw data-icon="inline-start" />{t("admin.memberCardScanner.retry")}</Button></Alert>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="size-5" />{phase === "verifying" ? t("admin.memberCardScanner.verifying") : phase === "camera-starting" ? t("admin.memberCardScanner.cameraStarting") : phase === "scanning" ? t("admin.memberCardScanner.scanning") : t("admin.memberCardScanner.start")}</CardTitle><CardDescription>{t("admin.memberCardScanner.scanInstruction")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {phase === "verifying" ? <div className="flex flex-col gap-3"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-2/3" /></div> : <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted"><video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label={t("admin.memberCardScanner.cameraPreview")} />{phase === "scanning" && <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-primary"><ScanLine className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-primary" /></div>}</div>}
              {phase === "idle" && <Button onClick={startScanner}><Camera data-icon="inline-start" />{t("admin.memberCardScanner.start")}</Button>}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function ResultView({ result, variant, onRetry }: { result: AdminMemberCardScanResult; variant: "success" | "warning" | "destructive"; onRetry: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const icon = result.status === "VALID_MEMBER" ? <CheckCircle2 className="size-6" /> : result.status === "GUEST_NON_MEMBER" ? <ShieldAlert className="size-6" /> : <ShieldAlert className="size-6" />;
  const title = result.status === "VALID_MEMBER" ? t("admin.memberCardScanner.validMember") : result.status === "GUEST_NON_MEMBER" ? t("admin.memberCardScanner.guestNonMember") : t("admin.memberCardScanner.invalid");
  return <div className="flex flex-col gap-5"><Alert variant={variant}><div className="flex items-start gap-3">{icon}<div><AlertTitle>{title}</AlertTitle><AlertDescription>{result.status === "GUEST_NON_MEMBER" ? t(`admin.memberCardScanner.guestReason.${result.reason}` as never) : result.status === "INVALID" ? t(`admin.memberCardScanner.invalidReason.${result.reason}` as never) : t("admin.memberCardScanner.validDescription")}</AlertDescription></div></div></Alert>{"member" in result && <><Separator /><MemberDetailContent member={result.member} /></>}<div className="flex flex-wrap gap-2"><Button onClick={onRetry}><RotateCcw data-icon="inline-start" />{t("admin.memberCardScanner.retry")}</Button><Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft data-icon="inline-start" />{t("admin.memberCardScanner.backDashboard")}</Button></div></div>;
}
