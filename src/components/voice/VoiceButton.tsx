"use client";

import { motion } from "motion/react";
import { Mic, MicOff, Loader2, AlertCircle, Volume2 } from "lucide-react";
import type { VoiceState } from "@/features/learning/types";

type VoiceButtonProps = {
  state: VoiceState;
  onPress: () => void;
  disabled?: boolean;
};

const labels: Record<VoiceState, string> = {
  idle: "Tap to answer — activate microphone",
  requesting_permission: "Requesting microphone permission",
  listening: "Listening — tap to stop",
  processing: "Thinking — processing your answer",
  speaking: "Miko is speaking",
  error: "Error — try again",
  unavailable: "Voice unavailable — tap a number instead",
};

const hintText: Record<VoiceState, string> = {
  idle: "Tap to answer",
  requesting_permission: "Allow microphone…",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Miko is speaking",
  error: "Try again",
  unavailable: "Voice unavailable — tap a number",
};

export default function VoiceButton({ state, onPress, disabled }: VoiceButtonProps) {
  const isUnavailable = state === "unavailable";
  const isDisabled = disabled || isUnavailable;
  const isListening = state === "listening";
  const isProcessing = state === "processing";
  const isSpeaking = state === "speaking";
  const isError = state === "error";
  const isIdle = state === "idle";
  const isRequesting = state === "requesting_permission";

  const ariaLabel = labels[state];

  // button chrome per state
  const circleClass =
    isIdle || isRequesting
      ? isRequesting
        ? "bg-[#FFB347] text-white border-2 border-[#FFD166]"
        : "bg-[#205C43] text-white border-2 border-[#205C43] shadow-[0_8px_24px_rgba(32,92,67,0.35)] hover:bg-[#184a36] active:bg-[#143d2d]"
      : isListening
        ? "bg-[#FF8A72] text-white border-2 border-[#FF8A72] shadow-[0_8px_24px_rgba(255,138,114,0.35)]"
        : isProcessing
          ? "bg-[#8BD3F7] text-[#123D30] border-2 border-[#8BD3F7] shadow-[0_8px_24px_rgba(139,211,247,0.35)]"
          : isSpeaking
            ? "bg-[#77B96A] text-white border-2 border-[#77B96A] shadow-[0_8px_24px_rgba(119,185,106,0.35)]"
            : isError
              ? "bg-white text-[#FF8A72] border-2 border-[#FF8A72] shadow-sm hover:bg-[#FFF8E9]"
              : "bg-zinc-200 text-zinc-500 border-2 border-zinc-300";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* pulsing rings for listening / speaking */}
        {isListening && (
          <>
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#FF8A72]/30"
              animate={{ scale: [1, 1.42, 1.42], opacity: [0.7, 0, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              style={{ width: 84, height: 84, left: -6, top: -6 }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#FF8A72]/20"
              animate={{ scale: [1, 1.65, 1.65], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.35 }}
              style={{ width: 84, height: 84, left: -6, top: -6 }}
            />
          </>
        )}
        {isSpeaking && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[#77B96A]/25"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 84, height: 84, left: -6, top: -6 }}
          />
        )}
        {isRequesting && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[#FFD166]/40"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 84, height: 84, left: -6, top: -6 }}
          />
        )}

        <button
          type="button"
          role="button"
          aria-label={ariaLabel}
          aria-disabled={isDisabled ? "true" : undefined}
          disabled={!!isDisabled && state !== "unavailable"}
          onClick={() => {
            if (isDisabled && state === "unavailable") return;
            if (!disabled) onPress();
          }}
          // unavailable is visually disabled but keep focusable for hint; block press
          className={[
            "relative flex h-[84px] w-[84px] min-h-[72px] min-w-[72px] shrink-0 items-center justify-center rounded-full",
            "transition-colors duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E9]",
            "disabled:opacity-50 disabled:pointer-events-none",
            circleClass,
            isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          ].join(" ")}
          style={{ touchAction: "manipulation" }}
        >
          {isIdle && <Mic className="h-7 w-7" strokeWidth={2.2} aria-hidden />}
          {isRequesting && <MicOff className="h-7 w-7 animate-pulse" strokeWidth={2} aria-hidden />}
          {isListening && (
            <span className="relative flex items-center justify-center">
              <Mic className="h-7 w-7" strokeWidth={2.2} aria-hidden />
              {/* sound waves */}
              <span className="absolute -right-5 flex items-end gap-[3px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-white/90"
                    animate={{ scaleY: [0.6, 1.6, 0.7] }}
                    transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity, ease: "easeInOut" }}
                    style={{ height: 12 + i * 2 }}
                  />
                ))}
              </span>
            </span>
          )}
          {isProcessing && <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.2} aria-hidden />}
          {isSpeaking && (
            <span className="relative flex items-center justify-center">
              <Volume2 className="h-7 w-7" strokeWidth={2.1} aria-hidden />
              <span className="absolute -right-4 flex items-end gap-[2px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-white/90"
                    animate={{ scaleY: [0.5, 1.4, 0.6] }}
                    transition={{ duration: 0.45, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                    style={{ height: 10 }}
                  />
                ))}
              </span>
            </span>
          )}
          {isError && <AlertCircle className="h-7 w-7" strokeWidth={2.1} aria-hidden />}
          {isUnavailable && <MicOff className="h-7 w-7 opacity-60" strokeWidth={2} aria-hidden />}
        </button>
      </div>

      <span
        className={[
          "text-center text-sm font-semibold leading-4",
          isError ? "text-[#FF8A72]" : isUnavailable ? "text-zinc-500" : "text-[#24352B]",
        ].join(" ")}
        aria-live="polite"
      >
        {hintText[state]}
      </span>
    </div>
  );
}
