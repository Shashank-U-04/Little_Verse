"use client";

import { motion } from "motion/react";
import {
  Sparkles,
  Clock,
  MessageCircle,
  Volume2,
  Lock,
  ArrowRight,
  Leaf,
  BookOpen,
  Hash,
  FlaskConical,
} from "lucide-react";
import Miko from "@/components/character/Miko";
import JungleScene from "@/components/explorer/JungleScene";
import { Badge, Card } from "@/components/ui";
import Link from "next/link";

const worlds = [
  {
    title: "Alphabet Garden",
    subtitle: "Letters & sounds",
    icon: BookOpen,
    bg: "bg-[#E3F2FD]",
    border: "border-[#BBDEFB]",
    iconColor: "text-[#1a4a6e]",
  },
  {
    title: "Number Kingdom",
    subtitle: "Numbers & patterns",
    icon: Hash,
    bg: "bg-[#FFF4D6]",
    border: "border-[#FFE9A8]",
    iconColor: "text-[#684800]",
  },
  {
    title: "Science Island",
    subtitle: "Discover & wonder",
    icon: FlaskConical,
    bg: "bg-[#E8F5E9]",
    border: "border-[#C8E6C9]",
    iconColor: "text-[#205C43]",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8E9] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-[#FFF0C9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="LittleVerse AI home"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 rounded-full"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[#205C43] shadow-sm">
              <Leaf className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[18px] sm:text-[19px] font-extrabold tracking-tight text-[#205C43]">
              LittleVerse AI
            </span>
          </Link>
          <Link
            href="/parent"
            aria-label="For Parents"
            className="inline-flex items-center justify-center rounded-full px-4 sm:px-5 py-2 text-sm font-semibold text-[#205C43] bg-transparent border border-transparent hover:bg-[#205C43]/[0.06] active:bg-[#205C43]/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 transition-colors min-h-9"
          >
            For Parents
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="relative overflow-hidden rounded-b-[32px] bg-[#C7EBFF]">
          <div className="absolute inset-0">
            <JungleScene variant="hero" />
          </div>
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="flex flex-col items-center gap-6">
              <Miko state="greeting" size="md" message="Hello, explorer! Ready to count?" />
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-xl"
              >
                <div className="bg-white rounded-3xl card-shadow border border-[#FFF4D6] p-6 sm:p-7 relative">
                  <div className="absolute -top-2 -right-2 hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4D6] border border-[#FFE9A8] text-[#684800] shadow-sm" aria-hidden="true">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#205C43] leading-tight flex items-center gap-2">
                    Jungle Counting Adventure
                    <Sparkles className="h-5 w-5 text-[#FFD166] shrink-0 sm:hidden" aria-hidden="true" />
                  </h1>
                  <p className="mt-1.5 text-[15px] leading-6 text-[#53645B]">
                    Help Miko find the jungle animals!
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="sunshine">Ages 4–6</Badge>
                    <Badge variant="leaf" className="gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      3–5 min
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2.5 text-sm font-medium text-[#24352B]">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[#205C43] shrink-0">
                      <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>Counting quantities 1 to 5</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] border border-[#FFE9A8] px-3 py-1.5 text-xs font-semibold text-[#684800] leading-none">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Tap answers
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F2FD] border border-[#BBDEFB] px-3 py-1.5 text-xs font-semibold text-[#1a4a6e] leading-none">
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Speak answers
                    </span>
                  </div>
                  <div className="mt-6">
                    <Link
                      href="/adventure/jungle-counting"
                      className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-full bg-[#205C43] text-white px-8 py-3.5 text-[17px] font-bold leading-none shadow-[0_4px_14px_rgba(32,92,67,0.25)] hover:bg-[#184a36] active:bg-[#143d2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors select-none"
                    >
                      Start Adventure
                      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-[#FFF8E9]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#205C43]">
              More worlds to explore
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {worlds.map((world) => {
                const Icon = world.icon;
                return (
                  <Card
                    key={world.title}
                    className="relative opacity-90 pointer-events-none p-6 pt-7 flex flex-col gap-3 min-h-[148px]"
                    aria-disabled="true"
                  >
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <Badge variant="coral" className="text-[11px] px-2.5 py-1">
                        Coming soon
                      </Badge>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white border border-[#FFF0C9] shadow-sm text-[#24352B]/50">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                    <span className={"inline-flex h-10 w-10 items-center justify-center rounded-full border " + world.bg + " " + world.border + " " + world.iconColor + " shrink-0"} aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-1">
                      <h3 className="text-base font-bold tracking-tight text-[#205C43] leading-tight">
                        {world.title}
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-[#53645B]">{world.subtitle}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center">
        <p className="text-xs font-medium tracking-wide text-[#53645B]">
          Made with care for little explorers
        </p>
      </footer>
    </div>
  );
}
