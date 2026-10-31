"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, CheckCircle2, Lock, Mic, ShieldCheck, Sparkles } from "lucide-react";
import SiteHeader from "@/components/nav/SiteHeader";
import JungleScene from "@/components/explorer/JungleScene";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { BadgeTile, StarRow } from "@/components/game/GameBits";
import { MODULES } from "@/features/learning/catalog";
import { BADGES, LEVELS } from "@/features/gamification/progression";
import { useFamily } from "@/lib/family";

const FLOATERS = [
  { name: "butterfly", className: "left-[6%] top-[30%]", size: 64, delay: 0 },
  { name: "parrot", className: "right-[7%] top-[24%]", size: 72, delay: 0.8 },
  { name: "banana", className: "left-[12%] bottom-[24%] hidden sm:block", size: 56, delay: 1.4 },
  { name: "monkey", className: "right-[12%] bottom-[26%] hidden sm:block", size: 76, delay: 0.4 },
];

const STEPS = [
  { symbol: "shield", title: "A grown-up signs in", text: "Create a parent account. Voice and data settings stay in your hands." },
  { symbol: "compass", title: "Tell us about your explorer", text: "Name, age, favourite hobbies and what you'd like them to practise." },
  { symbol: "rocket", title: "Play, learn and level up", text: "Age-matched adventures, XP, badges, titles and certificates to print." },
];

