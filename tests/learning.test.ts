import assert from "node:assert/strict";
import test from "node:test";
import { jungleCountingAdventure } from "../src/features/learning/activities.ts";
import { buildChartData, buildSkillProgress } from "../src/features/learning/progress.ts";
import { scoreSession } from "../src/features/learning/scoring.ts";
import { getHint, parseVoiceAnswer, validateAnswer } from "../src/features/learning/validation.ts";
import type { Session } from "../src/features/learning/types.ts";

function sessionWithAttempts(attempts: Session["attempts"]): Session {
  return {
    id: "test-session",
    learnerId: "learner-1",
    activityId: jungleCountingAdventure.id,
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:03:00.000Z",
    status: "completed",
    challenges: jungleCountingAdventure.challenges,
    attempts,
  };
}

function attempt(challengeId: string, answer: number, isCorrect: boolean, hintLevel: number, attemptNumber: number) {
  return {
    id: `${challengeId}-${attemptNumber}`,
    challengeId,
    answer,
    isCorrect,
    hintLevel,
    attemptNumber,
    answerType: "tap" as const,
    createdAt: `2026-01-01T00:0${attemptNumber}.000Z`,
  };
}

test("structured activities validate 3 butterflies, 5 bananas, and 4 elephants", () => {
  const expected = [3, 5, 4];
  jungleCountingAdventure.challenges.forEach((challenge, index) => {
    assert.equal(challenge.objectCount, expected[index]);
    assert.equal(validateAnswer(challenge, expected[index]!), true);
    assert.equal(validateAnswer(challenge, expected[index]! + 1), false);
  });
});

test("voice parsing only produces bounded number answers", () => {
  assert.equal(parseVoiceAnswer("I count three"), 3);
  assert.equal(parseVoiceAnswer("There are 5 bananas"), 5);
  assert.equal(parseVoiceAnswer("a dozen"), null);
});

test("incorrect answers progress hints and assistance is counted once", () => {
  const challenge = jungleCountingAdventure.challenges[0]!;
  assert.equal(getHint(challenge, 0), "Good try! Let's try again.");
  assert.equal(getHint(challenge, 1)?.includes("one, two, three"), true);

  const session = sessionWithAttempts([
    attempt(challenge.id, 2, false, 0, 1),
    attempt(challenge.id, 4, false, 1, 2),
    attempt(challenge.id, 3, true, 2, 3),
  ]);
  const score = scoreSession(session);
  assert.deepEqual(
    { attempted: score.attempted, correct: score.correct, correctUnaided: score.correctUnaided, hintsUsed: score.hintsUsed },
    { attempted: 1, correct: 1, correctUnaided: 0, hintsUsed: 2 }
  );
});

test("completion statistics reflect all three solved challenges", () => {
  const session = sessionWithAttempts(
    jungleCountingAdventure.challenges.map((challenge, index) => attempt(challenge.id, challenge.expectedAnswer, true, 0, index + 1))
  );
  const score = scoreSession(session);
  assert.equal(score.attempted, 3);
  assert.equal(score.total, 3);
  assert.equal(score.correct, 3);
  assert.equal(score.accuracy, 1);
  assert.equal(buildSkillProgress(session).length, 2);
});

test("empty progress and chart data are honest", () => {
  const empty = sessionWithAttempts([]);
  assert.deepEqual(buildSkillProgress(empty), [
    { skillId: "counting", label: "Counting", correct: 0, total: 2, hintRate: 0 },
    { skillId: "number_recognition", label: "Number Recognition", correct: 0, total: 1, hintRate: 0 },
  ]);
  assert.deepEqual(buildChartData([]), []);
  assert.equal(buildChartData([empty])[0]?.accuracy, 0);
});
