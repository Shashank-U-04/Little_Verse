import type { Session, SkillProgress } from "./types.ts";
import { scoreSession } from "./scoring.ts";

const SKILL_LABELS: Record<string, string> = {
  counting: "Counting",
  number_recognition: "Number Recognition",
};

function labelFor(skillId: string): string {
  return SKILL_LABELS[skillId] ?? skillId;
}

export function buildSkillProgress(session: Session): SkillProgress[] {
  if (session.challenges.length === 0) return [];

  // Group challenges by skillId
  const skillToChallenges = new Map<string, typeof session.challenges>();
  for (const ch of session.challenges) {
    const arr = skillToChallenges.get(ch.skillId);
    if (arr) arr.push(ch);
    else skillToChallenges.set(ch.skillId, [ch]);
  }

  // For correctness per skill, check whether each configured challenge was
  // eventually solved. Assistance is the highest level reached for that
  // challenge, matching scoreSession and avoiding duplicate-tap inflation.
  const challengeCorrect = new Map<string, boolean>();
  const challengeHintLevel = new Map<string, number>();
  for (const a of session.attempts) {
    challengeHintLevel.set(
      a.challengeId,
      Math.max(challengeHintLevel.get(a.challengeId) ?? 0, a.hintLevel)
    );
    if (a.isCorrect) challengeCorrect.set(a.challengeId, true);
    else if (!challengeCorrect.has(a.challengeId)) challengeCorrect.set(a.challengeId, false);
  }

  const result: SkillProgress[] = [];
  for (const [skillId, challenges] of skillToChallenges) {
    const total = challenges.length;
    let correct = 0;
    let hintSum = 0;
    for (const ch of challenges) {
      if (challengeCorrect.get(ch.id) === true) correct += 1;
      if (challengeHintLevel.has(ch.id)) {
        hintSum += challengeHintLevel.get(ch.id) ?? 0;
      }
    }
    const hintRate = total > 0 ? hintSum / total : 0;
    result.push({
      skillId,
      label: labelFor(skillId),
      correct,
      total,
      hintRate,
    });
  }

  return result;
}

export interface ChartPoint {
  date: string;
  accuracy: number;
  label: string;
}

export function buildChartData(sessions: Session[]): ChartPoint[] {
  if (sessions.length === 0) return [];
  return sessions.map((s) => {
    const { accuracy } = scoreSession(s);
    // Use startedAt date portion YYYY-MM-DD
    const date = s.startedAt.slice(0, 10);
    return {
      date,
      accuracy,
      label: date,
    };
  });
}
