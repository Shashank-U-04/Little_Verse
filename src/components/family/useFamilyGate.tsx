"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { justSignedOut, useFamily, type FamilySnapshot } from "@/lib/family";

/**
 * Keeps a page behind the parent sign-in (and, for the kids' side, a child
 * profile). Returns the family once it is allowed to render, otherwise null
 * while it redirects.
 */
export function useFamilyGate(need: "parent" | "child"): FamilySnapshot | null {
  const family = useFamily();
  const router = useRouter();
  const pathname = usePathname();
  const redirect = !family.ready
    ? null
    : !family.parent
      ? justSignedOut()
        ? "/"
        : `/login?next=${encodeURIComponent(pathname)}`
      : need === "child" && !family.activeChild
        ? "/onboarding"
        : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  return family.ready && !redirect ? family : null;
}

/** Shown while browser storage is read or a redirect is under way. */
export function GateLoader({ label = "Opening the jungle…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Symbol3D name="compass" size={64} className="animate-spin [animation-duration:3s]" />
      <p className="font-display text-lg font-semibold text-[#205C43]">{label}</p>
    </div>
  );
}
