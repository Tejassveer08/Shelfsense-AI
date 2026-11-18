"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { BookTile, BookTileSkeleton } from "./BookTile";
import type { BookSummary } from "@/lib/types";

/** Horizontally scrolling shelf of books with a heading. */
export function Rail({
  title,
  subtitle,
  books,
  href,
  icon,
  ranked = false,
  loading = false,
  empty,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  books: BookSummary[];
  href?: string;
  icon?: ReactNode;
  ranked?: boolean;
  loading?: boolean;
  empty?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  if (!loading && !books.length && !empty) return null;
  return (
    <section className="py-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold sm:text-[28px]">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href && (
            <Link href={href} className="mr-2 text-sm font-medium text-muted hover:text-accent">
              See all
            </Link>
          )}
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="hidden size-9 place-items-center rounded-full border border-line hover:bg-surface-2 sm:grid">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="hidden size-9 place-items-center rounded-full border border-line hover:bg-surface-2 sm:grid">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:px-6">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <BookTileSkeleton key={i} />)
          : books.length
            ? books.map((b, i) => <BookTile key={b.id} book={b} rank={ranked ? i + 1 : undefined} className={ranked ? "ml-3 snap-start" : "snap-start"} />)
            : empty}
      </div>
    </section>
  );
}
