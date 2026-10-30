import { bolnaReadiness, readVoiceServerConfig } from "../../../../lib/voice/server/config.ts";
import { isSameOriginRequest } from "../../../../lib/voice/server/origin.ts";
import { checkRateLimits, clientAddress, hashSubject, type RateLimitResult } from "../../../../lib/voice/server/rateLimit.ts";
import { jsonError, NO_STORE_HEADERS } from "../../../../lib/voice/server/responses.ts";
import { accessCodeMatches, createVoicePass, voicePassCookie } from "../../../../lib/voice/server/voicePass.ts";

/** Exchanges the grown-up access code for an HttpOnly voice pass cookie. */
export async function POST(request: Request): Promise<Response> {
  const config = readVoiceServerConfig();
  if (!isSameOriginRequest(request.headers, request.url, config.extraAllowedOrigins)) {
    return jsonError("forbidden_origin", "This request is not allowed.", 403);
  }

  const readiness = bolnaReadiness(config);
  if (!readiness.ready) return jsonError(readiness.code, readiness.message, 503);
  if (!config.accessCodeRequired) {
    return Response.json({ unlocked: true }, { headers: NO_STORE_HEADERS });
  }

  let limit: RateLimitResult;
  try {
    limit = await checkRateLimits(
      config.rateLimitStore!,
      [
        {
          name: "unlock-client",
          subject: hashSubject(clientAddress(request.headers)),
          limit: config.limits.unlockAttemptsPerClient,
          windowSeconds: config.limits.unlockWindowSeconds,
        },
      ],
      Date.now(),
    );
  } catch {
    return jsonError("limiter_unavailable", "Voice is paused because the rate limiter is unavailable.", 503);
  }
  if (!limit.ok) {
    return jsonError("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  let code: unknown;
  try {
    code = ((await request.json()) as { code?: unknown } | null)?.code;
  } catch {
    code = undefined;
  }
  if (!accessCodeMatches(code, config.accessCode!)) {
    return jsonError("wrong_code", "That access code didn't match.", 401);
  }

  const token = createVoicePass(config.accessCode!, config.bolna!.apiKey, Date.now());
  return Response.json(
    { unlocked: true },
    { headers: { ...NO_STORE_HEADERS, "Set-Cookie": voicePassCookie(token, config.isProduction) } },
  );
}
