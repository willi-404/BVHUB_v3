import ReactMarkdown from "react-markdown"
import { X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import logoSrc from "../../imports/logo1-high-resolution.png"
import { useI18n, type MessageKey } from "../../i18n"
import {
  register,
  type RegistrationInput,
} from "../../features/auth/registrationService"

type Field = keyof RegistrationInput
const required: Field[] = [
  "displayName",
  "firstName",
  "lastName",
  "email",
  "street",
  "houseNumber",
  "postalCode",
  "city",
  "birthDate",
]

function validate(
  values: RegistrationInput,
  t: (key: MessageKey) => string,
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  for (const field of required)
    if (!String(values[field] ?? "").trim())
      errors[field] = t("register.required")
  if (!errors.email && !/^\S+@\S+\.\S+$/.test(values.email))
    errors.email = t("register.invalidEmail")
  if (
    !errors.firstName &&
    !/^[\p{L}][\p{L}\p{M}\s'’-]{0,79}$/u.test(values.firstName)
  )
    errors.firstName = t("register.invalidName")
  if (
    !errors.lastName &&
    !/^[\p{L}][\p{L}\p{M}\s'’-]{0,79}$/u.test(values.lastName)
  )
    errors.lastName = t("register.invalidName")
  if (!errors.postalCode && !/^\d{5}$/.test(values.postalCode))
    errors.postalCode = t("register.invalidPostal")
  if (
    !errors.houseNumber &&
    !/^\d+[a-zA-Z]?(?:[-–]\d+[a-zA-Z]?)?$/.test(values.houseNumber)
  )
    errors.houseNumber = t("register.invalidHouse")
  if (!errors.birthDate || values.birthDate) {
    const date = new Date(`${values.birthDate}T00:00:00Z`)
    if (
      !errors.birthDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) ||
        Number.isNaN(date.getTime()) ||
        date >= new Date())
    )
      errors.birthDate = t("register.invalidBirthDate")
  }
  if (values.phone && !/^[+()\d][+()\d\s./-]{5,39}$/.test(values.phone))
    errors.phone = t("register.invalidPhone")
  return errors
}

export default function RegisterView() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})
  const privacyRef = useRef<HTMLInputElement | null>(null)
  const privacyDialogRef = useRef<HTMLElement | null>(null)
  const [values, setValues] = useState<RegistrationInput>({
    displayName: "",
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    birthDate: "",
    phone: "",
    contactInfo: "",
  })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [privacyError, setPrivacyError] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacyText, setPrivacyText] = useState("")
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [privacyLoadError, setPrivacyLoadError] = useState(false)

  useEffect(() => {
    if (!privacyOpen || privacyText) return
    const controller = new AbortController()
    setPrivacyLoading(true)
    setPrivacyLoadError(false)
    void fetch("/datenshutz_text.md", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("privacy policy unavailable")
        return response.text()
      })
      .then((content) => setPrivacyText(content))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setPrivacyLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setPrivacyLoading(false)
      })
    return () => controller.abort()
  }, [privacyOpen, privacyText])

  useEffect(() => {
    if (!privacyOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrivacyOpen(false)
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", closeOnEscape)
    const frame = window.requestAnimationFrame(() =>
      privacyDialogRef.current?.focus(),
    )
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [privacyOpen])

  function update(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (submitted) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (loading) return
    setSubmitted(true)
    setServerError("")
    const next = validate(values, t)
    setErrors(next)
    setPrivacyError(!privacyAccepted)
    const first = required.find((field) => next[field])
    if (first) {
      refs.current[first]?.focus()
      return
    }
    if (!privacyAccepted) {
      privacyRef.current?.focus()
      return
    }
    setLoading(true)
    try {
      const result = await register(values)
      navigate("/register/success", {
        state: { email: result.email },
        replace: true,
      })
    } catch {
      setServerError(t("register.error"))
    } finally {
      setLoading(false)
    }
  }
  const input = (
    field: Field,
    label: string,
    type = "text",
    optional = false,
  ) => {
    const error = errors[field]
    const value = String(values[field] ?? "")
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`register-${field}`}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {optional ? ` (${t("register.optional")})` : ""}
        </label>
        <Input
          id={`register-${field}`}
          ref={(el) => {
            refs.current[field] = el
          }}
          type={type}
          value={value}
          onChange={(e) => update(field, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `error-${field}` : undefined}
          className={`h-11 ${
            error
              ? "border-red-500 ring-1 ring-red-200"
              : submitted
                ? "border-emerald-500 ring-1 ring-emerald-100"
                : ""
          }`}
        />
        {error && (
          <p id={`error-${field}`} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  }
  return (
    <>
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]">
        <div className="w-full min-w-0 max-w-2xl">
          <div className="flex min-w-0 items-center gap-3 mb-6">
            <img
              src={logoSrc}
              alt={t("brand.logoAlt")}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="page-title">{t("register.title")}</h1>
              <p className="break-words text-sm text-[var(--muted-foreground)]">
                {t("register.subtitle")}
              </p>
            </div>
          </div>
          <form
            onSubmit={submit}
            noValidate
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 md:p-7 flex flex-col gap-4"
          >
            {input("displayName", t("register.displayName"))}
            <div className="grid md:grid-cols-2 gap-4">
              {input("firstName", t("register.firstName"))}
              {input("lastName", t("register.lastName"))}
            </div>
            {input("email", t("register.email"), "email")}
            <div className="grid md:grid-cols-2 gap-4">
              {input("street", t("register.street"))}
              {input("houseNumber", t("register.houseNumber"))}
              {input("postalCode", t("register.postalCode"))}
              {input("city", t("register.city"))}
            </div>
            {input("birthDate", t("register.birthDate"), "date")}
            <div className="grid md:grid-cols-2 gap-4">
              {input("phone", t("register.phone"), "tel")}
              {input("contactInfo", t("register.contactInfo"))}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="register-privacy"
                  ref={privacyRef}
                  checked={privacyAccepted}
                  onChange={(event) => {
                    const accepted = event.target.checked
                    setPrivacyAccepted(accepted)
                    if (accepted) setPrivacyError(false)
                    else if (submitted) setPrivacyError(true)
                  }}
                  aria-invalid={privacyError}
                  aria-describedby={privacyError ? "error-privacy" : undefined}
                  className={
                    privacyError
                      ? "ring-2 ring-red-500 ring-offset-1"
                      : submitted
                        ? "ring-2 ring-emerald-500 ring-offset-1"
                        : ""
                  }
                />
                <label
                  htmlFor="register-privacy"
                  className={`text-sm leading-5 ${
                    privacyError
                      ? "text-red-600"
                      : privacyAccepted && submitted
                        ? "text-emerald-700"
                        : "text-foreground"
                  }`}
                >
                  {t("register.privacyPrefix")}{" "}
                  <button
                    type="button"
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setPrivacyOpen(true)
                    }}
                  >
                    {t("register.privacyLink")}
                  </button>{" "}
                  {t("register.privacySuffix")}
                </label>
              </div>
              {privacyError && (
                <p id="error-privacy" className="text-xs text-red-600">
                  {t("register.privacyRequired")}
                </p>
              )}
            </div>
            {serverError && (
              <p
                role="alert"
                className="break-words text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3"
              >
                {serverError}
              </p>
            )}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? `${t("register.submit")} …` : t("register.submit")}
            </Button>
            <p className="text-sm text-center text-[var(--muted-foreground)]">
              <Link
                to="/login"
                className="text-[var(--primary)] hover:underline"
              >
                {t("register.backToLogin")}
              </Link>
            </p>
          </form>
        </div>
      </div>
      {privacyOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPrivacyOpen(false)
          }}
        >
          <section
            ref={privacyDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-privacy-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <h2 id="register-privacy-title" className="text-lg font-semibold">
                {t("register.privacyTitle")}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrivacyOpen(false)}
              >
                <X className="size-4" />
                {t("common.close")}
              </Button>
            </header>
            <div className="min-h-0 overflow-y-auto p-5 sm:p-8">
              <div className="prose prose-sm max-w-none break-words [overflow-wrap:anywhere]">
                <p aria-live="polite">
                  {privacyLoading
                    ? t("register.privacyLoading")
                    : privacyLoadError
                      ? t("register.privacyLoadError")
                      : privacyText
                        ? null
                        : t("register.privacyLoading")}
                </p>
                {privacyText && <ReactMarkdown>{privacyText}</ReactMarkdown>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
