import Image from "next/image";
import { cn } from "@/lib/utils";

type Symbol3DProps = {
  /** File name in /public/symbols, without extension. */
  name: string;
  size?: number;
  /** Empty for decorative symbols. */
  alt?: string;
  className?: string;
  priority?: boolean;
};

/** A Fluent 3D emoji symbol, shipped locally as a small WebP. */
export function Symbol3D({ name, size = 48, alt = "", className, priority = false }: Symbol3DProps) {
  return (
    <Image
      src={`/symbols/${name}.webp`}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      draggable={false}
      aria-hidden={alt === "" ? true : undefined}
      className={cn("select-none object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export default Symbol3D;
