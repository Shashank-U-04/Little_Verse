"use client";

import { motion } from "motion/react";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { OBJECTS } from "@/features/learning/objects";
import type { ObjectType } from "@/features/learning/types";

type CountableProps = {
  type: ObjectType;
  count: number;
  highlighted: number;
  highlightedIndices?: Set<number>;
  onTap?: (index: number) => void;
  revealed?: boolean;
  interactive?: boolean;
};

/** Small, fixed tilts so a group looks scattered rather than lined up. */
const TILTS = [-8, 6, -3, 9, -6, 4, -10, 7, -2, 5];

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
  const tappable = interactive && typeof onTap === "function";
  const { singular, plural, symbol } = OBJECTS[type];
  // Bigger groups get slightly smaller symbols so ten still fit on a phone.
  const size = safeCount > 7 ? 52 : safeCount > 5 ? 60 : 72;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4" role="group" aria-label={`${safeCount} ${plural}`}>
      {Array.from({ length: safeCount }).map((_, i) => {
        const isHighlighted = i < effectiveHighlighted || highlightedIndices?.has(i) === true;
        const label = `${singular} ${i + 1} of ${safeCount}`;

        const inner = (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: i * 0.07 }}
            className="relative"
          >
            <motion.div
              animate={isHighlighted ? { scale: 1.1, rotate: 0, y: -4 } : { scale: 1, rotate: TILTS[i % TILTS.length], y: 0 }}
              whileHover={tappable ? { scale: 1.12, rotate: 0 } : undefined}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
              className={[
                "relative flex items-center justify-center rounded-3xl p-2 transition-colors",
                isHighlighted ? "bg-[#FFF4D6] ring-4 ring-[#FFD166] shadow-[0_0_22px_rgba(255,209,102,0.7)]" : "bg-white/70 shadow-[0_6px_14px_rgba(18,61,48,0.12)]",
                tappable ? "cursor-pointer" : "",
              ].join(" ")}
            >
              <Symbol3D name={symbol} size={size} className="drop-shadow-[0_6px_6px_rgba(0,0,0,0.18)]" />
              {isHighlighted && tappable && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.06 }}
                  className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#205C43] px-1.5 font-display text-sm font-bold leading-none text-white shadow"
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
            className="rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E9]"
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
