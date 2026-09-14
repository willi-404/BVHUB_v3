import { describe, expect, it, beforeEach } from "vitest";
import de from "./locales/de.json";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";
import { formatLocaleDate, isLocale, LOCALE_STORAGE_KEY, readStoredLocale, translate } from ".";

describe("session locale handling", () => {
  beforeEach(() => {
    globalThis.sessionStorage?.clear();
  });

  it("defaults to English without a stored selection", () => {
    const storage = new Map<string, string>();
    expect(readStoredLocale({ getItem: (key: string) => storage.get(key) ?? null } as unknown as Storage)).toBe("en");
  });

  it("restores only valid sessionStorage locales", () => {
    const storage = { getItem: (key: string) => key === LOCALE_STORAGE_KEY ? "zh-CN" : null } as unknown as Storage;
    expect(readStoredLocale(storage)).toBe("zh-CN");
    expect(isLocale("de")).toBe(true);
  });

  it("falls back to English for damaged values", () => {
    let stored = "de-DE";
    const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } as unknown as Storage;
    expect(readStoredLocale(storage)).toBe("en");
    expect(stored).toBe("en");
    expect(isLocale("fr")).toBe(false);
  });

  it("keeps all catalog keys identical", () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(de).sort()).toEqual(keys);
    expect(Object.keys(zhCN).sort()).toEqual(keys);
  });

  it("never exposes a missing translation key", () => {
    const missing = "not.a.real.key" as keyof typeof en;
    expect(translate("de", missing)).toBe("");
  });

  it("switches translated visible copy immediately", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("de", "nav.home")).toBe("Startseite");
    expect(translate("zh-CN", "nav.home")).toBe("首页");
    expect(translate("de", "admin.members.count", { count: 3 })).toContain("3");
  });

  it("formats the same date according to the selected locale", () => {
    const iso = "2026-09-02T12:00:00Z";
    expect(formatLocaleDate(iso, "en")).not.toBe(formatLocaleDate(iso, "de"));
    expect(formatLocaleDate(iso, "zh-CN")).toContain("2026");
  });
});
