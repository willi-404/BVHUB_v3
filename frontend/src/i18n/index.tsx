import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const messages = { en, de, "zh-CN": zhCN } as const;
export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof en;
export type MessageParams = Record<string, string | number>;

export const LOCALE_STORAGE_KEY = "bvhub.locale";
export const LOCALES: readonly Locale[] = ["en", "de", "zh-CN"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function readStoredLocale(storage?: Storage): Locale {
  if (!storage && typeof window !== "undefined") {
    try { storage = window.sessionStorage; } catch { return "en"; }
  }
  if (!storage) return "en";
  try {
    const value = storage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(value)) return value;
    if (value !== null) storage.setItem(LOCALE_STORAGE_KEY, "en");
    return "en";
  } catch {
    return "en";
  }
}

export function formatLocaleDate(value: string | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  return interpolate(messages[locale][key] ?? messages.en[key] ?? "", params);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
}

const defaultI18n: I18nContextValue = {
  locale: "en",
  setLocale: () => undefined,
  t: (key, params) => translate("en", key, params),
};

const I18nContext = createContext<I18nContextValue>(defaultI18n);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = (next: Locale) => {
    const valid = isLocale(next) ? next : "en";
    setLocaleState(valid);
    try {
      window.sessionStorage.setItem(LOCALE_STORAGE_KEY, valid);
    } catch {
      // Private browsing or disabled storage: keep the locale in memory.
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  "zh-CN": "简体中文",
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.label")}
        className="h-9 rounded-[var(--radius)] border border-current/20 bg-white/10 px-2 text-current outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        {LOCALES.map((option) => <option key={option} value={option} className="bg-[var(--card)] text-[var(--foreground)]">{LOCALE_LABELS[option]}</option>)}
      </select>
    </label>
  );
}
