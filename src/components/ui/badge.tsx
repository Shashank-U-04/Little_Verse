import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "sunshine" | "leaf" | "sky" | "coral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  // Sunshine — warm yellow, e.g. "Ages 4-6", "New"
  sunshine: "bg-[#FFF4D6] text-[#684800] border-[#FFE9A8]",
  // Leaf — soft jungle green, e.g. "3-5 min"
  leaf: "bg-[#E8F5E9] text-[#205C43] border-[#C8E6C9]",
  // Sky — light blue, e.g. "Story", "Music"
  sky: "bg-[#E3F2FD] text-[#1a4a6e] border-[#BBDEFB]",
  // Coral — warm coral pill, e.g. "Popular", "New"
  coral: "bg-[#FFE4DE] text-[#8a3a2a] border-[#FFCCBE]",
};

/**
 * Badge — small pill badge for LittleVerse jungle design system.
 * Used for "Ages 4-6", "3-5 min", "New" etc.
 * Server-compatible (no "use client").
 */
export function Badge({
  variant = "sunshine",
  className,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide leading-none whitespace-nowrap",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export default Badge;
