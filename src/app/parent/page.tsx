"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ClipboardList,
  Sparkles,
  Target,
  Lightbulb,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChildSummaryCard } from "@/components/family/ChildSummaryCard";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { computeProgress } from "@/features/gamification/progression";
import { getAdventure } from "@/features/learning/activities";
import { buildChartData, buildSkillProgress } from "@/features/learning/progress";
import { scoreSession } from "@/features/learning/scoring";
import type { Session, SkillProgress } from "@/features/learning/types";

// ---------------------------------------------------------------------------
// Sample fallback — in-memory demo sessions when localStorage is empty.
// Clearly labelled in UI as sample data.
// ---------------------------------------------------------------------------
function createSampleSessions(): Session[] {
  const challenges: Session["challenges"] = [
    {
      id: "c1-butterflies",
      skillId: "counting",
      prompt: "Look at the butterflies! Can you count them?",
      objectType: "butterfly",
      objectCount: 3,
      expectedAnswer: 3,
      options: [2, 3, 4, 5],
      hintSequence: [
        "Good try! Let`s try again.",
        "Let`s count together \u2014 one, two, three!",
        "See \u2014 there are three butterflies. Can you say three?",
      ],
      difficulty: 1,
    },
    {
      id: "c2-bananas",
      skillId: "counting",
      prompt: "How many bananas can you see?",
      objectType: "banana",
      objectCount: 5,
      expectedAnswer: 5,
      options: [3, 4, 5, 6],
      hintSequence: [
        "Take another look!",
        "Let`s point to each banana as we count: 1\u20262\u20263\u20264\u20265",
        "There are five bananas. Let`s count them together!",
      ],
      difficulty: 2,
    },
    {
      id: "c3-elephants",
      skillId: "number_recognition",
      prompt: "Can you help me find four elephants?",
      objectType: "elephant",
      objectCount: 4,
      expectedAnswer: 4,
      options: [2, 3, 4, 5],
      hintSequence: [
        "Not quite \u2014 count again!",
        "Tap each elephant and count with me!",
        "We have four elephants. Can you show me four?",
      ],
      difficulty: 2,
    },
  ];

  const mkAttempt = (
    id: string,
    challengeId: string,
    answer: number,
    isCorrect: boolean,
    hintLevel: number,
    attemptNumber: number,
    createdAt: string
  ) => ({
    id,
    challengeId,
    answer,
    isCorrect,
    hintLevel,
    attemptNumber,
    answerType: "tap" as const,
    createdAt,
  });

  return [
    {
      id: "sample-1",
      learnerId: "learner-1",
      activityId: "jungle-counting",
      startedAt: "2026-10-11T10:00:00.000Z",
      completedAt: "2026-10-11T10:04:30.000Z",
      status: "completed",
      challenges,
      attempts: [
        mkAttempt("a1", "c1-butterflies", 3, true, 0, 1, "2026-10-11T10:01:00.000Z"),
        mkAttempt("a2", "c2-bananas", 4, false, 0, 1, "2026-10-11T10:02:00.000Z"),
        mkAttempt("a3", "c2-bananas", 5, true, 1, 2, "2026-10-11T10:02:30.000Z"),
        mkAttempt("a4", "c3-elephants", 4, true, 0, 1, "2026-10-11T10:03:30.000Z"),
      ],
    },
    {
      id: "sample-2",
      learnerId: "learner-1",
      activityId: "jungle-counting",
      startedAt: "2026-10-14T15:30:00.000Z",
      completedAt: "2026-10-14T15:34:00.000Z",
      status: "completed",
      challenges,
      attempts: [
        mkAttempt("b1", "c1-butterflies", 3, true, 0, 1, "2026-10-14T15:31:00.000Z"),
        mkAttempt("b2", "c2-bananas", 5, true, 0, 1, "2026-10-14T15:32:00.000Z"),
        mkAttempt("b3", "c3-elephants", 3, false, 0, 1, "2026-10-14T15:33:00.000Z"),
        mkAttempt("b4", "c3-elephants", 4, true, 1, 2, "2026-10-14T15:33:30.000Z"),
      ],
    },
    {
      id: "sample-3",
      learnerId: "learner-1",
      activityId: "jungle-counting",
      startedAt: "2026-10-17T09:15:00.000Z",
      completedAt: "2026-10-17T09:18:45.000Z",
      status: "completed",
      challenges,
      attempts: [
        mkAttempt("c1", "c1-butterflies", 3, true, 0, 1, "2026-10-17T09:16:00.000Z"),
        mkAttempt("c2", "c2-bananas", 5, true, 0, 1, "2026-10-17T09:17:00.000Z"),
        mkAttempt("c3", "c3-elephants", 4, true, 0, 1, "2026-10-17T09:17:45.000Z"),
      ],
    },
  ];
}

