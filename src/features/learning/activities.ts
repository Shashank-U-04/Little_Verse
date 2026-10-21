import type { AdventureDefinition, Challenge } from "./types.ts";

const c1: Challenge = {
  id: "c1-butterflies",
  skillId: "counting",
  prompt: "Look at the butterflies! Can you count them?",
  objectType: "butterfly",
  objectCount: 3,
  expectedAnswer: 3,
  options: [2, 3, 4, 5],
  hintSequence: [
    "Good try! Let's try again.",
    "Let's count together — one, two, three!",
    "See — there are three butterflies. Can you say three?",
  ],
  difficulty: 1,
};

const c2: Challenge = {
  id: "c2-bananas",
  skillId: "counting",
  prompt: "How many bananas can you see?",
  objectType: "banana",
  objectCount: 5,
  expectedAnswer: 5,
  options: [3, 4, 5, 6],
  hintSequence: [
    "Take another look!",
    "Let's point to each banana as we count: 1…2…3…4…5",
    "There are five bananas. Let's count them together!",
  ],
  difficulty: 2,
};

const c3: Challenge = {
  id: "c3-elephants",
  skillId: "number_recognition",
  prompt: "Can you help me find four elephants?",
  objectType: "elephant",
  objectCount: 4,
  expectedAnswer: 4,
  options: [2, 3, 4, 5],
  hintSequence: [
    "Not quite — count again!",
    "Tap each elephant and count with me!",
    "We have four elephants. Can you show me four?",
  ],
  difficulty: 2,
};

export const title = "Jungle Counting Adventure";
export const subtitle = "Count with Miko in the Jungle";
export const duration = "5 min";
export const objective = "Practice counting and number recognition with Miko";

export const jungleCountingAdventure: AdventureDefinition = {
  id: "jungle-counting",
  title,
  subtitle,
  duration,
  objective,
  challenges: [c1, c2, c3],
};