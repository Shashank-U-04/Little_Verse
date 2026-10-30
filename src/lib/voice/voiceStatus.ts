/** Shape of GET /api/voice/status. Contains no secrets; safe for the client. */
export type VoiceStatusResponse = {
  provider: "bolna" | "browser" | null;
  bolnaReady: boolean;
  /** Adult-facing reason when Bolna is not ready. */
  reason: string | null;
  accessCodeRequired: boolean;
  unlocked: boolean;
};
