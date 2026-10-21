"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Clock,
  Trophy,
  ArrowLeft,
  Eye,
  Home,
} from "lucide-react";
import Miko from "@/components/character/Miko";
import JungleScene from "@/components/explorer/JungleScene";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadSession, loadSessions } from "@/lib/storage";
import { scoreSession, masteryLabel } from "@/features/learning/scoring";
import { buildSkillProgress } from "@/features/learning/progress";
import type { Session } from "@/features/learning/types";

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt || !startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const diffMs = end - start;
  if (diffMs < 60000) {
    const secs = Math.round(diffMs / 1000);
    return `${secs}s`;
  }
  const mins = Math.round((diffMs / 60000) * 10) / 10;
  return Number.isInteger(mins) ? `${mins} min` : `${mins} min`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

const CONFETTI = [
  { left: "8%", top: "6%", char: "★", color: "#FFD166", delay: 0, size: 14 },
  { left: "18%", top: "14%", char: "●", color: "#FF8A72", delay: 0.2, size: 10 },
  { left: "32%", top: "4%", char: "★", color: "#77B96A", delay: 0.35, size: 12 },
  { left: "52%", top: "8%", char: "●", color: "#8BD3F7", delay: 0.12, size: 9 },
  { left: "68%", top: "12%", char: "★", color: "#FFD166", delay: 0.45, size: 13 },
  { left: "84%", top: "5%", char: "●", color: "#77B96A", delay: 0.28, size: 10 },
  { left: "92%", top: "18%", char: "★", color: "#FF8A72", delay: 0.18, size: 11 },
  { left: "12%", top: "22%", char: "●", color: "#FFD166", delay: 0.4, size: 8 },
] as const;

function CompleteInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let found: Session | null = null;
    if (id) {
      const requested = loadSession(id);
      // A completion URL must never render an in-progress or malformed record.
      found = requested?.status === "completed" ? requested : null;
    } else {
      const completed = loadSessions().filter((candidate) => candidate.status === "completed");
      const sorted = [...completed].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      found = sorted[0] ?? null;
    }
    // Hydrate the client-only summary from localStorage after the route mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(found);
    setIsReady(true);
  }, [id]);

  const score = useMemo(() => {
    if (!session) return null;
    return scoreSession(session);
  }, [session]);

  const skills = useMemo(() => {
    if (!session) return [];
    return buildSkillProgress(session);
  }, [session]);

  const durationLabel = useMemo(() => {
    if (!session) return "—";
    return formatDuration(session.startedAt, session.completedAt);
  }, [session]);

  const dateLabel = useMemo(() => {
    if (!session) return "—";
    return formatDate(session.startedAt);
  }, [session]);

  const mastery = useMemo(() => {
    if (!score) return "Exploring";
    return masteryLabel(score.correctUnaided, score.total);
  }, [score]);

  if (!isReady) {
    return (
      <div className="min-h-dvh jungle-soft-gradient flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto flex h-[56px] max-w-2xl items-center justify-between gap-3 px-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#205C43] hover:bg-[#205C43]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Link>
            <span className="text-xs font-semibold tracking-wide text-[#205C43]">Jungle Counting · Complete</span>
            <span className="w-16" aria-hidden />
          </div>
        </header>
        <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 pb-10">
          <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-30">
            <JungleScene variant="hero" />
          </div>
          <Card className="relative animate-pulse">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <Miko state="idle" size="md" />
              <div className="h-4 w-32 rounded-full bg-[#205C43]/10" />
              <div className="h-3 w-48 rounded-full bg-[#205C43]/10" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!session || !score) {
    return (
      <div className="min-h-dvh jungle-soft-gradient flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto flex h-[56px] max-w-2xl items-center justify-between gap-3 px-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#205C43] hover:bg-[#205C43]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Link>
            <span className="text-xs font-semibold tracking-wide text-[#205C43]">Jungle Counting · Complete</span>
            <span className="w-16" aria-hidden />
          </div>
        </header>
        <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 pb-10 text-center">
          <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-30">
            <JungleScene variant="hero" />
          </div>
          <div className="relative flex flex-col items-center gap-4">
            <Miko state="idle" size="lg" message="No adventure found — lets start a new one!" />
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43]">No adventure found</h1>
            <p className="max-w-[36ch] text-sm leading-relaxed text-[#24352B]/70">
              We could not find a recent jungle run on this device. Start a fresh counting adventure with Miko!
            </p>
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/adventure/jungle-counting"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#205C43] px-8 py-3.5 text-[17px] font-bold leading-none text-white shadow-[0_4px_14px_rgba(32,92,67,0.25)] transition-colors hover:bg-[#184a36] active:bg-[#143d2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
              >
                <Home className="h-5 w-5" aria-hidden />
                Start Adventure
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-[17px] font-bold leading-none text-[#205C43] border border-[#205C43]/20 shadow-sm hover:bg-[#FFF8EC] hover:border-[#205C43]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
              >
                <Eye className="h-5 w-5" aria-hidden />
                Back to Explorer
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const accuracyLabel = `${Math.round(score.accuracy * 100)}%`;
  const skillsPracticedLabel = skills.length > 0 ? skills.map((s) => s.label).join(", ") : "Counting, Number Recognition";

  return (
    <div className="min-h-dvh jungle-soft-gradient flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-[56px] max-w-2xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#205C43] hover:bg-[#205C43]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <span className="text-xs font-semibold tracking-wide text-[#205C43]">Jungle Counting · Complete</span>
          <Badge variant="leaf" className="hidden sm:inline-flex">
            <Trophy className="mr-1 h-3 w-3" aria-hidden />
            {mastery}
          </Badge>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-[0.22]">
          <JungleScene variant="hero" />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          {CONFETTI.map((c, i) => (
            <motion.span
              key={i}
              className="absolute select-none leading-none"
              style={{ left: c.left, top: c.top, color: c.color, fontSize: c.size }}
              initial={{ y: 0, opacity: 0, rotate: 0 }}
              animate={{ y: [0, -10, 0], opacity: [0.7, 1, 0.7], rotate: [0, 10, -8, 0] }}
              transition={{ duration: 2.2, delay: c.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              {c.char}
            </motion.span>
          ))}
        </div>

        <div className="relative flex flex-col items-center text-center">
          <Miko state="celebrating" size="lg" message="Amazing job, explorer! You finished the jungle!" />
          <h1 className="mt-4 text-balance text-[30px] font-extrabold leading-none tracking-tight text-[#205C43] sm:text-[34px]">
            You did it!
          </h1>
          <p className="mt-2 max-w-[36ch] text-[15px] leading-6 text-[#24352B]/70">You helped Miko count every animal.</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="sunshine" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {durationLabel}
            </Badge>
            <Badge variant="sky" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {dateLabel}
            </Badge>
            <Badge variant="leaf" className="sm:hidden gap-1">
              <Trophy className="h-3 w-3" aria-hidden />
              {mastery}
            </Badge>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="relative flex flex-col gap-4"
          >
            <Card className="card-shadow border border-white/70">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
                    <Trophy className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <h2 className="text-[13px] font-extrabold tracking-wide text-[#205C43] uppercase">Your adventure</h2>
                  <span className="ml-auto hidden text-xs font-medium text-[#24352B]/45 sm:inline">
                    <Clock className="mr-1 inline h-3 w-3" aria-hidden />
                    {durationLabel} · {dateLabel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#FFF4D6] bg-[#FFF8E9]/70 p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
                      <Trophy className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#24352B]/45">Challenges</p>
                    <p className="text-xl font-extrabold tracking-tight text-[#205C43]">{score.attempted}/{score.total}</p>
                    <p className="text-[11px] font-medium text-[#24352B]/55">challenges attempted</p>
                  </div>

                  <div className="rounded-2xl border border-[#FFF4D6] bg-white p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4D6] text-[#7a5a00]">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#24352B]/45">Correct</p>
                    <p className="text-xl font-extrabold tracking-tight text-[#205C43]">{score.correct}</p>
                    <p className="text-[11px] font-medium text-[#24352B]/55">of {score.total}</p>
                  </div>

                  <div className="rounded-2xl border border-[#FFCCBE]/40 bg-[#FFE4DE]/50 p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE4DE] text-[#8a3a2a]">
                      <Lightbulb className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#24352B]/45">Hints used</p>
                    <p className="text-xl font-extrabold tracking-tight text-[#205C43]">{score.hintsUsed}</p>
                    <p className="text-[11px] font-medium text-[#24352B]/55">total</p>
                  </div>

                  <div className="rounded-2xl border border-[#BBDEFB]/50 bg-[#E3F2FD]/60 p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F2FD] text-[#1a4a6e]">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#24352B]/45">Accuracy</p>
                    <p className="text-xl font-extrabold tracking-tight text-[#205C43]">{accuracyLabel}</p>
                    <p className="text-[11px] font-medium text-[#24352B]/55">{mastery}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow border border-white/70">
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-sm font-bold tracking-tight text-[#205C43]">Skill breakdown</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#24352B]/60">
                  How you did on each skill — green is growing beautifully!
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {skills.length === 0 ? (
                    <p className="col-span-2 py-4 text-center text-sm text-[#24352B]/60">No skill data yet.</p>
                  ) : (
                    skills.map((sp, idx) => {
                      const pct = sp.total > 0 ? Math.round((sp.correct / sp.total) * 100) : 0;
                      const barColor = sp.skillId === "counting" ? "bg-[#77B96A]" : "bg-[#FF8A72]";
                      return (
                        <motion.div
                          key={sp.skillId}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.06 }}
                          className="rounded-2xl border border-[#FFF4D6] bg-[#FFF8E9]/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-bold tracking-tight text-[#205C43]">{sp.label}</p>
                              <p className="mt-0.5 text-xs text-[#24352B]/60">
                                {sp.correct} / {sp.total} correct
                                <span className="mx-1.5 text-[#24352B]/20">·</span>
                                hint rate {(sp.hintRate * 100).toFixed(0)}%
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#7a5a00] border border-[#FFE9A8]">
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#FFF4D6]">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                              style={{ width: `${pct}%` }}
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${sp.label} progress`}
                            />
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-[#24352B]/50">
                            {sp.skillId === "counting" ? "Counting objects from 1 to 5" : "Recognising written numerals"}
                          </p>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-white border border-[#FFF4D6] px-4 py-3">
                  <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">Skills practiced: {skillsPracticedLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#24352B]/60">
                    You practiced counting and finding the right number — great work, explorer!
                    {score.hintsUsed > 0
                      ? ` You used ${score.hintsUsed} hint${score.hintsUsed === 1 ? "" : "s"} — hints help you learn, and that is a wonderful thing!`
                      : " You solved challenges without extra hints — shining! ✨"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#205C43] px-8 py-3.5 text-lg font-bold leading-none text-white shadow-[0_4px_14px_rgba(32,92,67,0.25)] transition-colors hover:bg-[#184a36] active:bg-[#143d2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
              >
                <Home className="h-5 w-5" aria-hidden />
                Back to Explorer
              </Link>
              <Link
                href="/parent"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-lg font-bold leading-none text-[#205C43] border border-[#205C43]/20 shadow-sm hover:bg-[#FFF8EC] hover:border-[#205C43]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
              >
                <Eye className="h-5 w-5" aria-hidden />
                View in Parent Dashboard
              </Link>
              <p className="text-center text-[11px] font-medium leading-4 text-[#205C43]/45">Your progress is saved on this device.</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function CompleteFallback(): React.ReactElement {
  return (
    <div className="min-h-dvh jungle-soft-gradient flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-[56px] max-w-2xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#205C43] hover:bg-[#205C43]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <span className="text-xs font-semibold tracking-wide text-[#205C43]">Jungle Counting · Complete</span>
          <span className="w-16" aria-hidden />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-30">
          <JungleScene variant="hero" />
        </div>
        <Card className="relative animate-pulse">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Miko state="idle" size="md" />
            <div className="h-4 w-32 rounded-full bg-[#205C43]/10" />
            <div className="h-3 w-48 rounded-full bg-[#205C43]/10" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function JungleCountingCompletePage(): React.ReactElement {
  return (
    <Suspense fallback={<CompleteFallback />}>
      <CompleteInner />
    </Suspense>
  );
}