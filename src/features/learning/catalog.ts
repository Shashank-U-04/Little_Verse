/** Learning goals a parent can ask LittleVerse to emphasise. */
export type FocusArea =
  | "numbers"
  | "letters"
  | "shapes_colors"
  | "animals_nature"
  | "healthy_food"
  | "listening_speaking";

export const FOCUS_AREAS: Record<FocusArea, { label: string; description: string; symbol: string }> = {
  numbers: { label: "Numbers & counting", description: "Counting, matching and number sense", symbol: "abc" },
  letters: { label: "Letters & phonics", description: "Letter sounds and early reading", symbol: "open-book" },
  shapes_colors: { label: "Shapes & colours", description: "Noticing shapes, colours and patterns", symbol: "artist-palette" },
  animals_nature: { label: "Animals & nature", description: "Curiosity about the living world", symbol: "parrot" },
  healthy_food: { label: "Healthy food", description: "Fruit, veggies and good habits", symbol: "strawberry" },
  listening_speaking: { label: "Listening & speaking", description: "Confidence to talk and follow along", symbol: "microphone" },
};

export const FOCUS_AREA_IDS = Object.keys(FOCUS_AREAS) as FocusArea[];

export function isFocusArea(value: unknown): value is FocusArea {
  return typeof value === "string" && Object.hasOwn(FOCUS_AREAS, value);
}

export type ModuleTheme = "jungle" | "fruit" | "safari" | "river" | "garden" | "sky";

export interface LearningModule {
  id: string;
  title: string;
  tagline: string;
  /** Fluent 3D symbol name in /public/symbols. */
  symbol: string;
  ageMin: number;
  ageMax: number;
  focusAreas: FocusArea[];
  minutes: number;
  theme: ModuleTheme;
  /** Playable modules link to an adventure; the rest are announced as coming soon. */
  adventureId: string | null;
}

export const MODULES: LearningModule[] = [
  {
    id: "jungle-counting",
    title: "Jungle Counting Adventure",
    tagline: "Help Miko count butterflies, bananas and elephants.",
    symbol: "butterfly",
    ageMin: 3,
    ageMax: 5,
    focusAreas: ["numbers", "animals_nature", "listening_speaking"],
    minutes: 5,
    theme: "jungle",
    adventureId: "jungle-counting",
  },
  {
    id: "fruit-basket",
    title: "Fruit Basket Count",
    tagline: "Count apples, mangoes and strawberries up to seven.",
    symbol: "apple",
    ageMin: 4,
    ageMax: 6,
    focusAreas: ["numbers", "healthy_food"],
    minutes: 5,
    theme: "fruit",
    adventureId: "fruit-basket",
  },
  {
    id: "safari-friends",
    title: "Safari Friends",
    tagline: "Count monkeys, parrots and lions on safari.",
    symbol: "lion",
    ageMin: 5,
    ageMax: 7,
    focusAreas: ["numbers", "animals_nature", "listening_speaking"],
    minutes: 5,
    theme: "safari",
    adventureId: "safari-friends",
  },
  {
    id: "river-count",
    title: "River Count Challenge",
    tagline: "Count frogs, fish and turtles all the way to ten.",
    symbol: "frog",
    ageMin: 6,
    ageMax: 8,
    focusAreas: ["numbers", "animals_nature"],
    minutes: 6,
    theme: "river",
    adventureId: "river-count",
  },
  {
    id: "alphabet-garden",
    title: "Alphabet Garden",
    tagline: "Grow a garden of letters and their sounds.",
    symbol: "abc",
    ageMin: 3,
    ageMax: 6,
    focusAreas: ["letters", "listening_speaking"],
    minutes: 5,
    theme: "garden",
    adventureId: null,
  },
  {
    id: "shape-safari",
    title: "Shape & Colour Safari",
    tagline: "Spot circles, stripes and rainbow colours.",
    symbol: "artist-palette",
    ageMin: 3,
    ageMax: 5,
    focusAreas: ["shapes_colors"],
    minutes: 5,
    theme: "sky",
    adventureId: null,
  },
  {
    id: "story-river",
    title: "Story River",
    tagline: "Listen to a jungle story and tell what happens next.",
    symbol: "open-book",
    ageMin: 5,
    ageMax: 8,
    focusAreas: ["listening_speaking", "letters"],
    minutes: 6,
    theme: "river",
    adventureId: null,
  },
  {
    id: "science-island",
    title: "Science Island",
    tagline: "Discover how plants grow and animals live.",
    symbol: "microscope",
    ageMin: 6,
    ageMax: 8,
    focusAreas: ["animals_nature"],
    minutes: 6,
    theme: "garden",
    adventureId: null,
  },
];

export function moduleForAdventure(adventureId: string): LearningModule | null {
  return MODULES.find((module) => module.adventureId === adventureId) ?? null;
}

export function fitsAge(module: LearningModule, age: number): boolean {
  return age >= module.ageMin && age <= module.ageMax;
}

/**
 * Modules for a child: age-appropriate ones first, playable before coming soon,
 * and within those, the ones matching the parent's focus areas first.
 */
export function modulesForChild(age: number, focus: FocusArea[]): { module: LearningModule; recommended: boolean }[] {
  return MODULES.filter((module) => fitsAge(module, age))
    .map((module) => ({ module, matches: module.focusAreas.filter((area) => focus.includes(area)).length }))
    .sort((a, b) => {
      const ready = Number(b.module.adventureId !== null) - Number(a.module.adventureId !== null);
      return ready !== 0 ? ready : b.matches - a.matches;
    })
    .map(({ module, matches }) => ({ module, recommended: matches > 0 && module.adventureId !== null }));
}
