import { bolnaReadiness, readVoiceServerConfig } from "../../../../lib/voice/server/config.ts";
import { NO_STORE_HEADERS } from "../../../../lib/voice/server/responses.ts";
import { readCookie, verifyVoicePass, VOICE_PASS_COOKIE } from "../../../../lib/voice/server/voicePass.ts";
import type { VoiceStatusResponse } from "../../../../lib/voice/voiceStatus.ts";

/** Tells the client which voice is configured without exposing any secret. */
export async function GET(request: Request): Promise<Response> {
  // Read the request before anything else: with Cache Components, a GET handler that
  // never touches the request is prerendered at build time, freezing env and cookie state.
  const pass = readCookie(request.headers.get("cookie"), VOICE_PASS_COOKIE);
  const config = readVoiceServerConfig();
  const readiness = bolnaReadiness(config);
  let unlocked = !config.accessCodeRequired;
  if (readiness.ready && config.accessCodeRequired) {
    unlocked = verifyVoicePass(pass, config.accessCode!, config.bolna!.apiKey, Date.now());
  }

  const body: VoiceStatusResponse = {
    provider: config.provider,
    bolnaReady: readiness.ready,
    reason: readiness.ready ? null : readiness.message,
    accessCodeRequired: config.accessCodeRequired,
    unlocked,
  };
  return Response.json(body, { headers: NO_STORE_HEADERS });
}
