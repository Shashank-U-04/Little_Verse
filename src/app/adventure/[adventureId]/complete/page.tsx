"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Award, CheckCircle2, Clock, Eye, Lightbulb, RotateCcw, Sparkles, Trees, Trophy, X } from "lucide-react";
import Miko from "@/components/character/Miko";
import JungleScene from "@/components/explorer/JungleScene";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { BadgeTile, ConfettiBurst, StarRow, XpBar } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { computeProgress, progressDelta, starsForSession } from "@/features/gamification/progression";
import { getAdventure } from "@/features/learning/activities";
import { buildSkillProgress } from "@/features/learning/progress";
import { masteryLabel, scoreSession } from "@/features/learning/scoring";
import type { Session } from "@/features/learning/types";

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "—";
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "—";
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  return `${Math.round((diffMs / 60000) * 10) / 10} min`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <JungleScene variant="compact" className="-z-10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/30 to-[#FFF8E9]/90" aria-hidden />
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link
            href="/kids"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#205C43]/15 bg-white px-3 text-sm font-bold text-[#205C43] hover:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            <Trees className="h-4 w-4" aria-hidden />
            Kids Zone
          </Link>
          <span className="font-display text-sm font-semibold text-[#205C43]">Adventure complete</span>
          <span className="w-24" aria-hidden />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 pb-12">{children}</main>
    </div>
  );
}

