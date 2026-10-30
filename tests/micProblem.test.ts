import assert from "node:assert/strict";
import test from "node:test";
import {
  micEnvironmentProblem,
  micProblemFromBolnaError,
  micProblemFromMediaError,
  micProblemFromRecognitionError,
} from "../src/components/voice/micProblem.ts";

function domError(name: string): { name: string; message: string } {
  return { name, message: name };
}

test("getUserMedia failures are told apart: blocked, missing or busy, unsupported", () => {
  assert.equal(micProblemFromMediaError(domError("NotAllowedError")), "denied");
  assert.equal(micProblemFromMediaError(domError("PermissionDeniedError")), "denied");
  assert.equal(micProblemFromMediaError(domError("NotFoundError")), "unavailable");
  assert.equal(micProblemFromMediaError(domError("NotReadableError")), "unavailable", "mic in use by another app");
  assert.equal(micProblemFromMediaError(domError("OverconstrainedError")), "unavailable");
  assert.equal(micProblemFromMediaError(domError("SecurityError")), "unsupported");
  assert.equal(micProblemFromMediaError(new TypeError("getUserMedia is not a function")), "unsupported");
  assert.equal(micProblemFromMediaError("weird"), "unavailable");
});

test("Bolna SDK errors recover the real microphone reason from cause", () => {
  // The SDK reports every getUserMedia failure as microphone_denied.
  assert.equal(micProblemFromBolnaError({ code: "microphone_denied", cause: domError("NotAllowedError") }), "denied");
  assert.equal(micProblemFromBolnaError({ code: "microphone_denied", cause: domError("NotFoundError") }), "unavailable");
  assert.equal(micProblemFromBolnaError({ code: "microphone_denied" }), "denied");
  assert.equal(micProblemFromBolnaError({ code: "connect_failed" }), "connection");
  assert.equal(micProblemFromBolnaError({ code: "call_rejected" }), "connection");
  assert.equal(micProblemFromBolnaError({ code: "autoplay_blocked" }), "connection");
});

test("session refusals are not reported as microphone problems", () => {
  assert.equal(micProblemFromBolnaError({ code: "mint_failed" }), null);
  assert.equal(micProblemFromBolnaError({ code: "already_active" }), null);
  assert.equal(micProblemFromBolnaError(null), null);
});

test("speech recognition error codes map to the same problem kinds", () => {
  assert.equal(micProblemFromRecognitionError("not-allowed"), "denied");
  assert.equal(micProblemFromRecognitionError("audio-capture"), "unavailable");
  assert.equal(micProblemFromRecognitionError("service-not-allowed"), "unsupported");
  assert.equal(micProblemFromRecognitionError("network"), "connection");
  assert.equal(micProblemFromRecognitionError("no-speech"), null);
  assert.equal(micProblemFromRecognitionError("aborted"), null);
});

test("an insecure page or a browser without getUserMedia or WebRTC is unsupported", () => {
  assert.equal(micEnvironmentProblem({ isSecureContext: true, hasGetUserMedia: true, hasWebRtc: true }), null);
  assert.equal(micEnvironmentProblem({ isSecureContext: false, hasGetUserMedia: true, hasWebRtc: true }), "unsupported");
  assert.equal(micEnvironmentProblem({ isSecureContext: true, hasGetUserMedia: false, hasWebRtc: true }), "unsupported");
  assert.equal(micEnvironmentProblem({ isSecureContext: true, hasGetUserMedia: true, hasWebRtc: false }), "unsupported");
});
