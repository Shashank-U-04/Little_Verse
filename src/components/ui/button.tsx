import * as React from "react";
import { cn } from "@/lib/utils";

// LittleVerse jungle palette:
//   Primary  #205C43 - deep forest / Jungle
//   Coral    #FF8A72 - warm coral for accents / CTA variant
//   Cream    #FFF8EC - soft border / card edge (see card.tsx)
//   Secondary white + forest border - light canopy card

export type ButtonVariant = "primary" | "secondary" | "ghost" | "coral";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Primary: deep forest - the main jungle CTA
  primary:
    "bg-[#205C43] text-white shadow-[0_4px_14px_rgba(32,92,67,0.25)] hover:bg-[#184a36] active:bg-[#143d2d] border border-transparent",
  // Secondary: white canopy with forest border
  secondary:
    "bg-white text-[#205C43] border border-[#205C43]/20 shadow-sm hover:bg-[#FFF8EC] hover:border-[#205C43]/30 active:bg-[#FFF4D6]",
  // Coral: warm coral CTA - playful accent
  coral:
    "bg-[#FF8A72] text-white shadow-[0_4px_14px_rgba(255,138,114,0.35)] hover:bg-[#ff7a62] active:bg-[#f56e54] border border-transparent",
  // Ghost: transparent - for subtle / icon actions
  ghost:
    "bg-transparent text-[#205C43] border border-transparent hover:bg-[#205C43]/[0.06] active:bg-[#205C43]/[0.10]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1 text-sm gap-1",
  md: "min-h-10 px-5 py-2 text-[15px] gap-1.5",
  lg: "min-h-12 px-7 py-2.5 text-base gap-2",
  // xl: child-friendly target - min 56px, large text, generous padding
  xl: "min-h-14 px-8 py-3.5 text-lg gap-2 leading-none",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold tracking-tight " +
  "transition-colors duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "select-none whitespace-nowrap";

/**
 * Button - LittleVerse jungle design system.
 *
 * Server-compatible (no "use client"). Motion-friendly via CSS transitions;
 * callers using framer-motion can wrap with <motion.button> or pass
 * whileHover/whileTap through a motion wrapper - no motion import here.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
