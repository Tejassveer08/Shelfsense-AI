"use client";

import Link from "next/link";
import { Cover } from "./Cover";
import { ShelfButton } from "./ShelfButton";
import { RatingBadge } from "./Stars";
import type { BookSummary } from "@/lib/types";
import { bookHref, cn } from "@/lib/utils";

/** Compact cover-first tile used in rails and grids. */
export function BookTile({ book, className, rank, note }: { book: BookSummary; className?: string; rank?: number; note?: string }) {
  return (
    <div className={cn("group relative w-36 shrink-0 sm:w-40", className)}>
      <Link href={bookHref(book.id)} className="block focus-visible:outline-none">
        <div className="relative transition-transform duration-300 group-hover:-translate-y-1">
          <Cover src={book.cover} title={book.title} author={book.authors[0]} />
          {rank !== undefined && (
            <span className="font-display absolute -bottom-3 -left-2 text-5xl leading-none font-bold text-ink drop-shadow-[0_2px_0_var(--paper)]">
              {rank}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-0.5">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-accent">{book.title}</h3>
          <p className="truncate text-xs text-muted">{book.authors.join(", ")}</p>
          {note ? <p className="text-xs text-muted">{note}</p> : <RatingBadge rating={book.rating ?? 0} ratings={book.ratings} />}
        </div>
      </Link>
      <div className="absolute top-2 right-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
        <ShelfButton book={book} variant="icon" />
      </div>
    </div>
  );
}

export function BookTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-36 shrink-0 sm:w-40", className)}>
      <div className="skeleton aspect-[2/3] rounded-[4px]" />
      <div className="skeleton mt-3 h-4 w-4/5 rounded" />
      <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
    </div>
  );
}
