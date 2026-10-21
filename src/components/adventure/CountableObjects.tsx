"use client";

import { motion } from "motion/react";

type CountableProps = {
  type: "butterfly" | "banana" | "elephant";
  count: number;
  highlighted: number;
  highlightedIndices?: Set<number>;
  onTap?: (index: number) => void;
  revealed?: boolean;
  interactive?: boolean;
};

function ButterflySVG() {
  return (
    <svg viewBox="0 0 64 56" width="60" height="56" aria-hidden className="overflow-visible">
      {/* left top wing */}
      <ellipse cx="20" cy="18" rx="16" ry="13" fill="#FF8A72" />
      <ellipse cx="17" cy="16" rx="8" ry="7" fill="#FFD166" opacity={0.95} />
      <ellipse cx="14" cy="14" rx="3.2" ry="2.8" fill="white" opacity={0.45} />
      {/* right top wing */}
      <ellipse cx="44" cy="18" rx="16" ry="13" fill="#FF8A72" />
      <ellipse cx="47" cy="16" rx="8" ry="7" fill="#8BD3F7" opacity={0.95} />
      <ellipse cx="50" cy="14" rx="3.2" ry="2.8" fill="white" opacity={0.45} />
      {/* bottom wings */}
      <ellipse cx="22" cy="37" rx="11" ry="9" fill="#FF8A72" opacity={0.92} />
      <ellipse cx="42" cy="37" rx="11" ry="9" fill="#8BD3F7" opacity={0.92} />
      {/* body */}
      <ellipse cx="32" cy="30" rx="4.2" ry="16" fill="#24352B" />
      <ellipse cx="32" cy="30" rx="2" ry="12" fill="#FFD166" opacity={0.9} />
      {/* antennae */}
      <path d="M30 14 Q27 6 22 5" stroke="#24352B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M34 14 Q37 6 42 5" stroke="#24352B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="5" r="1.6" fill="#24352B" />
      <circle cx="42" cy="5" r="1.6" fill="#24352B" />
      {/* wing dots */}
      <circle cx="20" cy="20" r="1.3" fill="white" opacity={0.7} />
      <circle cx="44" cy="20" r="1.3" fill="white" opacity={0.7} />
    </svg>
  );
}

