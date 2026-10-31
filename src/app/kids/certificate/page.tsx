"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Printer } from "lucide-react";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { ConfettiBurst } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { computeProgress } from "@/features/gamification/progression";

function CertificateInner() {
  const family = useFamilyGate("child");
  const levelNumber = Number(useSearchParams().get("level"));
  if (!family?.activeChild) return <GateLoader />;

  const child = family.activeChild;
  const progress = computeProgress(family.sessions);
  const reached = progress.levelsReached.find((r) => r.level.level === levelNumber);

  if (!reached || levelNumber < 2) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <Symbol3D name="locked" size={72} />
        <h1 className="font-display text-2xl font-bold text-[#123D30]">This certificate is still locked</h1>
        <p className="text-sm text-[#53645B]">Keep exploring to earn new titles. Each one unlocks a certificate.</p>
        <Link href="/kids/trophies" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#205C43] px-6 font-extrabold text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to trophies
        </Link>
      </div>
    );
  }

  const date = reached.reachedAt
    ? new Date(reached.reachedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <ConfettiBurst pieces={50} className="print:hidden" />
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link href="/kids/trophies" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[#205C43] hover:bg-[#205C43]/[0.07]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Trophies
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#205C43] px-5 text-sm font-extrabold text-white shadow hover:bg-[#184a36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print certificate
        </button>
      </div>

      <motion.article
        initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="print-area relative aspect-[1.414] w-full overflow-hidden rounded-3xl bg-[#FFFBEF] p-3 shadow-2xl sm:p-5"
        aria-label={`Certificate: ${child.name} earned the title ${reached.level.title}`}
      >
        <div className="relative flex h-full flex-col items-center justify-center rounded-2xl border-[6px] border-double border-[#D9AE3F] px-6 text-center sm:border-[10px]">
          <Symbol3D name="palm-tree" size={64} className="absolute bottom-3 left-3 hidden opacity-80 sm:block" />
          <Symbol3D name="parrot" size={56} className="absolute right-4 top-4 hidden sm:block" />
          <Symbol3D name={reached.level.symbol} size={72} />
          <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.35em] text-[#B07A00] sm:text-xs">Certificate of achievement</p>
          <p className="mt-2 text-xs text-[#53645B] sm:mt-4 sm:text-base">This certificate is proudly presented to</p>
          <p className="mt-1 font-display text-3xl font-bold text-[#123D30] sm:text-6xl">{child.name}</p>
          <p className="mt-1 text-xs text-[#53645B] sm:mt-3 sm:text-base">for reaching level {reached.level.level} and earning the title</p>
          <p className="mt-1 bg-gradient-to-r from-[#2E8B57] to-[#E8A200] bg-clip-text font-display text-2xl font-bold text-transparent sm:text-5xl">
            {reached.level.title}
          </p>
          <p className="mt-1 text-xs italic text-[#53645B] sm:text-sm">{reached.level.blurb}</p>
          <div className="mt-3 flex w-full max-w-md items-end justify-between gap-4 text-[10px] text-[#53645B] sm:mt-8 sm:text-sm">
            <div className="flex-1 border-t border-[#D9AE3F] pt-1">{date}</div>
            <Symbol3D name="medal-gold" size={48} />
            <div className="flex-1 border-t border-[#D9AE3F] pt-1">Miko the elephant</div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<GateLoader />}>
      <CertificateInner />
    </Suspense>
  );
}
