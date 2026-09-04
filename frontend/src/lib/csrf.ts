const STORAGE_KEY = "bvhub.csrfToken";
const COOKIE_KEY = "csrf-token";

function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function initializeCsrfToken(): string {
  if (typeof window === "undefined") return "";
  let token = "";
  try { token = window.sessionStorage.getItem(STORAGE_KEY) || ""; } catch { /* storage may be unavailable */ }
  if (!token) token = randomToken();
  try { window.sessionStorage.setItem(STORAGE_KEY, token); } catch { /* storage may be unavailable */ }
  try { document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Strict`; } catch { /* cookies may be unavailable */ }
  return token;
}

export function getCsrfToken(): string {
  if (typeof window === "undefined") return "";
  try { return window.sessionStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}
