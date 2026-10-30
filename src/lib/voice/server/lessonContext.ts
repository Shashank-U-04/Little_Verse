import { jungleCountingAdventure } from "../../../features/learning/activities.ts";
import type { AdventureDefinition } from "../../../features/learning/types.ts";

const ADVENTURES: Record<string, AdventureDefinition> = {
  [jungleCountingAdventure.id]: jungleCountingAdventure,
};

const OBJECT_PLURALS: Record<string, string> = {
  butterfly: "butterflies",
  banana: "bananas",
  elephant: "elephants",
};

export type LessonContextRequest = { adventureId: string; challengeIndex: number };

/** Accepts only identifiers from the browser; free text never reaches the agent prompt. */
export function parseLessonContextRequest(body: unknown): LessonContextRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { adventure_id: adventureId, challenge_index: challengeIndex } = body as Record<string, unknown>;
  // Object.hasOwn, not `in`: inherited keys such as "constructor" must not pass as adventures.
  if (typeof adventureId !== "string" || !Object.hasOwn(ADVENTURES, adventureId)) return null;
  if (typeof challengeIndex !== "number" || !Number.isInteger(challengeIndex)) return null;
  const adventure = ADVENTURES[adventureId]!;
  if (challengeIndex < 0 || challengeIndex >= adventure.challenges.length) return null;
  return { adventureId, challengeIndex };
}

/**
 * Builds Bolna `user_data` on the server from trusted lesson definitions.
 * Expected answers and object counts are deliberately left out: the agent
 * coaches, and the app alone decides correctness.
 */
export function buildBolnaUserData({ adventureId, challengeIndex }: LessonContextRequest): Record<string, string> {
  const adventure = ADVENTURES[adventureId]!;
  const current = adventure.challenges[challengeIndex]!;
  const challengeList = adventure.challenges
    .map((challenge, index) => {
      const objects = OBJECT_PLURALS[challenge.objectType] ?? challenge.objectType;
      return `${index + 1}. ${challenge.prompt} (${objects}; answer buttons ${challenge.options.join(", ")})`;
    })
    .join("\n");

  return {
    adventure_title: adventure.title,
    learning_objective: adventure.objective,
    total_challenges: String(adventure.challenges.length),
    current_challenge_number: String(challengeIndex + 1),
    current_prompt: current.prompt,
    current_objects: OBJECT_PLURALS[current.objectType] ?? current.objectType,
    challenge_list: challengeList,
  };
}