function BananaSVG() {
  return (
    <svg viewBox="0 0 52 80" width="50" height="72" aria-hidden className="overflow-visible">
      {/* peel shadow */}
      <path d="M16 8 C 8 28, 14 56, 28 72 C 34 66, 38 48, 36 22 C 36 10, 26 4, 16 8Z" fill="#77B96A" opacity={0.92} />
      {/* banana body */}
      <path
        d="M19 10 C 11 26, 16 54, 28.5 69.5 C 32 63, 35.5 48, 35 22 C 34.5 12, 27 6, 19 10Z"
        fill="#FFD166"
        stroke="#E2A700"
        strokeWidth="1"
      />
      {/* highlight */}
      <path d="M21 18 C 16 28, 18 50, 26 62" stroke="white" strokeWidth="1.6" opacity={0.5} fill="none" strokeLinecap="round" />
      {/* peel tip */}
      <ellipse cx="18.5" cy="9.5" rx="5" ry="3.2" fill="#205C43" />
      <ellipse cx="29" cy="70.2" rx="3.2" ry="1.6" fill="#205C43" opacity={0.85} />
      {/* little leaf at top */}
      <path d="M14 9 C 10 4, 18 2, 20 7" fill="#77B96A" stroke="#205C43" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
}

function ElephantSVG() {
  return (
    <svg viewBox="0 0 72 52" width="70" height="50" aria-hidden className="overflow-visible">
      <ellipse cx="36" cy="48" rx="18" ry="3.2" fill="#123D30" opacity={0.12} />
      {/* body */}
      <ellipse cx="36" cy="30" rx="22" ry="15" fill="#9AA5A8" />
      <ellipse cx="36" cy="32" rx="13" ry="8" fill="#C2CDD0" opacity={0.9} />
      {/* head */}
      <ellipse cx="52" cy="24" rx="14" ry="13" fill="#9AA5A8" />
      <ellipse cx="52" cy="22" rx="7" ry="5" fill="white" opacity={0.18} />
      {/* ear */}
      <ellipse cx="44" cy="20" rx="11" ry="12" fill="#8E9A9D" />
      <ellipse cx="44" cy="21" rx="6" ry="7" fill="#FFD166" opacity={0.75} />
      <ellipse cx="44" cy="21" rx="2.8" ry="3.5" fill="#FF8A72" opacity={0.28} />
      {/* eye */}
      <circle cx="55" cy="22" r="3.4" fill="white" />
      <circle cx="55.6" cy="22.6" r="1.7" fill="#123D30" />
      <circle cx="56.4" cy="21.2" r="0.6" fill="white" />
      {/* trunk */}
      <path d="M62 28 C 66 32, 64 40, 58 42 C 56 42.5, 55 41, 56.5 39 C 59 36.5, 60 33, 58.5 29Z" fill="#8E9A9D" stroke="#7A8689" strokeWidth="0.6" />
      <circle cx="57.8" cy="41.2" r="0.7" fill="#123D30" opacity={0.9} />
      <circle cx="59.6" cy="41.2" r="0.7" fill="#123D30" opacity={0.9} />
      {/* feet */}
      <ellipse cx="24" cy="43" rx="6" ry="3.2" fill="#7A8689" />
      <ellipse cx="40" cy="43" rx="6" ry="3.2" fill="#7A8689" />
      {/* tail */}
      <path d="M14 30 Q10 28 11 24" stroke="#7A8689" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="11" cy="24" r="1.8" fill="#205C43" opacity={0.9} />
    </svg>
  );
}

const visuals = {
  butterfly: ButterflySVG,
  banana: BananaSVG,
  elephant: ElephantSVG,
} as const;

export default function CountableObjects({
  type,
  count,
  highlighted,
  highlightedIndices,
  onTap,
  revealed = true,
  interactive = false,
}: CountableProps) {
  const safeCount = Math.max(0, Math.floor(count));
  const effectiveHighlighted = revealed ? Math.max(0, Math.min(highlighted, safeCount)) : 0;
  const Visual = visuals[type];
  const tappable = interactive && typeof onTap === "function";
  const objectLabel = type === "butterfly" ? "butterflies" : `${type}s`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4" role="group" aria-label={`${safeCount} ${objectLabel}`}>
      {Array.from({ length: safeCount }).map((_, i) => {
        const isHighlighted = i < effectiveHighlighted || highlightedIndices?.has(i) === true;
        const label = `${type} ${i + 1} of ${safeCount}`;

        const inner = (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: i * 0.08, ease: "easeOut" }}
            className="relative"
          >
            <motion.div
              animate={
                isHighlighted
                  ? { scale: 1.05, transition: { type: "spring", stiffness: 420, damping: 16 } }
                  : { scale: 1 }
              }
              className={[
                "relative flex items-center justify-center rounded-2xl bg-white p-2.5",
                "border border-[#205C43]/10 soft-shadow transition-shadow",
                isHighlighted
                  ? "ring-4 ring-[#FFD166] shadow-[0_0_18px_rgba(255,209,102,0.55)] border-[#FFD166]/40"
                  : "opacity-100",
                tappable ? "cursor-pointer hover:border-[#FFD166]/50 active:scale-[0.98]" : "",
              ].join(" ")}
            >
              <Visual />
              {isHighlighted && tappable && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.06 }}
                  className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#205C43] px-1.5 text-xs font-extrabold leading-none text-white shadow-sm"
                >
                  {i + 1}
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        );

        return tappable ? (
          <button
            key={i}
            type="button"
            onClick={() => onTap?.(i)}
            aria-label={label}
            aria-pressed={highlightedIndices?.has(i) ?? false}
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E9]"
          >
            {inner}
          </button>
        ) : (
          <div key={i} aria-label={label} role="img">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
