import PocketBase, { BaseAuthStore, type AuthRecord } from "pocketbase";

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:18099" : "");

if (!pocketbaseUrl) throw new Error("VITE_POCKETBASE_URL must be configured in production");

/**
 * PocketBase's default LocalAuthStore survives browser restarts. Auth tokens
 * are intentionally scoped to the current tab instead.
 */
export class SessionAuthStore extends BaseAuthStore {
  private readonly storageKey: string;
  private memoryState: { token: string; record: AuthRecord } = { token: "", record: null };

  constructor(storageKey = "pb_auth") {
    super();
    this.storageKey = storageKey;
    const state = this.read();
    if (state) {
      this.baseToken = state.token;
      this.baseModel = state.record;
    }
  }

  get token(): string { return this.baseToken; }
  get record(): AuthRecord { return this.baseModel; }

  save(token: string, record?: AuthRecord): void {
    super.save(token, record);
    this.persist();
  }

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

// Multiple queries can run in parallel during auth/bootstrap.
pb.autoCancellation(false);
