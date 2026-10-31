/**
 * Generates the jungle scenery in public/scenery as static SVG files.
 *
 * Trees are grown, not drawn: a seeded random walk builds a tapered branching
 * skeleton, and each branch tip carries a cluster of individually placed and
 * shaded leaves. Seeds are fixed, so re-running produces identical files.
 *
 *   node --experimental-strip-types scripts/generate-scenery.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(import.meta.dirname, "..", "public", "scenery");

type Pt = { x: number; y: number };
type Rng = () => number;

function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number): string => String(Math.round(v * 10) / 10);

/** Extent of everything drawn since the last reset, so each file's viewBox fits its tree. */
const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
function track(x: number, y: number, pad = 0): void {
  bounds.minX = Math.min(bounds.minX, x - pad);
  bounds.minY = Math.min(bounds.minY, y - pad);
  bounds.maxX = Math.max(bounds.maxX, x + pad);
  bounds.maxY = Math.max(bounds.maxY, y + pad);
}
function resetBounds(): void {
  bounds.minX = bounds.minY = Infinity;
  bounds.maxX = bounds.maxY = -Infinity;
}
const range = (rand: Rng, lo: number, hi: number): number => lo + rand() * (hi - lo);
/** Centre-weighted value in [-1, 1]. */
const bell = (rand: Rng): number => (rand() + rand() + rand()) / 1.5 - 1;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}

