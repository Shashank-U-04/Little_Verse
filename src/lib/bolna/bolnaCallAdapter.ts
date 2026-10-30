import {
  BolnaWebCall,
  type BolnaWebCallEvents,
  type CallError,
  type CallState,
} from "@bolna/web-call";

export type BolnaUiState = "idle" | "requesting_permission" | "connecting" | "active" | "ending" | "ended" | "error";

export type BolnaUiSnapshot = {
  state: BolnaUiState;
  error: string | null;
};

export interface BolnaCallClient {
  start(): Promise<void>;
  stop(): Promise<void>;
  getState(): CallState;
  on<K extends keyof BolnaWebCallEvents>(event: K, listener: BolnaWebCallEvents[K]): unknown;
  off<K extends keyof BolnaWebCallEvents>(event: K, listener: BolnaWebCallEvents[K]): unknown;
}

type CallFactory = () => BolnaCallClient;
type SnapshotListener = (snapshot: BolnaUiSnapshot) => void;
const AUDIO_OWNED_STATES = new Set<BolnaUiState>([
  "requesting_permission",
  "connecting",
  "active",
  "ending",
]);

/** A session-endpoint failure carries child-friendly copy on the SDK error's cause. */
function sessionRequestMessage(error: object): string | null {
  const { cause, cause2 } = error as { cause?: unknown; cause2?: unknown };
  const source = cause ?? cause2;
  if (typeof source === "object" && source !== null && "childMessage" in source) {
    const message = (source as { childMessage: unknown }).childMessage;
    if (typeof message === "string") return message;
  }
  return null;
}

function describeCallError(error: CallError | unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as CallError).code === "mint_failed") {
      const message = sessionRequestMessage(error);
      if (message) return message;
    }
    switch ((error as CallError).code) {
      case "microphone_denied":
        return "Microphone access was denied. You can still answer by tapping a number.";
      case "at_capacity":
        return "Miko is busy right now. Please try again shortly.";
      case "autoplay_blocked":
        return "The browser blocked call audio. Try again using the Start conversation button.";
      case "mint_failed":
        return "Miko couldn't connect. Please try again, or keep tapping the numbers.";
      case "call_rejected":
      case "connect_failed":
        return "The voice call could not connect. Please try again or tap a number.";
      case "already_active":
        return "A voice call is already in progress.";
      default:
        return "The voice call could not start. You can still answer by tapping a number.";
    }
  }

  return "The voice call could not start. You can still answer by tapping a number.";
}

export class BolnaCallAdapter {
  private readonly createCall: CallFactory;
  private call: BolnaCallClient | null = null;
  private state: BolnaUiState = "idle";
  private error: string | null = null;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private listeners = new Set<SnapshotListener>();

  constructor(createCall: CallFactory = () => new BolnaWebCall({ sessionUrl: "/api/bolna-session" })) {
    this.createCall = createCall;
  }

  getSnapshot(): BolnaUiSnapshot {
    return { state: this.state, error: this.error };
  }

  /** Reflects the adapter lifecycle and retained SDK call after an unconfirmed stop. */
  ownsAudio(): boolean {
    if (AUDIO_OWNED_STATES.has(this.state)) return true;
    if (this.state !== "error" || !this.call) return false;
    const callState = this.call.getState();
    return callState === "connecting" || callState === "ringing" || callState === "active";
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    // Covers requesting_permission and an unconfirmed hang-up whose SDK call is still live.
    if (this.call && this.ownsAudio()) return;

    const call = this.createCall();
    this.call = call;
    this.error = null;
    this.setState("connecting");

    const onStateChange: BolnaWebCallEvents["state-change"] = (state) => {
      if (this.call !== call) return;
      if (this.state === "ending") return;
      if (state === "active") this.setState("active");
      else if (state === "connecting" || state === "ringing") this.setState("connecting");
      // The SDK emits state-change("ended") before call-end. Wait for call-end
      // so a failed remote hangup keeps its reason and error state.
    };
    const onCallStart: BolnaWebCallEvents["call-start"] = () => {
      if (this.call === call && this.state !== "ending") this.setState("active");
    };
    const onCallEnd: BolnaWebCallEvents["call-end"] = ({ reason }) => {
      if (reason === "failed") {
        this.finish(call, "error", "The voice call ended unexpectedly. You can still answer by tapping a number.");
      } else {
        this.finish(call, "ended", null);
      }
    };
    const onError: BolnaWebCallEvents["error"] = (error) => {
      if (this.call !== call) return;
      this.error = describeCallError(error);
      this.publish();
    };
    const onMediaPermission: BolnaWebCallEvents["media-permission"] = () => {
      if (this.call === call && this.state === "connecting") this.setState("requesting_permission");
    };

    call.on("state-change", onStateChange);
    call.on("call-start", onCallStart);
    call.on("call-end", onCallEnd);
    call.on("error", onError);
    call.on("media-permission", onMediaPermission);

    const detach = () => {
      call.off("state-change", onStateChange);
      call.off("call-start", onCallStart);
      call.off("call-end", onCallEnd);
      call.off("error", onError);
      call.off("media-permission", onMediaPermission);
    };
    this.detachForCall = detach;

    const operation = (async () => {
      try {
        await call.start();
        if (this.call === call && this.state !== "ending" && call.getState() === "active") this.setState("active");
      } catch (error) {
        const message = describeCallError(error);
        if (this.call === call) this.finish(call, "error", message);
        throw new Error(message);
      }
    })();
    this.startPromise = operation;
    try {
      await operation;
    } finally {
      if (this.startPromise === operation) this.startPromise = null;
    }
  }

  private detachForCall: (() => void) | null = null;

  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    const call = this.call;
    if (!call) return;

    this.setState("ending");
    const operation = (async () => {
      try {
        await call.stop();
        if (this.call === call) this.finish(call, "ended", null);
      } catch {
        if (this.call === call) {
          this.error = "The call could not be confirmed as ended. Please wait before using voice answer capture.";
          this.setState("error");
        }
        throw new Error("Bolna call teardown did not complete.");
      }
    })();
    this.stopPromise = operation;
    try {
      await operation;
    } finally {
      if (this.stopPromise === operation) this.stopPromise = null;
    }
  }

  dispose(): void {
    void this.stop().catch(() => undefined);
  }

  private finish(call: BolnaCallClient, state: "ended" | "error", error: string | null): void {
    if (this.call !== call) return;
    this.detachForCall?.();
    this.detachForCall = null;
    this.call = null;
    this.error = error;
    this.setState(state);
  }

  private setState(state: BolnaUiState): void {
    if (this.state === state) return;
    this.state = state;
    this.publish();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
