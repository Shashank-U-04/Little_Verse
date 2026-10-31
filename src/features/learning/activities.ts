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

function challenge(
  id: string,
  skillId: Challenge["skillId"],
  prompt: string,
  objectType: Challenge["objectType"],
  count: number,
  options: number[],
  hintSequence: string[],
  difficulty: Challenge["difficulty"],
): Challenge {
  return { id, skillId, prompt, objectType, objectCount: count, expectedAnswer: count, options, hintSequence, difficulty };
}

export const fruitBasketAdventure: AdventureDefinition = {
  id: "fruit-basket",
  title: "Fruit Basket Count",
  subtitle: "Fill Miko's basket with juicy fruit",
  duration: "5 min",
  objective: "Count groups of fruit up to seven",
  challenges: [
    challenge("f1-apples", "counting", "Miko picked some shiny apples. How many apples are there?", "apple", 6, [4, 5, 6, 7], [
      "Good try! Let's look again.",
      "Touch each apple as you count: 1, 2, 3, 4, 5, 6!",
      "There are six apples. Can you find six?",
    ], 1),
    challenge("f2-mangoes", "counting", "Some mangoes fell from the tree! How many mangoes can you see?", "mango", 4, [3, 4, 5, 6], [
      "Almost! Count them once more.",
      "Let's count slowly together: 1, 2, 3, 4.",
      "There are four mangoes. Can you tap four?",
    ], 1),
    challenge("f3-strawberries", "number_recognition", "Can you find the number that shows how many strawberries there are?", "strawberry", 7, [5, 6, 7, 8], [
      "Nice try! Count each strawberry.",
      "Tap each strawberry and say the number: 1 … 7!",
      "There are seven strawberries. Find the number seven!",
    ], 2),
  ],
};

export const safariFriendsAdventure: AdventureDefinition = {
  id: "safari-friends",
  title: "Safari Friends",
  subtitle: "Count the animals on a jungle safari",
  duration: "5 min",
  objective: "Count animal groups up to eight and match the number",
  challenges: [
    challenge("s1-monkeys", "counting", "The monkeys are swinging in the trees! How many monkeys are there?", "monkey", 6, [5, 6, 7, 8], [
      "Ooh, close! Let's count again.",
      "Point to each monkey: 1, 2, 3, 4, 5, 6!",
      "There are six monkeys. Can you find six?",
    ], 2),
    challenge("s2-parrots", "counting", "Listen to the parrots squawk! How many parrots can you count?", "parrot", 8, [6, 7, 8, 9], [
      "Good try! Count every parrot.",
      "Count with me, nice and slow: 1 … 8!",
      "There are eight parrots. Tap eight!",
    ], 2),
    challenge("s3-lions", "number_recognition", "Roar! Which number tells how many lions are resting?", "lion", 5, [3, 4, 5, 6], [
      "Not quite — have another look!",
      "Tap each lion: 1, 2, 3, 4, 5.",
      "There are five lions. Find the number five!",
    ], 2),
  ],
};

export const riverCountAdventure: AdventureDefinition = {
  id: "river-count",
  title: "River Count Challenge",
  subtitle: "Count the creatures of the jungle river",
  duration: "6 min",
  objective: "Count larger groups up to ten with confidence",
  challenges: [
    challenge("r1-frogs", "counting", "Hop, hop! How many frogs are sitting by the river?", "frog", 9, [7, 8, 9, 10], [
      "So close! Count them once more.",
      "Count in twos if you like: 2, 4, 6, 8 … and one more!",
      "There are nine frogs. Can you find nine?",
    ], 3),
    challenge("r2-fish", "counting", "Splash! How many fish are swimming in the river?", "fish", 10, [8, 9, 10, 11], [
      "Good try! Let's count every fish.",
      "Tap each fish as you count all the way to ten.",
      "There are ten fish. Find ten!",
    ], 3),
    challenge("r3-turtles", "number_recognition", "Which number shows how many turtles are swimming home?", "turtle", 7, [5, 6, 7, 8], [
      "Nearly! Count each turtle again.",
      "Tap each turtle: 1, 2, 3, 4, 5, 6, 7.",
      "There are seven turtles. Find the number seven!",
    ], 3),
  ],
};

/** Every playable adventure, keyed by id. The voice server only accepts these ids. */
export const ADVENTURES: Record<string, AdventureDefinition> = {
  [jungleCountingAdventure.id]: jungleCountingAdventure,
  [fruitBasketAdventure.id]: fruitBasketAdventure,
  [safariFriendsAdventure.id]: safariFriendsAdventure,
  [riverCountAdventure.id]: riverCountAdventure,
};

export function getAdventure(id: string): AdventureDefinition | null {
  return Object.hasOwn(ADVENTURES, id) ? ADVENTURES[id]! : null;
}