const SAMPLE_SESSIONS: Session[] = createSampleSessions();

// Aggregate skill progress across multiple sessions
function aggregateSkillProgress(sessions: Session[]): SkillProgress[] {
  const map = new Map<string, { label: string; correct: number; total: number; hintSum: number }>();
  for (const s of sessions) {
    const per = buildSkillProgress(s);
    for (const p of per) {
      const cur = map.get(p.skillId);
      if (cur) {
        cur.correct += p.correct;
        cur.total += p.total;
        cur.hintSum += p.hintRate * p.total;
      } else {
        map.set(p.skillId, {
          label: p.label,
          correct: p.correct,
          total: p.total,
          hintSum: p.hintRate * p.total,
        });
      }
    }
  }
  const out: SkillProgress[] = [];
  for (const [skillId, v] of map) {
    out.push({
      skillId,
      label: v.label,
      correct: v.correct,
      total: v.total,
      hintRate: v.total > 0 ? v.hintSum / v.total : 0,
    });
  }
  // Stable order: counting first
  out.sort((a, b) => a.skillId.localeCompare(b.skillId));
  return out;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string; accuracy: number } }>;
  label?: string;
}): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="rounded-xl border border-[#FFF4D6] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(32,92,67,0.12)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#24352B]/85">{label}</p>
      <p className="text-sm font-bold text-[#205C43]">{Math.round(v)}% accuracy</p>
    </div>
  );
}