function quadTangent(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const x = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const y = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/** One pointed leaf, from its stem along `angle`. */
function leaf(x: number, y: number, length: number, width: number, angle: number): string {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tipX = x + dx * length;
  const tipY = y + dy * length;
  const mx = x + dx * length * 0.45;
  const my = y + dy * length * 0.45;
  const ox = -dy * width;
  const oy = dx * width;
  track(x, y);
  track(tipX, tipY);
  track(mx + ox, my + oy);
  track(mx - ox, my - oy);
  return `M${n(x)} ${n(y)}Q${n(mx + ox)} ${n(my + oy)} ${n(tipX)} ${n(tipY)}Q${n(mx - ox)} ${n(my - oy)} ${n(x)} ${n(y)}Z`;
}

function circle(x: number, y: number, r: number): string {
  track(x, y, r);
  return `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/** A tapered quadratic limb as a closed polygon, optionally shifted sideways in world space. */
function limb(p0: Pt, c: Pt, p1: Pt, w0: number, w1: number, shiftX = 0, widthScale = 1): string {
  const steps = 10;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = quad(p0, c, p1, t);
    const tan = quadTangent(p0, c, p1, t);
    const w = lerp(w0, w1, t);
    const half = (w / 2) * widthScale;
    const sx = shiftX * w;
    left.push({ x: p.x - tan.y * half + sx, y: p.y + tan.x * half });
    right.push({ x: p.x + tan.y * half + sx, y: p.y - tan.x * half });
  }
  const pts = [...left, ...right.reverse()];
  for (const p of pts) track(p.x, p.y);
  return `M${pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}Z`;
}

type Palette = {
  /** Leaf tones from deepest shadow to sunlit. */
  leaves: [string, string, string, string, string];
  sun: string;
  deep: string;
  bark: string;
  barkLight: string;
  barkDark: string;
  vine: string;
};

const NEAR: Palette = {
  leaves: ["#0f3a20", "#18522b", "#246c34", "#3c8a3c", "#6fb04e"],
  sun: "#a9d86a",
  deep: "#0b2c17",
  bark: "#5b3f2c",
  barkLight: "#94704f",
  barkDark: "#2f1f15",
  vine: "#36552a",
};

const MID: Palette = {
  leaves: ["#1f4d33", "#2b6440", "#3a7c4b", "#579659", "#8bbd73"],
  sun: "#b3d98a",
  deep: "#1a432c",
  bark: "#66503f",
  barkLight: "#97806a",
  barkDark: "#3d2f25",
  vine: "#3e5f37",
};

type Cluster = { x: number; y: number; r: number };

type BroadleafOptions = {
  seed: number;
  width: number;
  height: number;
  trunkHeight: number;
  trunkWidth: number;
  crownWidth: number;
  depth: number;
  spread: number;
  leafLength: number;
  /** Leaves per unit of cluster area, relative to full single-layer cover. */
  density: number;
  palette: Palette;
  vines: number;
  buttress: boolean;
};

/** A rainforest broadleaf tree: buttressed trunk, branching limbs and a layered leaf crown. */
function broadleaf(o: BroadleafOptions): string {
  const rand = seeded(o.seed);
  const p = o.palette;
  const base: Pt = { x: o.width / 2, y: o.height - 6 };
  const bark: string[] = [];
  const barkLit: string[] = [];
  const barkShade: string[] = [];
  const furrows: string[] = [];
  const clusters: Cluster[] = [];
  const vineAnchors: Pt[] = [];

  const grow = (start: Pt, angle: number, length: number, w: number, depth: number): void => {
    const end: Pt = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
    const bend = range(rand, -0.35, 0.35);
    const mid: Pt = {
      x: (start.x + end.x) / 2 - Math.sin(angle) * length * bend * 0.4,
      y: (start.y + end.y) / 2 + Math.cos(angle) * length * bend * 0.4,
    };
    const endW = w * 0.62;
    bark.push(limb(start, mid, end, w, endW));
    bark.push(circle(end.x, end.y, endW / 2));
    barkLit.push(limb(start, mid, end, w, endW, 0.2, 0.32));
    barkShade.push(limb(start, mid, end, w, endW, -0.26, 0.26));
    if (w > 16) {
      for (const k of [-0.3, -0.12, 0.08, 0.28]) {
        const a = { x: start.x + k * w, y: start.y };
        const b = { x: end.x + k * endW, y: end.y };
        const c = { x: mid.x + k * lerp(w, endW, 0.5) + range(rand, -2, 2), y: mid.y };
        furrows.push(`M${n(a.x)} ${n(a.y)}Q${n(c.x)} ${n(c.y)} ${n(b.x)} ${n(b.y)}`);
      }
    }
    if (depth <= 1) vineAnchors.push(quad(start, mid, end, 0.6));
    if (depth === 0) {
      clusters.push({ x: end.x, y: end.y - o.leafLength * 0.4, r: o.crownWidth * range(rand, 0.11, 0.15) });
      return;
    }
    if (depth <= 1) {
      clusters.push({ ...quad(start, mid, end, 0.55), r: o.crownWidth * range(rand, 0.08, 0.11) });
    }
    const children = depth >= 2 && rand() > 0.45 ? 3 : 2;
    const spread = depth === o.depth ? o.spread : o.spread * 0.75;
    for (let i = 0; i < children; i++) {
      const offset = (i / (children - 1) - 0.5) * 2;
      // Limbs fan out but keep reaching for the light.
      const childAngle = lerp(angle + offset * spread + range(rand, -0.15, 0.15), -Math.PI / 2, 0.18);
      grow(end, childAngle, length * range(rand, 0.66, 0.8), endW, depth - 1);
    }
  };

  const lean = range(rand, -0.06, 0.06);
  grow(base, -Math.PI / 2 + lean, o.trunkHeight, o.trunkWidth, o.depth);

  // Buttress roots flare into the ground.
  const roots: string[] = [];
  if (o.buttress) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const reach = o.trunkWidth * range(rand, 0.9, 1.6) * (i === 0 ? 1 : 0.7);
        const rise = o.trunkWidth * range(rand, 1.1, 1.8);
        const x0 = base.x + side * o.trunkWidth * 0.3;
        roots.push(
          `M${n(x0)} ${n(base.y - rise)}Q${n(x0 + side * reach * 0.25)} ${n(base.y - rise * 0.2)} ${n(x0 + side * reach)} ${n(base.y + 2)}L${n(x0 - side * o.trunkWidth * 0.2)} ${n(base.y + 2)}Z`,
        );
      }
    }
  }

  // Shade relative to the whole crown as well as each cluster, lit from the upper right.
  const crownTop = Math.min(...clusters.map((c) => c.y - c.r));
  const crownBottom = Math.max(...clusters.map((c) => c.y + c.r));
  const crownMid = (crownTop + crownBottom) / 2;
  const crownHalf = (crownBottom - crownTop) / 2 || 1;

  const masses: string[] = [];
  const backTiers: string[][] = [[], [], [], [], []];
  const frontTiers: string[][] = [[], [], [], [], []];
  const sunlit: string[] = [];
  const leafW = o.leafLength * 0.42;
  for (const c of clusters) {
    masses.push(circle(c.x + range(rand, -4, 4), c.y + c.r * 0.2, c.r * 0.42));
    const count = Math.round(((Math.PI * c.r * c.r) / (o.leafLength * leafW * 0.6)) * o.density);
    for (let i = 0; i < count; i++) {
      const u = bell(rand);
      const v = bell(rand);
      const x = c.x + u * c.r * 1.1;
      const y = c.y + v * c.r * 0.85;
      const light =
        -v * 0.5 + u * 0.22 - ((y - crownMid) / crownHalf) * 0.4 + range(rand, -0.35, 0.35);
      const tier = Math.max(0, Math.min(4, Math.floor(((light + 1) / 2) * 5)));
      const outward = Math.atan2(y - c.y, x - c.x);
      const angle = outward + range(rand, -1.1, 1.1);
      const len = o.leafLength * range(rand, 0.75, 1.25);
      const shape = leaf(x, y, len, len * 0.42 * range(rand, 0.8, 1.15), angle);
      if (i < count * 0.3) backTiers[Math.max(0, tier - 1)]!.push(shape);
      else if (tier === 4 && rand() > 0.7) sunlit.push(shape);
      else frontTiers[tier]!.push(shape);
    }
  }

  // Lianas hang from the lower limbs.
  const vines: string[] = [];
  const vineLeaves: string[] = [];
  for (let i = 0; i < o.vines && vineAnchors.length > 0; i++) {
    const a = vineAnchors[Math.floor(rand() * vineAnchors.length)]!;
    const drop = range(rand, 0.18, 0.4) * o.height;
    const end = { x: a.x + range(rand, -30, 30), y: Math.min(o.height - 40, a.y + drop) };
    const c = { x: (a.x + end.x) / 2 + range(rand, -40, 40), y: (a.y + end.y) / 2 + drop * 0.2 };
    vines.push(`M${n(a.x)} ${n(a.y)}Q${n(c.x)} ${n(c.y)} ${n(end.x)} ${n(end.y)}`);
    for (let t = 0.12; t <= 1; t += 0.07) {
      const q = quad(a, c, end, t);
      const side = rand() > 0.5 ? 1 : -1;
      vineLeaves.push(leaf(q.x, q.y, o.leafLength * 0.55, o.leafLength * 0.3, Math.PI / 2 + side * range(rand, 0.5, 1.2)));
    }
  }

  const path = (d: string[], fill: string, extra = ""): string =>
    d.length ? `<path fill="${fill}"${extra} d="${d.join("")}"/>` : "";

  return fitted([
    path(masses, p.deep),
    ...backTiers.map((d, i) => path(d, p.leaves[i]!)),
    path(roots, p.bark),
    path(bark, p.bark),
    path(barkShade, p.barkDark, ' opacity="0.55"'),
    path(barkLit, p.barkLight, ' opacity="0.6"'),
    furrows.length
      ? `<path fill="none" stroke="${p.barkDark}" stroke-width="1.6" stroke-linecap="round" opacity="0.4" d="${furrows.join("")}"/>`
      : "",
    vines.length
      ? `<path fill="none" stroke="${p.vine}" stroke-width="2.6" stroke-linecap="round" d="${vines.join("")}"/>`
      : "",
    path(vineLeaves, p.leaves[2]),
    ...frontTiers.map((d, i) => path(d, p.leaves[i]!)),
    path(sunlit, p.sun),
  ]);
}

type FrondSet = { back: string[][]; front: string[][]; ribs: string[] };

/** Palm and fern fronds: a drooping rib lined with narrow leaflets. */
function fronds(
  rand: Rng,
  origin: Pt,
  count: number,
  length: number,
  arc: [number, number],
  droop: number,
  leafletScale: number,
): FrondSet {
  const back: string[][] = [[], [], [], [], []];
  const front: string[][] = [[], [], [], [], []];
  const ribs: string[] = [];
  for (let f = 0; f < count; f++) {
    const t0 = count === 1 ? 0.5 : f / (count - 1);
    const angle = lerp(arc[0], arc[1], t0) + range(rand, -0.12, 0.12);
    const len = length * range(rand, 0.8, 1.1);
    const sideways = Math.cos(angle);
    const end: Pt = {
      x: origin.x + Math.cos(angle) * len,
      y: origin.y + Math.sin(angle) * len + Math.abs(sideways) * len * droop,
    };
    const ctrl: Pt = {
      x: origin.x + Math.cos(angle) * len * 0.55,
      y: origin.y + Math.sin(angle) * len * 0.55 - len * 0.12,
    };
    ribs.push(`M${n(origin.x)} ${n(origin.y)}Q${n(ctrl.x)} ${n(ctrl.y)} ${n(end.x)} ${n(end.y)}`);
    // Fronds pointing straight up sit behind the crown; side fronds come forward.
    const isBack = Math.abs(sideways) < 0.35 && rand() > 0.3;
    const tiers = isBack ? back : front;
    for (let t = 0.1; t <= 1.0001; t += 0.035) {
      const at = quad(origin, ctrl, end, t);
      const tan = quadTangent(origin, ctrl, end, t);
      const tanAngle = Math.atan2(tan.y, tan.x);
      const size = len * leafletScale * Math.sin(Math.PI * Math.min(1, t * 1.05)) + 4;
      for (const side of [-1, 1]) {
        const a = lerp(tanAngle + side * 0.95, Math.PI / 2, 0.22) + range(rand, -0.08, 0.08);
        const light = (side === -1 ? 0.25 : -0.1) + (1 - t) * 0.2 + (isBack ? -0.45 : 0) + range(rand, -0.3, 0.3);
        const tier = Math.max(0, Math.min(4, Math.floor(((light + 1) / 2) * 5)));
        tiers[tier]!.push(leaf(at.x, at.y, size, size * 0.11 + 1, a));
      }
    }
  }
  return { back, front, ribs };
}

function palm(seed: number, width: number, height: number, curve: number, palette: Palette): string {
  const rand = seeded(seed);
  const base: Pt = { x: width / 2 - curve * 0.4, y: height - 6 };
  const crown: Pt = { x: width / 2 + curve * 0.6, y: height * 0.3 };
  const ctrl: Pt = { x: base.x + curve * 1.4, y: lerp(base.y, crown.y, 0.55) };
  const w0 = width * 0.07;
  const w1 = width * 0.04;
  const trunk = limb(base, ctrl, crown, w0, w1);
  const lit = limb(base, ctrl, crown, w0, w1, 0.22, 0.3);
  const shade = limb(base, ctrl, crown, w0, w1, -0.28, 0.24);
  const rings: string[] = [];
  for (let t = 0.03; t < 0.98; t += 0.028) {
    const at = quad(base, ctrl, crown, t);
    const tan = quadTangent(base, ctrl, crown, t);
    const half = lerp(w0, w1, t) / 2;
    const sag = range(rand, 2, 4);
    rings.push(
      `M${n(at.x + tan.y * half)} ${n(at.y - tan.x * half)}Q${n(at.x + tan.x * sag)} ${n(at.y + sag)} ${n(at.x - tan.y * half)} ${n(at.y + tan.x * half)}`,
    );
  }
  const set = fronds(rand, crown, 13, width * 0.48, [-Math.PI * 1.02, Math.PI * 0.02], 0.55, 0.2);
  const nuts = [0, 1, 2, 3].map((i) => circle(crown.x + (i - 1.5) * 9 + range(rand, -2, 2), crown.y + 10 + range(rand, 0, 6), 9));
  const path = (d: string[], fill: string, extra = ""): string =>
    d.length ? `<path fill="${fill}"${extra} d="${d.join("")}"/>` : "";
  return fitted([
    ...set.back.map((d, i) => path(d, palette.leaves[i]!)),
    `<path fill="none" stroke="${palette.leaves[1]}" stroke-width="2.4" stroke-linecap="round" d="${set.ribs.join("")}"/>`,
    path([trunk], "#8a6a4c"),
    path([shade], palette.barkDark, ' opacity="0.45"'),
    path([lit], "#c4a27a", ' opacity="0.55"'),
    `<path fill="none" stroke="#4b3626" stroke-width="2" stroke-linecap="round" opacity="0.55" d="${rings.join("")}"/>`,
    path(nuts, "#6b4a2b"),
    path(nuts.map((_, i) => circle(crown.x + (i - 1.5) * 9 + 2.5, crown.y + 8, 3)), "#9b7550", ' opacity="0.8"'),
    ...set.front.map((d, i) => path(d, palette.leaves[i]!)),
  ]);
}

/** A banana plant: broad paddle leaves with a pale midrib and wind tears. */
function bananaPlant(seed: number, width: number, height: number): string {
  const rand = seeded(seed);
  const base: Pt = { x: width / 2, y: height - 6 };
  const parts: string[] = [];
  const stemTop: Pt = { x: base.x + range(rand, -6, 6), y: height * 0.52 };
  parts.push(`<path fill="#6f8f3a" d="${limb(base, { x: base.x + 4, y: lerp(base.y, stemTop.y, 0.5) }, stemTop, width * 0.09, width * 0.06)}"/>`);
  parts.push(`<path fill="#9fb85a" opacity="0.6" d="${limb(base, { x: base.x + 4, y: lerp(base.y, stemTop.y, 0.5) }, stemTop, width * 0.09, width * 0.06, 0.2, 0.3)}"/>`);
  const angles = [-2.6, -2.15, -1.75, -1.4, -1.05, -0.6, -0.25];
  angles.forEach((a0, i) => {
    const a = a0 + range(rand, -0.1, 0.1);
    const len = width * range(rand, 0.38, 0.48);
    const start = { x: stemTop.x, y: stemTop.y + i * 2 };
    const end = { x: start.x + Math.cos(a) * len, y: start.y + Math.sin(a) * len + Math.abs(Math.cos(a)) * len * 0.45 };
    const ctrl = { x: start.x + Math.cos(a) * len * 0.6, y: start.y + Math.sin(a) * len * 0.6 - len * 0.1 };
    const w = len * 0.26;
    const top: Pt[] = [];
    const bottom: Pt[] = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const at = quad(start, ctrl, end, t);
      const tan = quadTangent(start, ctrl, end, t);
      const half = w * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85)) * (t < 0.08 ? t / 0.08 : 1);
      top.push({ x: at.x - tan.y * half, y: at.y + tan.x * half });
      bottom.push({ x: at.x + tan.y * half, y: at.y - tan.x * half });
    }
    const spine = Array.from({ length: 15 }, (_, k) => quad(start, ctrl, end, k / 14));
    const half = (pts: Pt[]): string => `M${pts.forEach((q) => track(q.x, q.y)) ?? ""}${[...pts, ...[...spine].reverse()].map((q) => `${n(q.x)} ${n(q.y)}`).join("L")}Z`;
    const shadeTone = i % 2 === 0 ? "#2f7a33" : "#3a8a3a";
    parts.push(`<path fill="${shadeTone}" d="${half(top)}"/>`);
    parts.push(`<path fill="#5aa845" d="${half(bottom)}"/>`);
    const tears: string[] = [];
    for (let k = 0; k < 6; k++) {
      const t = range(rand, 0.25, 0.9);
      const at = quad(start, ctrl, end, t);
      const tan = quadTangent(start, ctrl, end, t);
      const side = rand() > 0.5 ? 1 : -1;
      const reach = w * 0.9 * Math.sin(Math.PI * t);
      tears.push(`M${n(at.x - side * tan.y * reach * 0.3)} ${n(at.y + side * tan.x * reach * 0.3)}L${n(at.x - side * tan.y * reach + tan.x * 6)} ${n(at.y + side * tan.x * reach + tan.y * 6)}`);
    }
    parts.push(`<path fill="none" stroke="#bfe39a" stroke-width="1.4" opacity="0.7" d="${tears.join("")}"/>`);
    parts.push(`<path fill="none" stroke="#d6eaa8" stroke-width="2.4" stroke-linecap="round" d="M${n(start.x)} ${n(start.y)}Q${n(ctrl.x)} ${n(ctrl.y)} ${n(end.x)} ${n(end.y)}"/>`);
  });
  // A small hand of bananas under the crown.
  const hand: string[] = [];
  for (let k = 0; k < 5; k++) {
    const x = stemTop.x + 10 + k * 6;
    const y = stemTop.y + 26 + Math.abs(k - 2) * 3;
    hand.push(leaf(x, y, 26, 6, -1.2 + k * 0.08));
  }
  parts.push(`<path fill="#e7c64a" stroke="#a88a24" stroke-width="0.8" d="${hand.join("")}"/>`);
  return fitted(parts);
}

function fern(seed: number, width: number, height: number, palette: Palette): string {
  const rand = seeded(seed);
  const origin: Pt = { x: width / 2, y: height - 4 };
  const set = fronds(rand, origin, 11, height * 0.95, [-Math.PI * 0.95, -Math.PI * 0.05], 0.35, 0.16);
  const path = (d: string[], fill: string): string => (d.length ? `<path fill="${fill}" d="${d.join("")}"/>` : "");
  return fitted([
    ...set.back.map((d, i) => path(d, palette.leaves[i]!)),
    `<path fill="none" stroke="${palette.leaves[0]}" stroke-width="1.6" d="${set.ribs.join("")}"/>`,
    ...set.front.map((d, i) => path(d, palette.leaves[i]!)),
  ]);
}

/** Foreground strip: undergrowth, grass blades, ferns and a few flowers along the bottom edge. */
function undergrowth(seed: number, width: number, height: number): string {
  const rand = seeded(seed);
  const parts: string[] = [];
  parts.push(
    `<defs><linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6b2f"/><stop offset="1" stop-color="#173f1d"/></linearGradient></defs>`,
  );
  let ground = `M0 ${height}`;
  for (let x = 0; x <= width; x += 40) ground += `L${x} ${n(height * 0.62 + Math.sin(x / 130) * 10 + range(rand, -6, 6))}`;
  ground += `L${width} ${height}Z`;
  parts.push(`<path fill="url(#soil)" d="${ground}"/>`);
  const tones = ["#174a22", "#225f2a", "#2f7832", "#4a9a3e", "#7cc25a"];
  const blades: string[][] = [[], [], [], [], []];
  for (let i = 0; i < width * 0.55; i++) {
    const x = range(rand, -10, width + 10);
    const baseY = height * range(rand, 0.6, 1.02);
    const h = range(rand, 24, 70) * (baseY / height);
    const lean = range(rand, -0.5, 0.5);
    const w = range(rand, 2, 4.5);
    const tipX = x + lean * h;
    const tipY = baseY - h;
    const tier = Math.max(0, Math.min(4, Math.floor(rand() * 3 + ((baseY / height) - 0.6) * 5)));
    blades[tier]!.push(
      `M${n(x - w)} ${n(baseY)}Q${n(x + lean * h * 0.4)} ${n(baseY - h * 0.6)} ${n(tipX)} ${n(tipY)}Q${n(x + lean * h * 0.3 + w * 0.5)} ${n(baseY - h * 0.5)} ${n(x + w)} ${n(baseY)}Z`,
    );
  }
  blades.forEach((d, i) => parts.push(`<path fill="${tones[i]}" d="${d.join("")}"/>`));
  for (let i = 0; i < 5; i++) {
    const fx = range(rand, 20, width - 20);
    const fy = height * range(rand, 0.72, 0.95);
    const set = fronds(rand, { x: fx, y: fy }, 7, range(rand, 70, 110), [-Math.PI * 0.92, -Math.PI * 0.08], 0.5, 0.15);
    set.back.forEach((d, k) => d.length && parts.push(`<path fill="${tones[k]}" d="${d.join("")}"/>`));
    set.front.forEach((d, k) => d.length && parts.push(`<path fill="${tones[k]}" d="${d.join("")}"/>`));
  }
  const flowers = ["#ff7a8a", "#ffd166", "#ffffff", "#c58cff", "#ff9f43"];
  for (let i = 0; i < 26; i++) {
    const x = range(rand, 10, width - 10);
    const y = height * range(rand, 0.7, 0.96);
    const color = flowers[Math.floor(rand() * flowers.length)]!;
    const petals = Array.from({ length: 5 }, (_, k) => circle(x + Math.cos((k / 5) * Math.PI * 2) * 3.4, y + Math.sin((k / 5) * Math.PI * 2) * 3.4, 2.8)).join("");
    parts.push(`<path fill="${color}" d="${petals}"/><circle cx="${n(x)}" cy="${n(y)}" r="1.8" fill="#ffd166"/>`);
  }
  return svg(width, height, parts, "xMidYMax slice");
}

