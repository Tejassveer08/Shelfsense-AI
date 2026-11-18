import type { Metadata } from "next";
import { Suspense } from "react";
import { TasteMatch } from "./TasteMatch";

export const metadata: Metadata = {
  title: "Taste Match",
  description: "Blend the books you loved into a taste profile and find their closest relatives — or ask for “like these, but darker.”",
};

export default function TastePage() {
  return (
    <Suspense>
      <TasteMatch />
    </Suspense>
  );
}
