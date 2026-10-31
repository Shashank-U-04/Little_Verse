import type { Session } from "../learning/types.ts";
import { scoreSession } from "../learning/scoring.ts";

/**
 * Progression is derived from completed sessions every time, never stored, so
 * XP, levels and badges always agree with the learning evidence a parent sees.
 */

export interface LevelDef {
  level: number;
  /** Total XP needed to reach this level. */
  xp: number;
  title: string;
  symbol: string;
  blurb: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, xp: 0, title: "Seedling Scout", symbol: "seedling", blurb: "Just sprouting into the jungle." },
  { level: 2, xp: 60, title: "Jungle Explorer", symbol: "compass", blurb: "Brave enough to follow the trail." },
  { level: 3, xp: 150, title: "Trail Tracker", symbol: "footprints", blurb: "Spots every footprint on the path." },
  { level: 4, xp: 270, title: "Vine Swinger", symbol: "herb", blurb: "Swings from vine to vine with a whoop." },
  { level: 5, xp: 420, title: "Canopy Climber", symbol: "tree", blurb: "Climbs to the very top of the trees." },
  { level: 6, xp: 600, title: "River Ranger", symbol: "canoe", blurb: "Paddles the jungle river with skill." },
  { level: 7, xp: 820, title: "Wildlife Whisperer", symbol: "parrot", blurb: "Every animal is a friend." },
  { level: 8, xp: 1080, title: "Jungle Guardian", symbol: "shield", blurb: "Keeps the jungle safe and happy." },
  { level: 9, xp: 1380, title: "Jungle Hero", symbol: "medal-gold", blurb: "The whole jungle cheers your name." },
  { level: 10, xp: 1750, title: "Jungle Legend", symbol: "crown", blurb: "Stories about you are told for ages." },
];

export const XP_RULES = {
  /** Per challenge, by the highest hint level reached before solving it. */
  solvedUnaided: 10,
  solvedWithHint: 7,
  solvedWithHelp: 5,
  completion: 20,
  perfect: 15,
  firstOfDay: 10,
} as const;

export interface XpBreakdown {
  challenges: number;
  completion: number;
  perfect: number;
  firstOfDay: number;
  total: number;
}

export type BadgeId =
  | "first-footprints"
  | "sharp-eyes"
  | "never-give-up"
  | "brave-voice"
  | "trailblazer"
  | "butterfly-buddy"
  | "fruit-friend"
  | "safari-pal"
  | "splash-star"
  | "world-wanderer"
  | "on-a-roll"
  | "counting-champion"
  | "super-star"
  | "halfway-hero";

interface Stats {
  completed: number;
  perfectRuns: number;
  persevered: boolean;
  voiceAnswers: number;
  adventures: Set<string>;
  days: Set<string>;
  challengesSolved: number;
  level: number;
}

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  symbol: string;
  earned: (stats: Stats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first-footprints", name: "First Footprints", description: "Finish your very first adventure.", symbol: "footprints", earned: (s) => s.completed >= 1 },
  { id: "sharp-eyes", name: "Sharp Eyes", description: "Finish an adventure without any hints.", symbol: "eyes", earned: (s) => s.perfectRuns >= 1 },
  { id: "never-give-up", name: "Never Give Up", description: "Solve a tricky one after lots of help.", symbol: "biceps", earned: (s) => s.persevered },
  { id: "brave-voice", name: "Brave Voice", description: "Say an answer out loud.", symbol: "microphone", earned: (s) => s.voiceAnswers >= 1 },
  { id: "butterfly-buddy", name: "Butterfly Buddy", description: "Finish the Jungle Counting Adventure.", symbol: "butterfly", earned: (s) => s.adventures.has("jungle-counting") },
  { id: "fruit-friend", name: "Fruit Friend", description: "Finish Fruit Basket Count.", symbol: "strawberry", earned: (s) => s.adventures.has("fruit-basket") },
  { id: "safari-pal", name: "Safari Pal", description: "Finish Safari Friends.", symbol: "lion", earned: (s) => s.adventures.has("safari-friends") },
  { id: "splash-star", name: "Splash Star", description: "Finish the River Count Challenge.", symbol: "fish", earned: (s) => s.adventures.has("river-count") },
  { id: "trailblazer", name: "Trailblazer", description: "Finish three adventures.", symbol: "rocket", earned: (s) => s.completed >= 3 },
  { id: "world-wanderer", name: "World Wanderer", description: "Finish three different adventures.", symbol: "world-map", earned: (s) => s.adventures.size >= 3 },
  { id: "on-a-roll", name: "On a Roll", description: "Explore on three different days.", symbol: "fire", earned: (s) => s.days.size >= 3 },
  { id: "counting-champion", name: "Counting Champion", description: "Solve 25 challenges.", symbol: "hundred", earned: (s) => s.challengesSolved >= 25 },
  { id: "super-star", name: "Super Star", description: "Finish five adventures without hints.", symbol: "glowing-star", earned: (s) => s.perfectRuns >= 5 },
  { id: "halfway-hero", name: "Halfway Hero", description: "Reach level 5.", symbol: "gem", earned: (s) => s.level >= 5 },
];

