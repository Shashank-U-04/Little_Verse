"use client";

import { motion } from "motion/react";
import type { MikoState } from "@/features/learning/types";

type MikoProps = {
  state: MikoState;
  size?: "sm" | "md" | "lg";
  message?: string;
};

const SIZE_PX = { sm: 80, md: 120, lg: 160 } as const;

export default function Miko({ state, size = "md", message }: MikoProps) {
  const px = SIZE_PX[size];

  const isIdle = state === "idle";
  const isGreeting = state === "greeting";
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isCelebrating = state === "celebrating";
  const isEncouraging = state === "encouraging";

  // wrapper bob / jump / nod
  const wrapperAnimate: Record<string, number | number[]> = {};
  const wrapperTransition: Record<string, unknown> = {};

  if (isIdle) {
    Object.assign(wrapperAnimate, { y: [0, -4, 0] });
    Object.assign(wrapperTransition, { duration: 2.6, repeat: Infinity, ease: "easeInOut" });
  } else if (isCelebrating) {
    Object.assign(wrapperAnimate, { y: [0, -14, 0] });
    Object.assign(wrapperTransition, { duration: 0.6, repeat: 3, ease: "easeOut" });
  } else if (isEncouraging) {
    Object.assign(wrapperAnimate, { y: [0, -2, 0], rotateX: [0, 6, 0] });
    Object.assign(wrapperTransition, { duration: 1.6, repeat: Infinity, ease: "easeInOut" });
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* speech bubble */}
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative mb-3 max-w-[min(280px,85vw)] rounded-2xl bg-white px-4 py-3 soft-shadow border border-[#205C43]/10 z-10"
          role="note"
          aria-label="Miko says"
        >
          <p className="text-[14px] font-semibold leading-5 text-[#24352B]">{message}</p>
          {/* tail */}
          <span
            aria-hidden
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white border-r border-b border-[#205C43]/10"
          />
        </motion.div>
      ) : null}

      {/* glow for encouraging */}
      {isEncouraging && (
        <motion.div
          aria-hidden
          className="absolute top-1/2 -z-10 h-[72%] w-[78%] -translate-y-1/2 rounded-full bg-[#FFD166]/35 blur-[14px]"
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        animate={wrapperAnimate}
        transition={wrapperTransition as never}
        style={{ width: px, height: px }}
        className="relative shrink-0 select-none"
        aria-hidden="true"
      >
        {/* celebrating stars */}
        {isCelebrating && (
          <>
            {[
              { l: "8%", t: "6%", d: 0 },
              { l: "78%", t: "4%", d: 0.12 },
              { l: "88%", t: "26%", d: 0.2 },
              { l: "4%", t: "28%", d: 0.08 },
              { l: "50%", t: "-2%", d: 0.15 },
            ].map((s, i) => (
              <motion.span
                key={i}
                className="absolute text-[#FFD166] text-[14px] leading-none drop-shadow-sm"
                style={{ left: s.l, top: s.t }}
                initial={{ opacity: 0, scale: 0, rotate: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6], rotate: [0, 18, -10], y: [0, -8, 0] }}
                transition={{ duration: 0.9, delay: s.d, repeat: Infinity, repeatDelay: 1.1 }}
              >
                ★
              </motion.span>
            ))}
          </>
        )}

        <svg
          viewBox="0 0 120 110"
          width={px}
          height={px}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Miko the elephant - ${state}`}
        >
          {/* shadow */}
          <ellipse cx="60" cy="102" rx="26" ry="5.5" fill="#123D30" opacity="0.13" />

          {/* body */}
          <ellipse cx="60" cy="80" rx="32" ry="24" fill="#205C43" />
          <ellipse cx="60" cy="86" rx="18" ry="12" fill="#77B96A" />

          {/* feet */}
          <ellipse cx="42" cy="98" rx="9" ry="5" fill="#184a36" />
          <ellipse cx="78" cy="98" rx="9" ry="5" fill="#184a36" />

          {/* left ear */}
          <motion.g
            animate={
              isListening
                ? { scale: [1, 1.08, 1] }
                : isGreeting
                  ? { rotate: [0, -14, 0] }
                  : undefined
            }
            transition={
              isListening
                ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                : isGreeting
                  ? { duration: 0.7, repeat: 2, ease: "easeInOut" }
                  : undefined
            }
            style={{ originX: "28px", originY: "48px" }}
          >
            <ellipse cx="28" cy="49" rx="17" ry="21" fill="#205C43" />
            <ellipse cx="28" cy="51" rx="10" ry="12" fill="#FFD166" opacity={isListening ? 0.95 : 0.88} />
            <ellipse cx="28" cy="51" rx="4.5" ry="6" fill="#FF8A72" opacity="0.35" />
          </motion.g>

          {/* right ear */}
          <motion.g
            animate={isListening ? { scale: [1, 1.08, 1] } : undefined}
            transition={isListening ? { duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 } : undefined}
            style={{ originX: "92px", originY: "48px" }}
          >
            <ellipse cx="92" cy="49" rx="17" ry="21" fill="#205C43" />
            <ellipse cx="92" cy="51" rx="10" ry="12" fill="#FFD166" opacity={isListening ? 0.95 : 0.88} />
            <ellipse cx="92" cy="51" rx="4.5" ry="6" fill="#FF8A72" opacity="0.35" />
          </motion.g>

          {/* head */}
          <ellipse cx="60" cy="54" rx="30" ry="26" fill="#77B96A" />
          {/* forehead highlight */}
          <ellipse cx="60" cy="42" rx="13" ry="7" fill="white" opacity="0.16" />

          {/* eyes */}
          <g>
            <circle cx="48" cy="53" r="7.2" fill="white" />
            <circle cx="48.5" cy="54.2" r="3.6" fill="#123D30" />
            <circle cx="49.8" cy="51.5" r="1.2" fill="white" />
            {/* eyelid when thinking */}
            {isThinking && <path d="M41 48 Q48 46 55 48" stroke="#123D30" strokeWidth="1.1" fill="none" opacity="0.45" />}
            <circle cx="72" cy="53" r="7.2" fill="white" />
            <circle cx="72.5" cy="54.2" r="3.6" fill="#123D30" />
            <circle cx="73.8" cy="51.5" r="1.2" fill="white" />
            {isThinking && <path d="M65 48 Q72 46 79 48" stroke="#123D30" strokeWidth="1.1" fill="none" opacity="0.45" />}
          </g>

          {/* blush */}
          <ellipse cx="38" cy="64" rx="5" ry="3" fill="#FF8A72" opacity="0.42" />
          <ellipse cx="82" cy="64" rx="5" ry="3" fill="#FF8A72" opacity="0.42" />

          {/* trunk */}
          <motion.g
            animate={isGreeting ? { rotate: [0, 12, -6, 0] } : isEncouraging ? { rotate: [0, 2, 0] } : undefined}
            transition={
              isGreeting
                ? { duration: 0.9, repeat: 1, ease: "easeInOut" }
                : isEncouraging
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : undefined
            }
            style={{ originX: "60px", originY: "62px" }}
          >
            <ellipse cx="60" cy="70" rx="9" ry="11" fill="#205C43" />
            <ellipse cx="60" cy="74" rx="6" ry="4.5" fill="#184a36" opacity="0.9" />
            <ellipse cx="57.2" cy="77.5" rx="1" ry="1.2" fill="#123D30" opacity="0.9" />
            <ellipse cx="62.8" cy="77.5" rx="1" ry="1.2" fill="#123D30" opacity="0.9" />
          </motion.g>

          {/* mouth */}
          <g>
            {isThinking ? (
              <>
                <ellipse cx="60" cy="70.5" rx="2.6" ry="2" fill="#123D30" />
                {/* hand on chin */}
                <motion.g
                  animate={{ y: [0, -1, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ellipse cx="74" cy="74" rx="8" ry="7" fill="#205C43" />
                  <ellipse cx="74" cy="74" rx="4.5" ry="3.5" fill="#FFD166" opacity="0.9" />
                </motion.g>
                {/* thinking dots */}
                <motion.g>
                  {[0, 1, 2].map((i) => (
                    <motion.circle
                      key={i}
                      cx={84 + i * 6}
                      cy={62}
                      r={1.7}
                      fill="#205C43"
                      opacity={0.85}
                      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.9, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </motion.g>
              </>
            ) : isListening ? (
              <g>
                <ellipse cx="60" cy="71" rx="7" ry="6.5" fill="#123D30" />
                <ellipse cx="60" cy="72.5" rx="3.8" ry="2.6" fill="#FF8A72" />
                <ellipse cx="60" cy="68.5" rx="2.2" ry="1.2" fill="white" opacity="0.95" />
              </g>
            ) : isSpeaking ? (
              <motion.ellipse
                cx="60"
                cy="71"
                rx="6"
                ry="5.5"
                fill="#123D30"
                animate={{ scaleY: [1, 1.35, 0.85, 1.15, 1] }}
                transition={{ duration: 0.42, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "60px", originY: "71px" }}
              />
            ) : isCelebrating ? (
              <g>
                <ellipse cx="60" cy="71" rx="6.2" ry="5" fill="#123D30" />
                <path d="M56 71 Q60 75 64 71" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
              </g>
            ) : (
              <ellipse cx="60" cy="70.5" rx={isEncouraging ? 4.2 : 2.8} ry={isEncouraging ? 2.6 : 1.8} fill="#123D30" />
            )}
            {/* speaking inner tongue */}
            {isSpeaking && (
              <motion.ellipse
                cx="60"
                cy="73"
                rx="2.8"
                ry="1.6"
                fill="#FF8A72"
                animate={{ scaleY: [1, 1.4, 0.9, 1.2, 1], opacity: [1, 0.9, 1] }}
                transition={{ duration: 0.42, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "60px", originY: "73px" }}
              />
            )}
          </g>

          {/* tiny hat / leaf accent for celebrating */}
          {isCelebrating && (
            <g>
              <path d="M54 28 L60 18 L66 28" fill="#FFD166" stroke="#205C43" strokeWidth="1.1" strokeLinejoin="round" />
              <circle cx="60" cy="30" r="2" fill="#FF8A72" />
            </g>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