function LevelUpDialog({ title, symbol, level, onClose }: { title: string; symbol: string; level: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123D30]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <ConfettiBurst pieces={80} />
      <motion.div
        initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="relative w-full max-w-sm rounded-[2rem] bg-gradient-to-b from-[#FFFBEF] to-[#FFE9A8] p-7 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#205C43] hover:bg-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-[#B07A00]">Level up!</p>
        <motion.div animate={{ rotate: [0, -10, 10, -6, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }} className="mx-auto mt-3 w-fit">
          <Symbol3D name={symbol} size={112} />
        </motion.div>
        <h2 id="levelup-title" className="mt-3 font-display text-3xl font-bold text-[#123D30]">
          Level {level}: {title}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#53645B]">A brand-new certificate is waiting for you!</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/kids/certificate?level=${level}`}
            autoFocus
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#205C43] px-6 font-extrabold text-white shadow-lg hover:bg-[#184a36]"
          >
            <Award className="h-5 w-5" aria-hidden />
            See my certificate
          </Link>
          <button type="button" onClick={onClose} className="min-h-12 rounded-full px-6 font-bold text-[#205C43] hover:bg-white/60">
            Keep celebrating
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CompleteInner() {
  const family = useFamilyGate("child");
  const { adventureId } = useParams<{ adventureId: string }>();
  const id = useSearchParams().get("id");
  const adventure = getAdventure(adventureId);
  const [dismissedLevelUp, setDismissedLevelUp] = useState(false);

  const sessions = family?.sessions;
  const session = useMemo<Session | null>(() => {
    if (!sessions) return null;
    const completed = sessions.filter((s) => s.status === "completed" && s.activityId === adventureId);
    // A completion URL must never render an in-progress or malformed record.
    if (id) return completed.find((s) => s.id === id) ?? null;
    return [...completed].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  }, [sessions, id, adventureId]);

  const celebration = useMemo(() => {
    if (!sessions || !session) return null;
    const before = computeProgress(sessions.filter((s) => s.id !== session.id));
    const after = computeProgress(sessions);
    return { after, delta: progressDelta(before, after), xp: after.sessionXp.get(session.id) ?? null };
  }, [sessions, session]);

  if (!family) return <GateLoader />;

  if (!session || !celebration) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
        <Miko state="idle" size="lg" message="No adventure found — let's start a new one!" />
        <h1 className="font-display text-[26px] font-bold tracking-tight text-[#205C43]">No adventure found</h1>
        <p className="max-w-[36ch] text-sm leading-relaxed text-[#24352B]/80">
          We couldn&apos;t find a finished adventure on this device. Start a fresh one with Miko!
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={adventure ? `/adventure/${adventure.id}` : "/kids"}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#205C43] px-8 text-[17px] font-bold text-white shadow-lg hover:bg-[#184a36]"
          >
            Start Adventure
          </Link>
          <Link
            href="/kids"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#205C43]/20 bg-white px-8 text-[17px] font-bold text-[#205C43] shadow-sm hover:bg-[#FFF8EC]"
          >
            Back to Kids Zone
          </Link>
        </div>
      </div>
    );
  }

  const score = scoreSession(session);
  const skills = buildSkillProgress(session);
  const stars = starsForSession(session);
  const mastery = masteryLabel(score.correctUnaided, score.total);
  const { after, delta, xp } = celebration;
  const child = family.activeChild!;

  return (
    <>
      <ConfettiBurst pieces={60} />
      <AnimatePresence>
        {delta.levelUp && !dismissedLevelUp && (
          <LevelUpDialog title={delta.levelUp.title} symbol={delta.levelUp.symbol} level={delta.levelUp.level} onClose={() => setDismissedLevelUp(true)} />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center text-center">
        <Miko state="celebrating" size="lg" message={`Amazing job, ${child.name}! You finished ${adventure?.title ?? "the adventure"}!`} />
        <h1 className="mt-4 font-display text-[36px] font-bold leading-none tracking-tight text-[#205C43] sm:text-[44px]">You did it!</h1>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 200 }} className="mt-3">
          <StarRow stars={stars} size={44} label={`${stars} of 3 stars`} />
        </motion.div>
        <p className="mt-2 text-sm font-bold text-[#53645B]">
          {stars === 3 ? "Perfect, with no hints at all!" : stars === 2 ? "Great counting with a little help!" : "You kept trying and finished!"}
        </p>
      </div>

      {xp && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-[2rem] bg-gradient-to-br from-[#123D30] to-[#205C43] p-5 text-white shadow-xl sm:p-6"
          aria-labelledby="xp-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="xp-heading" className="font-display text-xl font-semibold">
              XP earned
            </h2>
            <motion.span initial={{ scale: 0.5 }} animate={{ scale: [0.5, 1.3, 1] }} transition={{ delay: 0.6, duration: 0.6 }} className="font-display text-3xl font-bold text-[#FFD166]">
              +{xp.total} XP
            </motion.span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              { label: "Challenges", value: xp.challenges },
              { label: "Finished", value: xp.completion },
              { label: "No-hint bonus", value: xp.perfect },
              { label: "First today", value: xp.firstOfDay },
            ].map((row) => (
              <li key={row.label} className="rounded-2xl bg-white/10 px-3 py-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-white/70">{row.label}</span>
                <span className="font-display text-lg font-bold">+{row.value}</span>
              </li>
            ))}
          </ul>
          <XpBar progress={after} dark className="mt-4" />
        </motion.section>
      )}

      {delta.newBadges.length > 0 && (
        <section aria-labelledby="new-badges-heading">
          <h2 id="new-badges-heading" className="text-center font-display text-xl font-bold text-[#123D30]">
            New badge{delta.newBadges.length > 1 ? "s" : ""} unlocked!
          </h2>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {delta.newBadges.map((badge, i) => (
              <motion.div key={badge.id} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.8 + i * 0.15, type: "spring", stiffness: 220, damping: 12 }} className="w-40">
                <BadgeTile badge={badge} earned />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur sm:p-6" aria-labelledby="summary-heading">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          <h2 id="summary-heading" className="font-display text-lg font-semibold text-[#205C43]">
            Your adventure
          </h2>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#53645B]">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatDuration(session.startedAt, session.completedAt)}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Challenges", value: `${score.attempted}/${score.total}`, sub: "challenges attempted", icon: Trophy, tone: "bg-[#E8F5E9] text-[#205C43]" },
            { label: "Correct", value: String(score.correct), sub: `of ${score.total}`, icon: CheckCircle2, tone: "bg-[#FFF4D6] text-[#7a5a00]" },
            { label: "Hints used", value: String(score.hintsUsed), sub: "total", icon: Lightbulb, tone: "bg-[#FFE4DE] text-[#8a3a2a]" },
            { label: "Accuracy", value: `${Math.round(score.accuracy * 100)}%`, sub: mastery, icon: Sparkles, tone: "bg-[#E3F2FD] text-[#1a4a6e]" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-2xl border border-[#FFF4D6] bg-[#FFFBEF] p-4">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${m.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#53645B]">{m.label}</p>
                <p className="font-display text-2xl font-bold text-[#205C43]">{m.value}</p>
                <p className="text-[11px] font-medium text-[#53645B]">{m.sub}</p>
              </div>
            );
          })}
        </div>
        {skills.length > 0 && (
          <ul className="mt-4 space-y-2">
            {skills.map((sp) => {
              const pct = sp.total > 0 ? Math.round((sp.correct / sp.total) * 100) : 0;
              return (
                <li key={sp.skillId} className="rounded-2xl bg-[#F1F8E9] px-4 py-3">
                  <div className="flex items-center justify-between text-sm font-bold text-[#205C43]">
                    <span>{sp.label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-label={`${sp.label} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-[#77B96A]" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/kids"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2E8B57] to-[#205C43] px-6 text-lg font-extrabold text-white shadow-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
        >
          <Trees className="h-5 w-5" aria-hidden />
          Back to Kids Zone
        </Link>
        <Link
          href={`/adventure/${adventureId}`}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#205C43]/20 bg-white px-6 text-lg font-bold text-[#205C43] shadow-sm hover:bg-[#FFF8EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-5 w-5" aria-hidden />
          Play again
        </Link>
        <Link
          href="/parent"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#205C43]/20 bg-white px-6 text-lg font-bold text-[#205C43] shadow-sm hover:bg-[#FFF8EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
        >
          <Eye className="h-5 w-5" aria-hidden />
          View in Parent Dashboard
        </Link>
      </div>
    </>
  );
}

export default function AdventureCompletePage() {
  return (
    <Shell>
      <Suspense fallback={<GateLoader />}>
        <CompleteInner />
      </Suspense>
    </Shell>
  );
}
