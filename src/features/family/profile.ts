import { isFocusArea, type FocusArea } from "../learning/catalog.ts";

export interface ParentAccount {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  hobbies: string[];
  focusAreas: FocusArea[];
  avatar: AvatarId;
  createdAt: string;
}

export const MIN_AGE = 3;
export const MAX_AGE = 8;

export const AVATARS = {
  tiger: "Tiger",
  "monkey-face": "Monkey",
  panda: "Panda",
  fox: "Fox",
  owl: "Owl",
  koala: "Koala",
  frog: "Frog",
  unicorn: "Unicorn",
  rabbit: "Bunny",
  elephant: "Elephant",
} as const;

export type AvatarId = keyof typeof AVATARS;
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];

export const HOBBY_SUGGESTIONS = [
  "Drawing",
  "Dinosaurs",
  "Music",
  "Dancing",
  "Football",
  "Building blocks",
  "Animals",
  "Stories",
  "Space",
  "Cars",
  "Cooking",
  "Puzzles",
] as const;

export interface ChildInput {
  name: string;
  age: number;
  hobbies: string[];
  focusAreas: FocusArea[];
  avatar: AvatarId;
}

export type ChildInputErrors = Partial<Record<keyof ChildInput, string>>;

/** Validates and normalises the onboarding form; the UI shows these messages as they are. */
export function validateChildInput(input: ChildInput): { ok: true; value: ChildInput } | { ok: false; errors: ChildInputErrors } {
  const errors: ChildInputErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length === 0) errors.name = "Please enter your child's first name.";
  else if (name.length > 30) errors.name = "Please keep the name under 30 characters.";
  if (!Number.isInteger(input.age) || input.age < MIN_AGE || input.age > MAX_AGE) {
    errors.age = `Choose an age from ${MIN_AGE} to ${MAX_AGE}.`;
  }
  const hobbies = [...new Set(input.hobbies.map((h) => h.trim()).filter(Boolean))].slice(0, 8);
  if (hobbies.some((h) => h.length > 24)) errors.hobbies = "Keep each hobby under 24 characters.";
  const focusAreas = [...new Set(input.focusAreas)].filter(isFocusArea);
  if (focusAreas.length === 0) errors.focusAreas = "Pick at least one thing to focus on.";
  if (!Object.hasOwn(AVATARS, input.avatar)) errors.avatar = "Pick an explorer buddy.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, age: input.age, hobbies, focusAreas, avatar: input.avatar } };
}

export function isChildProfile(value: unknown): value is ChildProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.parentId === "string" &&
    typeof v.name === "string" &&
    typeof v.age === "number" &&
    Array.isArray(v.hobbies) &&
    v.hobbies.every((h) => typeof h === "string") &&
    Array.isArray(v.focusAreas) &&
    v.focusAreas.every(isFocusArea) &&
    typeof v.avatar === "string" &&
    Object.hasOwn(AVATARS, v.avatar) &&
    typeof v.createdAt === "string"
  );
}

export function isParentAccount(value: unknown): value is ParentAccount {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.email === "string" &&
    typeof v.salt === "string" &&
    typeof v.passwordHash === "string" &&
    typeof v.createdAt === "string"
  );
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email));
}
