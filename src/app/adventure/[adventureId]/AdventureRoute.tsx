"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdventurePlayer from "@/components/adventure/AdventurePlayer";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { getAdventure } from "@/features/learning/activities";

export default function AdventureRoute() {
  const { adventureId } = useParams<{ adventureId: string }>();
  const family = useFamilyGate("child");
  const adventure = getAdventure(adventureId);

  if (!family?.activeChild) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FFF8E9]">
        <GateLoader />
      </div>
    );
  }
  if (!adventure) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#FFF8E9] px-4 text-center">
        <Symbol3D name="compass" size={72} />
        <h1 className="font-display text-2xl font-bold text-[#123D30]">This trail doesn&apos;t exist yet</h1>
        <Link href="/kids" className="inline-flex min-h-12 items-center rounded-full bg-[#205C43] px-6 font-extrabold text-white">
          Back to my adventures
        </Link>
      </main>
    );
  }
  // A new key restarts the player cleanly when switching child or adventure.
  return <AdventurePlayer key={`${family.activeChild.id}:${adventure.id}`} adventure={adventure} learner={family.activeChild} />;
}
