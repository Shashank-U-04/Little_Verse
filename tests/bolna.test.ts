import assert from "node:assert/strict";
import test from "node:test";
import type { BolnaWebCallEvents, CallState } from "@bolna/web-call";
import { BolnaCallAdapter, type BolnaCallClient } from "../src/lib/bolna/bolnaCallAdapter.ts";
import { MicrophoneOwnership } from "../src/lib/voice/microphoneOwnership.ts";
import { POST as createBolnaSession } from "../src/app/api/bolna-session/route.ts";

type EventName = keyof BolnaWebCallEvents;

class MockCall implements BolnaCallClient {
  state: CallState = "idle";
  startImpl: () => Promise<void> = async () => {
    this.state = "active";
    this.emit("state-change", "active");
    this.emit("call-start", undefined);
  };
  stopImpl: () => Promise<void> = async () => {
    this.state = "ended";
    this.emit("state-change", "ended");
    this.emit("call-end", { reason: "local-hangup" });
  };
  private readonly listeners = new Map<EventName, Set<(payload: never) => void>>();

  start(): Promise<void> { return this.startImpl(); }
  stop(): Promise<void> { return this.stopImpl(); }
  getState(): CallState { return this.state; }
  on<K extends EventName>(event: K, listener: BolnaWebCallEvents[K]): unknown {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as (payload: never) => void);
    this.listeners.set(event, set);
    return undefined;
  }
  off<K extends EventName>(event: K, listener: BolnaWebCallEvents[K]): unknown {
    this.listeners.get(event)?.delete(listener as (payload: never) => void);
    return undefined;
  }
  emit<K extends EventName>(event: K, payload: BolnaWebCallEvents[K] extends (arg: infer A) => void ? A : never): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload as never);
  }
  listenerCount(): number { return [...this.listeners.values()].reduce((count, set) => count + set.size, 0); }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("Bolna adapter exposes connecting and active, then awaits SDK stop teardown", async () => {
  const call = new MockCall();
  const connected = deferred<void>();
  const teardown = deferred<void>();
  call.startImpl = () => connected.promise;
  call.stopImpl = () => teardown.promise;
  const adapter = new BolnaCallAdapter(() => call);

  const starting = adapter.start();
  assert.equal(adapter.getSnapshot().state, "connecting");
  call.state = "active";
  call.emit("call-start", undefined);
  connected.resolve();
  await starting;
  assert.equal(adapter.getSnapshot().state, "active");

  const stopping = adapter.stop();
  assert.equal(adapter.getSnapshot().state, "ending");
  let stopResolved = false;
  void stopping.then(() => { stopResolved = true; });
  await Promise.resolve();
  assert.equal(stopResolved, false);
  teardown.resolve();
  await stopping;
  assert.equal(adapter.getSnapshot().state, "ended");
  assert.equal(call.listenerCount(), 0);
});

test("start does not mint a second call while the first still owns audio", async () => {
  const calls: MockCall[] = [];
  const adapter = new BolnaCallAdapter(() => {
    const call = new MockCall();
    // SDK start resolves before the remote side answers.
    call.startImpl = async () => { call.state = "connecting"; call.emit("media-permission", undefined as never); };
    calls.push(call);
    return call;
  });

  await adapter.start();
  assert.equal(adapter.getSnapshot().state, "requesting_permission");
  await adapter.start();
  assert.equal(calls.length, 1);

  // An unconfirmed hang-up leaves the live SDK call retained in the error state.
  calls[0]!.stopImpl = async () => { throw new Error("teardown failed"); };
  await assert.rejects(adapter.stop());
  calls[0]!.state = "active";
  assert.equal(adapter.getSnapshot().state, "error");
  assert.equal(adapter.ownsAudio(), true);
  await adapter.start();
  assert.equal(calls.length, 1);

  // Once the SDK reports the call ended, a fresh start is allowed.
  calls[0]!.state = "ended";
  calls[0]!.startImpl = async () => undefined;
  await adapter.start();
  assert.equal(calls.length, 2);
});

test("remote hangup is reflected as ended and failed call-end is an error", async () => {
  const call = new MockCall();
  const adapter = new BolnaCallAdapter(() => call);
  await adapter.start();
  call.state = "ended";
  call.emit("state-change", "ended");
  call.emit("call-end", { reason: "remote-hangup" });
  assert.equal(adapter.getSnapshot().state, "ended");

  const failedCall = new MockCall();
  const failedAdapter = new BolnaCallAdapter(() => failedCall);
  await failedAdapter.start();
  failedCall.state = "ended";
  failedCall.emit("state-change", "ended");
  failedCall.emit("call-end", { reason: "failed" });
  assert.equal(failedAdapter.getSnapshot().state, "error");
  assert.match(failedAdapter.getSnapshot().error ?? "", /ended unexpectedly/);
});

test("permission denial and connection failure produce safe generic errors", async () => {
  const deniedCall = new MockCall();
  deniedCall.startImpl = async () => { throw { code: "microphone_denied" }; };
  const deniedAdapter = new BolnaCallAdapter(() => deniedCall);
  await assert.rejects(deniedAdapter.start(), /Microphone access was denied/);
  assert.equal(deniedAdapter.getSnapshot().state, "error");
  assert.equal(deniedAdapter.ownsAudio(), false);

  const failedCall = new MockCall();
  failedCall.startImpl = async () => { throw { code: "connect_failed" }; };
  const failedAdapter = new BolnaCallAdapter(() => failedCall);
  await assert.rejects(failedAdapter.start(), /voice call could not connect/);
  assert.equal(failedAdapter.getSnapshot().state, "error");
  assert.equal(failedAdapter.ownsAudio(), false);
});

