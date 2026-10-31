import { ADVENTURES } from "@/features/learning/activities";

/** Every adventure page and its completion page is prerendered; unknown ids show a friendly not-found state. */
export function generateStaticParams(): { adventureId: string }[] {
  return Object.keys(ADVENTURES).map((adventureId) => ({ adventureId }));
}

export default function AdventureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
