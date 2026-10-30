/**
 * Why a voice feature could not use the microphone, in terms a grown-up can act on.
 * The Bolna SDK reports every getUserMedia failure as `microphone_denied` and keeps
 * the browser's DOMException on `cause`; these helpers recover the real reason.
 */
export type MicProblemKind = "denied" | "unavailable" | "unsupported" | "connection";

const DENIED = new Set(["NotAllowedError", "PermissionDeniedError"]);
const UNAVAILABLE = new Set([
  "NotFoundError",
  "DevicesNotFoundError",
  "OverconstrainedError",
  "NotReadableError",
  "TrackStartError",
  "AbortError",
]);

function errorName(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("name" in error)) return null;
  const name = (error as { name: unknown }).name;
  return typeof name === "string" ? name : null;
}

/** Classifies a getUserMedia rejection. */
export function micProblemFromMediaError(error: unknown): MicProblemKind {
  const name = errorName(error);
  if (name && DENIED.has(name)) return "denied";
  if (name && UNAVAILABLE.has(name)) return "unavailable";
  // SecurityError: insecure page or a permissions policy; TypeError: no getUserMedia at all.
  if (name === "SecurityError" || name === "TypeError") return "unsupported";
  return "unavailable";
}

/**
 * Classifies a Bolna SDK `error` event. Returns null for failures that are not about
 * the microphone or the connection (for example a session the server refused), which
 * keep their own, more specific message.
 */
export function micProblemFromBolnaError(error: { code?: unknown; cause?: unknown } | null): MicProblemKind | null {
  if (!error) return null;
  switch (error.code) {
    case "microphone_denied":
      return error.cause === undefined ? "denied" : micProblemFromMediaError(error.cause);
    case "connect_failed":
    case "call_rejected":
    case "autoplay_blocked":
      return "connection";
    default:
      return null;
  }
}

/** Classifies a Web Speech API `SpeechRecognitionErrorEvent.error` code. */
export function micProblemFromRecognitionError(code: string): MicProblemKind | null {
  switch (code) {
    case "not-allowed":
    case "permission-denied":
      return "denied";
    case "audio-capture":
      return "unavailable";
    case "service-not-allowed":
      return "unsupported";
    case "network":
      return "connection";
    default:
      return null;
  }
}

/** Detects, before any call starts, a browser or page that cannot capture audio at all. */
export function micEnvironmentProblem(env: { isSecureContext: boolean; hasGetUserMedia: boolean; hasWebRtc: boolean }): "unsupported" | null {
  return env.isSecureContext && env.hasGetUserMedia && env.hasWebRtc ? null : "unsupported";
}

export function browserMicEnvironment(): { isSecureContext: boolean; hasGetUserMedia: boolean; hasWebRtc: boolean } {
  if (typeof window === "undefined") return { isSecureContext: false, hasGetUserMedia: false, hasWebRtc: false };
  return {
    isSecureContext: window.isSecureContext,
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
    hasWebRtc: typeof window.RTCPeerConnection === "function",
  };
}
