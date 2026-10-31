import { Suspense } from "react";
import AdventureRoute from "./AdventureRoute";

export default function AdventurePage() {
  // The route reads its id in the browser; the boundary keeps the prerendered shell static.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#FFF8E9]" />}>
      <AdventureRoute />
    </Suspense>
  );
}