/** Hanging lianas with heart-shaped leaves, for the top edge of a scene. */
function hangingVines(seed: number, width: number, height: number): string {
  const rand = seeded(seed);
  const stems: string[] = [];
  const leaves: string[][] = [[], [], [], [], []];
  for (let i = 0; i < 9; i++) {
    const x = range(rand, 0, width);
    const drop = range(rand, 0.35, 1) * height;
    const a = { x, y: -4 };
    const end = { x: x + range(rand, -40, 40), y: drop };
    const c = { x: x + range(rand, -60, 60), y: drop * 0.6 };
    stems.push(`M${n(a.x)} ${n(a.y)}Q${n(c.x)} ${n(c.y)} ${n(end.x)} ${n(end.y)}`);
    for (let t = 0.05; t <= 1; t += 0.06) {
      const q = quad(a, c, end, t);
      for (const side of [-1, 1]) {
        if (rand() > 0.75) continue;
        const ang = Math.PI / 2 + side * range(rand, 0.6, 1.3);
        const size = range(rand, 14, 22) * (1 - t * 0.35);
        const tier = Math.floor(rand() * 5);
        // Heart shape: two overlapping lobes.
        leaves[tier]!.push(leaf(q.x, q.y, size, size * 0.55, ang - 0.25) + leaf(q.x, q.y, size, size * 0.55, ang + 0.25));
      }
    }
  }
  // A canopy fringe along the very top edge.
  const fringe: string[][] = [[], [], [], [], []];
  for (let i = 0; i < width / 4; i++) {
    const x = range(rand, -20, width + 20);
    const y = range(rand, -10, 28);
    const tier = Math.floor(range(rand, 0, 5));
    fringe[tier]!.push(leaf(x, y, range(rand, 22, 38), range(rand, 8, 14), range(rand, 0.4, Math.PI - 0.4)));
  }
  return svg(width, height, [
    ...fringe.map((d, i) => (d.length ? `<path fill="${NEAR.leaves[i]}" d="${d.join("")}"/>` : "")),
    `<path fill="none" stroke="${NEAR.vine}" stroke-width="3" stroke-linecap="round" d="${stems.join("")}"/>`,
    ...leaves.map((d, i) => (d.length ? `<path fill="${NEAR.leaves[i]}" d="${d.join("")}"/>` : "")),
  ], "xMidYMin slice");
}

