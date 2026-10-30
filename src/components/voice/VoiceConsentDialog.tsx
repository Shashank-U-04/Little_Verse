"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type VoiceConsentDialogProps = {
  open: boolean;
  /** True when the server needs the grown-up access code before Bolna calls. */
  needsAccessCode: boolean;
  onCancel: () => void;
  /** Called after consent is given and, when needed, the access code was accepted. */
  onAccepted: () => void;
};

/** Parent-facing disclosure shown before the first voice session on a device. */
export default function VoiceConsentDialog({ open, needsAccessCode, onCancel, onAccepted }: VoiceConsentDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed || submitting) return;
    setError(null);
    if (needsAccessCode) {
      setSubmitting(true);
      try {
        const response = await fetch("/api/voice/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { code?: string } | null;
          setError(
            body?.code === "wrong_code"
              ? "That access code didn't match."
              : body?.code === "rate_limited"
                ? "Too many tries. Please wait a few minutes."
                : "Voice couldn't be turned on right now. Tapping still works.",
          );
          return;
        }
      } catch {
        setError("Voice couldn't be turned on right now. Tapping still works.");
        return;
      } finally {
        setSubmitting(false);
      }
    }
    setCode("");
    onAccepted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#123D30]/40 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#FFF4D6] bg-white p-5 text-[#24352B] shadow-[0_24px_60px_rgba(18,61,48,0.25)] sm:p-7"
      >
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-lg font-extrabold tracking-tight text-[#205C43] focus:outline-none">
            For grown-ups: before Miko can talk
          </h2>
        </div>
        <div id={descriptionId} className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            <strong>Talk to Miko</strong> starts a live voice call. Your child&apos;s voice streams to our voice partner{" "}
            <strong>Bolna</strong>, which uses Deepgram (speech-to-text), OpenAI (language model) and ElevenLabs (Miko&apos;s voice).
          </p>
          <p>
            <strong>Bolna keeps a recording and a transcript of each call</strong> in its call history. LittleVerse cannot switch
            that off today, and Bolna sets how long it is kept. Please supervise, and don&apos;t let your child share names,
            addresses or other personal details.
          </p>
          <p>
            <strong>Answer with my voice</strong> uses your browser&apos;s speech recognition. In Chrome, that audio is sent to
            Google.
          </p>
          <p className="rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9] px-3.5 py-3 text-[#205C43]">
            <strong>LittleVerse itself stores no audio and no transcripts.</strong> It saves only answers, hints used and times,
            in this browser&apos;s local storage. You can clear them in Parent settings.
          </p>
          <p>Miko never decides scores: answers are checked by the app. Tapping the numbers always works without voice.</p>
        </div>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#205C43]"
            />
            I&apos;m this child&apos;s parent or guardian, I&apos;ve read this, and I agree to voice features on this device.
          </label>
          {needsAccessCode && (
            <label className="block text-sm font-semibold">
              Access code
              <input
                type="password"
                autoComplete="off"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                className="mt-1.5 block w-full rounded-2xl border border-[#205C43]/20 bg-[#FFF8E9] px-4 py-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43]"
              />
              <span className="mt-1 block text-xs font-normal text-[#53645B]">This demo&apos;s voice is limited to people with the code.</span>
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-[#B4442F]">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Not now
            </Button>
            <Button type="submit" variant="primary" disabled={!agreed || submitting || (needsAccessCode && code.length === 0)}>
              {submitting ? "Checking…" : "Agree and turn on voice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
