import type { Challenge } from "./types.ts";

export function validateAnswer(challenge: Challenge, answer: number): boolean {
  return answer === challenge.expectedAnswer;
}

const WORD_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export function parseVoiceAnswer(transcript: string): number | null {
  const lower = transcript.toLowerCase().trim();

  // Digits take precedence: e.g. "3", "I see 5 butterflies"
  const digitMatch = lower.match(/\b(10|[1-9])\b/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  // Number words one..ten
  for (const [word, value] of Object.entries(WORD_MAP)) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower)) {
      return value;
    }
  }

  return null;
}

export function getHint(challenge: Challenge, hintLevel: number): string | null {
  if (hintLevel < 0 || hintLevel >= challenge.hintSequence.length) {
    return null;
  }
  return challenge.hintSequence[hintLevel];
}
