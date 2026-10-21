import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ParentNav from "./parent-nav";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#FFF8E9] text-[#24352B]">
      {/* Top nav — compact analytics header */}
      <header className="sticky top-0 z-30 border-b border-[#FFF0C9] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
          {/* Left: logo + nav */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 rounded-full"
            >
              <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#205C43] text-[11px] font-extrabold leading-none text-white">
                LV
              </span>
              <span className="hidden text-sm font-extrabold tracking-tight text-[#205C43] sm:inline">
                LittleVerse AI
              </span>
              <span className="text-sm font-extrabold tracking-tight text-[#205C43] sm:hidden">
                LittleVerse
              </span>
            </Link>

            {/* Horizontal dashboard nav — client active state */}
            <ParentNav />
          </div>

          {/* Right: back to explorer */}
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#205C43]/90 hover:bg-[#205C43]/[0.06] hover:text-[#205C43] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Back to Explorer</span>
            <span className="sm:hidden">Explorer</span>
          </Link>
        </div>
      </header>

      {/* Content container */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-center text-[11px] leading-relaxed tracking-wide text-[#24352B]/85">
          LittleVerse AI · Parent insights stay on this device. No data leaves without your approval.
        </p>
      </footer>
    </div>
  );
}
