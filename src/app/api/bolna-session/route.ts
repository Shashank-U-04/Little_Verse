import type { Session } from "@bolna/web-call";
import { bolnaReadiness, readVoiceServerConfig } from "../../../lib/voice/server/config.ts";
import { buildBolnaUserData, parseLessonContextRequest } from "../../../lib/voice/server/lessonContext.ts";
import { isSameOriginRequest } from "../../../lib/voice/server/origin.ts";
import { checkRateLimits, clientAddress, hashSubject, type RateLimitResult } from "../../../lib/voice/server/rateLimit.ts";
import { jsonError, NO_STORE_HEADERS } from "../../../lib/voice/server/responses.ts";
import { readCookie, verifyVoicePass, VOICE_PASS_COOKIE } from "../../../lib/voice/server/voicePass.ts";

const SESSION_URL = "https://api.bolna.ai/web-call/freeswitch-session";
const SESSION_TIMEOUT_MS = 12_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBolnaSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  if (
    !isNonEmptyString(value.run_id) ||
    !isNonEmptyString(value.agent_id) ||
    !isNonEmptyString(value.sip_username) ||
    !isNonEmptyString(value.sip_password) ||
    !isNonEmptyString(value.sip_domain) ||
    !isNonEmptyString(value.wss_url) ||
    typeof value.sip_register !== "boolean" ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in <= 0 ||
    !Array.isArray(value.ice_servers)
  ) {
    return false;
  }

  try {
    if (new URL(value.wss_url).protocol !== "wss:") return false;
  } catch {
    return false;
  }

  return value.ice_servers.every((server) => {
    if (!isRecord(server)) return false;
    const urls = server.urls;
    return typeof urls === "string" || (Array.isArray(urls) && urls.every((url) => typeof url === "string"));
  });
}

export async function POST(request: Request): Promise<Response> {
  const config = readVoiceServerConfig();
  if (!isSameOriginRequest(request.headers, request.url, config.extraAllowedOrigins)) {
    return jsonError("forbidden_origin", "This voice-session request is not allowed.", 403);
  }

  const readiness = bolnaReadiness(config);
  if (!readiness.ready) return jsonError(readiness.code, readiness.message, 503);
  const bolna = config.bolna!;
  const store = config.rateLimitStore!;
  const now = Date.now();

  if (config.accessCodeRequired) {
    const pass = readCookie(request.headers.get("cookie"), VOICE_PASS_COOKIE);
    if (!verifyVoicePass(pass, config.accessCode!, bolna.apiKey, now)) {
      return jsonError("locked", "A grown-up needs to unlock voice first.", 401);
    }
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Handled below as an invalid lesson request.
  }
  const lesson = parseLessonContextRequest(body);
  if (!lesson) return jsonError("invalid_lesson", "The voice session needs a valid lesson.", 400);

  let limit: RateLimitResult;
  try {
    limit = await checkRateLimits(
      store,
      [
        {
          name: "session-client",
          subject: hashSubject(clientAddress(request.headers)),
          limit: config.limits.sessionsPerClient,
          windowSeconds: config.limits.sessionWindowSeconds,
        },
        { name: "session-global", subject: "global", limit: config.limits.sessionsGlobalPerDay, windowSeconds: 86_400 },
      ],
      now,
    );
  } catch (error) {
    // Fail closed: without a working limiter a public URL could spend unbounded credits.
    console.error("[bolna-session] rate-limit store failed:", error instanceof Error ? error.message : "unknown error");
    return jsonError("limiter_unavailable", "Voice is paused because the rate limiter is unavailable.", 503);
  }
  if (!limit.ok) {
    return jsonError("rate_limited", "Miko needs a short rest. Please try again soon.", 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(SESSION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bolna.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: bolna.agentId, user_data: buildBolnaUserData(lesson) }),
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[bolna-session] mint request failed:", error instanceof Error ? error.name : "unknown error");
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonError("upstream_timeout", "Bolna session creation timed out. Please try again.", 504);
    }
    return jsonError("upstream_unreachable", "Bolna could not be reached. Please try again.", 502);
  }

  if (!upstream.ok) {
    // Status only: the upstream body may echo request details and is never logged.
    console.error(`[bolna-session] Bolna rejected the mint with HTTP ${upstream.status}`);
    if (upstream.status === 429) return jsonError("at_capacity", "Bolna is at call capacity. Please try again shortly.", 429);
    return jsonError("upstream_rejected", "Bolna could not create a voice session. Check the server configuration.", 502);
  }

  let session: unknown;
  try {
    session = await upstream.json();
  } catch {
    return jsonError("upstream_invalid", "Bolna returned an invalid voice session.", 502);
  }

  if (!isBolnaSession(session)) {
    return jsonError("upstream_invalid", "Bolna returned an incomplete voice session.", 502);
  }

  return Response.json(session, { headers: NO_STORE_HEADERS });
}
