"use client";

import { MicOff, RotateCcw } from "lucide-react";
import type { MicProblemKind } from "./micProblem";

type MicHelpProps = {
  problem: MicProblemKind;
  /** Omitted when retrying cannot help (an unsupported browser). */
  onRetry?: () => void;
};

const CONTENT: Record<MicProblemKind, { title: string; steps: string[]; note?: string }> = {
  denied: {
    title: "The microphone is blocked",
    steps: [
      "Click the lock or settings icon next to the web address.",
      "Find Microphone and choose Allow.",
      "Then tap Try again.",
    ],
    note: "On a phone: open the browser menu, then Settings, Site settings, Microphone.",
  },
  unavailable: {
    title: "No working microphone found",
    steps: [
      "Plug in or switch on a microphone or headset.",
      "Close other apps that may be using it, like video calls.",
      "Then tap Try again.",
    ],
  },
  unsupported: {
    title: "This browser can't use the microphone here",
    steps: [
      "Open LittleVerse in the latest Chrome or Edge.",
      "Use the secure link: the address must start with https://",
    ],
  },
  connection: {
    title: "Miko couldn't connect",
    steps: ["Check that the internet is working.", "Then tap Try again."],
  },
};

/** Grown-up instructions for a microphone or connection problem. Tapping always still works. */
export default function MicHelp({ problem, onRetry }: MicHelpProps) {
  const content = CONTENT[problem];
  return (
    <div
      role="alert"
      data-testid="mic-help"
      data-problem={problem}
      className="w-full max-w-sm rounded-2xl border border-[#FF8A72]/35 bg-[#FFF4F1] px-4 py-3 text-left text-[#24352B]"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-[#8a3a2a]">
        <MicOff className="h-4 w-4 shrink-0" aria-hidden />
        {content.title}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-[#53645B]">For a grown-up:</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs leading-5">
        {content.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {content.note && <p className="mt-1.5 text-xs leading-5 text-[#53645B]">{content.note}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#205C43]/20 bg-white px-4 text-sm font-semibold text-[#205C43] hover:bg-[#FFF8E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        )}
        <span className="text-xs font-semibold text-[#205C43]">You can keep playing by tapping the numbers.</span>
      </div>
    </div>
  );
}
