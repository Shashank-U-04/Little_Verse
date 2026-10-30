import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const VOICE_PASS_COOKIE = "lv_voice_pass";
export const VOICE_PASS_TTL_MS = 4 * 60 * 60 * 1000;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time comparison that does not leak the expected code's length. */
export function accessCodeMatches(input: unknown, expected: string): boolean {
  if (typeof input !== "string" || input.length === 0 || input.length > 200) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

/**
 * The signing key is derived from two server-only secrets, so rotating
 * either the access code or the Bolna key invalidates every issued pass.
 */
function signingKey(accessCode: string, serverSecret: string): Buffer {
  return createHmac("sha256", serverSecret).update(`littleverse-voice-pass:v1:${accessCode}`).digest();
}

function sign(expiresAt: number, key: Buffer): string {
  return createHmac("sha256", key).update(`v1.${expiresAt}`).digest("base64url");
}

export function createVoicePass(accessCode: string, serverSecret: string, nowMs: number, ttlMs = VOICE_PASS_TTL_MS): string {
  const expiresAt = nowMs + ttlMs;
  return `v1.${expiresAt}.${sign(expiresAt, signingKey(accessCode, serverSecret))}`;
}

export function verifyVoicePass(token: string | null | undefined, accessCode: string, serverSecret: string, nowMs: number): boolean {
  if (!token) return false;
  const [version, expiresRaw, signature, ...rest] = token.split(".");
  if (version !== "v1" || !expiresRaw || !signature || rest.length > 0) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowMs) return false;

  const expected = Buffer.from(sign(expiresAt, signingKey(accessCode, serverSecret)));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return rawValue.join("=") || null;
  }
  return null;
}

export function voicePassCookie(token: string, secure: boolean, maxAgeMs = VOICE_PASS_TTL_MS): string {
  const attributes = [
    `${VOICE_PASS_COOKIE}=${token}`,
    "Path=/api",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
