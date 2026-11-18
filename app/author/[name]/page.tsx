import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import { booksByAuthor, getAuthor } from "@/lib/server/books";
import { formatCount, searchHref } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/author/[name]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).name) };
}

export default async function AuthorPage({ params }: PageProps<"/author/[name]">) {
  const name = decodeURIComponent((await params).name);
  const [author, books] = await Promise.all([getAuthor(name).catch(() => null), booksByAuthor(name, { limit: 48 })]);
  if (!books.length) notFound();
  const totalRatings = author?.total_ratings ?? books.reduce((s, b) => s + b.ratings, 0);
  const avg = author?.avg_rating ?? books.reduce((s, b) => s + b.rating, 0) / books.length;
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-center">
        <div className="font-display grid size-24 shrink-0 place-items-center rounded-full bg-ink text-3xl font-semibold text-paper">{initials}</div>
        <div className="flex-1">
          <p className="text-sm font-medium tracking-wider text-muted uppercase">Author</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">{name}</h1>
          <p className="mt-3 text-sm text-muted">
            {author?.books ?? books.length} books in the catalogue · {formatCount(totalRatings)} ratings · ★ {avg.toFixed(2)} average
            {author?.categories?.length ? ` · ${author.categories.slice(0, 3).join(", ")}` : ""}
          </p>
        </div>
        <Link
          href={searchHref(`like ${books[0].title}`)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110 sm:self-center"
        >
          <Sparkles className="size-4" /> Fans also love…
        </Link>
      </header>
      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {books.map((b, i) => (
          <BookCard key={b.id} book={{ ...b, snippet: b.description.split(/(?<=[.!?])\s/)[0] }} index={i} showWhy={false} />
        ))}
      </div>
    </div>
  );
}
