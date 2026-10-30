import assert from "node:assert/strict";
import test from "node:test";
import type { BolnaWebCallEvents, CallState } from "@bolna/web-call";
import { BolnaCallAdapter, type BolnaCallClient } from "../src/lib/bolna/bolnaCallAdapter.ts";
import {
  BrowserSpeechController,
  type SpeechSynthesisPort,
  type SpeechTimerPort,
  type SpeechUtterancePort,
} from "../src/lib/voice/browserSpeechController.ts";

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
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (payload: never) => void);
    this.listeners.set(event, listeners);
    return undefined;
  }
  off<K extends EventName>(event: K, listener: BolnaWebCallEvents[K]): unknown {
    this.listeners.get(event)?.delete(listener as (payload: never) => void);
    return undefined;
  }
  emit<K extends EventName>(event: K, payload: BolnaWebCallEvents[K] extends (arg: infer A) => void ? A : never): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload as never);
  }
}

class FakeTimers implements SpeechTimerPort {
  private nextId = 1;
  lastDelayMs = 0;
  readonly callbacks = new Map<number, () => void>();
  readonly active = new Set<number>();

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.lastDelayMs = delayMs;
    this.callbacks.set(id, callback);
    this.active.add(id);
    return id;
  }
  clearTimeout(id: number): void { this.active.delete(id); }
  fireEvenIfCleared(id: number): void { this.callbacks.get(id)?.(); }
}

