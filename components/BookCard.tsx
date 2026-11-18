"use client";

import { Info, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Cover } from "./Cover";
import { ShelfButton } from "./ShelfButton";
import { RatingBadge } from "./Stars";
import { api } from "@/lib/api";
import { VIBE_META } from "@/lib/constants";
import type { ScoredBook, VibeAxis } from "@/lib/types";
import { authorHref, bookHref, cn } from "@/lib/utils";

/** Search / recommendation result with the grounded snippet, AI explanation and ranking breakdown. */
export function BookCard({ book, query, index = 0, showWhy = true }: { book: ScoredBook; query?: string; index?: number; showWhy?: boolean }) {
  const [why, setWhy] = useState<{ text: string; ai: boolean } | "loading" | null>(null);
  const [showRank, setShowRank] = useState(false);
  const summary = { id: book.id, title: book.title, authors: book.authors, cover: book.cover, year: book.year, rating: book.rating, ratings: book.ratings, category: book.category };

  const askWhy = async () => {
    if (!query || why === "loading") return;
    setWhy("loading");
    try {
      const r = await api.explain(book.id, query, book.snippet);
      setWhy({ text: r.explanation, ai: r.aiPowered });
    } catch {
      setWhy({ text: "Couldn't fetch an explanation right now.", ai: false });
    }
  };

  return (
    <article className="fade-up group relative flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-ink-2/30 sm:gap-5 sm:p-5" style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
      <Link href={bookHref(book.id)} className="w-24 shrink-0 sm:w-28" tabIndex={-1} aria-hidden>
        <Cover src={book.cover} title={book.title} author={book.authors[0]} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={bookHref(book.id)} className="font-display line-clamp-2 text-lg leading-snug font-semibold hover:text-accent sm:text-xl">
              {book.title}
            </Link>
            <p className="mt-0.5 truncate text-sm text-muted">
              by{" "}
              {book.authors.slice(0, 2).map((a, i) => (
                <span key={a}>
                  {i > 0 && ", "}
                  <Link href={authorHref(a)} className="hover:text-ink hover:underline">
                    {a}
                  </Link>
                </span>
              ))}
            </p>
          </div>
          <ShelfButton book={summary} variant="icon" className="shrink-0" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <RatingBadge rating={book.rating} ratings={book.ratings} />
          {book.year > 0 && <span>{book.year}</span>}
          {book.pages > 0 && <span>{book.pages} pages</span>}
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">{book.category}</span>
          {typeof book.similarity === "number" && book.similarity > 0 && <span className="text-ai-1">{Math.round(book.similarity * 100)}% match</span>}
        </div>
        {book.snippet && (
          <blockquote className="mt-3 border-l-2 border-accent/60 pl-3 text-sm leading-relaxed text-ink-2 italic">
            {book.snippet.length > 260 ? `${book.snippet.slice(0, 257)}…` : book.snippet}
          </blockquote>
        )}
        {why && why !== "loading" && (
          <p className="fade-up mt-3 rounded-xl bg-ai-soft px-3 py-2 text-sm leading-relaxed text-ink">
            <Sparkles className="mr-1.5 -mt-0.5 inline size-3.5 text-ai-1" />
            {why.text}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {showWhy && query && !(why && why !== "loading") && (
            <button
              type="button"
              onClick={askWhy}
              className="inline-flex items-center gap-1.5 rounded-full border border-ai-1/40 px-3 py-1 text-xs font-medium text-ai-1 transition hover:bg-ai-soft"
            >
              {why === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Why this book?
            </button>
          )}
          {book.ranking && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRank((s) => !s)}
                aria-expanded={showRank}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:text-ink"
              >
                <Info className="size-3.5" /> How was this ranked?
              </button>
              {showRank && <RankingPopover book={book} onClose={() => setShowRank(false)} />}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RankingPopover({ book, onClose }: { book: ScoredBook; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const r = book.ranking!;
  const rows: [string, string][] = [
    ["Meaning match (vector)", r.denseRank ? `#${r.denseRank} · cos ${r.denseScore?.toFixed(3)}` : "—"],
    ["Keyword match (BM25)", r.textRank ? `#${r.textRank} · ${r.textScore?.toFixed(2)}` : "—"],
    ["Fused score (RRF)", r.rrf.toFixed(3)],
    ["Vibe alignment", `×${r.vibeMultiplier.toFixed(2)}`],
    ["Reader-love prior", `×${r.qualityPrior.toFixed(2)}`],
    ...(r.genreAffinity !== undefined ? ([["Shared shelves", `${Math.round(r.genreAffinity * 100)}%`]] as [string, string][]) : []),
  ];
  return (
    <div ref={ref} className="fade-up absolute bottom-full left-0 z-30 mb-2 w-72 rounded-xl border border-line bg-surface p-4 text-xs shadow-xl">
      <p className="mb-2 font-semibold">Ranking breakdown</p>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="font-mono tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {Object.keys(r.vibeAdjustments).length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          {(Object.entries(r.vibeAdjustments) as [VibeAxis, number][]).map(([axis, v]) => (
            <div key={axis} className="flex justify-between">
              <span className="text-muted">{VIBE_META[axis].label}</span>
              <span className={cn("font-mono", v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {v >= 0 ? "+" : ""}
                {v.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 border-t border-line pt-2 font-mono text-[11px]">final = {r.final.toFixed(4)}</p>
    </div>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="flex gap-5 rounded-2xl border border-line bg-surface p-5">
      <div className="skeleton aspect-[2/3] w-28 shrink-0 rounded" />
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton mt-4 h-12 w-full rounded" />
      </div>
    </div>
  );
}