test("session endpoint failures surface the server's reason, not a configuration hint", async () => {
  const { VoiceSessionRequestError } = await import("../src/lib/voice/bolnaSession.ts");
  const lockedCall = new MockCall();
  // The SDK wraps getSession failures as mint_failed and keeps the original error on cause2.
  lockedCall.startImpl = async () => { throw { code: "mint_failed", cause2: new VoiceSessionRequestError("locked", 401) }; };
  const adapter = new BolnaCallAdapter(() => lockedCall);
  await assert.rejects(adapter.start(), /grown-up needs to turn on Miko's voice/);
  assert.equal(adapter.getSnapshot().state, "error");

  const plainCall = new MockCall();
  plainCall.startImpl = async () => { throw { code: "mint_failed" }; };
  const plain = new BolnaCallAdapter(() => plainCall);
  await assert.rejects(plain.start(), /Miko couldn't connect/);
});

test("session requests send only lesson identifiers and map server error codes", async () => {
  const { requestBolnaSession, VoiceSessionRequestError } = await import("../src/lib/voice/bolnaSession.ts");
  let sentBody: unknown;
  const ok = await requestBolnaSession({ adventureId: "jungle-counting", challengeIndex: 2 }, async (_url, init) => {
    sentBody = JSON.parse(String(init?.body));
    return Response.json({ run_id: "r" });
  });
  assert.deepEqual(sentBody, { adventure_id: "jungle-counting", challenge_index: 2 });
  assert.equal(ok.run_id, "r");

  await assert.rejects(
    requestBolnaSession({ adventureId: "jungle-counting", challengeIndex: 0 }, async () => Response.json({ code: "rate_limited" }, { status: 429 })),
    (error: unknown) => error instanceof VoiceSessionRequestError && error.code === "rate_limited" && /little rest/.test(error.childMessage),
  );
  await assert.rejects(
    requestBolnaSession({ adventureId: "jungle-counting", challengeIndex: 0 }, async () => Response.json({ code: "rate_limit_store_missing" }, { status: 503 })),
    (error: unknown) => error instanceof VoiceSessionRequestError && /isn't set up here yet/.test(error.childMessage),
  );
});

test("dispose initiates call teardown and detaches SDK listeners", async () => {
  const call = new MockCall();
  const adapter = new BolnaCallAdapter(() => call);
  await adapter.start();
  adapter.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(adapter.getSnapshot().state, "ended");
  assert.equal(call.listenerCount(), 0);
});

test("microphone ownership rejects simultaneous browser and Bolna capture", () => {
  const ownership = new MicrophoneOwnership();
  assert.equal(ownership.claim("browser-recognition"), true);
  assert.equal(ownership.claim("bolna-call"), false);
  ownership.release("browser-recognition");
  assert.equal(ownership.claim("bolna-call"), true);
  assert.equal(ownership.claim("browser-recognition"), false);
  ownership.release("bolna-call");
  assert.equal(ownership.current, null);
});

test("session route requires same-origin requests and server configuration", async () => {
  const response = await createBolnaSession(new Request("http://localhost:3000/api/bolna-session", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  }));
  assert.equal(response.status, 403);
});

test("session route proxies a validated ephemeral session without exposing the API key", async () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousApiKey = process.env.BOLNA_API_KEY;
  const previousAgentId = process.env.BOLNA_AGENT_ID;
  const originalFetch = globalThis.fetch;
  const apiKey = "mock-only-test-key";
  const session = {
    run_id: "run-test",
    agent_id: "agent-test",
    sip_username: "sip-user",
    sip_password: "temporary-session-password",
    sip_domain: "sip.example.test",
    wss_url: "wss://sip.example.test/socket",
    sip_register: true,
    expires_in: 120,
    ice_servers: [{ urls: "stun:stun.example.test" }],
  };
  env.NODE_ENV = "development";
  process.env.BOLNA_API_KEY = apiKey;
  process.env.BOLNA_AGENT_ID = "agent-test";
  globalThis.fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${apiKey}`);
    const mintBody = JSON.parse(String(init?.body)) as { agent_id: string; user_data: Record<string, string> };
    assert.equal(mintBody.agent_id, "agent-test");
    assert.equal(mintBody.user_data.current_prompt, "Look at the butterflies! Can you count them?");
    assert.equal(mintBody.user_data.current_challenge_number, "1");
    return Response.json(session);
  };
  try {
    const response = await createBolnaSession(new Request("http://localhost:3000/api/bolna-session", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" },
      body: JSON.stringify({ adventure_id: "jungle-counting", challenge_index: 0 }),
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    const body = await response.json();
    assert.deepEqual(body, session);
    assert.equal(JSON.stringify(body).includes(apiKey), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousNodeEnv === undefined) delete env.NODE_ENV; else env.NODE_ENV = previousNodeEnv;
    if (previousApiKey === undefined) delete process.env.BOLNA_API_KEY; else process.env.BOLNA_API_KEY = previousApiKey;
    if (previousAgentId === undefined) delete process.env.BOLNA_AGENT_ID; else process.env.BOLNA_AGENT_ID = previousAgentId;
  }
});