/** Hazy rainforest canopy silhouettes for distant layers. */
function canopyBand(
  rand: Rng,
  width: number,
  top: number,
  bottom: number,
  tones: [string, string, string],
  bumps: number,
  leafSize: number,
): string {
  const blobs: string[] = [];
  const leaves: string[][] = [[], [], []];
  for (let i = 0; i < bumps; i++) {
    const x = range(rand, -40, width + 40);
    const r = range(rand, 22, 60);
    const y = range(rand, top + r, bottom);
    blobs.push(circle(x, y, r));
    // Texture each crown with small leaves, lighter towards the sunlit top.
    for (let k = 0; k < r * 0.4; k++) {
      const u = bell(rand);
      const v = bell(rand);
      const tier = v < -0.25 ? 2 : v < 0.25 ? 1 : 0;
      leaves[tier]!.push(leaf(x + u * r, y + v * r * 0.9, leafSize * range(rand, 0.7, 1.2), leafSize * 0.4, range(rand, 0, Math.PI * 2)));
    }
  }
  return `<path fill="${tones[0]}" d="${blobs.join("")}M0 ${n(bottom)}H${width}V${n(bottom + 400)}H0Z"/>${leaves
    .map((d, i) => `<path fill="${tones[i]}" d="${d.join("")}"/>`)
    .join("")}`;
}

