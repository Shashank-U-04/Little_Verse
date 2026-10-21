import type { CSSProperties } from "react";

type Props = {
  variant?: "hero" | "compact";
};

export default function JungleScene({ variant = "hero" }: Props) {
  const isHero = variant === "hero";

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 w-full overflow-hidden",
        isHero ? "min-h-[60vh]" : "h-32",
      ].join(" ")}
      style={{ zIndex: 0 } as CSSProperties}
    >
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #8BD3F7 0%, #C7EBFF 42%, #E0F2FE 72%, #FFF8E9 100%)",
        }}
      />

      {/* distant hills */}
      <svg
        viewBox="0 0 1200 260"
        className="absolute left-0 right-0 top-[18%] h-[34%] w-full opacity-[0.95]"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 180 Q 180 70, 360 140 T 720 120 T 1020 150 T 1200 110 L 1200 260 L 0 260 Z"
          fill="#205C43"
          opacity={0.14}
        />
        <path
          d="M0 200 Q 220 110, 420 170 T 780 145 T 1200 175 L 1200 260 L 0 260 Z"
          fill="#205C43"
          opacity={0.10}
        />
      </svg>

      {/* soft sun glow */}
      <div
        className="absolute rounded-full blur-[42px]"
        style={{
          width: isHero ? 220 : 120,
          height: isHero ? 220 : 120,
          right: isHero ? "6%" : "8%",
          top: isHero ? "8%" : "10%",
          background: "radial-gradient(circle, rgba(255,209,102,0.55) 0%, rgba(255,209,102,0) 70%)",
        }}
      />

      {/* foliage clusters — back layer */}
      <div className="absolute inset-0">
        {/* left cluster */}
        <div className="absolute -left-6 top-[38%] hidden sm:block" aria-hidden>
          <TreeCluster scale={isHero ? 1 : 0.62} />
        </div>
        {/* right cluster */}
        <div className="absolute -right-8 top-[34%] hidden sm:block" aria-hidden>
          <TreeCluster scale={isHero ? 0.92 : 0.58} mirror />
        </div>
        {/* center small */}
        {isHero && (
          <div className="absolute left-[48%] top-[36%] hidden lg:block opacity-90" aria-hidden>
            <TreeCluster scale={0.52} />
          </div>
        )}
      </div>

      {/* winding path */}
      <svg
        viewBox="0 0 1200 420"
        className="absolute bottom-0 left-0 w-full"
        style={{ height: isHero ? "46%" : "58%" }}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M -10 360 C 220 310, 380 380, 560 300 C 740 220, 880 260, 1210 170 L 1210 420 L -10 420 Z"
          fill="#FFF8E9"
          stroke="#D8C4A6"
          strokeWidth={3}
        />
        {/* dashed center line of path */}
        <path
          d="M 20 355 C 240 308, 400 365, 565 298 C 730 232, 880 248, 1180 178"
          stroke="#E8D9B8"
          strokeWidth={2}
          strokeDasharray="10 10"
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
        {/* path edge shading */}
        <path
          d="M -10 362 C 220 312, 380 382, 560 302 C 740 222, 880 262, 1210 172"
          stroke="#C8B49A"
          strokeWidth={1}
          fill="none"
          opacity={0.45}
        />
      </svg>

      {/* foreground foliage / bushes along path edges */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-1 sm:px-3 pointer-events-none">
        <div className="flex items-end gap-1 sm:gap-2">
          <Bush size={isHero ? 56 : 30} color="#77B96A" />
          <Bush size={isHero ? 42 : 24} color="#205C43" compact />
          <Bush size={isHero ? 48 : 26} color="#77B96A" />
        </div>
        <div className="flex items-end gap-1 sm:gap-2">
          <Bush size={isHero ? 44 : 24} color="#205C43" compact />
          <Bush size={isHero ? 58 : 30} color="#77B96A" />
          <Bush size={isHero ? 38 : 22} color="#205C43" compact />
        </div>
      </div>

      {/* flowers */}
      <div className="absolute inset-0" aria-hidden>
        {isHero ? (
          <>
            <Flower left="16%" top="62%" size={10} color="#FF8A72" />
            <Flower left="72%" top="58%" size={8} color="#FFD166" />
            <Flower left="44%" top="68%" size={9} color="#FF8A72" />
            <Flower left="86%" top="72%" size={7} color="#FFD166" />
            <Flower left="28%" top="74%" size={8} color="#FF8A72" />
            <Flower left="61%" top="78%" size={7} color="#FFD166" />
          </>
        ) : (
          <>
            <Flower left="18%" top="54%" size={7} color="#FF8A72" />
            <Flower left="76%" top="48%" size={6} color="#FFD166" />
          </>
        )}
      </div>

      {/* butterflies — tiny SVGs */}
      {isHero && (
        <div className="absolute inset-0" aria-hidden>
          <span className="absolute" style={{ left: "22%", top: "24%" }}>
            <TinyButterfly />
          </span>
          <span className="absolute" style={{ left: "78%", top: "20%" }}>
            <TinyButterfly alt />
          </span>
          <span className="absolute hidden sm:block" style={{ left: "52%", top: "28%" }}>
            <TinyButterfly />
          </span>
        </div>
      )}

      {/* bottom jungle floor fade so content above stays legible */}
      <div
        className="absolute inset-x-0 bottom-0 h-10 opacity-[0.06]"
        style={{ background: "linear-gradient(180deg, transparent, #205C43)" }}
      />
    </div>
  );
}

