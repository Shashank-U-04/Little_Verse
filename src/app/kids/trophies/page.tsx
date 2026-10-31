"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Award, Lock } from "lucide-react";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { BadgeTile, StarRow, XpBar } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { computeProgress, LEVELS } from "@/features/gamification/progression";
import { MODULES } from "@/features/learning/catalog";

export default function TrophiesPage() {
  const family = useFamilyGate("child");
  if (!family?.activeChild) return <GateLoader />;

  const child = family.activeChild;
  const progress = computeProgress(family.sessions);
  const reached = new Map(progress.levelsReached.map((r) => [r.level.level, r.reachedAt]));
  const earnedCount = progress.badges.filter((b) => b.earnedAt).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#123D30] to-[#205C43] p-6 text-white shadow-xl sm:p-8">
        <Symbol3D name="trophy" size={120} className="absolute -right-4 -top-2 rotate-12 opacity-90 sm:right-6" />
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{child.name}&apos;s trophy room</h1>
        <p className="mt-1 text-white/80">
          {earnedCount} of {progress.badges.length} badges · {progress.completed} adventures finished
        </p>
        <XpBar progress={progress} dark className="mt-5 max-w-xl" />
      </div>

      <section className="mt-10" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="font-display text-2xl font-bold text-[#123D30]">
          Badges
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {progress.badges.map(({ badge, earnedAt }, i) => (
            <motion.div key={badge.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <BadgeTile badge={badge} earned={earnedAt !== null} earnedAt={earnedAt} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="titles-heading">
        <h2 id="titles-heading" className="font-display text-2xl font-bold text-[#123D30]">
          Titles &amp; certificates
        </h2>
        <p className="text-sm text-[#53645B]">Every new title comes with a certificate to print and hang on the fridge.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS.map((level) => {
            const isReached = reached.has(level.level);
            return (
              <li
                key={level.level}
                className={`flex items-center gap-4 rounded-3xl border p-4 ${isReached ? "border-[#FFE9A8] bg-white shadow-sm" : "border-dashed border-[#205C43]/20 bg-white/60"}`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isReached ? "bg-[#FFF4D6]" : "bg-[#205C43]/[0.05]"}`}>
                  <Symbol3D name={level.symbol} size={40} className={isReached ? "" : "opacity-30 grayscale"} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7a5a00]">Level {level.level}</p>
                  <p className="font-display text-lg font-semibold leading-tight text-[#123D30]">{level.title}</p>
                  <p className="text-xs text-[#53645B]">{isReached ? level.blurb : `Unlocks at ${level.xp} XP`}</p>
                </div>
                {isReached ? (
                  <Link
                    href={`/kids/certificate?level=${level.level}`}
                    aria-label={`Certificate for ${level.title}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#205C43] px-3.5 text-xs font-extrabold text-white hover:bg-[#184a36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                  >
                    <Award className="h-4 w-4" aria-hidden />
                    Certificate
                  </Link>
                ) : (
                  <Lock className="h-5 w-5 shrink-0 text-[#53645B]/60" aria-label="Locked" />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="stars-heading">
        <h2 id="stars-heading" className="font-display text-2xl font-bold text-[#123D30]">
          Adventure stars
        </h2>
        <p className="text-sm text-[#53645B]">Three stars means no hints at all. Two means just a little help.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.filter((m) => m.adventureId).map((module) => (
            <li key={module.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
              <Symbol3D name={module.symbol} size={44} />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-[#123D30]">{module.title}</p>
                <StarRow stars={progress.stars[module.adventureId!] ?? 0} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
