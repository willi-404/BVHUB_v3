import { useEffect, useRef, useState, type PointerEvent } from "react"
import { Navigate, useOutletContext } from "react-router-dom"
import { Check, Download, Eraser, FilePenLine, RefreshCw } from "lucide-react"
import { Button } from "../app/components/ui/button"
import { useI18n } from "../i18n"
import type { MemberAppContext } from "./LegacyShell"
import { createApplicationPdf } from "../features/memberApplication/pdf"
import PdfPreview from "../features/memberApplication/PdfPreview"
import {
  getApplication,
  loadApplicationPdf,
  retryApplication,
  submitApplication,
  type ApplicationRecord,
} from "../features/memberApplication/api"

type Step = "form" | "confirm" | "preview" | "sign" | "done"

const copy = {
  en: {
    title: "Become a member",
    bank: "SEPA bank details",
    confirm: "Confirm your details",
    preview: "Review your application",
    sign: "Sign your application",
    done: "Application sent",
    institute: "Bank name",
    iban: "IBAN",
    bic: "BIC",
    next: "Continue",
    back: "Back",
    edit: "Edit profile",
    correct: "I confirm that all details are correct",
    generate: "Generate PDF",
    download: "Download PDF",
    signature: "Sign with your finger or mouse",
    clear: "Clear signature",
    submit: "Sign and send",
    sending: "Sending...",
    sent: "Your signed application was emailed to the board.",
    failed: "The PDF was saved, but the email failed. Retry sending it.",
    retry: "Retry email",
    again: "Start a new application",
    missing: "Complete your profile before applying.",
    underage: "You must be at least 18 to sign this application.",
    invalidBank: "Check the bank name, IBAN and BIC.",
    error: "The application could not be completed. Try again.",
    dateChanged: "The date changed. Review the PDF and sign again.",
    pending: "The application is being sent.",
    signed: "Signed application",
    personal: "Personal details",
    notGuest: "Only guest accounts can submit an application.",
  },
  de: {
    title: "Mitglied werden",
    bank: "SEPA-Bankdaten",
    confirm: "Angaben bestätigen",
    preview: "Antrag prüfen",
    sign: "Antrag unterschreiben",
    done: "Antrag gesendet",
    institute: "Kreditinstitut Name",
    iban: "IBAN",
    bic: "BIC",
    next: "Weiter",
    back: "Zurück",
    edit: "Profil bearbeiten",
    correct: "Ich bestätige, dass alle Angaben richtig sind",
    generate: "PDF erstellen",
    download: "PDF herunterladen",
    signature: "Mit Finger oder Maus unterschreiben",
    clear: "Unterschrift löschen",
    submit: "Unterschreiben und senden",
    sending: "Wird gesendet...",
    sent: "Dein unterschriebener Antrag wurde an den Vorstand gesendet.",
    failed:
      "Das PDF wurde gespeichert, aber die E-Mail konnte nicht gesendet werden. Bitte erneut senden.",
    retry: "E-Mail erneut senden",
    again: "Neuen Antrag stellen",
    missing: "Bitte vervollständige zuerst dein Profil.",
    underage: "Für diesen Antrag musst du mindestens 18 Jahre alt sein.",
    invalidBank: "Bitte prüfe Kreditinstitut, IBAN und BIC.",
    error:
      "Der Antrag konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
    dateChanged:
      "Das Datum hat sich geändert. Bitte prüfe das PDF und unterschreibe erneut.",
    pending: "Der Antrag wird gesendet.",
    signed: "Unterschriebener Antrag",
    personal: "Persönliche Angaben",
    notGuest: "Nur Gastkonten können einen Antrag stellen.",
  },
  "zh-CN": {
    title: "成为会员",
    bank: "SEPA 银行信息",
    confirm: "确认资料",
    preview: "预览申请书",
    sign: "签署申请书",
    done: "申请已发送",
    institute: "银行名称",
    iban: "IBAN",
    bic: "BIC",
    next: "继续",
    back: "返回",
    edit: "修改个人资料",
    correct: "我确认所有个人和银行信息正确",
    generate: "生成 PDF",
    download: "下载 PDF",
    signature: "请用手指或鼠标签名",
    clear: "清除签名",
    submit: "签名并发送",
    sending: "正在发送...",
    sent: "签署版申请书已发给理事会。",
    failed: "PDF 已保存，但邮件发送失败。请重新发送。",
    retry: "重新发送邮件",
    again: "重新申请",
    missing: "请先补全个人资料。",
    underage: "签署申请书必须年满 18 岁。",
    invalidBank: "请检查银行名称、IBAN 和 BIC。",
    error: "申请未完成，请重试。",
    dateChanged: "日期已变化。请重新核对 PDF 并签名。",
    pending: "申请书正在发送。",
    signed: "已签署的申请书",
    personal: "个人信息",
    notGuest: "只有访客账户可以提交申请。",
  },
} as const

