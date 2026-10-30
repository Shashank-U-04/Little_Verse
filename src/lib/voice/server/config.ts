import { createMemoryStore, createUpstashStore, type RateLimitStore } from "./rateLimit.ts";

export type VoiceProviderName = "bolna" | "browser";

export type VoiceServerConfig = {
  /** null when VOICE_PROVIDER holds an unrecognised value: voice stays off rather than guessing. */
  provider: VoiceProviderName | null;
  isProduction: boolean;
  bolna: { apiKey: string; agentId: string } | null;
  /** Required in production; optional in development. */
  accessCode: string | null;
  accessCodeRequired: boolean;
  rateLimitStore: RateLimitStore | null;
  extraAllowedOrigins: string[];
  limits: {
    sessionsPerClient: number;
    sessionWindowSeconds: number;
    sessionsGlobalPerDay: number;
    unlockAttemptsPerClient: number;
    unlockWindowSeconds: number;
  };
};

export type VoiceReadiness =
  | { ready: true }
  | { ready: false; code: "provider_invalid" | "not_bolna" | "bolna_not_configured" | "access_code_missing" | "rate_limit_store_missing"; message: string };

type Env = Record<string, string | undefined>;

function trimmed(value: string | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

let devMemoryStore: RateLimitStore | null = null;

export function readVoiceServerConfig(env: Env = process.env): VoiceServerConfig {
  const isProduction = env.NODE_ENV === "production";
  const rawProvider = trimmed(env.VOICE_PROVIDER)?.toLowerCase() ?? "bolna";
  const provider: VoiceProviderName | null = rawProvider === "bolna" || rawProvider === "browser" ? rawProvider : null;

  const apiKey = trimmed(env.BOLNA_API_KEY);
  const agentId = trimmed(env.BOLNA_AGENT_ID);
  const accessCode = trimmed(env.DEMO_ACCESS_CODE);

  // Vercel's Upstash integration may name these KV_REST_API_*; accept both.
  const storeUrl = trimmed(env.UPSTASH_REDIS_REST_URL) ?? trimmed(env.KV_REST_API_URL);
  const storeToken = trimmed(env.UPSTASH_REDIS_REST_TOKEN) ?? trimmed(env.KV_REST_API_TOKEN);
  let rateLimitStore: RateLimitStore | null = null;
  if (storeUrl && storeToken) rateLimitStore = createUpstashStore(storeUrl, storeToken);
  else if (!isProduction) rateLimitStore = devMemoryStore ??= createMemoryStore();

  return {
    provider,
    isProduction,
    bolna: apiKey && agentId ? { apiKey, agentId } : null,
    accessCode,
    accessCodeRequired: isProduction || accessCode !== null,
    rateLimitStore,
    extraAllowedOrigins: (env.VOICE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    limits: {
      sessionsPerClient: positiveInt(env.VOICE_SESSIONS_PER_CLIENT, 6),
      sessionWindowSeconds: positiveInt(env.VOICE_SESSION_WINDOW_SECONDS, 600),
      sessionsGlobalPerDay: positiveInt(env.VOICE_SESSIONS_PER_DAY, 150),
      unlockAttemptsPerClient: 10,
      unlockWindowSeconds: 600,
    },
  };
}

/** Whether Bolna voice sessions may be minted; reasons are safe to show to an adult. */
export function bolnaReadiness(config: VoiceServerConfig): VoiceReadiness {
  if (config.provider === null) {
    return { ready: false, code: "provider_invalid", message: "VOICE_PROVIDER must be \"bolna\" or \"browser\"." };
  }
  if (config.provider !== "bolna") {
    return { ready: false, code: "not_bolna", message: "This deployment uses the device voice instead of Bolna." };
  }
  if (!config.bolna) {
    return { ready: false, code: "bolna_not_configured", message: "Bolna is not configured on the server." };
  }
  if (config.accessCodeRequired && !config.accessCode) {
    return { ready: false, code: "access_code_missing", message: "Voice is locked: no access code is configured on the server." };
  }
  if (!config.rateLimitStore) {
    return { ready: false, code: "rate_limit_store_missing", message: "Voice is off: the rate-limit store is not configured." };
  }
  return { ready: true };
}
