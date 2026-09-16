import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import de from "./locales/de.json"
import en from "./locales/en.json"
import zhCN from "./locales/zh-CN.json"

const messages = { en, de, "zh-CN": zhCN } as const
export type Locale = keyof typeof messages
export type MessageKey = keyof typeof en
export type MessageParams = Record<string, string | number>

export const LOCALE_STORAGE_KEY = "bvhub.locale"
export const LOCALES: readonly Locale[] = ["en", "de", "zh-CN"]

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  )
}

export function readStoredLocale(storage?: Storage): Locale {
  if (!storage && typeof window !== "undefined") {
    try {
      storage = window.sessionStorage
    } catch {
      return "en"
    }
  }
  if (!storage) return "en"
  try {
    const value = storage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(value)) return value
    if (value !== null) storage.setItem(LOCALE_STORAGE_KEY, "en")
    return "en"
  } catch {
    return "en"
  }
}

export function formatLocaleDate(value: string | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date)
}

export function formatLocaleDateTime(
  value: string | Date,
  locale: Locale,
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date)
}

function berlinParts(value: Date): Record<string, string> {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value).reduce<Record<string, string>>((out, part) => {
    out[part.type] = part.value
    return out
  }, {})
}

export function formatBerlinDateTimeInput(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = berlinParts(date)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function berlinDateTimeInputToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new RangeError("Invalid Europe/Berlin date-time")
  const wanted = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]))
  let instant = wanted
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = berlinParts(new Date(instant))
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    instant += wanted - rendered
  }
  const result = new Date(instant)
  if (formatBerlinDateTimeInput(result) !== value) throw new RangeError("Invalid Europe/Berlin date-time")
  return result.toISOString()
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? `{${name}}`),
  )
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  return interpolate(messages[locale][key] ?? messages.en[key] ?? "", params)
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: MessageParams) => string
}

const defaultI18n: I18nContextValue = {
  locale: "en",
  setLocale: () => undefined,
  t: (key, params) => translate("en", key, params),
}

const I18nContext = createContext<I18nContextValue>(defaultI18n)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  const setLocale = (next: Locale) => {
    const valid = isLocale(next) ? next : "en"
    setLocaleState(valid)
    try {
      window.sessionStorage.setItem(LOCALE_STORAGE_KEY, valid)
    } catch {
      // Private browsing or disabled storage: keep the locale in memory.
    }
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  "zh-CN": "简体中文",
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.label")}
        className="h-9 rounded-md border border-current/20 bg-background/10 px-2 text-current outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {LOCALES.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-card text-card-foreground"
          >
            {LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
