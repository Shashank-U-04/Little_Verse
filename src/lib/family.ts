"use client";

import { useSyncExternalStore } from "react";
import {
  isChildProfile,
  isParentAccount,
  isValidEmail,
  normaliseEmail,
  type ChildInput,
  type ChildProfile,
  type ParentAccount,
} from "@/features/family/profile";
import type { Session } from "@/features/learning/types";
import { deleteSessionsFor, loadSessions, notifyStorageChange, SESSIONS_KEY, STORAGE_EVENT } from "@/lib/storage";

/**
 * Device-local family accounts for the prototype. Passwords are salted and
 * hashed with PBKDF2 before they are stored, but everything lives in this
 * browser: this is a parent gate for a shared device, not server-side auth.
 */

const PARENTS_KEY = "littleverse:parents";
const AUTH_KEY = "littleverse:auth";
const CHILDREN_KEY = "littleverse:children";
const ACTIVE_CHILD_KEY = "littleverse:active-child";
const KEYS = [PARENTS_KEY, AUTH_KEY, CHILDREN_KEY, ACTIVE_CHILD_KEY, SESSIONS_KEY];

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled: the in-memory flow continues for this page.
  }
  notifyStorageChange();
}

function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing to remove.
  }
  notifyStorageChange();
}

function readParents(): ParentAccount[] {
  const value = readJson(PARENTS_KEY);
  return Array.isArray(value) ? value.filter(isParentAccount) : [];
}

function readChildren(): ChildProfile[] {
  const value = readJson(CHILDREN_KEY);
  return Array.isArray(value) ? value.filter(isChildProfile) : [];
}

function newId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return toHex(bits);
}

export type AuthResult = { ok: true; parent: ParentAccount } | { ok: false; error: string };

export async function signUp(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  const name = input.name.trim();
  const email = normaliseEmail(input.email);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please enter a valid email address." };
  if (input.password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { ok: false, error: "This browser can't create a secure password here. Open LittleVerse over https." };
  }
  const parents = readParents();
  if (parents.some((p) => p.email === email)) return { ok: false, error: "An account with this email already exists on this device. Sign in instead." };
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const parent: ParentAccount = {
    id: newId("parent"),
    name,
    email,
    salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
  writeJson(PARENTS_KEY, [...parents, parent]);
  writeJson(AUTH_KEY, { parentId: parent.id, signedInAt: parent.createdAt });
  return { ok: true, parent };
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  const email = normaliseEmail(input.email);
  const parent = readParents().find((p) => p.email === email);
  // One message for both cases, so the form doesn't reveal which emails exist.
  const failure: AuthResult = { ok: false, error: "That email and password don't match an account on this device." };
  if (!parent || typeof crypto === "undefined" || !crypto.subtle) return failure;
  if ((await hashPassword(input.password, parent.salt)) !== parent.passwordHash) return failure;
  writeJson(AUTH_KEY, { parentId: parent.id, signedInAt: new Date().toISOString() });
  return { ok: true, parent };
}

let signedOutAt = 0;

export function signOut(): void {
  signedOutAt = Date.now();
  remove(AUTH_KEY);
}

/** True just after this tab signed out, so guards send the parent home rather than to sign-in. */
export function justSignedOut(): boolean {
  return Date.now() - signedOutAt < 5000;
}

export function createChild(parentId: string, input: ChildInput): ChildProfile {
  const child: ChildProfile = { ...input, id: newId("child"), parentId, createdAt: new Date().toISOString() };
  writeJson(CHILDREN_KEY, [...readChildren(), child]);
  setActiveChild(child.id);
  return child;
}

export function updateChild(id: string, input: ChildInput): void {
  writeJson(CHILDREN_KEY, readChildren().map((c) => (c.id === id ? { ...c, ...input } : c)));
}

export function deleteChild(id: string): void {
  writeJson(CHILDREN_KEY, readChildren().filter((c) => c.id !== id));
  deleteSessionsFor(id);
  if (readJson(ACTIVE_CHILD_KEY) === id) remove(ACTIVE_CHILD_KEY);
}

export function setActiveChild(id: string): void {
  writeJson(ACTIVE_CHILD_KEY, id);
}

export interface FamilySnapshot {
  /** False during server rendering and hydration, before browser storage is read. */
  ready: boolean;
  parent: ParentAccount | null;
  children: ChildProfile[];
  activeChild: ChildProfile | null;
  /** Sessions of the active child only. */
  sessions: Session[];
}

const SERVER_SNAPSHOT: FamilySnapshot = { ready: false, parent: null, children: [], activeChild: null, sessions: [] };
let cachedKey: string | null = null;
let cachedSnapshot: FamilySnapshot = SERVER_SNAPSHOT;

function readSnapshot(): FamilySnapshot {
  let key: string;
  try {
    key = KEYS.map((k) => storage()?.getItem(k) ?? "").join("\u0000");
  } catch {
    key = "";
  }
  // useSyncExternalStore needs a stable object until storage really changes.
  if (key === cachedKey) return cachedSnapshot;
  cachedKey = key;

  const auth = readJson(AUTH_KEY) as { parentId?: unknown } | null;
  const parent = readParents().find((p) => p.id === auth?.parentId) ?? null;
  const children = parent ? readChildren().filter((c) => c.parentId === parent.id) : [];
  const activeId = readJson(ACTIVE_CHILD_KEY);
  const activeChild = children.find((c) => c.id === activeId) ?? children[0] ?? null;
  const sessions = activeChild ? loadSessions().filter((s) => s.learnerId === activeChild.id) : [];
  cachedSnapshot = { ready: true, parent, children, activeChild, sessions };
  return cachedSnapshot;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

export function useFamily(): FamilySnapshot {
  return useSyncExternalStore(subscribe, readSnapshot, () => SERVER_SNAPSHOT);
}
