import type { Session } from "@bolna/web-call";

export type LessonPointer = { adventureId: string; challengeIndex: number };

const CHILD_MESSAGES: Record<string, string> = {
  locked: "A grown-up needs to turn on Miko's voice first.",
  rate_limited: "Miko needs a little rest. Try again in a few minutes — tapping still works!",
  at_capacity: "Miko is busy right now. Please try again shortly — tapping still works!",
  forbidden_origin: "Miko's voice can't start from this web address.",
  invalid_lesson: "Miko got a bit lost. Please try again.",
};
const NOT_SET_UP = "Miko's voice isn't set up here yet. You can keep tapping the numbers!";
const COULD_NOT_CONNECT = "Miko couldn't connect. Please try again, or keep tapping the numbers.";
const SETUP_CODES = new Set([
  "provider_invalid",
  "not_bolna",
  "bolna_not_configured",
  "access_code_missing",
  "rate_limit_store_missing",
  "limiter_unavailable",
]);

/** Carries the server's error code; the Bolna adapter reads `childMessage` from the SDK error cause. */
export class VoiceSessionRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly childMessage: string;

  constructor(code: string, status: number) {
    super(`Voice session request failed (${code}, HTTP ${status})`);
    this.name = "VoiceSessionRequestError";
    this.code = code;
    this.status = status;
    this.childMessage = CHILD_MESSAGES[code] ?? (SETUP_CODES.has(code) ? NOT_SET_UP : COULD_NOT_CONNECT);
  }
}

/**
 * Asks our server to mint a Bolna session for the current lesson. Only
 * identifiers are sent; the server builds the agent's lesson context.
 */
export async function requestBolnaSession(lesson: LessonPointer, fetchImpl: typeof fetch = fetch): Promise<Session> {
  let response: Response;
  try {
    response = await fetchImpl("/api/bolna-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ adventure_id: lesson.adventureId, challenge_index: lesson.challengeIndex }),
    });
  } catch {
    throw new VoiceSessionRequestError("network", 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    throw new VoiceSessionRequestError(typeof body?.code === "string" ? body.code : "unknown", response.status);
  }
  return (await response.json()) as Session;
}
