import { Flame, Gem, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookTile } from "@/components/BookTile";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { MoodGrid } from "@/components/MoodGrid";
import { catalogStats, hiddenGems, popularBooks, topRatedBooks } from "@/lib/server/books";
import { CATEGORIES } from "@/lib/constants";
import { cn, formatCount } from "@/lib/utils";
import { SurpriseButton } from "./SurpriseButton";

export const metadata: Metadata = { title: "Discover" };

const VIEWS = [
  { key: "popular", label: "Most read", icon: Flame },
  { key: "top", label: "Top rated", icon: Trophy },
  { key: "gems", label: "Hidden gems", icon: Gem },
] as const;

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const view = (VIEWS.find((v) => v.key === sp.view)?.key ?? "popular") as (typeof VIEWS)[number]["key"];
  const category = typeof sp.category === "string" && (CATEGORIES as readonly string[]).includes(sp.category) ? sp.category : undefined;

  const [booksResult, statsResult] = await Promise.allSettled([
    view === "popular"
      ? popularBooks({ category, limit: 48 })
      : view === "top"
        ? topRatedBooks({ category, limit: 48, minRatings: category ? 2000 : 20000 })
        : hiddenGems({ category, limit: 48 }),
    catalogStats(),
  ]);
  const error = booksResult.status === "rejected";
  const books = booksResult.status === "fulfilled" ? booksResult.value : [];
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const counts = new Map(stats?.categories.map((c) => [c.name, c.count]));
  const href = (patch: { view?: string; category?: string | null }) => {
    const p = new URLSearchParams();
    const v = patch.view ?? view;
    const c = patch.category === undefined ? category : patch.category;
    if (v !== "popular") p.set("view", v);
    if (c) p.set("category", c);
    const s = p.toString();
    return `/discover${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Discover</h1>
          <p className="mt-2 text-muted">Browse by mood, genre or what everyone&apos;s reading — or let fate decide.</p>
        </div>
        <SurpriseButton category={category} />
      </div>

      {error && <DatabaseNotice />}

      <section className="mt-10">
        <h2 className="font-display mb-4 text-2xl font-semibold">Moods</h2>
        <MoodGrid />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category">
          <Link href={href({ category: null })} className={cn("rounded-full border px-4 py-1.5 text-sm", !category ? "border-ink bg-ink text-paper" : "border-line hover:border-ink-2")}>
            Everything
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={href({ category: c })} className={cn("rounded-full border px-4 py-1.5 text-sm", category === c ? "border-ink bg-ink text-paper" : "border-line hover:border-ink-2")}>
              {c}
              {counts.get(c) ? <span className="ml-1.5 text-xs opacity-60">{formatCount(counts.get(c)!)}</span> : null}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex gap-1 border-b border-line">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href({ view: v.key })}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium",
                view === v.key ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              <v.icon className="size-4" /> {v.label}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {books.map((b, i) => (
            <BookTile key={b.id} book={b} className="w-auto sm:w-auto" note={view === "popular" ? `#${i + 1} most read` : undefined} />
          ))}
        </div>
        {!books.length && !error && <p className="py-16 text-center text-muted">Nothing here yet.</p>}
      </section>
    </div>
  );
}
