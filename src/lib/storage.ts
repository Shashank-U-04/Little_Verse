import type { Challenge, Session } from "@/features/learning/types";
import { isObjectType } from "@/features/learning/objects";

export const SESSIONS_KEY = "littleverse:sessions";
const STORAGE_KEY = SESSIONS_KEY;
/** Fired on window after any LittleVerse write, so open views re-read storage. */
export const STORAGE_EVENT = "littleverse:storage";

export function notifyStorageChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORAGE_EVENT));
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChallenge(value: unknown): value is Session["challenges"][number] {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.skillId === "counting" || value.skillId === "number_recognition") &&
    typeof value.prompt === "string" &&
    isObjectType(value.objectType) &&
    typeof value.objectCount === "number" &&
    Number.isInteger(value.objectCount) &&
    value.objectCount >= 0 &&
    typeof value.expectedAnswer === "number" &&
    Array.isArray(value.options) &&
    value.options.every((option) => typeof option === "number") &&
    Array.isArray(value.hintSequence) &&
    value.hintSequence.every((hint) => typeof hint === "string") &&
    (value.difficulty === 1 || value.difficulty === 2 || value.difficulty === 3)
  );
}

function isAttempt(value: unknown): value is Session["attempts"][number] {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.challengeId === "string" &&
    typeof value.answer === "number" &&
    typeof value.isCorrect === "boolean" &&
    typeof value.hintLevel === "number" &&
    Number.isInteger(value.hintLevel) &&
    value.hintLevel >= 0 &&
    typeof value.attemptNumber === "number" &&
    Number.isInteger(value.attemptNumber) &&
    value.attemptNumber > 0 &&
    (value.answerType === "tap" || value.answerType === "voice") &&
    typeof value.createdAt === "string"
  );
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.learnerId === "string" &&
    typeof value.activityId === "string" &&
    typeof value.startedAt === "string" &&
    (value.completedAt === null || typeof value.completedAt === "string") &&
    (value.status === "in_progress" || value.status === "completed" || value.status === "abandoned") &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isAttempt) &&
    Array.isArray(value.challenges) &&
    value.challenges.every(isChallenge)
  );
}

function readRaw(): Session[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Treat malformed browser data as unavailable rather than allowing it to
    // crash the parent dashboard or completion route.
    return parsed.filter(isSession);
  } catch {
    return [];
  }
}

function writeRaw(sessions: Session[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    notifyStorageChange();
  } catch {
    // Private browsing, quota limits, and disabled storage must not block the
    // visual learning flow. The caller still has the in-memory session state.
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function saveSession(s: Session): void {
  if (!isBrowser()) return;
  const sessions = readRaw();
  const idx = sessions.findIndex((x) => x.id === s.id);
  if (idx >= 0) {
    sessions[idx] = s;
  } else {
    sessions.push(s);
  }
  writeRaw(sessions);
}

export function loadSessions(): Session[] {
  return readRaw();
}

export function loadSession(id: string): Session | null {
  const sessions = readRaw();
  return sessions.find((s) => s.id === id) ?? null;
}

/** Removes every session that belongs to one learner, e.g. when a child profile is deleted. */
export function deleteSessionsFor(learnerId: string): void {
  writeRaw(readRaw().filter((s) => s.learnerId !== learnerId));
}

export function createNewSession(
  challenges: Challenge[],
  { learnerId, activityId }: { learnerId: string; activityId: string },
): Session {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    learnerId,
    activityId,
    startedAt: now,
    completedAt: null,
    status: "in_progress",
    attempts: [],
    challenges,
  };
}