export default function ParentOverviewPage(): React.ReactElement {
  const family = useFamilyGate("parent");
  const childSessions = family?.activeChild ? family.sessions : null;
  // Sample data is an explicit, labelled demo fallback until the child plays.
  const isSample = childSessions !== null && childSessions.length === 0;
  const sessions = childSessions === null ? null : isSample ? SAMPLE_SESSIONS : childSessions;
  const progress = useMemo(() => computeProgress(childSessions ?? []), [childSessions]);

  const ready = sessions !== null;
  const data = useMemo<Session[]>(() => sessions ?? [], [sessions]);
  const completedData = useMemo<Session[]>(
    () => data.filter((session) => session.status === "completed"),
    [data]
  );

  // Summary metrics intentionally use completed sessions. An abandoned or
  // in-progress record is still shown as evidence below, but is not presented
  // as a completed learning outcome.
  const metrics = useMemo(() => {
    if (!ready || completedData.length === 0) {
      return { count: 0, skills: 0, avgAccuracy: 0, hints: 0 };
    }
    const count = completedData.length;
    const skillIds = new Set<string>();
    let accSum = 0;
    let hints = 0;
    for (const s of completedData) {
      for (const ch of s.challenges) skillIds.add(ch.skillId);
      const sc = scoreSession(s);
      accSum += sc.accuracy;
      hints += sc.hintsUsed;
    }
    return {
      count,
      skills: skillIds.size,
      avgAccuracy: count > 0 ? accSum / count : 0,
      hints,
    };
  }, [completedData, ready]);

  const chartData = useMemo(() => {
    if (!ready) return [];
    return buildChartData(completedData).map((p) => ({
      date: p.date,
      accuracy: Math.round(p.accuracy * 100),
      label: p.label,
    }));
  }, [completedData, ready]);

  const skillProgress = useMemo(() => {
    if (!ready || completedData.length === 0) return [];
    return aggregateSkillProgress(completedData);
  }, [completedData, ready]);

  // Empty state is based on completed outcomes, not merely the existence of a
  // session shell in localStorage.
  const showEmpty = ready && !isSample && completedData.length === 0;

  if (!family) return <GateLoader label="Opening your dashboard…" />;
  if (!family.activeChild) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Symbol3D name="compass" size={80} />
        <h1 className="font-display text-3xl font-bold text-[#123D30]">Parent Dashboard</h1>
        <p className="max-w-md text-sm text-[#53645B]">Add your child&apos;s explorer profile to see their adventures, levels and learning evidence here.</p>
        <Link href="/onboarding" className="inline-flex min-h-12 items-center rounded-full bg-[#205C43] px-6 font-extrabold text-white shadow-lg hover:bg-[#184a36]">
          Add your child
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43] sm:text-2xl">
            Parent Dashboard
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#24352B]/85">
            Meaningful learning evidence for {family.activeChild.name}, not just screen time.
          </p>
        </div>
        {isSample && ready && (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <Badge variant="coral" className="text-[11px]">
              Sample data
            </Badge>
            <p className="max-w-[320px] text-[11px] leading-relaxed text-[#24352B]/85 sm:text-right">
              Sample data — complete an adventure to see your child&apos;s progress
            </p>
          </div>
        )}
      </div>

      <ChildSummaryCard child={family.activeChild} progress={progress} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            label: "Activities Completed",
            value: ready ? String(metrics.count) : "\u2014",
            sub: isSample ? "sample sessions" : "total sessions",
            icon: ClipboardList,
            accent: "bg-[#E8F5E9] text-[#205C43]",
          },
          {
            label: "Skills Practiced",
            value: ready ? String(metrics.skills) : "\u2014",
            sub: "unique skills",
            icon: Sparkles,
            accent: "bg-[#FFF4D6] text-[#7a5a00]",
          },
          {
            label: "Avg Accuracy",
            value: ready ? `${Math.round(metrics.avgAccuracy * 100)}%` : "\u2014",
            sub: "across sessions",
            icon: Target,
            accent: "bg-[#E3F2FD] text-[#1a4a6e]",
          },
          {
            label: "Hints Used",
            value: ready ? String(metrics.hints) : "\u2014",
            sub: "total hints",
            icon: Lightbulb,
            accent: "bg-[#FFE4DE] text-[#8a3a2a]",
          },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            >
              <Card className="h-full">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest text-[#24352B]/85 uppercase">
                        {m.label}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#205C43] sm:text-[26px]">
                        {m.value}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-none text-[#24352B]/85">{m.sub}</p>
                    </div>
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${m.accent} shrink-0`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Learning Progress chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">Learning Progress</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">
            Accuracy over time — each point is one adventure session.
          </p>
        </CardHeader>
        <CardContent>
          {showEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <div className="rounded-full bg-[#FFF4D6] p-3">
                <BookOpen className="h-6 w-6 text-[#205C43]" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#205C43]">No sessions yet — start an adventure!</p>
                <p className="mt-1 text-xs text-[#24352B]/85">Finish an adventure in the Kids Zone to see the chart.</p>
              </div>
              <Link href="/kids" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#205C43] px-5 py-2 text-[15px] font-semibold tracking-tight text-white shadow-[0_4px_14px_rgba(32,92,67,0.25)] transition-colors hover:bg-[#184a36]">Open the Kids Zone</Link>
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FFF0C9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6b7c6e" }}
                    axisLine={{ stroke: "#FFF0C9" }}
                    tickLine={{ stroke: "#FFF0C9" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#6b7c6e" }}
                    axisLine={{ stroke: "#FFF0C9" }}
                    tickLine={{ stroke: "#FFF0C9" }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#205C43"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#205C43", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#77B96A", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {isSample && !showEmpty && (
            <p className="mt-2 text-center text-[11px] text-[#24352B]/85">
              Showing sample data — your child&apos;s real progress will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Skill Breakdown */}
      <div>
        <h2 className="mb-3 text-sm font-bold tracking-tight text-[#205C43]">Skill Breakdown</h2>
        {skillProgress.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[#24352B]/85">
              No skill data yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {skillProgress.map((sp, idx) => {
              const pct = sp.total > 0 ? Math.round((sp.correct / sp.total) * 100) : 0;
              const barColor = sp.skillId === "counting" ? "bg-[#77B96A]" : "bg-[#FF8A72]";
              return (
                <motion.div
                  key={sp.skillId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <Card className="h-full">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-bold tracking-tight text-[#205C43]">{sp.label}</p>
                          <p className="mt-0.5 text-xs text-[#24352B]/85">
                            {sp.correct} / {sp.total} correct
                            <span className="mx-1.5 text-[#24352B]/85">·</span>
                            hint rate {(sp.hintRate * 100).toFixed(0)}%
                          </p>
                        </div>
                        <span className="rounded-full bg-[#FFF4D6] px-2.5 py-1 text-xs font-bold text-[#7a5a00]">
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
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#24352B]/85">
                        {sp.skillId === "counting"
                          ? "Counting groups of objects"
                          : "Recognising written numerals"}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <p className="text-xs text-[#24352B]/85">Latest adventure sessions and challenge evidence.</p>
        </CardHeader>
        <CardContent className="pt-0">
          {data.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#24352B]/85">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-[#FFF4D6]">
              {data
                .slice()
                .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                .map((s) => {
                  const sc = scoreSession(s);
                  const skillIds = Array.from(new Set(s.challenges.map((c) => c.skillId))).join(", ");
                  const isDemo = isSample && s.id.startsWith("sample-");
                  return (
                    <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">
                            {getAdventure(s.activityId)?.title ?? s.activityId}
                          </p>
                          <Badge
                            variant={s.status === "completed" ? "leaf" : s.status === "in_progress" ? "sunshine" : "sky"}
                            className="text-[10px] leading-none"
                          >
                            {s.status.replace("_", " ")}
                          </Badge>
                          {isDemo && (
                            <Badge variant="coral" className="text-[10px] leading-none">
                              sample
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#24352B]/85">
                          {formatDate(s.startedAt)} · {s.challenges.length} challenges · skills: {skillIds}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:justify-end">
                        <span className="inline-flex items-center gap-1 text-[#24352B]/85">
                          <span className="font-semibold text-[#205C43]">{sc.correct}</span>/{sc.total} correct
                        </span>
                        <span className="text-[#24352B]/85">·</span>
                        <span className="text-[#24352B]/85">{sc.hintsUsed} hints</span>
                        <span className="text-[#24352B]/85">·</span>
                        <span className="font-semibold text-[#205C43]">{Math.round(sc.accuracy * 100)}%</span>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-[#C8E6C9] bg-[#F1F8E9]">
        <div className="flex gap-3 p-4 sm:p-5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#77B96A] shadow-sm">
            <Lightbulb className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-[#205C43]">Suggestion for next practice</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#24352B]/85">
              {progress.nextLevel
                ? `${progress.nextLevel.xp - progress.xp} XP until ${family.activeChild.name} becomes a ${progress.nextLevel.title}. One short adventure a day keeps the streak going.`
                : `${family.activeChild.name} has reached the top level. Replaying adventures for three stars keeps skills fresh.`}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#24352B]/85">
              Based on recent hint rate and accuracy. Short, playful sessions build confidence — 3–5 minutes is ideal.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}



