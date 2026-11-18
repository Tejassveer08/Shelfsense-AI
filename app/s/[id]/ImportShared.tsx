"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { shelf } from "@/lib/shelf";
import type { ShelfEntry } from "@/lib/types";

export function ImportShared({ books }: { books: Omit<ShelfEntry, "addedAt">[] }) {
  const [added, setAdded] = useState<number | null>(null);
  return (
    <button
      type="button"
      onClick={() => setAdded(shelf.importMany(books.map((b) => ({ ...b, status: "want" as const, myRating: undefined }))))}
      className="inline-flex items-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
    >
      {added === null ? <Plus className="size-4" /> : <Check className="size-4" />}
      {added === null ? "Add all to my Want to read" : `Added ${added} new books`}
    </button>
  );
}
