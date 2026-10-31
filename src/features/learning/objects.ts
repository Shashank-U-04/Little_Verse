import type { ObjectType } from "./types.ts";

/** Every countable thing an adventure can show, with its wording and 3D symbol. */
export const OBJECTS: Record<ObjectType, { singular: string; plural: string; symbol: string }> = {
  butterfly: { singular: "butterfly", plural: "butterflies", symbol: "butterfly" },
  banana: { singular: "banana", plural: "bananas", symbol: "banana" },
  elephant: { singular: "elephant", plural: "elephants", symbol: "elephant" },
  apple: { singular: "apple", plural: "apples", symbol: "apple" },
  mango: { singular: "mango", plural: "mangoes", symbol: "mango" },
  strawberry: { singular: "strawberry", plural: "strawberries", symbol: "strawberry" },
  monkey: { singular: "monkey", plural: "monkeys", symbol: "monkey" },
  parrot: { singular: "parrot", plural: "parrots", symbol: "parrot" },
  lion: { singular: "lion", plural: "lions", symbol: "lion" },
  frog: { singular: "frog", plural: "frogs", symbol: "frog" },
  fish: { singular: "fish", plural: "fish", symbol: "fish" },
  turtle: { singular: "turtle", plural: "turtles", symbol: "turtle" },
};

export const OBJECT_TYPES = Object.keys(OBJECTS) as ObjectType[];

export function isObjectType(value: unknown): value is ObjectType {
  return typeof value === "string" && Object.hasOwn(OBJECTS, value);
}

export function pluralOf(type: ObjectType): string {
  return OBJECTS[type].plural;
}
