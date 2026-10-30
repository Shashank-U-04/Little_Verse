"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Target,
  History,
  Lightbulb,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadSessions } from "@/lib/storage";
import { scoreSession } from "@/features/learning/scoring";
import { buildSkillProgress } from "@/features/learning/progress";
import type { Session, SkillProgress } from "@/features/learning/types";

function formatDateLong(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

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
  out.sort((a, b) => a.skillId.localeCompare(b.skillId));
  return out;
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
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

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return id.slice(0, 10) + "\u2026";
}

export default function ParentProgressPage(): React.ReactElement {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    const loaded = loadSessions();
    // Hydrate the client-only dashboard from localStorage after the route mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(loaded);
  }, []);

  const ready: boolean = sessions !== null;
  const data = useMemo<Session[]>(() => sessions ?? [], [sessions]);
  const completedData = useMemo<Session[]>(
    () => data.filter((session) => session.status === "completed"),
    [data]
  );

  const chartData = useMemo(() => {
    if (!ready) return [];
    return completedData.map((s) => ({
      name: new Date(s.startedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      accuracy: Math.round(scoreSession(s).accuracy * 100),
    }));
  }, [completedData, ready]);

  const skillProgress = useMemo(() => {
    if (!ready || data.length === 0) return [];
    return aggregateSkillProgress(data);
  }, [data, ready]);

  const sortedSessions = useMemo(() => {
    return [...data].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [data]);

  const showEmpty: boolean = ready && completedData.length === 0;

  if (!ready) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43] sm:text-2xl">Detailed Progress</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#24352B]/85">Skill-level evidence and challenge outcomes</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-[#24352B]/85">Loading progress\u2026</CardContent>
        </Card>
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43] sm:text-2xl">Detailed Progress</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#24352B]/85">Skill-level evidence and challenge outcomes</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="rounded-full bg-[#FFF4D6] p-3">
              <BookOpen className="h-6 w-6 text-[#205C43]" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#205C43]">No completed progress yet — finish an adventure!</p>
              <p className="mt-1 text-xs text-[#24352B]/85">Complete a Jungle Counting session to see skill evidence here.</p>
            </div>
            <Link
              href="/adventure/jungle-counting"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#205C43] px-5 py-2 text-[15px] font-semibold tracking-tight text-white shadow-[0_4px_14px_rgba(32,92,67,0.25)] transition-colors hover:bg-[#184a36]"
            >
              Start Jungle Counting
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43] sm:text-2xl">Detailed Progress</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#24352B]/85">
          Skill-level evidence and challenge outcomes
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              </span>
              <CardTitle className="text-base">Accuracy by Session</CardTitle>
            </div>
            <p className="text-xs leading-relaxed text-[#24352B]/85">Each bar is one completed adventure \— accuracy across all challenges.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FFF0C9" />
                  <XAxis
                    dataKey="name"
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
                    width={44}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(32,92,67,0.04)" }} />
                  <Bar dataKey="accuracy" fill="#205C43" radius={[8, 8, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#24352B]/85">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#205C43]" aria-hidden /> Accuracy
              </span>
              <span className="text-[#24352B]/85">\u00b7</span>
              <span>{chartData.length} session{chartData.length !== 1 ? "s" : ""}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4D6] text-[#7a5a00]">
            <Target className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-[#205C43]">Skill Breakdown</h2>
          <span className="text-xs text-[#24352B]/85">\u00b7 aggregated across all sessions</span>
        </div>

        {skillProgress.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[#24352B]/85">No skill data yet.</CardContent>
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
                  transition={{ duration: 0.3, delay: idx * 0.07, ease: "easeOut" }}
                >
                  <Card className="h-full">
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-bold tracking-tight text-[#205C43]">{sp.label}</p>
                          <p className="mt-0.5 text-xs text-[#24352B]/85">
                            {sp.correct} / {sp.total} correct
                            <span className="mx-1.5 text-[#24352B]/85">\u00b7</span>
                            hint rate {(sp.hintRate * 100).toFixed(0)}%
                          </p>
                        </div>
                        <span className="rounded-full bg-[#FFF4D6] px-2.5 py-1 text-xs font-bold text-[#7a5a00]">{pct}%</span>
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
                        {sp.skillId === "counting" ? "Counting objects from 1 to 5" : "Recognising written numerals"}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        className="flex items-center gap-2 rounded-2xl border border-[#C8E6C9] bg-[#F1F8E9] px-4 py-3"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#77B96A] shadow-sm">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-xs leading-relaxed text-[#24352B]/85">
          <span className="font-semibold text-[#205C43]">How to read this:</span> higher bars mean stronger unaided accuracy. Hint rate shows how often scaffolding was needed \— lower is more independent.
        </p>
      </motion.div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E3F2FD] text-[#1a4a6e]">
            <History className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-[#205C43]">Recent Detailed</h2>
          <Badge variant="sky" className="text-[10px]">attempt-level evidence</Badge>
        </div>

        <div className="space-y-4">
          {sortedSessions.map((session, sIdx) => {
            const sc = scoreSession(session);
            const sortedAttempts = [...session.attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: sIdx * 0.06, ease: "easeOut" }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-[15px]">
                          {session.activityId === "jungle-counting" ? "Jungle Counting" : session.activityId}
                        </CardTitle>
                        <p className="mt-1 text-xs text-[#24352B]/85">
                          {formatDateLong(session.startedAt)} \u00b7 {formatTime(session.startedAt)} \u00b7 {session.challenges.length} challenges
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={session.status === "completed" ? "leaf" : session.status === "in_progress" ? "sunshine" : "sky"} className="text-[10px]">
                          {session.status.replace("_", " ")}
                        </Badge>
                        <span className="rounded-full bg-[#FFF4D6] px-2.5 py-1 text-xs font-bold text-[#7a5a00]">
                          {Math.round(sc.accuracy * 100)}% \u00b7 {sc.correct}/{sc.total}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {sortedAttempts.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#24352B]/85">No attempts recorded for this session.</p>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-[#FFF4D6]">
                        <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr] gap-2 bg-[#FFF8E9] px-3 py-2 text-[11px] font-semibold tracking-wide text-[#24352B]/85 sm:grid-cols-[1.4fr_0.7fr_0.6fr_0.6fr_0.6fr] sm:px-4">
                          <span>Challenge</span>
                          <span className="text-center">Answer</span>
                          <span className="text-center">Result</span>
                          <span className="text-center">Hint</span>
                          <span className="text-center">#</span>
                        </div>
                        <ul className="divide-y divide-[#FFF4D6]">
                          {sortedAttempts.map((a) => (
                            <li
                              key={a.id}
                              className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr] items-center gap-2 px-3 py-2.5 text-xs sm:grid-cols-[1.4fr_0.7fr_0.6fr_0.6fr_0.6fr] sm:px-4"
                            >
                              <span className="truncate font-medium tracking-tight text-[#24352B]" title={a.challengeId}>
                                {shortId(a.challengeId)}
                              </span>
                              <span className="text-center font-semibold tabular-nums text-[#205C43]">{a.answer}</span>
                              <span className="flex justify-center">
                                {a.isCorrect ? (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]" aria-label="correct">
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE4DE] text-[#8a3a2a]" aria-label="incorrect">
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                  </span>
                                )}
                              </span>
                              <span className="text-center tabular-nums text-[#24352B]/85">L{a.hintLevel}</span>
                              <span className="text-center tabular-nums text-[#24352B]/85">{a.attemptNumber}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#24352B]/85">
                      <span>{sortedAttempts.length} attempt{sortedAttempts.length !== 1 ? "s" : ""}</span>
                      <span className="text-[#24352B]/85">\u00b7</span>
                      <span>{sc.hintsUsed} hint{sc.hintsUsed !== 1 ? "s" : ""} used</span>
                      <span className="ml-auto inline-flex items-center gap-1.5">
                        <Lightbulb className="h-3 w-3" aria-hidden /> Lower hint levels = more independent
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Card className="border-[#C8E6C9] bg-[#F1F8E9]">
        <div className="flex gap-3 p-4 sm:p-5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#77B96A] shadow-sm">
            <Lightbulb className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-[#205C43]">What this tells you</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#24352B]/85">
              Accuracy shows overall success; skill breakdown shows where support was needed. Attempt history makes every answer traceable \— no hidden scoring.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
