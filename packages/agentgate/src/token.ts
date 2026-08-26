import type { HumanToken } from "./types";

interface StoredToken {
  scope: string;
  expiresAt: number;
  used: boolean;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older jsdom, etc).
  return `agentgate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** In-memory single-use, scoped token store backing request_human(). */
export class HumanTokenStore {
  private tokens = new Map<string, StoredToken>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /** Mints a fresh token scoped to a single tool name. */
  mint(scope: string): HumanToken {
    const token = randomId();
    const expiresAt = Date.now() + this.ttlMs;
    this.tokens.set(token, { scope, expiresAt, used: false });
    return { token, scope, expires_at: new Date(expiresAt).toISOString() };
  }

  /**
   * Validates and consumes a token for the given scope. Returns true and marks the token used
   * exactly once; returns false (without consuming anything) for a missing, expired, wrong-scope,
   * or already-used token.
   */
  consume(token: string | undefined | null, scope: string): boolean {
    if (!token) return false;
    const entry = this.tokens.get(token);
    if (!entry) return false;
    if (entry.used) return false;
    if (entry.scope !== scope) return false;
    if (Date.now() > entry.expiresAt) return false;
    entry.used = true;
    return true;
  }
}
