"use client";

import { motion } from "motion/react";
import SiteHeader from "@/components/nav/SiteHeader";
import JungleScene from "@/components/explorer/JungleScene";
import { Symbol3D } from "@/components/ui/Symbol3D";

/** Split layout for the grown-up forms: the jungle on one side, the form on the other. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8E9]">
      <SiteHeader />
      <main className="grid flex-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:block">
          <JungleScene variant="compact" />
          <div className="absolute inset-x-0 bottom-[22%] flex justify-center">
            <div className="float-y rounded-3xl bg-white/80 px-6 py-4 text-center shadow-xl backdrop-blur">
              <Symbol3D name="elephant" size={72} className="mx-auto" />
              <p className="mt-1 font-display text-lg font-semibold text-[#205C43]">Miko can&apos;t wait to meet your explorer!</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[2rem] border border-[#FFE9A8] bg-white p-6 shadow-[0_24px_50px_rgba(32,92,67,0.12)] sm:p-8"
          >
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#E8A200]">For grown-ups</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#123D30]">{title}</h1>
            <p className="mt-1.5 text-sm leading-6 text-[#53645B]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export function Field({
  label,
  id,
  hint,
  error,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string; error?: string }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-[#24352B]">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-[#205C43]/15 bg-[#FFFDF7] px-4 text-base text-[#24352B] outline-none transition placeholder:text-[#53645B]/60 focus:border-[#2E8B57] focus:bg-white focus:ring-4 focus:ring-[#77B96A]/25 aria-[invalid=true]:border-[#E0533B]"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[#53645B]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-bold text-[#B4442F]">
          {error}
        </p>
      )}
    </div>
  );
}

export const primaryButton =
  "inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2E8B57] to-[#205C43] px-6 py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_rgba(32,92,67,0.3)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70";
