import assert from "node:assert/strict";
import test from "node:test";
import { ADVENTURES, fruitBasketAdventure, jungleCountingAdventure, riverCountAdventure } from "../src/features/learning/activities.ts";
import { modulesForChild, MODULES } from "../src/features/learning/catalog.ts";
import { OBJECTS } from "../src/features/learning/objects.ts";
import { parseVoiceAnswer, validateAnswer } from "../src/features/learning/validation.ts";
import type { AdventureDefinition, Attempt, Session } from "../src/features/learning/types.ts";
import { computeProgress, LEVELS, levelForXp, progressDelta, starsForSession, XP_RULES } from "../src/features/gamification/progression.ts";
import { validateChildInput } from "../src/features/family/profile.ts";

let counter = 0;

/** A completed session where each challenge is solved at the given hint level (0 = no hints). */
function played(adventure: AdventureDefinition, completedAt: string, hintLevels: number[] = [], answerType: Attempt["answerType"] = "tap"): Session {
  const attempts: Attempt[] = [];
  adventure.challenges.forEach((challenge, i) => {
    const hints = hintLevels[i] ?? 0;
    for (let h = 0; h < hints; h++) {
      attempts.push({ id: `a${counter++}`, challengeId: challenge.id, answer: -1, isCorrect: false, hintLevel: h, attemptNumber: h + 1, answerType, createdAt: completedAt });
    }
    attempts.push({ id: `a${counter++}`, challengeId: challenge.id, answer: challenge.expectedAnswer, isCorrect: true, hintLevel: hints, attemptNumber: hints + 1, answerType, createdAt: completedAt });
  });
  return {
    id: `s${counter++}`,
    learnerId: "child-1",
    activityId: adventure.id,
    startedAt: completedAt,
    completedAt,
    status: "completed",
    attempts,
    challenges: adventure.challenges,
  };
}

test("every adventure is internally consistent and has a symbol for each object", () => {
  for (const adventure of Object.values(ADVENTURES)) {
    assert.ok(adventure.challenges.length > 0, adventure.id);
    for (const challenge of adventure.challenges) {
      assert.equal(challenge.objectCount, challenge.expectedAnswer, challenge.id);
      assert.ok(challenge.options.includes(challenge.expectedAnswer), challenge.id);
      assert.equal(validateAnswer(challenge, challenge.expectedAnswer), true);
      assert.ok(OBJECTS[challenge.objectType], challenge.objectType);
    }
  }
  for (const mod of MODULES) {
    if (mod.adventureId) assert.ok(ADVENTURES[mod.adventureId], mod.id);
  }
});

test("voice answers reach ten for the older adventures", () => {
  assert.equal(parseVoiceAnswer("there are ten fish"), 10);
  assert.equal(parseVoiceAnswer("I see 9"), 9);
  assert.equal(parseVoiceAnswer("seven turtles"), 7);
  assert.equal(parseVoiceAnswer("a dozen"), null);
});

test("modules are filtered by age and recommended by focus area", () => {
  const four = modulesForChild(4, ["healthy_food"]).map((m) => m.module.id);
  assert.ok(four.includes("jungle-counting"));
  assert.ok(four.includes("fruit-basket"));
  assert.ok(!four.includes("river-count"));
  const recommended = modulesForChild(4, ["healthy_food"]).find((m) => m.recommended);
  assert.equal(recommended?.module.id, "fruit-basket");
  const eight = modulesForChild(8, ["numbers"]).map((m) => m.module.id);
  assert.deepEqual(eight.filter((id) => ADVENTURES[id]), ["river-count"]);
});

test("a perfect first adventure earns all bonuses and the Jungle Explorer title", () => {
  const session = played(jungleCountingAdventure, "2026-10-20T10:00:00.000Z");
  const progress = computeProgress([session], new Date("2026-10-20T12:00:00.000Z"));
  const expected = 3 * XP_RULES.solvedUnaided + XP_RULES.completion + XP_RULES.perfect + XP_RULES.firstOfDay;
  assert.equal(progress.xp, expected);
  assert.equal(progress.level.title, "Jungle Explorer");
  assert.equal(starsForSession(session), 3);
  assert.equal(progress.stars["jungle-counting"], 3);
  assert.ok(progress.earnedBadgeIds.has("first-footprints"));
  assert.ok(progress.earnedBadgeIds.has("sharp-eyes"));
  assert.ok(progress.earnedBadgeIds.has("butterfly-buddy"));
  assert.ok(!progress.earnedBadgeIds.has("brave-voice"));
  assert.equal(progress.levelsReached.at(-1)?.reachedAt, session.completedAt);
});

