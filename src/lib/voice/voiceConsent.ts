export const VOICE_CONSENT_KEY = "littleverse:voice-consent";
/** Bump when the disclosure text changes materially so parents re-consent. */
export const VOICE_CONSENT_VERSION = 1;

export type VoiceConsent = { version: number; acceptedAt: string };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

export function readVoiceConsent(storage: ReadableStorage | null): VoiceConsent | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(VOICE_CONSENT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { version, acceptedAt } = parsed as Record<string, unknown>;
    if (version !== VOICE_CONSENT_VERSION || typeof acceptedAt !== "string") return null;
    return { version, acceptedAt };
  } catch {
    return null;
  }
}

/** Returns the stored consent, or null when storage is unavailable (consent then lasts for this page only). */
export function saveVoiceConsent(storage: WritableStorage | null, now: Date): VoiceConsent {
  const consent = { version: VOICE_CONSENT_VERSION, acceptedAt: now.toISOString() };
  try {
    storage?.setItem(VOICE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Private browsing or disabled storage: the caller keeps consent in memory.
  }
  return consent;
}

export function clearVoiceConsent(storage: WritableStorage | null): void {
  try {
    storage?.removeItem(VOICE_CONSENT_KEY);
  } catch {
    // Nothing stored to clear.
  }
}

/**
 * Which voice speaks the tutor's lines. "bolna" never uses device speech;
 * "device" is used only when configured or explicitly chosen by the user.
 */
export type TutorVoiceMode = "bolna" | "device" | "off";

export function initialTutorVoiceMode(provider: "bolna" | "browser" | null): TutorVoiceMode {
  if (provider === "bolna") return "bolna";
  if (provider === "browser") return "device";
  return "off";
}
