import type { Metadata } from "next";
import { Suspense } from "react";
import { BookCardSkeleton } from "@/components/BookCard";
import { SearchView } from "./SearchView";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q ? `“${q.slice(0, 60)}”` : "Search" };
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-24 sm:px-6 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <SearchView />
    </Suspense>
  );
}
