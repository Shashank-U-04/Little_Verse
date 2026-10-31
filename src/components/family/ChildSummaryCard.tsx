"use client";

import Link from "next/link";
import { Flame, Pencil, Star, Trophy } from "lucide-react";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { StarRow, XpBar } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import type { ChildProfile } from "@/features/family/profile";
import type { ChildProgress } from "@/features/gamification/progression";
import { FOCUS_AREAS, modulesForChild } from "@/features/learning/catalog";

/** The parent's view of one child: profile, level and where to go next. */
export function ChildSummaryCard({ child, progress }: { child: ChildProfile; progress: ChildProgress }) {
  const modules = modulesForChild(child.age, child.focusAreas).filter((m) => m.module.adventureId !== null);
  // Suggest the first recommended adventure that hasn't earned three stars yet.
  const next =
    modules.find((m) => m.recommended && (progress.stars[m.module.adventureId!] ?? 0) < 3) ??
    modules.find((m) => (progress.stars[m.module.adventureId!] ?? 0) < 3) ??
    null;
  const earned = progress.badges.filter((b) => b.earnedAt);
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="child-summary-heading" className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-3xl border border-[#FFF4D6] bg-white p-5 shadow-[0_8px_30px_rgba(32,92,67,0.08)] sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <ChildAvatar avatar={child.avatar} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="child-summary-heading" className="font-display text-2xl font-bold text-[#123D30]">
                {child.name}
              </h2>
              <span className="rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-xs font-bold text-[#205C43]">Age {child.age}</span>
            </div>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#7a5a00]">
              <Symbol3D name={progress.level.symbol} size={18} />
              Level {progress.level.level} · {progress.level.title}
            </p>
          </div>
          <Link
            href={`/onboarding?edit=${encodeURIComponent(child.id)}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#205C43]/15 px-3 text-xs font-bold text-[#205C43] hover:bg-[#205C43]/[0.06]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit profile
          </Link>
        </div>
        <XpBar progress={progress} className="mt-5" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#53645B]">Focus areas</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {child.focusAreas.map((area) => (
                <li key={area} className="inline-flex items-center gap-1 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-xs font-bold text-[#684800]">
                  <Symbol3D name={FOCUS_AREAS[area].symbol} size={16} />
                  {FOCUS_AREAS[area].label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#53645B]">Hobbies</h3>
            {child.hobbies.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {child.hobbies.map((hobby) => (
                  <li key={hobby} className="rounded-full bg-[#E3F2FD] px-2.5 py-1 text-xs font-bold text-[#1a4a6e]">
                    {hobby}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#53645B]">None added yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "Badges", value: `${earned.length}/${progress.badges.length}` },
            { icon: Star, label: "Stars", value: String(totalStars) },
            { icon: Flame, label: "Streak", value: `${progress.streak.current}d` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-3xl border border-[#FFF4D6] bg-white p-3 text-center shadow-sm">
              <Icon className="mx-auto h-5 w-5 text-[#E8A200]" aria-hidden />
              <p className="mt-1 font-display text-xl font-bold text-[#205C43]">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#53645B]">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-3xl bg-gradient-to-br from-[#2E8B57] to-[#205C43] p-5 text-white shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">Suggested next</p>
          {next ? (
            <div className="mt-2 flex items-center gap-3">
              <Symbol3D name={next.module.symbol} size={52} />
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold leading-tight">{next.module.title}</p>
                <p className="text-xs text-white/80">{next.recommended ? "Matches your focus areas" : "Right for their age"}</p>
                <div className="mt-1">
                  <StarRow stars={progress.stars[next.module.adventureId!] ?? 0} size={14} onDark />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/85">Every adventure for this age has three stars. New ones are on the way!</p>
          )}
          <Link href="/kids" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-extrabold text-[#205C43] hover:bg-[#FFF4D6]">
            Open {child.name}&apos;s Kids Zone
          </Link>
        </div>
      </div>
    </section>
  );
}
