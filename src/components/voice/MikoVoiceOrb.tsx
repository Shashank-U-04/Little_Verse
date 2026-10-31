"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { motion } from "motion/react";
import { ParticlesOrb } from "@/registry/orbe/particles-orb/particles-orb";
import type { OrbState } from "@/registry/lib/orb-state";
import { useAudioLevel } from "@/registry/lib/use-audio-level";
import { useReducedMotion } from "@/registry/lib/use-reduced-motion";
import type { BolnaUiState } from "@/lib/bolna/bolnaCallAdapter";

const ORB_SIZE = 128;
const ORB_SPEED = 0.5;
const ORB_COLOR_FROM = "#22d3ee";
const ORB_COLOR_TO = "#34d399";
// Miko's level arrives ~10 times a second; hysteresis plus a hold keeps the orb from flickering between words.
const SPEAKING_ON_LEVEL = 0.05;
const SPEAKING_OFF_LEVEL = 0.02;
const SPEAKING_HOLD_MS = 700;
const AGENT_LEVEL_GAIN = 1.8;

type MikoVoiceOrbProps = {
  callState: BolnaUiState;
  /** The server has Bolna configured; otherwise the orb rests, disabled. */
  ready: boolean;
  /** An unconfirmed hang-up still holds the microphone. */
  holdsAudio: boolean;
  subscribeAgentLevel: (listener: (level: number) => void) => () => void;
  onStart: () => void;
  onStop: () => void;
};

type OrbView = {
  orb: OrbState;
  /** Accessible name of the orb button. */
  action: string;
  caption: string;
  disabled: boolean;
  press: "start" | "stop" | null;
};

function orbView(callState: BolnaUiState, ready: boolean, holdsAudio: boolean, speaking: boolean): OrbView {
  if (!ready) {
    return { orb: "disabled", action: "Miko's voice isn't available", caption: "Miko's voice isn't available right now. Tapping the numbers works great!", disabled: true, press: null };
  }
  switch (callState) {
    case "requesting_permission":
      return { orb: "connecting", action: "Cancel talking to Miko", caption: "Allow the microphone to talk to Miko", disabled: false, press: "stop" };
    case "connecting":
      return { orb: "connecting", action: "Cancel talking to Miko", caption: "Connecting to Miko…", disabled: false, press: "stop" };
    case "active":
      return speaking
        ? { orb: "speaking", action: "End talk with Miko", caption: "Miko is talking…", disabled: false, press: "stop" }
        : { orb: "listening", action: "End talk with Miko", caption: "Miko is listening…", disabled: false, press: "stop" };
    case "ending":
      return { orb: "thinking", action: "Hanging up", caption: "Hanging up…", disabled: true, press: null };
    case "error":
      return holdsAudio
        ? { orb: "error", action: "Retry hanging up", caption: "Hang-up not confirmed yet. Tap to try again.", disabled: false, press: "stop" }
        : { orb: "error", action: "Talk to Miko", caption: "Miko isn't connected. Tap the orb to try again.", disabled: false, press: "start" };
    default:
      return { orb: "idle", action: "Talk to Miko", caption: "Tap the orb to talk to Miko", disabled: false, press: "start" };
  }
}

/** Tracks whether Miko is speaking from the SDK's level events, and exposes the level for the orb. */
function useAgentSpeech(isLive: boolean, subscribe: MikoVoiceOrbProps["subscribeAgentLevel"]) {
  const levelRef = useRef(0);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!isLive) return;
    let isSpeaking = false;
    let quietSince: number | null = null;
    const unsubscribe = subscribe((level) => {
      levelRef.current = Math.min(1, level * AGENT_LEVEL_GAIN);
      if (level >= SPEAKING_ON_LEVEL) {
        quietSince = null;
        if (!isSpeaking) { isSpeaking = true; setSpeaking(true); }
        return;
      }
      if (!isSpeaking || level > SPEAKING_OFF_LEVEL) return;
      const now = Date.now();
      quietSince ??= now;
      if (now - quietSince >= SPEAKING_HOLD_MS) { isSpeaking = false; quietSince = null; setSpeaking(false); }
    });
    return () => {
      unsubscribe();
      levelRef.current = 0;
      setSpeaking(false);
    };
  }, [isLive, subscribe]);

  return { speaking: isLive && speaking, agentLevelRef: levelRef };
}

export default function MikoVoiceOrb({ callState, ready, holdsAudio, subscribeAgentLevel, onStart, onStop }: MikoVoiceOrbProps) {
  const isLive = ready && callState === "active";
  const { speaking, agentLevelRef } = useAgentSpeech(isLive, subscribeAgentLevel);
  // The child's own voice drives the orb while Miko listens; -1 lets the orb animate on its own.
  const { levelRef: micLevelRef } = useAudioLevel(isLive);
  const speakingRef = useRef(speaking);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  const [levelRef] = useState<RefObject<number>>(() => ({
    get current() { return speakingRef.current ? agentLevelRef.current : micLevelRef.current; },
  }));
  const reducedMotion = useReducedMotion();
  const view = orbView(callState, ready, holdsAudio, speaking);
  const press = () => {
    if (view.press === "start") onStart();
    else if (view.press === "stop") onStop();
  };
  const glow = view.orb === "error" ? "shadow-[0_0_0_6px_rgba(244,63,94,0.25)]" : view.orb === "idle" || view.orb === "disabled" ? "shadow-[0_12px_32px_rgba(18,61,48,0.35)]" : "shadow-[0_0_0_6px_rgba(52,211,153,0.28),0_12px_40px_rgba(34,211,238,0.35)]";

  return (
    <div className="flex flex-col items-center gap-2" data-orb-state={view.orb}>
      <motion.button
        type="button"
        aria-label={view.action}
        disabled={view.disabled}
        onClick={press}
        whileHover={view.disabled || reducedMotion ? undefined : { scale: 1.05 }}
        whileTap={view.disabled || reducedMotion ? undefined : { scale: 0.94 }}
        className={[
          "relative grid h-[152px] w-[152px] place-items-center rounded-full bg-[radial-gradient(circle_at_50%_40%,#1d5a46_0%,#123D30_55%,#0a2219_100%)] transition-shadow duration-300",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD166] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          view.disabled ? "cursor-not-allowed" : "cursor-pointer",
          glow,
        ].join(" ")}
        style={{ touchAction: "manipulation" }}
      >
        <span aria-hidden className="pointer-events-none">
          <ParticlesOrb state={view.orb} size={ORB_SIZE} speed={ORB_SPEED} colorFrom={ORB_COLOR_FROM} colorTo={ORB_COLOR_TO} levelRef={isLive ? levelRef : undefined} label="" />
        </span>
      </motion.button>
      <p className="max-w-xs text-center text-sm font-bold text-[#123D30]" aria-live="polite" data-testid="tutor-voice-status">{view.caption}</p>
      {view.press === "stop" && callState === "active" && <p className="text-xs font-semibold text-[#53645B]">Tap the orb again to stop.</p>}
    </div>
  );
}