export interface EarnedBadge {
  badge: BadgeDef;
  earnedAt: string | null;
}

export interface ReachedLevel {
  level: LevelDef;
  reachedAt: string | null;
}

export interface ChildProgress {
  xp: number;
  level: LevelDef;
  nextLevel: LevelDef | null;
  /** XP earned since reaching the current level, and XP the next level needs from there. */
  xpIntoLevel: number;
  xpForNext: number;
  /** 0..1 towards the next level; 1 at the top level. */
  levelProgress: number;
  badges: EarnedBadge[];
  earnedBadgeIds: Set<BadgeId>;
  /** Every level reached so far, lowest first; level 1 is reached from the start. */
  levelsReached: ReachedLevel[];
  /** Best stars (1-3) per adventure id. */
  stars: Record<string, number>;
  completed: number;
  streak: { current: number; best: number };
  sessionXp: Map<string, XpBreakdown>;
}

export function levelForXp(xp: number): LevelDef {
  let current = LEVELS[0]!;
  for (const level of LEVELS) if (xp >= level.xp) current = level;
  return current;
}

/** Local calendar day, so "first adventure today" matches the child's own day. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Highest hint level reached per challenge, for challenges that were eventually solved. */
function solvedChallenges(session: Session): { challengeId: string; hintLevel: number }[] {
  const solved: { challengeId: string; hintLevel: number }[] = [];
  for (const challenge of session.challenges) {
    const attempts = session.attempts.filter((a) => a.challengeId === challenge.id);
    if (!attempts.some((a) => a.isCorrect)) continue;
    solved.push({ challengeId: challenge.id, hintLevel: attempts.reduce((max, a) => Math.max(max, a.hintLevel), 0) });
  }
  return solved;
}

export function starsForSession(session: Session): number {
  const score = scoreSession(session);
  if (score.total === 0 || score.correct < score.total) return 0;
  if (score.correctUnaided === score.total) return 3;
  return score.hintsUsed <= score.total ? 2 : 1;
}

function completionTime(session: Session): string {
  return session.completedAt ?? session.startedAt;
}

