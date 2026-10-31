import { Symbol3D } from "@/components/ui/Symbol3D";
import type { AvatarId } from "@/features/family/profile";
import { cn } from "@/lib/utils";

const RINGS = [
  "from-[#FFD166] to-[#FF8A72]",
  "from-[#8BD3F7] to-[#77B96A]",
  "from-[#C58CFF] to-[#FF8A72]",
  "from-[#77B96A] to-[#FFD166]",
];

/** A child's explorer buddy inside a bright ring. */
export function ChildAvatar({ avatar, size = 48, className, tone = 0 }: { avatar: AvatarId; size?: number; className?: string; tone?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-sm", RINGS[tone % RINGS.length], className)}
      style={{ width: size, height: size }}
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
        <Symbol3D name={avatar} size={Math.round(size * 0.72)} />
      </span>
    </span>
  );
}
