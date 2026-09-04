import PocketBase, { BaseAuthStore, type AuthRecord } from "pocketbase";

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:18099" : "");

if (!pocketbaseUrl) throw new Error("VITE_POCKETBASE_URL must be configured in production");

/**
 * Stores PocketBase auth state in sessionStorage so credentials stay scoped to
 * the current browser tab instead of surviving browser restarts.
 */
export class SessionAuthStore extends BaseAuthStore {
  private readonly storageKey: string;
  private memoryState: { token: string; record: AuthRecord } = { token: "", record: null };

  /** Creates a session-scoped auth store. @param {string} storageKey The sessionStorage key. */
  constructor(storageKey = "pb_auth") {
    super();
    this.storageKey = storageKey;
    const state = this.read();
    if (state) {
      this.baseToken = state.token;
      this.baseModel = state.record;
    }
  }

  /** Returns the current auth token. @returns {string} The token or an empty string. */
  get token(): string { return this.baseToken; }
  /** Returns the current auth record. @returns {AuthRecord} The stored record or null. */
  get record(): AuthRecord { return this.baseModel; }

  /** Persists a new auth state in memory and sessionStorage. @param {string} token The auth token. @param {AuthRecord} [record] The associated auth record. @returns {void} Nothing. */
  save(token: string, record?: AuthRecord): void {
    super.save(token, record);
    this.persist();
  }

  /** Clears the auth state from memory and sessionStorage. @returns {void} Nothing. */
  clear(): void {
    super.clear();
    this.remove();
  }

  private read(): { token: string; record: AuthRecord } | null {
    try {
      const raw = window.sessionStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { token?: unknown; record?: unknown };
        if (typeof parsed.token === "string") return { token: parsed.token, record: (parsed.record ?? null) as AuthRecord };
      }
    } catch { /* storage may be unavailable or contain malformed data */ }
    return this.memoryState.token ? this.memoryState : null;
  }

  private persist(): void {
    this.memoryState = { token: this.baseToken, record: this.baseModel };
    try { window.sessionStorage.setItem(this.storageKey, JSON.stringify(this.memoryState)); } catch { /* memory fallback */ }
  }

  private remove(): void {
    this.memoryState = { token: "", record: null };
    try { window.sessionStorage.removeItem(this.storageKey); } catch { /* storage may be unavailable */ }
  }
}

export const pb = new PocketBase(pocketbaseUrl, new SessionAuthStore());

/**
 * Multiple auth/bootstrap queries intentionally run in parallel. Disabling
 * PocketBase auto-cancellation prevents one request from aborting another
 * request that shares a URL; callers still own cleanup for unmounted work.
 */
pb.autoCancellation(false);

function csrfTokenFromCookie(): string {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrf-token="));
  return cookie ? decodeURIComponent(cookie.slice("csrf-token=".length)) : "";
}

/**
 * Adds a CSRF header to mutating requests when a server-issued session cookie
 * exists, falling back to the current auth token for token-authenticated APIs.
 * Guest endpoints do not receive ambient credentials, so an empty header is
 * harmless and does not recreate the previous cross-origin cookie dependency.
 */
pb.beforeSend = (url, options) => {
  const method = String(options.method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return { url, options };
  const token = csrfTokenFromCookie() || pb.authStore.token;
  return {
    url,
    options: {
      ...options,
      headers: { ...(options.headers || {}), "X-CSRF-Token": token },
    },
  };
};
