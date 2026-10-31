"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Flame, Lock, Play, Sparkles, Star, Trophy } from "lucide-react";
import JungleScene from "@/components/explorer/JungleScene";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { BadgeTile, StarRow, XpBar } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { computeProgress, LEVELS } from "@/features/gamification/progression";
import { modulesForChild, type LearningModule } from "@/features/learning/catalog";
import { cn } from "@/lib/utils";

const THEME: Record<LearningModule["theme"], { card: string; glow: string }> = {
  jungle: { card: "from-[#2E8B57] to-[#1B5E3A]", glow: "bg-[#77B96A]" },
  fruit: { card: "from-[#FF8A72] to-[#E0533B]", glow: "bg-[#FFD166]" },
  safari: { card: "from-[#F2A93B] to-[#C77700]", glow: "bg-[#FFE29A]" },
  river: { card: "from-[#3BA7D9] to-[#1E6E9E]", glow: "bg-[#8BD3F7]" },
  garden: { card: "from-[#9B6BDF] to-[#6A3FB0]", glow: "bg-[#E2CCFF]" },
  sky: { card: "from-[#2BB3B1] to-[#167A79]", glow: "bg-[#B2EBF2]" },
};

function greeting(name: string, hobby: string | undefined): string {
  return hobby
    ? `Hi ${name}! I heard you love ${hobby.toLowerCase()}. Shall we go on an adventure?`
    : `Hi ${name}! Ready for a jungle adventure today?`;
}