test("hints lower XP and stars but persevering earns a badge", () => {
  const lightHelp = played(fruitBasketAdventure, "2026-10-20T09:00:00.000Z", [2, 1, 0]);
  assert.equal(starsForSession(lightHelp), 2);
  const session = played(fruitBasketAdventure, "2026-10-20T10:00:00.000Z", [2, 2, 1]);
  const progress = computeProgress([session]);
  assert.equal(progress.sessionXp.get(session.id)?.challenges, 2 * XP_RULES.solvedWithHelp + XP_RULES.solvedWithHint);
  assert.equal(progress.sessionXp.get(session.id)?.perfect, 0);
  assert.equal(starsForSession(session), 1);
  assert.ok(progress.earnedBadgeIds.has("never-give-up"));
  assert.ok(progress.earnedBadgeIds.has("fruit-friend"));
});

test("only the first adventure of a day gets the daily bonus, and streaks count consecutive days", () => {
  const sessions = [
    played(jungleCountingAdventure, "2026-10-20T09:00:00"),
    played(jungleCountingAdventure, "2026-10-20T15:00:00"),
    played(riverCountAdventure, "2026-10-21T09:00:00"),
    played(fruitBasketAdventure, "2026-10-22T09:00:00", [], "voice"),
  ];
  const progress = computeProgress(sessions, new Date("2026-10-22T18:00:00"));
  assert.equal(progress.sessionXp.get(sessions[0]!.id)?.firstOfDay, XP_RULES.firstOfDay);
  assert.equal(progress.sessionXp.get(sessions[1]!.id)?.firstOfDay, 0);
  assert.deepEqual(progress.streak, { current: 3, best: 3 });
  assert.ok(progress.earnedBadgeIds.has("on-a-roll"));
  assert.ok(progress.earnedBadgeIds.has("world-wanderer"));
  assert.ok(progress.earnedBadgeIds.has("trailblazer"));
  assert.ok(progress.earnedBadgeIds.has("brave-voice"));
  assert.equal(computeProgress(sessions, new Date("2026-10-25T18:00:00")).streak.current, 0);
});

test("in-progress sessions never count, and the delta reports level-ups and new badges once", () => {
  const first = played(jungleCountingAdventure, "2026-10-20T10:00:00.000Z");
  const unfinished: Session = { ...played(fruitBasketAdventure, "2026-10-20T11:00:00.000Z"), status: "in_progress", completedAt: null };
  const before = computeProgress([unfinished]);
  assert.equal(before.xp, 0);
  assert.equal(before.level.level, 1);
  const after = computeProgress([unfinished, first]);
  const delta = progressDelta(before, after);
  assert.equal(delta.levelUp?.title, "Jungle Explorer");
  assert.ok(delta.newBadges.some((b) => b.id === "first-footprints"));
  assert.equal(progressDelta(after, after).levelUp, null);
  assert.deepEqual(progressDelta(after, after).newBadges, []);
});

test("levels are ordered and the top level has no next level", () => {
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i]!.xp > LEVELS[i - 1]!.xp);
  assert.equal(levelForXp(0).level, 1);
  assert.equal(levelForXp(LEVELS.at(-1)!.xp + 500).title, "Jungle Legend");
});

test("child profiles are validated and normalised", () => {
  const ok = validateChildInput({ name: "  Aanya   Rao ", age: 5, hobbies: ["Drawing", "Drawing", " "], focusAreas: ["numbers", "numbers"], avatar: "tiger" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.name, "Aanya Rao");
    assert.deepEqual(ok.value.hobbies, ["Drawing"]);
    assert.deepEqual(ok.value.focusAreas, ["numbers"]);
  }
  const bad = validateChildInput({ name: "", age: 12, hobbies: [], focusAreas: [], avatar: "tiger" });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.errors.name);
    assert.ok(bad.errors.age);
    assert.ok(bad.errors.focusAreas);
  }
});