const THEME_BG: Record<string, string> = {
  jungle: "from-[#E8F5E9] to-[#C8E6C9]",
  fruit: "from-[#FFF1E6] to-[#FFD9C2]",
  safari: "from-[#FFF4D6] to-[#FFE29A]",
  river: "from-[#E3F2FD] to-[#B9E1F7]",
  garden: "from-[#F3E8FF] to-[#E2CCFF]",
  sky: "from-[#E0F7FA] to-[#B2EBF2]",
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Home() {
  const family = useFamily();
  const signedIn = family.ready && family.parent !== null;
  const primaryHref = signedIn ? (family.activeChild ? "/kids" : "/onboarding") : "/signup";

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8E9]">
      <SiteHeader transparent />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate flex min-h-[640px] items-center overflow-hidden pt-16 sm:min-h-[92vh]">
          <JungleScene variant="hero" interactive className="-z-10" />
          {FLOATERS.map((f) => (
            <motion.div
              key={f.name}
              aria-hidden
              className={`pointer-events-none absolute z-0 ${f.className}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + f.delay * 0.4, type: "spring", stiffness: 120 }}
            >
              <div className="float-y" style={{ animationDelay: `${f.delay}s` }}>
                <Symbol3D name={f.name} size={f.size} className="drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)]" />
              </div>
            </motion.div>
          ))}

          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/75 p-6 text-center shadow-[0_24px_60px_rgba(18,61,48,0.25)] backdrop-blur-md sm:p-10"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF4D6] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#684800]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ages 3–8 · Voice-first learning
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-[#123D30] sm:text-6xl">
                Little explorers,{" "}
                <span className="bg-gradient-to-r from-[#2E8B57] via-[#77B96A] to-[#E8A200] bg-clip-text text-transparent">big jungle adventures</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#24352B] sm:text-lg">
                Children count butterflies with Miko the elephant, climb from Seedling Scout to Jungle Legend and earn certificates. You see exactly what
                they learned.
              </p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  href={primaryHref}
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2E8B57] to-[#205C43] px-8 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(32,92,67,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                >
                  {signedIn ? "Enter the Kids Zone" : "Start exploring free"}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                {!signedIn && (
                  <Link
                    href="/login"
                    className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-[#205C43]/20 bg-white px-7 text-base font-bold text-[#205C43] transition hover:border-[#205C43]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                  >
                    I have an account
                  </Link>
                )}
                {signedIn && (
                  <Link
                    href="/parent"
                    className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-[#205C43]/20 bg-white px-7 text-base font-bold text-[#205C43] transition hover:border-[#205C43]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
                  >
                    Parent dashboard
                  </Link>
                )}
              </div>
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-[#205C43]">
                {["No ads, ever", "Grown-up controls voice", "Progress saved on this device"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-widest text-[#E8A200]">How it works</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#123D30] sm:text-4xl">Three steps into the jungle</h2>
          </motion.div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="relative rounded-[1.75rem] border border-[#FFE9A8] bg-white p-6 shadow-[0_12px_30px_rgba(32,92,67,0.08)]"
              >
                <span className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-[#205C43] font-display text-lg font-bold text-white shadow-md">
                  {i + 1}
                </span>
                <Symbol3D name={step.symbol} size={64} className="mt-2" />
                <h3 className="mt-4 font-display text-xl font-semibold text-[#205C43]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#53645B]">{step.text}</p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* Adventures */}
        <section id="adventures" className="scroll-mt-20 bg-gradient-to-b from-[#FFF8E9] to-[#EAF6E6] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp} className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-widest text-[#E8A200]">Adventures</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#123D30] sm:text-4xl">Picked for their age</h2>
                <p className="mt-2 max-w-xl text-[15px] leading-6 text-[#53645B]">
                  Every explorer sees the adventures that fit their age, with the ones matching your goals at the top.
                </p>
              </div>
            </motion.div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((module, i) => {
                const ready = module.adventureId !== null;
                return (
                  <motion.article
                    key={module.id}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: (i % 4) * 0.08 }}
                    whileHover={{ y: -6 }}
                    className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${THEME_BG[module.theme]} p-5 shadow-[0_10px_24px_rgba(32,92,67,0.10)]`}
                  >
                    <div className="flex items-start justify-between">
                      <Symbol3D name={module.symbol} size={64} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-[#205C43]">
                        Ages {module.ageMin}–{module.ageMax}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold leading-tight text-[#123D30]">{module.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#24352B]/80">{module.tagline}</p>
                    <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold ${ready ? "text-[#205C43]" : "text-[#8a3a2a]"}`}>
                      {ready ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
                      {ready ? `Playable now · ${module.minutes} min` : "Coming soon"}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Rewards */}
        <section id="rewards" className="relative scroll-mt-20 overflow-hidden bg-[#123D30] py-16 text-white sm:py-24">
          <div aria-hidden className="absolute inset-0 opacity-25">
            <JungleScene variant="backdrop" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#123D30]/95 via-[#123D30]/85 to-[#123D30]/95" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-extrabold uppercase tracking-widest text-[#FFD166]">Level up</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">From Seedling Scout to Jungle Legend</h2>
              <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-6 text-white/80">
                Every counted banana earns XP. Explorers climb ten levels, collect badges for brave tries and perfect runs, and unlock a printable certificate
                for every new title.
              </p>
            </motion.div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Explorer levels"
              className="mt-10 flex snap-x gap-3 overflow-x-auto rounded-3xl pb-4 [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166]"
            >
              {LEVELS.map((level, i) => (
                <motion.div
                  key={level.level}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                  className="flex w-36 shrink-0 snap-start flex-col items-center rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur"
                >
                  <Symbol3D name={level.symbol} size={52} />
                  <span className="mt-2 text-[11px] font-extrabold uppercase tracking-widest text-[#FFD166]">Level {level.level}</span>
                  <span className="mt-0.5 font-display text-base font-semibold leading-tight">{level.title}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 grid items-center gap-8 lg:grid-cols-2">
              <motion.div {...fadeUp} className="grid grid-cols-3 gap-3">
                {BADGES.slice(0, 6).map((badge, i) => (
                  <BadgeTile key={badge.id} badge={badge} earned={i < 4} size="sm" />
                ))}
              </motion.div>
              <motion.div {...fadeUp} className="relative mx-auto w-full max-w-md rotate-[-2deg] rounded-3xl border-[6px] border-[#E8C468] bg-[#FFFBEF] p-6 text-center text-[#123D30] shadow-2xl">
                <Symbol3D name="medal-gold" size={56} className="mx-auto" />
                <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#B07A00]">Certificate of Achievement</p>
                <p className="mt-2 font-display text-2xl font-bold">Aanya</p>
                <p className="text-sm text-[#53645B]">has earned the title</p>
                <p className="mt-1 font-display text-xl font-semibold text-[#2E8B57]">Jungle Explorer</p>
                <div className="mt-3 flex justify-center">
                  <StarRow stars={3} label="Three stars" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* For grown-ups */}
        <section id="parents" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <p className="text-sm font-extrabold uppercase tracking-widest text-[#E8A200]">For grown-ups</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#123D30] sm:text-4xl">Learning evidence, not just screen time</h2>
              <ul className="mt-6 space-y-4">
                {[
                  { icon: BarChart3, title: "A dashboard per child", text: "Accuracy over time, hints used, skills practised and the level they've reached." },
                  { icon: Mic, title: "Voice only with your consent", text: "Miko talks only after a grown-up agrees. Tapping always works without a microphone." },
                  { icon: ShieldCheck, title: "Private by default", text: "Profiles and progress stay in this browser. Delete them any time from Settings." },
                ].map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#205C43]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#205C43]">{title}</h3>
                      <p className="text-sm leading-6 text-[#53645B]">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...fadeUp} className="rounded-[2rem] border border-[#FFE9A8] bg-white p-5 shadow-[0_24px_50px_rgba(32,92,67,0.12)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF4D6]">
                  <Symbol3D name="tiger" size={36} />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-[#123D30]">Aanya · age 5</p>
                  <p className="text-xs font-bold text-[#7a5a00]">Level 3 · Trail Tracker</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Adventures", value: "7" },
                  { label: "Accuracy", value: "92%" },
                  { label: "Badges", value: "6" },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl bg-[#FFF8E9] p-3 text-center">
                    <p className="font-display text-2xl font-bold text-[#205C43]">{m.value}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#53645B]">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex h-32 items-end gap-2" aria-hidden>
                {[40, 55, 50, 70, 78, 85, 92].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="flex-1 rounded-t-xl bg-gradient-to-t from-[#2E8B57] to-[#77B96A]"
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-[#53645B]">Example: accuracy across a week of adventures</p>
            </motion.div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-16 sm:px-6">
          <motion.div
            {...fadeUp}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#2E8B57] to-[#205C43] px-6 py-12 text-center text-white shadow-[0_24px_50px_rgba(32,92,67,0.35)] sm:px-12"
          >
            <Symbol3D name="party-popper" size={64} className="mx-auto" />
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready for the first adventure?</h2>
            <p className="mx-auto mt-2 max-w-lg text-white/85">It takes two minutes to set up an explorer profile.</p>
            <Link
              href={primaryHref}
              className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#FFD166] px-8 text-lg font-extrabold text-[#123D30] shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#205C43]"
            >
              {signedIn ? "Let's play" : "Create a free account"}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[#205C43]/10 py-8 text-center">
        <p className="text-xs font-medium tracking-wide text-[#53645B]">Made with care for little explorers · 3D symbols: Microsoft Fluent Emoji (MIT)</p>
      </footer>
    </div>
  );
}