function backdrop(seed: number): string {
  const rand = seeded(seed);
  const W = 1600;
  const H = 900;
  const parts: string[] = [];
  parts.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb8ec"/><stop offset="0.45" stop-color="#a9dcf6"/><stop offset="0.7" stop-color="#e3f4f2"/><stop offset="1" stop-color="#fdf1d2"/></linearGradient>
<radialGradient id="sun" cx="0.78" cy="0.12" r="0.35"><stop offset="0" stop-color="#fff7d1" stop-opacity="1"/><stop offset="0.25" stop-color="#ffe9a3" stop-opacity="0.7"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef8f4" stop-opacity="0"/><stop offset="0.5" stop-color="#eef8f4" stop-opacity="0.75"/><stop offset="1" stop-color="#eef8f4" stop-opacity="0"/></linearGradient>
<linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fae55"/><stop offset="1" stop-color="#3f8a3f"/></linearGradient>
<linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8f5"/><stop offset="1" stop-color="#5fb4d6"/></linearGradient>
<linearGradient id="rays" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#sun)"/>`);
  // Clouds.
  for (let i = 0; i < 6; i++) {
    const cx = range(rand, 60, W - 60);
    const cy = range(rand, 50, 220);
    const puffs = Array.from({ length: 6 }, () => circle(cx + range(rand, -70, 70), cy + range(rand, -12, 12), range(rand, 22, 42))).join("");
    parts.push(`<path fill="#ffffff" opacity="0.85" filter="url(#soft)" d="${puffs}"/>`);
  }
  // Mountains fading into haze.
  parts.push(`<path fill="#9fc7c8" opacity="0.8" d="M0 470L140 360L260 420L420 300L560 400L700 330L860 420L1010 310L1180 400L1320 340L1460 410L1600 350V900H0Z"/>`);
  parts.push(`<path fill="#86b6ae" opacity="0.85" d="M0 500L180 430L330 470L500 400L660 470L820 420L980 480L1140 410L1300 470L1450 430L1600 470V900H0Z"/>`);
  parts.push(canopyBand(rand, W, 430, 540, ["#6f9f86", "#86b29a", "#a9cbb4"], 70, 9));
  parts.push(`<rect y="470" width="${W}" height="140" fill="url(#mist)"/>`);
  parts.push(canopyBand(rand, W, 500, 600, ["#3f7d55", "#55925f", "#7fb276"], 80, 12));
  // Sun shafts through the canopy.
  parts.push(`<path fill="url(#rays)" opacity="0.6" d="M1180 0L1260 0L1020 620L900 620ZM1320 0L1370 0L1220 620L1140 620ZM1060 0L1110 0L760 620L690 620Z"/>`);
  // Meadow and river.
  parts.push(`<path fill="url(#meadow)" d="M0 600Q400 570 800 590T1600 585V900H0Z"/>`);
  const riverCentre = (y: number): number => 810 + Math.sin((y - 598) / 70) * 55;
  const riverHalf = (y: number): number => lerp(40, 190, (y - 598) / 302);
  const leftBank: string[] = [];
  const rightBank: string[] = [];
  for (let y = 598; y <= 900; y += 10) {
    leftBank.push(`${n(riverCentre(y) - riverHalf(y))} ${y}`);
    rightBank.unshift(`${n(riverCentre(y) + riverHalf(y))} ${y}`);
  }
  parts.push(`<path fill="url(#river)" d="M${leftBank.join("L")}L${rightBank.join("L")}Z"/>`);
  const shimmer: string[] = [];
  for (let i = 0; i < 26; i++) {
    const y = range(rand, 610, 890);
    const x = riverCentre(y) + range(rand, -0.7, 0.5) * riverHalf(y);
    shimmer.push(`M${n(x)} ${n(y)}h${n(range(rand, 10, 30) * (y / 700))}`);
  }
  parts.push(`<path stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.6" d="${shimmer.join("")}"/>`);
  // Small mid-distance trees on the far bank.
  const tufts: string[][] = [[], [], [], [], []];
  for (let i = 0; i < 900; i++) {
    const x = range(rand, 0, W);
    const y = range(rand, 595, 900);
    if (Math.abs(x - riverCentre(y)) < riverHalf(y) + 4) continue;
    const s = 4 + ((y - 595) / 305) * 9;
    const tier = Math.floor(rand() * 5);
    tufts[tier]!.push(leaf(x, y, s * 1.6, s * 0.35, -Math.PI / 2 + range(rand, -0.6, 0.6)));
  }
  const tuftTones = ["#2f6e35", "#3b7f3b", "#4f9443", "#6aa94e", "#8cc265"];
  tufts.forEach((d, i) => parts.push(`<path fill="${tuftTones[i]}" d="${d.join("")}"/>`));
  return svg(W, H, parts, "xMidYMax slice");
}

