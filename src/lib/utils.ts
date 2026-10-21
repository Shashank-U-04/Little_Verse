/**
 * Shared Tailwind class helper for LittleVerse jungle design system.
 * Filters falsy values and joins remaining classes with a single space.
 * No external deps - keeps bundle light and server-compatible.
 */
export type ClassValue = string | boolean | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