function createSpeechController(adapter: BolnaCallAdapter, timers = new FakeTimers()) {
  const spoken: string[] = [];
  let currentUtterance: (SpeechUtterancePort & { text: string }) | null = null;
  let finished = 0;
  let starts = 0;
  const synthesis: SpeechSynthesisPort = {
    cancel: () => undefined,
    speak: (utterance) => { spoken.push((utterance as SpeechUtterancePort & { text: string }).text); },
  };
  const controller = new BrowserSpeechController({
    isAudioOwned: () => adapter.ownsAudio(),
    getSynthesis: () => synthesis,
    createUtterance: (text) => {
      currentUtterance = { text, lang: "", rate: 1, pitch: 1, onend: null, onerror: null };
      return currentUtterance;
    },
    timers,
    onStart: () => { starts += 1; },
    onFinish: () => { finished += 1; },
  });
  return { controller, spoken, timers, get currentUtterance() { return currentUtterance; }, get starts() { return starts; }, get finished() { return finished; } };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

test("browser TTS remains available outside a Bolna session", () => {
  const adapter = new BolnaCallAdapter(() => new MockCall());
  const speech = createSpeechController(adapter);

  assert.equal(speech.controller.speak("Count the butterflies."), true);
  assert.deepEqual(speech.spoken, ["Count the butterflies."]);
  assert.equal(speech.currentUtterance?.lang, "en-US");
  assert.equal(speech.currentUtterance?.rate, 0.95);
  assert.equal(speech.currentUtterance?.pitch, 1.02);
  assert.equal(speech.starts, 1);
  speech.currentUtterance?.onend?.();
  assert.equal(speech.finished, 1);
});

test("adapter audio ownership covers permission, connection, active, and teardown states", async () => {
  const call = new MockCall();
  const start = deferred<void>();
  const stop = deferred<void>();
  call.startImpl = () => start.promise;
  call.stopImpl = () => stop.promise;
  const adapter = new BolnaCallAdapter(() => call);

  const starting = adapter.start();
  assert.equal(adapter.getSnapshot().state, "connecting");
  assert.equal(adapter.ownsAudio(), true);
  call.emit("media-permission", undefined);
  assert.equal(adapter.getSnapshot().state, "requesting_permission");
  assert.equal(adapter.ownsAudio(), true);
  call.state = "active";
  call.emit("call-start", undefined);
  start.resolve();
  await starting;
  assert.equal(adapter.ownsAudio(), true);

  const stopping = adapter.stop();
  assert.equal(adapter.getSnapshot().state, "ending");
  assert.equal(adapter.ownsAudio(), true);
  call.state = "ended";
  call.emit("state-change", "ended");
  call.emit("call-end", { reason: "local-hangup" });
  stop.resolve();
  await stopping;
  assert.equal(adapter.getSnapshot().state, "ended");
  assert.equal(adapter.ownsAudio(), false);
});

test("failed connection releases the audio gate and allows normal browser TTS", async () => {
  const call = new MockCall();
  call.startImpl = async () => { throw { code: "connect_failed" }; };
  const adapter = new BolnaCallAdapter(() => call);
  const speech = createSpeechController(adapter);

  await assert.rejects(adapter.start(), /voice call could not connect/i);
  assert.equal(adapter.getSnapshot().state, "error");
  assert.equal(adapter.ownsAudio(), false);
  assert.equal(speech.controller.speak("Try tapping a number."), true);
  assert.deepEqual(speech.spoken, ["Try tapping a number."]);
});

test("pending speech timers are canceled and stale queued callbacks stay inert", async () => {
  const call = new MockCall();
  const adapter = new BolnaCallAdapter(() => call);
  const speech = createSpeechController(adapter);
  const cancelTimer = speech.controller.schedule("A delayed hint", 250);
  const timerId = [...speech.timers.callbacks.keys()][0]!;
  assert.equal(speech.timers.lastDelayMs, 250);

  await adapter.start();
  assert.equal(adapter.ownsAudio(), true);
  speech.controller.cancelAll();
  cancelTimer();
  speech.timers.fireEvenIfCleared(timerId);

  assert.deepEqual(speech.spoken, []);
});

test("device speech never runs unless it is the chosen voice", async () => {
  const { initialTutorVoiceMode } = await import("../src/lib/voice/voiceConsent.ts");
  const adapter = new BolnaCallAdapter(() => new MockCall());
  let mode = initialTutorVoiceMode("bolna");
  const spoken: string[] = [];
  const timers = new FakeTimers();
  const controller = new BrowserSpeechController({
    isAudioOwned: () => adapter.ownsAudio(),
    isEnabled: () => mode === "device",
    getSynthesis: () => ({ cancel: () => undefined, speak: (utterance) => { spoken.push((utterance as SpeechUtterancePort & { text: string }).text); } }),
    createUtterance: (text) => ({ text, lang: "", rate: 1, pitch: 1, onend: null, onerror: null }) as SpeechUtterancePort,
    timers,
    onStart: () => undefined,
    onFinish: () => undefined,
  });

  assert.equal(controller.speak("Bolna is selected"), false);
  controller.schedule("Queued while Bolna is selected", 400);
  const [queuedId] = [...timers.active];
  mode = "device";
  assert.equal(controller.speak("Grown-up chose the device voice"), true);
  mode = "bolna";
  timers.fireEvenIfCleared(queuedId!);
  assert.deepEqual(spoken, ["Grown-up chose the device voice"]);

  assert.equal(initialTutorVoiceMode("browser"), "device");
  assert.equal(initialTutorVoiceMode(null), "off");
});

test("voice consent is versioned and tolerates broken storage", async () => {
  const { readVoiceConsent, saveVoiceConsent, clearVoiceConsent, VOICE_CONSENT_KEY } = await import("../src/lib/voice/voiceConsent.ts");
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  assert.equal(readVoiceConsent(storage), null);
  saveVoiceConsent(storage, new Date("2026-10-31T10:00:00.000Z"));
  assert.deepEqual(readVoiceConsent(storage), { version: 1, acceptedAt: "2026-10-31T10:00:00.000Z" });
  data.set(VOICE_CONSENT_KEY, JSON.stringify({ version: 0, acceptedAt: "old" }));
  assert.equal(readVoiceConsent(storage), null, "older disclosure versions need fresh consent");
  data.set(VOICE_CONSENT_KEY, "{not json");
  assert.equal(readVoiceConsent(storage), null);
  clearVoiceConsent(storage);
  assert.equal(data.has(VOICE_CONSENT_KEY), false);
  const throwing = { setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("denied"); } };
  assert.equal(saveVoiceConsent(throwing, new Date(0)).version, 1);
  clearVoiceConsent(throwing);
});
