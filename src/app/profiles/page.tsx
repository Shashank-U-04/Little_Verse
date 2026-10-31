"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Plus } from "lucide-react";
import SiteHeader from "@/components/nav/SiteHeader";
import JungleScene from "@/components/explorer/JungleScene";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { computeProgress } from "@/features/gamification/progression";
import { setActiveChild } from "@/lib/family";
import { loadSessions } from "@/lib/storage";

/** "Who's exploring today?" — the hub between the kids' side and the parent dashboard. */
export default function ProfilesPage() {
  const family = useFamilyGate("parent");
  const router = useRouter();

  const choose = (id: string) => {
    setActiveChild(id);
    router.push("/kids");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
        <JungleScene variant="compact" className="-z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#123D30]/30 to-[#123D30]/55" aria-hidden />
        {!family?.parent ? (
          <GateLoader />
        ) : (
          <>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-outline text-center font-display text-4xl font-bold text-white sm:text-5xl"
            >
              Who&apos;s exploring today?
            </motion.h1>
            <p className="text-outline mt-2 text-center font-semibold text-white/90">Hi {family.parent.name}! Pick an explorer, or open your dashboard.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-5">
              {family.children.map((child, i) => {
                const progress = computeProgress(loadSessions().filter((s) => s.learnerId === child.id));
                return (
                  <motion.button
                    key={child.id}
                    type="button"
                    onClick={() => choose(child.id)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 16 }}
                    whileHover={{ y: -8 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex w-40 flex-col items-center rounded-[2rem] border border-white/60 bg-white/90 p-5 text-center shadow-xl backdrop-blur focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD166]"
                  >
                    <ChildAvatar avatar={child.avatar} size={96} tone={i} />
                    <span className="mt-3 font-display text-xl font-bold text-[#123D30]">{child.name}</span>
                    <span className="text-xs font-extrabold text-[#7a5a00]">
                      Lv {progress.level.level} · {progress.level.title}
                    </span>
                  </motion.button>
                );
              })}
              <Link
                href="/onboarding"
                className="flex w-40 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/70 bg-white/20 p-5 text-center text-white backdrop-blur transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD166]"
              >
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/25">
                  <Plus className="h-10 w-10" aria-hidden />
                </span>
                <span className="mt-3 font-display text-lg font-bold">Add explorer</span>
              </Link>
            </div>
            <Link
              href="/parent"
              className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-base font-extrabold text-[#205C43] shadow-lg transition hover:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD166]"
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden />
              Open the parent dashboard
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