export default function KidsHome() {
  const family = useFamilyGate("child");
  if (!family?.activeChild) return <GateLoader />;

  const child = family.activeChild;
  const progress = computeProgress(family.sessions);
  const modules = modulesForChild(child.age, child.focusAreas);
  const playable = modules.filter((m) => m.module.adventureId !== null);
  const soon = modules.filter((m) => m.module.adventureId === null);
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const earned = progress.badges.filter((b) => b.earnedAt);

  return (
    <div className="pb-16">
      {/* Explorer banner */}
      <section className="relative isolate overflow-hidden">
        <JungleScene variant="compact" className="-z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-[#FFF8E9]" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_50px_rgba(18,61,48,0.2)] backdrop-blur-md sm:flex-row sm:p-7"
          >
            <motion.div whileHover={{ rotate: [-4, 4, -2, 0] }} className="relative">
              <ChildAvatar avatar={child.avatar} size={112} />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9F43] px-3 py-1 font-display text-sm font-bold text-[#123D30] shadow">
                Lv {progress.level.level}
              </span>
            </motion.div>
            <div className="w-full min-w-0 flex-1 text-center sm:text-left">
              <h1 className="font-display text-3xl font-bold text-[#123D30] sm:text-4xl">Hi, {child.name}!</h1>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-3 py-1 text-sm font-extrabold text-[#684800]">
                <Symbol3D name={progress.level.symbol} size={20} />
                {progress.level.title}
              </p>
              <XpBar progress={progress} className="mt-4" />
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4DE] px-3 py-1.5 text-xs font-extrabold text-[#8a3a2a]">
                  <Flame className="h-4 w-4" aria-hidden />
                  {progress.streak.current} day streak
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-3 py-1.5 text-xs font-extrabold text-[#684800]">
                  <Star className="h-4 w-4 fill-[#FFC233] text-[#E8A200]" aria-hidden />
                  {totalStars} stars
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3 py-1.5 text-xs font-extrabold text-[#205C43]">
                  <Trophy className="h-4 w-4" aria-hidden />
                  {earned.length} badges
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-5 flex max-w-xl items-end justify-center gap-3">
            <Symbol3D name="elephant" size={64} className="float-y" />
            <p role="note" aria-label="Miko says" className="relative rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm font-bold text-[#24352B] shadow-lg">
              {greeting(child.name, child.hobbies[0])}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Adventures */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-labelledby="adventures-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="adventures-heading" className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">
              Your adventures
            </h2>
            <p className="text-sm text-[#53645B]">Picked for explorers who are {child.age}.</p>
          </div>
        </div>
        {playable.length === 0 ? (
          <p className="mt-6 rounded-3xl bg-white p-6 text-center text-sm text-[#53645B]">New adventures for age {child.age} are on their way!</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {playable.map(({ module, recommended }, i) => {
              const theme = THEME[module.theme];
              const stars = progress.stars[module.adventureId!] ?? 0;
              return (
                <motion.article
                  key={module.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  whileHover={{ y: -8, rotate: i % 2 === 0 ? -0.6 : 0.6 }}
                  className={cn("group relative overflow-hidden rounded-[2rem] bg-gradient-to-br p-5 text-white shadow-[0_16px_34px_rgba(18,61,48,0.22)]", theme.card)}
                >
                  <span aria-hidden className={cn("absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-2xl", theme.glow)} />
                  {recommended && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#205C43]">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      For you
                    </span>
                  )}
                  <div className="relative flex justify-end">
                    <Symbol3D name={module.symbol} size={96} className="drop-shadow-[0_12px_14px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  </div>
                  <h3 className="relative mt-2 font-display text-2xl font-bold leading-tight">{module.title}</h3>
                  <p className="relative mt-1 text-sm text-white/85">{module.tagline}</p>
                  <div className="relative mt-4 flex items-center justify-between gap-3">
                    <StarRow stars={stars} size={20} onDark label={stars ? `Best: ${stars} of 3 stars` : "Not played yet"} />
                    <span className="text-xs font-bold text-white/80">{module.minutes} min</span>
                  </div>
                  <Link
                    href={`/adventure/${module.adventureId}`}
                    aria-label={`Play ${module.title}`}
                    className="relative mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-lg font-extrabold text-[#123D30] shadow-lg transition group-hover:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD166]"
                  >
                    <Play className="h-5 w-5 fill-current" aria-hidden />
                    Play
                  </Link>
                </motion.article>
              );
            })}
          </div>
        )}

        {soon.length > 0 && (
          <>
            <h3 className="mt-10 font-display text-xl font-bold text-[#123D30]">Coming soon</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {soon.map(({ module }) => (
                <div key={module.id} className="flex items-center gap-3 rounded-3xl border border-dashed border-[#205C43]/25 bg-white/70 p-3">
                  <Symbol3D name={module.symbol} size={40} className="opacity-70" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-[#205C43]">{module.title}</p>
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#53645B]">
                      <Lock className="h-3 w-3" aria-hidden />
                      Soon
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Jungle trail of levels */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6" aria-labelledby="trail-heading">
        <h2 id="trail-heading" className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">
          Your jungle trail
        </h2>
        <p className="text-sm text-[#53645B]">Earn XP in every adventure to unlock new explorer titles.</p>
        <ol tabIndex={0} aria-label="Explorer levels" className="relative mt-6 flex snap-x gap-4 overflow-x-auto rounded-3xl pb-4 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43]">
          {LEVELS.map((level) => {
            const reached = level.level <= progress.level.level;
            const current = level.level === progress.level.level;
            return (
              <li key={level.level} className="relative flex w-32 shrink-0 snap-start flex-col items-center text-center">
                <span
                  className={cn(
                    "relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition",
                    current
                      ? "border-[#FFC233] bg-[#FFF4D6] shadow-[0_0_0_8px_rgba(255,194,51,0.25)]"
                      : reached
                        ? "border-[#77B96A] bg-[#E8F5E9]"
                        : "border-[#205C43]/10 bg-white",
                  )}
                >
                  <Symbol3D name={level.symbol} size={46} className={reached ? "" : "opacity-30 grayscale"} />
                  {current && <span className="absolute inset-0 animate-ping rounded-full border-4 border-[#FFC233] opacity-40" aria-hidden />}
                </span>
                <span className="mt-2 text-[11px] font-extrabold uppercase tracking-wider text-[#7a5a00]">Level {level.level}</span>
                <span className={cn("font-display text-sm font-semibold leading-tight", reached ? "text-[#123D30]" : "text-[#53645B]")}>{level.title}</span>
                <span className="sr-only">{current ? "You are here" : reached ? "Reached" : `Needs ${level.xp} XP`}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Badges */}
      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6" aria-labelledby="badges-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="badges-heading" className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">
            Badges
          </h2>
          <Link href="/kids/trophies" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-extrabold text-[#205C43] hover:bg-[#205C43]/[0.07]">
            All trophies
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[...progress.badges].sort((a, b) => Number(b.earnedAt !== null) - Number(a.earnedAt !== null)).slice(0, 6).map(({ badge, earnedAt }) => (
            <BadgeTile key={badge.id} badge={badge} earned={earnedAt !== null} size="sm" />
          ))}
        </div>
      </section>
    </div>
  );
}
