import type { Session } from "@bolna/web-call";

const SESSION_URL = "https://api.bolna.ai/web-call/freeswitch-session";
const SESSION_TIMEOUT_MS = 12_000;
const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

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

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: noStoreHeaders });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    (fetchSite !== null && fetchSite !== "same-origin")
  ) {
    return jsonError("This voice-session request is not allowed.", 403);
  }

  if (process.env.NODE_ENV === "production") {
    return jsonError("Voice calls are unavailable until parent access protection is configured.", 503);
  }

  const apiKey = process.env.BOLNA_API_KEY;
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!apiKey || !agentId) {
    return jsonError("Bolna is not configured. Set BOLNA_API_KEY and BOLNA_AGENT_ID locally.", 503);
  }

  let upstream: Response;
  try {
    upstream = await fetch(SESSION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agentId }),
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonError("Bolna session creation timed out. Please try again.", 504);
    }
    return jsonError("Bolna could not be reached. Please try again.", 502);
  }

  if (!upstream.ok) {
    if (upstream.status === 429) return jsonError("Bolna is at call capacity. Please try again shortly.", 429);
    return jsonError("Bolna could not create a voice session. Check the server configuration.", 502);
  }

  let session: unknown;
  try {
    session = await upstream.json();
  } catch {
    return jsonError("Bolna returned an invalid voice session.", 502);
  }

  if (!isBolnaSession(session)) {
    return jsonError("Bolna returned an incomplete voice session.", 502);
  }

  return Response.json(session, { headers: noStoreHeaders });
}
