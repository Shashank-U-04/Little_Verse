export type MicrophoneOwner = "browser-recognition" | "bolna-call";

/** Synchronous gate preventing two app-controlled voice paths from owning the mic. */
export class MicrophoneOwnership {
  private owner: MicrophoneOwner | null = null;

  get current(): MicrophoneOwner | null {
    return this.owner;
  }

  claim(owner: MicrophoneOwner): boolean {
    if (this.owner !== null) return false;
    this.owner = owner;
    return true;
  }

  release(owner: MicrophoneOwner): void {
    if (this.owner === owner) this.owner = null;
  }
}
