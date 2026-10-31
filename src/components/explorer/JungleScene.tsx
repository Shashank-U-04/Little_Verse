"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useCallback, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact" | "backdrop";

type Props = {
  variant?: Variant;
  /** Layers drift with the pointer on the landing hero. */
  interactive?: boolean;
  className?: string;
};

/** Intrinsic sizes of the generated files in /public/scenery (see scripts/generate-scenery.ts). */
const ART = {
  backdrop: { w: 1600, h: 900 },
  kapok: { w: 1609, h: 1509 },
  fig: { w: 1036, h: 1009 },
  mid: { w: 523, h: 655 },
  palmTall: { w: 525, h: 947 },
  palmShort: { w: 496, h: 694 },
  banana: { w: 345, h: 428 },
  fern: { w: 461, h: 253 },
  undergrowth: { w: 1600, h: 240 },
  vines: { w: 1600, h: 320 },
} as const;

const FILES: Record<keyof typeof ART, string> = {
  backdrop: "backdrop",
  kapok: "tree-kapok",
  fig: "tree-fig",
  mid: "tree-mid",
  palmTall: "palm-tall",
  palmShort: "palm-short",
  banana: "banana-plant",
  fern: "fern",
  undergrowth: "undergrowth",
  vines: "hanging-vines",
};

function Art({ name, className, priority = false }: { name: keyof typeof ART; className?: string; priority?: boolean }) {
  return (
    <Image
      src={`/scenery/${FILES[name]}.svg`}
      alt=""
      width={ART[name].w}
      height={ART[name].h}
      priority={priority}
      unoptimized
      draggable={false}
      className={cn("pointer-events-none max-w-none select-none", className)}
    />
  );
}

function Layer({ depth, x, y, className, children }: { depth: number; x: MotionValue<number>; y: MotionValue<number>; className?: string; children: React.ReactNode }) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth * 0.4);
  return (
    <motion.div style={{ x: tx, y: ty }} className={cn("absolute inset-0", className)}>
      {children}
    </motion.div>
  );
}

/**
 * Layered rainforest scenery: a hazy backdrop, grown trees on both sides,
 * undergrowth along the bottom and lianas from the top. Purely decorative.
 */
export default function JungleScene({ variant = "hero", interactive = false, className }: Props) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 18 });
  const y = useSpring(rawY, { stiffness: 60, damping: 18 });

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!interactive || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      rawX.set(((event.clientX - rect.left) / rect.width - 0.5) * -24);
      rawY.set(((event.clientY - rect.top) / rect.height - 0.5) * -16);
    },
    [interactive, rawX, rawY],
  );

  const full = variant === "hero";
  const soft = variant === "backdrop";

  return (
    <div
      aria-hidden="true"
      onPointerMove={interactive ? onPointerMove : undefined}
      className={cn("absolute inset-0 overflow-hidden", interactive ? "" : "pointer-events-none", className)}
    >
      <Layer depth={0.25} x={x} y={y} className="-inset-x-6">
        <Art name="backdrop" priority className="absolute inset-0 h-full w-full object-cover object-bottom" />
      </Layer>

      {!soft && (
        <Layer depth={0.5} x={x} y={y}>
          <Art name="mid" className="sway-slow absolute bottom-[6%] left-[24%] hidden h-[38%] w-auto opacity-90 md:block" />
          <Art name="palmShort" className="sway absolute bottom-[5%] right-[22%] hidden h-[48%] w-auto opacity-95 lg:block" />
        </Layer>
      )}

      <Layer depth={0.85} x={x} y={y}>
        <Art
          name="kapok"
          className={cn(
            "sway-slow absolute bottom-0 w-auto",
            full ? "-left-[38%] h-[108%] sm:-left-[26%] lg:-left-[14%]" : "-left-[30%] h-[118%] sm:-left-[18%]",
            soft && "opacity-80",
          )}
        />
        <Art
          name="fig"
          className={cn(
            "sway absolute bottom-0 w-auto",
            full ? "-right-[34%] h-[88%] sm:-right-[20%] lg:-right-[9%]" : "-right-[30%] h-[95%] sm:-right-[14%]",
            soft && "opacity-80",
          )}
        />
        {!soft && (
          <>
            <Art name="palmTall" className="sway absolute bottom-0 left-[6%] hidden h-[78%] w-auto sm:block lg:left-[14%]" />
            <Art name="banana" className="sway-fast absolute bottom-[2%] right-[8%] h-[30%] w-auto sm:right-[18%]" />
          </>
        )}
      </Layer>

      <Layer depth={1.2} x={x} y={y}>
        <Art name="undergrowth" className={cn("absolute -bottom-1 left-1/2 w-[140%] max-w-none -translate-x-1/2 sm:w-[112%]", full ? "h-[22%]" : "h-[18%]")} />
        {full && <Art name="fern" className="sway-fast absolute -bottom-2 left-[34%] h-[18%] w-auto" />}
        {!soft && (
          <Art name="vines" className={cn("absolute -top-1 left-1/2 w-[160%] max-w-none -translate-x-1/2 sm:w-[110%]", full ? "h-[26%]" : "h-[30%]")} />
        )}
      </Layer>

      {full && <Fireflies />}
    </div>
  );
}

const FIREFLIES = [
  { left: "18%", top: "38%", d: 0 },
  { left: "32%", top: "58%", d: 1.2 },
  { left: "64%", top: "44%", d: 0.6 },
  { left: "78%", top: "62%", d: 2.1 },
  { left: "52%", top: "30%", d: 1.6 },
  { left: "88%", top: "36%", d: 0.3 },
];

function Fireflies() {
  return (
    <>
      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className="firefly absolute h-1.5 w-1.5 rounded-full bg-[#FFF3B0] shadow-[0_0_10px_3px_rgba(255,236,150,0.8)]"
          style={{ left: f.left, top: f.top, animationDelay: `${f.d}s` }}
        />
      ))}
    </>
  );
}
