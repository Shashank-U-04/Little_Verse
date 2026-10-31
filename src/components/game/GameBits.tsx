"use client";

import { motion } from "motion/react";
import { Lock, Star } from "lucide-react";
import { Symbol3D } from "@/components/ui/Symbol3D";
import type { BadgeDef, ChildProgress } from "@/features/gamification/progression";
import { cn } from "@/lib/utils";

/** XP towards the next level, with the level's title on top. */
export function XpBar({ progress, className, dark = false }: { progress: ChildProgress; className?: string; dark?: boolean }) {
  const pct = Math.round(progress.levelProgress * 100);
  const label = progress.nextLevel
    ? `${progress.xpForNext - progress.xpIntoLevel} XP to level ${progress.nextLevel.level}: ${progress.nextLevel.title}`
    : "Top level reached: you are a Jungle Legend!";
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("mb-1.5 flex items-center justify-between gap-2 text-xs font-extrabold", dark ? "text-white/90" : "text-[#205C43]")}>
        <span>{progress.xp} XP</span>
        <span className={dark ? "text-white/80" : "text-[#53645B]"}>{label}</span>
      </div>
      <div
        className={cn("relative h-4 overflow-hidden rounded-full", dark ? "bg-white/20" : "bg-[#205C43]/10")}
        role="progressbar"
        aria-label="Experience towards the next level"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={label}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 4)}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="shine h-full rounded-full bg-[linear-gradient(90deg,#FFD166,#FF9F43,#FFD166)]"
        />
      </div>
    </div>
  );
}

export function StarRow({ stars, size = 18, label, onDark = false }: { stars: number; size?: number; label?: string; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${stars} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          aria-hidden
          style={{ width: size, height: size }}
          className={i <= stars ? "fill-[#FFC233] text-[#E8A200]" : onDark ? "fill-white/25 text-white/60" : "fill-[#205C43]/10 text-[#205C43]/25"}
        />
      ))}
    </span>
  );
}

export function BadgeTile({ badge, earned, earnedAt, size = "md" }: { badge: BadgeDef; earned: boolean; earnedAt?: string | null; size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <motion.div
      whileHover={earned ? { y: -4, rotate: -2 } : undefined}
      className={cn(
        "relative flex flex-col items-center rounded-3xl border text-center transition-shadow",
        small ? "gap-1 p-3" : "gap-2 p-4",
        earned
          ? "border-[#FFE9A8] bg-gradient-to-b from-[#FFFBEF] to-[#FFF1C7] shadow-[0_8px_20px_rgba(232,162,0,0.18)]"
          : "border-dashed border-[#205C43]/20 bg-white/70",
      )}
    >
      <span className={cn("relative flex items-center justify-center rounded-full", small ? "h-12 w-12" : "h-16 w-16", earned ? "bg-white shadow-inner" : "bg-[#205C43]/[0.05]")}>
        <Symbol3D name={badge.symbol} size={small ? 36 : 48} className={earned ? "" : "opacity-30 grayscale"} />
        {!earned && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#53645B] shadow">
            <Lock className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </span>
      <p className={cn("font-display font-semibold leading-tight", small ? "text-xs" : "text-sm", earned ? "text-[#7a4f00]" : "text-[#53645B]")}>{badge.name}</p>
      {!small && <p className="text-[11px] leading-4 text-[#53645B]">{badge.description}</p>}
      {!small && earned && earnedAt && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#B07A00]">
          Earned {new Date(earnedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </p>
      )}
      <span className="sr-only">{earned ? "Earned" : "Not earned yet"}</span>
    </motion.div>
  );
}

const CONFETTI_COLORS = ["#FFD166", "#FF8A72", "#77B96A", "#8BD3F7", "#C58CFF", "#FF6B6B"];

/** A one-off burst of confetti from the top of its container. Decorative. */
export function ConfettiBurst({ pieces = 60, className }: { pieces?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: pieces }, (_, i) => {
        // Deterministic spread so server and client agree.
        const left = (i * 37) % 100;
        const delay = ((i * 13) % 20) / 25;
        const drift = ((i * 29) % 60) - 30;
        const rotate = ((i * 47) % 720) - 360;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const round = i % 3 === 0;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block"
            style={{ left: `${left}%`, width: round ? 10 : 8, height: round ? 10 : 14, backgroundColor: color, borderRadius: round ? 999 : 2 }}
            initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: ["0vh", "105vh"], x: [0, drift, drift * 0.4], rotate, opacity: [1, 1, 0.8] }}
            transition={{ duration: 2.8 + (i % 5) * 0.3, delay, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}
