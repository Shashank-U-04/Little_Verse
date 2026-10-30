import { createHash } from "node:crypto";

export interface RateLimitStore {
  readonly kind: "upstash" | "memory";
  /** Increments a counter that expires after `ttlSeconds`; returns the new count. */
  increment(key: string, ttlSeconds: number): Promise<number>;
}

export type RateLimitRule = {
  name: string;
  /** Stable subject, e.g. a hashed client address or "global". */
  subject: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { ok: true } | { ok: false; rule: string; retryAfterSeconds: number };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Durable fixed-window counters in Upstash Redis over its REST API.
 * Serverless instances share nothing in memory, so production limits must
 * live in a shared store; this avoids adding an SDK dependency.
 */
export function createUpstashStore(restUrl: string, token: string, fetchImpl: FetchLike = fetch): RateLimitStore {
  const base = restUrl.replace(/\/+$/, "");
  return {
    kind: "upstash",
    async increment(key, ttlSeconds) {
      const response = await fetchImpl(`${base}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, String(ttlSeconds)],
        ]),
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) throw new Error(`Rate-limit store responded ${response.status}`);
      const body: unknown = await response.json();
      const count = Array.isArray(body) ? (body[0] as { result?: unknown } | undefined)?.result : undefined;
      if (typeof count !== "number" || !Number.isFinite(count)) throw new Error("Rate-limit store returned an invalid count");
      return count;
    },
  };
}

/** Development-only store. Never used in production (see config.ts). */
export function createMemoryStore(now: () => number = Date.now): RateLimitStore {
  const counters = new Map<string, { count: number; expiresAt: number }>();
  return {
    kind: "memory",
    async increment(key, ttlSeconds) {
      const current = counters.get(key);
      const time = now();
      if (!current || current.expiresAt <= time) {
        counters.set(key, { count: 1, expiresAt: time + ttlSeconds * 1000 });
        return 1;
      }
      current.count += 1;
      return current.count;
    },
  };
}

/** Client addresses are hashed before they become storage keys. */
export function hashSubject(value: string): string {
  return createHash("sha256").update(`littleverse-rl:${value}`).digest("hex").slice(0, 32);
}

export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Checks every rule; a store failure throws so callers can fail closed. */
export async function checkRateLimits(store: RateLimitStore, rules: RateLimitRule[], nowMs: number): Promise<RateLimitResult> {
  for (const rule of rules) {
    const windowMs = rule.windowSeconds * 1000;
    const windowIndex = Math.floor(nowMs / windowMs);
    const key = `lv:rl:${rule.name}:${rule.subject}:${windowIndex}`;
    const count = await store.increment(key, rule.windowSeconds);
    if (count > rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((windowIndex + 1) * windowMs - nowMs) / 1000));
      return { ok: false, rule: rule.name, retryAfterSeconds };
    }
  }
  return { ok: true };
}