function TreeCluster({ scale = 1, mirror = false }: { scale?: number; mirror?: boolean }) {
  return (
    <div
      className="relative"
      style={{
        width: 180 * scale,
        height: 220 * scale,
        transform: mirror ? "scaleX(-1)" : undefined,
      }}
    >
      {/* trunk */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: 14 * scale,
          width: 18 * scale,
          height: 86 * scale,
          background: "linear-gradient(180deg, #6B4E2A 0%, #4A3418 100%)",
        }}
      />
      {/* foliage blobs — layered rounded shapes */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: 74 * scale,
          width: 120 * scale,
          height: 86 * scale,
          background: "#205C43",
          borderRadius: "54% 46% 48% 52% / 58% 52% 48% 42%",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          left: 12 * scale,
          bottom: 92 * scale,
          width: 74 * scale,
          height: 62 * scale,
          background: "#77B96A",
          borderRadius: "52% 48% 44% 56% / 50% 55% 45% 50%",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          right: 14 * scale,
          bottom: 98 * scale,
          width: 68 * scale,
          height: 56 * scale,
          background: "#77B96A",
          borderRadius: "48% 52% 56% 44% / 55% 50% 50% 45%",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-90"
        style={{
          bottom: 126 * scale,
          width: 86 * scale,
          height: 52 * scale,
          background: "#1a4a36",
          borderRadius: "50% 50% 44% 56% / 60% 60% 40% 40%",
        }}
      />
    </div>
  );
}

function Bush({ size, color, compact }: { size: number; color: string; compact?: boolean }) {
  return (
    <div
      aria-hidden
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: compact ? size * 0.72 : size * 0.82,
        background: color,
        borderRadius: "52% 48% 44% 56% / 58% 42% 58% 42%",
        opacity: compact ? 0.92 : 1,
        boxShadow: "inset 0 -6px 12px rgba(18,61,48,0.18)",
      }}
    />
  );
}

function Flower({ left, top, size, color }: { left: string; top: string; size: number; color: string }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
      style={{
        left,
        top,
        width: size,
        height: size,
        background: color,
        border: "1.5px solid white",
      }}
    >
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{ width: size * 0.36, height: size * 0.36 }}
      />
    </span>
  );
}

function TinyButterfly({ alt }: { alt?: boolean }) {
  return (
    <svg
      viewBox="0 0 28 22"
      width="22"
      height="18"
      className="overflow-visible drop-shadow-sm"
      style={{ transform: alt ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <ellipse cx="9" cy="8" rx="7" ry="5.5" fill={alt ? "#8BD3F7" : "#FF8A72"} opacity="0.95" />
      <ellipse cx="19" cy="8" rx="7" ry="5.5" fill="#FFD166" opacity="0.95" />
      <ellipse cx="9.5" cy="15" rx="4.5" ry="3.5" fill={alt ? "#8BD3F7" : "#FF8A72"} opacity="0.88" />
      <ellipse cx="18.5" cy="15" rx="4.5" ry="3.5" fill="#FFD166" opacity={0.88} />
      <ellipse cx="14" cy="11" rx="1.6" ry="6" fill="#24352B" />
    </svg>
  );
}
