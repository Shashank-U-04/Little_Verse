import type { Session } from "./types.ts";

export interface SessionScore {
  /** Number of activities in the adventure definition. */
  total: number;
  /** Number of activities with at least one recorded attempt. */
  attempted: number;
  /** Number of activities eventually answered correctly. */
  correct: number;
  correctUnaided: number;
  /** Highest assistance level reached for each activity, summed once per activity. */
  hintsUsed: number;
  accuracy: number;
}

export function scoreSession(session: Session): SessionScore {
  const total = session.challenges.length;

  if (total === 0) {
    return { total: 0, attempted: 0, correct: 0, correctUnaided: 0, hintsUsed: 0, accuracy: 0 };
  }

  const byChallenge = new Map<string, typeof session.attempts>();
  for (const a of session.attempts) {
    const arr = byChallenge.get(a.challengeId);
    if (arr) arr.push(a);
    else byChallenge.set(a.challengeId, [a]);
  }

  let attempted = 0;
  let correct = 0;
  let correctUnaided = 0;
  let hintsUsed = 0;

  for (const ch of session.challenges) {
    const attempts = byChallenge.get(ch.id) ?? [];
    if (attempts.length === 0) continue;

    attempted += 1;
    // An assistance level describes the support available before an answer.
    // Count the highest level reached once per activity, never once per tap.
    hintsUsed += attempts.reduce((max, attempt) => Math.max(max, attempt.hintLevel), 0);

    const correctAttempts = attempts.filter((a) => a.isCorrect);
    if (correctAttempts.length > 0) {
      // The UI prevents duplicate correct submissions. Choosing the latest
      // correct attempt also makes imported legacy sessions deterministic.
      const lastCorrect = correctAttempts.reduce((prev, cur) =>
        cur.attemptNumber > prev.attemptNumber ? cur : prev
      );
      correct += 1;
      if (lastCorrect.hintLevel === 0) correctUnaided += 1;
    }
  }

  const accuracy = total > 0 ? correct / total : 0;

  return { total, attempted, correct, correctUnaided, hintsUsed, accuracy };
}

export function masteryLabel(correctUnaided: number, total: number): string {
  if (total === 0) return "Exploring";
  const ratio = correctUnaided / total;
  if (ratio === 0) return "Exploring";
  if (ratio < 0.5) return "Practicing";
  if (ratio < 1) return "Growing";
  return "Shining";
}