/** Wraps a free-standing plant in a viewBox that fits everything drawn, with its base on the bottom edge. */
function fitted(body: string[]): string {
  const pad = 4;
  const x = Math.floor(bounds.minX - pad);
  const y = Math.floor(bounds.minY - pad);
  const w = Math.ceil(bounds.maxX + pad) - x;
  const h = Math.ceil(bounds.maxY) - y;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body.join("")}</svg>\n`;
}

function svg(width: number, height: number, body: string[], aspect = "xMidYMax meet"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="${aspect}">${body.join("")}</svg>\n`;
}

mkdirSync(OUT_DIR, { recursive: true });

const make = (draw: () => string): string => {
  resetBounds();
  return draw();
};

const files: Record<string, string> = {
  "backdrop.svg": make(() => backdrop(7)),
  "tree-kapok.svg": make(() => broadleaf({
    seed: 11, width: 900, height: 1100, trunkHeight: 470, trunkWidth: 64, crownWidth: 860,
    depth: 4, spread: 0.72, leafLength: 34, density: 0.3, palette: NEAR, vines: 6, buttress: true,
  })),
  "tree-fig.svg": make(() => broadleaf({
    seed: 23, width: 760, height: 900, trunkHeight: 300, trunkWidth: 52, crownWidth: 700,
    depth: 4, spread: 0.62, leafLength: 32, density: 0.3, palette: NEAR, vines: 4, buttress: true,
  })),
  "tree-mid.svg": make(() => broadleaf({
    seed: 37, width: 520, height: 620, trunkHeight: 220, trunkWidth: 34, crownWidth: 480,
    depth: 3, spread: 0.6, leafLength: 24, density: 0.4, palette: MID, vines: 2, buttress: false,
  })),
  "palm-tall.svg": make(() => palm(41, 560, 1000, 40, NEAR)),
  "palm-short.svg": make(() => palm(53, 480, 720, -30, MID)),
  "banana-plant.svg": make(() => bananaPlant(61, 420, 520)),
  "fern.svg": make(() => fern(71, 360, 260, NEAR)),
  "undergrowth.svg": make(() => undergrowth(83, 1600, 240)),
  "hanging-vines.svg": make(() => hangingVines(97, 1600, 320)),
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(OUT_DIR, name), content);
  console.log(`${name.padEnd(20)} ${(content.length / 1024).toFixed(1)} KB`);
}
