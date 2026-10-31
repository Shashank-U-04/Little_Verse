export type VoiceState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "unavailable";

export type MikoState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "celebrating"
  | "encouraging";

export type SkillId = "counting" | "number_recognition";

export type ObjectType =
  | "butterfly"
  | "banana"
  | "elephant"
  | "apple"
  | "mango"
  | "strawberry"
  | "monkey"
  | "parrot"
  | "lion"
  | "frog"
  | "fish"
  | "turtle";

export interface Challenge {
  id: string;
  skillId: SkillId;
  prompt: string;
  objectType: ObjectType;
  objectCount: number;
  expectedAnswer: number;
  options: number[];
  hintSequence: string[];
  difficulty: 1 | 2 | 3;
}

export interface Attempt {
  id: string;
  challengeId: string;
  answer: number;
  isCorrect: boolean;
  hintLevel: number;
  attemptNumber: number;
  answerType: "tap" | "voice";
  createdAt: string;
}

export interface Session {
  id: string;
  learnerId: string;
  activityId: string;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed" | "abandoned";
  attempts: Attempt[];
  challenges: Challenge[];
}

export interface SkillProgress {
  skillId: string;
  label: string;
  correct: number;
  total: number;
  hintRate: number;
}

export interface AdventureDefinition {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  objective: string;
  challenges: Challenge[];
}