/** `now` defaults to the current time, read only when there is history (never during prerender). */
export function computeProgress(sessions: Session[], now?: Date): ChildProgress {
  const completed = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => completionTime(a).localeCompare(completionTime(b)));

  const stats: Stats = {
    completed: 0,
    perfectRuns: 0,
    persevered: false,
    voiceAnswers: 0,
    adventures: new Set(),
    days: new Set(),
    challengesSolved: 0,
    level: 1,
  };
  const earnedAt = new Map<BadgeId, string>();
  const levelReachedAt = new Map<number, string>();
  const stars: Record<string, number> = {};
  const sessionXp = new Map<string, XpBreakdown>();
  let xp = 0;

  for (const session of completed) {
    const at = completionTime(session);
    const day = dayKey(at);
    const solved = solvedChallenges(session);
    const challengeXp = solved.reduce(
      (sum, c) => sum + (c.hintLevel === 0 ? XP_RULES.solvedUnaided : c.hintLevel === 1 ? XP_RULES.solvedWithHint : XP_RULES.solvedWithHelp),
      0,
    );
    const sessionStars = starsForSession(session);
    const breakdown: XpBreakdown = {
      challenges: challengeXp,
      completion: XP_RULES.completion,
      perfect: sessionStars === 3 ? XP_RULES.perfect : 0,
      firstOfDay: stats.days.has(day) ? 0 : XP_RULES.firstOfDay,
      total: 0,
    };
    breakdown.total = breakdown.challenges + breakdown.completion + breakdown.perfect + breakdown.firstOfDay;
    sessionXp.set(session.id, breakdown);
    xp += breakdown.total;

    stats.completed += 1;
    if (sessionStars === 3) stats.perfectRuns += 1;
    if (solved.some((c) => c.hintLevel >= 2)) stats.persevered = true;
    stats.voiceAnswers += session.attempts.filter((a) => a.answerType === "voice").length;
    stats.adventures.add(session.activityId);
    stats.days.add(day);
    stats.challengesSolved += solved.length;
    stars[session.activityId] = Math.max(stars[session.activityId] ?? 0, sessionStars);

    const level = levelForXp(xp);
    for (const def of LEVELS) {
      if (def.level <= level.level && def.level > 1 && !levelReachedAt.has(def.level)) levelReachedAt.set(def.level, at);
    }
    stats.level = level.level;
    for (const badge of BADGES) {
      if (!earnedAt.has(badge.id) && badge.earned(stats)) earnedAt.set(badge.id, at);
    }
  }

  const level = levelForXp(xp);
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1) ?? null;
  const xpIntoLevel = xp - level.xp;
  const xpForNext = nextLevel ? nextLevel.xp - level.xp : 0;

  return {
    xp,
    level,
    nextLevel,
    xpIntoLevel,
    xpForNext,
    levelProgress: nextLevel ? xpIntoLevel / xpForNext : 1,
    badges: BADGES.map((badge) => ({ badge, earnedAt: earnedAt.get(badge.id) ?? null })),
    earnedBadgeIds: new Set(earnedAt.keys()),
    levelsReached: LEVELS.filter((l) => l.level <= level.level).map((l) => ({
      level: l,
      reachedAt: l.level === 1 ? null : levelReachedAt.get(l.level) ?? null,
    })),
    stars,
    completed: stats.completed,
    streak: streaks(stats.days, now),
    sessionXp,
  };
}

/** Consecutive active days; the current streak survives until the end of the day after the last visit. */
function streaks(days: Set<string>, now: Date | undefined): { current: number; best: number } {
  if (days.size === 0) return { current: 0, best: 0 };
  const sorted = [...days].sort();
  const toTime = (key: string): number => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y!, m! - 1, d!).getTime();
  };
  const dayMs = 24 * 60 * 60 * 1000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = Math.round((toTime(sorted[i]!) - toTime(sorted[i - 1]!)) / dayMs) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const gap = Math.round((toTime(dayKey((now ?? new Date()).toISOString())) - toTime(sorted[sorted.length - 1]!)) / dayMs);
  return { current: gap <= 1 ? run : 0, best };
}

/** What changed when one session completed: used to celebrate on the completion screen. */
export function progressDelta(before: ChildProgress, after: ChildProgress): { levelUp: LevelDef | null; newBadges: BadgeDef[] } {
  return {
    levelUp: after.level.level > before.level.level ? after.level : null,
    newBadges: after.badges.filter((b) => b.earnedAt && !before.earnedBadgeIds.has(b.badge.id)).map((b) => b.badge),
  };
}