function validIban(value: string): boolean {
  const compact = value.replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false
  const rearranged = compact.slice(4) + compact.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const digits = char >= "A" ? String(char.charCodeAt(0) - 55) : char
    for (const digit of digits)
      remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

function SignaturePad({
  onChange,
}: {
  onChange: (value: string | null) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const moved = useRef(false)
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * 600) / rect.width,
      y: ((event.clientY - rect.top) * 170) / rect.height,
    }
  }
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const position = point(event)
    const context = canvas.current?.getContext("2d")
    if (!context) return
    context.strokeStyle = "#142b25"
    context.lineWidth = 3
    context.lineCap = "round"
    context.lineJoin = "round"
    context.beginPath()
    context.moveTo(position.x, position.y)
    drawing.current = true
  }
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const position = point(event)
    const context = canvas.current?.getContext("2d")
    if (!context) return
    context.lineTo(position.x, position.y)
    context.stroke()
    moved.current = true
  }
  const end = () => {
    drawing.current = false
    if (moved.current && canvas.current)
      onChange(canvas.current.toDataURL("image/png"))
  }
  const clear = () => {
    canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 170)
    moved.current = false
    onChange(null)
  }
  const { locale } = useI18n()
  const c = copy[locale]
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="member-signature">
        {c.signature}
      </label>
      <canvas
        ref={canvas}
        id="member-signature"
        aria-label={c.signature}
        width={600}
        height={170}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="block w-full max-w-[600px] aspect-[600/170] rounded border border-[var(--border)] bg-white touch-none"
      />
      <Button type="button" variant="outline" onClick={clear}>
        <Eraser size={16} />
        {c.clear}
      </Button>
    </div>
  )
}

