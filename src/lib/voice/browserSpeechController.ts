export interface SpeechUtterancePort {
  lang: string;
  rate: number;
  pitch: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface SpeechSynthesisPort {
  cancel(): void;
  speak(utterance: SpeechUtterancePort): void;
}

export interface SpeechTimerPort {
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(timerId: number): void;
}

export interface BrowserSpeechControllerOptions {
  isAudioOwned: () => boolean;
  getSynthesis: () => SpeechSynthesisPort | null;
  createUtterance: (text: string) => SpeechUtterancePort;
  timers: SpeechTimerPort;
  onStart: () => void;
  onFinish: () => void;
}

/** Browser TTS that consults the live Bolna adapter before every playback. */
export class BrowserSpeechController {
  private readonly options: BrowserSpeechControllerOptions;
  private pendingTimers = new Set<number>();
  private utteranceGeneration = 0;

  constructor(options: BrowserSpeechControllerOptions) {
    this.options = options;
  }

  speak(text: string): boolean {
    if (this.options.isAudioOwned()) return false;
    const synthesis = this.options.getSynthesis();
    if (!synthesis) return false;

    const generation = ++this.utteranceGeneration;
    try {
      synthesis.cancel();
      const utterance = this.options.createUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1.02;
      utterance.onend = () => {
        if (generation === this.utteranceGeneration) this.options.onFinish();
      };
      utterance.onerror = () => {
        if (generation === this.utteranceGeneration) this.options.onFinish();
      };
      this.options.onStart();
      synthesis.speak(utterance);
      return true;
    } catch {
      if (generation === this.utteranceGeneration) this.options.onFinish();
      return false;
    }
  }

  schedule(text: string, delayMs: number): () => void {
    let timerId = 0;
    timerId = this.options.timers.setTimeout(() => {
      // A timer callback already queued by the browser can still run after
      // clearTimeout. Membership also acts as its cancellation generation.
      if (!this.pendingTimers.delete(timerId)) return;
      // Check again at execution time so a callback captured before a rerender
      // cannot start speech after Bolna has taken audio ownership.
      if (!this.options.isAudioOwned()) this.speak(text);
    }, delayMs);
    this.pendingTimers.add(timerId);
    return () => this.clearTimer(timerId);
  }

  cancelPending(): void {
    for (const timerId of this.pendingTimers) this.options.timers.clearTimeout(timerId);
    this.pendingTimers.clear();
  }

  cancelAll(): void {
    this.cancelPending();
    this.utteranceGeneration += 1;
    this.options.getSynthesis()?.cancel();
    this.options.onFinish();
  }

  private clearTimer(timerId: number): void {
    if (!this.pendingTimers.delete(timerId)) return;
    this.options.timers.clearTimeout(timerId);
  }
}
