import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const messages = { de, en, "zh-CN": zhCN } as const;
export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof de;

function initialLocale(): Locale {
  const language = typeof navigator === "undefined" ? "de" : navigator.language;
  if (language.toLowerCase().startsWith("zh")) return "zh-CN";
  if (language.toLowerCase().startsWith("en")) return "en";
  return "de";
}

const defaultI18n = {
  locale: "de" as Locale,
  setLocale: (_locale: Locale) => undefined,
  t: (key: MessageKey) => messages.de[key],
};

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}>(defaultI18n);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: MessageKey) => messages[locale][key] ?? messages.de[key],
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