export default function MemberApplicationPage() {
  const { profile, profileLoading, openProfileEditor } =
    useOutletContext<MemberAppContext>()
  const { locale, t } = useI18n()
  const c = copy[locale]
  const [step, setStep] = useState<Step>("form")
  const [bank, setBank] = useState({ institute: "", iban: "", bic: "" })
  const [confirmed, setConfirmed] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationRecord | null>(null)
  const [today, setToday] = useState("")
  const [pdf, setPdf] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (
      !profile ||
      profile.user.role === "ADMIN" ||
      profile.user.role === "SUPER_ADMIN"
    )
      return
    let active = true
    getApplication()
      .then((state) => {
        if (!active) return
        setToday(state.today)
        setApplication(state.application)
        if (state.application) setStep("done")
      })
      .catch(() => {
        if (active) setError(c.error)
      })
    return () => {
      active = false
    }
  }, [profile?.user.role])

  useEffect(() => {
    if (step === "confirm" || step === "preview" || step === "sign") {
      setConfirmed(false)
      setSignature(null)
      setPdf(null)
      setStep("confirm")
    }
  }, [profile?.user.updated, profile?.profile?.updated])

  const birthDate = profile?.profile?.birthDate
  const eligible = Boolean(
    profile?.profile &&
      profile.user.firstName &&
      profile.user.lastName &&
      profile.user.email &&
      profile.profile.street &&
      profile.profile.houseNumber &&
      profile.profile.postalCode &&
      profile.profile.city &&
      birthDate,
  )
  const adult = Boolean(
    today &&
      birthDate &&
      birthDate <= `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`,
  )
  const bankValid =
    bank.institute.trim().length > 0 &&
    bank.institute.trim().length <= 100 &&
    validIban(bank.iban) &&
    /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(
      bank.bic.replace(/\s/g, "").toUpperCase(),
    )
  const fields = profile?.profile
    ? [
        ["Vorname", profile.user.firstName],
        ["Nachname", profile.user.lastName],
        ["Geburtsdatum", birthDate?.split("-").reverse().join(".") || ""],
        [
          "Straße u. Hausnr",
          `${profile.profile.street} ${profile.profile.houseNumber}`,
        ],
        ["PLZ", profile.profile.postalCode],
        ["Stadt", profile.profile.city],
        ["Email", profile.user.email],
      ]
    : []

  const generate = async () => {
    if (!profile || !confirmed || !bankValid || !adult) return
    setSignature(null)
    setBusy(true)
    setError("")
    try {
      setPdf(
        await createApplicationPdf(
          profile,
          {
            institute: bank.institute.trim(),
            iban: bank.iban.replace(/\s/g, "").toUpperCase(),
            bic: bank.bic.replace(/\s/g, "").toUpperCase(),
          },
          today,
        ),
      )
      setStep("preview")
    } catch {
      setError(c.error)
    } finally {
      setBusy(false)
    }
  }
  const send = async () => {
    if (!profile || !signature || !today || !bankValid) return
    setBusy(true)
    setError("")
    try {
      const signed = await createApplicationPdf(
        profile,
        {
          institute: bank.institute.trim(),
          iban: bank.iban.replace(/\s/g, "").toUpperCase(),
          bic: bank.bic.replace(/\s/g, "").toUpperCase(),
        },
        today,
        signature,
      )
      setPdf(signed)
      const result = await submitApplication(signed, today)
      setApplication(result.application)
      setStep("done")
    } catch {
      const state = await getApplication().catch(() => null)
      if (state?.today && state.today !== today) {
        setToday(state.today)
        setPdf(null)
        setSignature(null)
        setConfirmed(false)
        setStep("confirm")
        setError(c.dateChanged)
      } else if (
        state?.application &&
        (!application || state.application.updated !== application.updated)
      ) {
        setApplication(state.application)
        setStep("done")
        setError(state.application.status === "FAILED" ? c.failed : "")
      } else setError(c.error)
    } finally {
      setBusy(false)
    }
  }
  const retry = async () => {
    setBusy(true)
    setError("")
    try {
      const result = await retryApplication()
      setApplication(result.application)
    } catch {
      setError(c.failed)
    } finally {
      setBusy(false)
    }
  }
  const download = async () => {
    try {
      const file =
        pdf || (application && (await loadApplicationPdf(application)))
      if (!file) return
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = "Aufnahmeantrag.pdf"
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      setError(c.error)
    }
  }
  const viewSaved = async () => {
    if (!application) return
    try {
      setPdf(await loadApplicationPdf(application))
    } catch {
      setError(c.error)
    }
  }

  if (
    !profileLoading &&
    (profile?.user.role === "ADMIN" || profile?.user.role === "SUPER_ADMIN")
  )
    return <Navigate to="/home" replace />

  return (
    <div className="mx-auto max-w-4xl space-y-5 text-[var(--foreground)]">
      <div className="flex items-center gap-3">
        <FilePenLine size={24} />
        <h1
          id="view-title-memberApplication"
          tabIndex={-1}
          className="page-title"
        >
          {profile?.user.role === "MEMBER" ? c.signed : c.title}
        </h1>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {profileLoading || !today ? (
        <div className="space-y-3">
          {!error && <p>{c.pending}</p>}
          {error && (
            <Button
              variant="outline"
              onClick={() =>
                void getApplication()
                  .then((state) => {
                    setToday(state.today)
                    setApplication(state.application)
                    if (state.application) setStep("done")
                    setError("")
                  })
                  .catch(() => setError(c.error))
              }
            >
              {t("common.retry")}
            </Button>
          )}
        </div>
      ) : step !== "done" && profile?.user.role !== "GUEST" ? (
        <p role="alert">{c.notGuest}</p>
      ) : step !== "done" && !eligible ? (
        <div className="space-y-3">
          <p>{c.missing}</p>
          <Button onClick={openProfileEditor}>{c.edit}</Button>
        </div>
      ) : step !== "done" && !adult ? (
        <p role="alert">{c.underage}</p>
      ) : (
        <>
          {step === "form" && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                if (bankValid) {
                  setError("")
                  setStep("confirm")
                } else setError(c.invalidBank)
              }}
            >
              <h2 className="text-lg font-semibold">{c.bank}</h2>
              {(["institute", "iban", "bic"] as const).map((key) => (
                <label
                  key={key}
                  className="block space-y-1 text-sm font-medium"
                >
                  <span>{c[key]}</span>
                  <input
                    required
                    autoComplete="off"
                    value={bank[key]}
                    onChange={(event) =>
                      setBank({ ...bank, [key]: event.target.value })
                    }
                    maxLength={key === "institute" ? 100 : 42}
                    className="block h-11 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 text-base"
                  />
                </label>
              ))}
              <Button type="submit">{c.next}</Button>
            </form>
          )}
          {step === "confirm" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">{c.confirm}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div
                    key={label}
                    className="border-b border-[var(--border)] py-2"
                  >
                    <span className="block text-xs text-[var(--muted-foreground)]">
                      {label}
                    </span>
                    <span className="break-all">{value}</span>
                  </div>
                ))}
                <div className="border-b border-[var(--border)] py-2">
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    {c.institute}
                  </span>
                  <span className="break-all">{bank.institute}</span>
                </div>
                <div className="border-b border-[var(--border)] py-2">
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    IBAN
                  </span>
                  <span className="break-all">{bank.iban}</span>
                </div>
                <div className="border-b border-[var(--border)] py-2">
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    BIC
                  </span>
                  <span className="break-all">{bank.bic}</span>
                </div>
              </div>
              <Button variant="outline" onClick={openProfileEditor}>
                {c.edit}
              </Button>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />
                {c.correct}
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("form")}>
                  {c.back}
                </Button>
                <Button disabled={!confirmed || busy} onClick={generate}>
                  {c.generate}
                </Button>
              </div>
            </div>
          )}
          {step === "preview" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{c.preview}</h2>
              {pdf && <PdfPreview pdf={pdf} title={c.preview} />}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void download()}>
                  <Download size={16} />
                  {c.download}
                </Button>
                <Button variant="outline" onClick={() => setStep("confirm")}>
                  {c.back}
                </Button>
                <Button onClick={() => setStep("sign")}>{c.next}</Button>
              </div>
            </div>
          )}
          {step === "sign" && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">{c.sign}</h2>
              <SignaturePad onChange={setSignature} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSignature(null)
                    setStep("preview")
                  }}
                >
                  {c.back}
                </Button>
                <Button
                  disabled={!signature || busy}
                  onClick={() => void send()}
                >
                  <Check size={16} />
                  {busy ? c.sending : c.submit}
                </Button>
              </div>
            </div>
          )}
          {step === "done" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{c.signed}</h2>
              <p role="status">
                {application?.status === "SENT"
                  ? c.sent
                  : application?.status === "FAILED"
                    ? c.failed
                    : c.pending}
              </p>
              {application?.status === "FAILED" &&
                profile?.user.role === "GUEST" && (
                  <Button disabled={busy} onClick={() => void retry()}>
                    <RefreshCw size={16} />
                    {c.retry}
                  </Button>
                )}
              {application && (
                <Button variant="outline" onClick={() => void download()}>
                  <Download size={16} />
                  {c.download}
                </Button>
              )}
              {application && !pdf && (
                <Button variant="outline" onClick={() => void viewSaved()}>
                  {c.preview}
                </Button>
              )}
              {pdf && <PdfPreview pdf={pdf} title={c.signed} />}
              {application?.status === "SENT" &&
                profile?.user.role === "GUEST" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPdf(null)
                      setSignature(null)
                      setConfirmed(false)
                      setStep("form")
                    }}
                  >
                    {c.again}
                  </Button>
                )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
