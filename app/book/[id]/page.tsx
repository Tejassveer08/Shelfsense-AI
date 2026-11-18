import { BookOpen, Calendar, Dna, Layers, Sparkles, Wand2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Cover } from "@/components/Cover";
import { Rail } from "@/components/Rail";
import { ShelfButton } from "@/components/ShelfButton";
import { RatingBadge } from "@/components/Stars";
import { booksByAuthor, getBook, seriesBooks } from "@/lib/server/books";
import { similarBooks } from "@/lib/server/recommend";
import { EMOTION_META } from "@/lib/constants";
import type { Emotion } from "@/lib/types";
import { asSummary, authorHref, formatCount, searchHref } from "@/lib/utils";
import { Description, DnaPanel, MyRating, YourMatch } from "./BookClient";

const loadBook = cache((id: string) => getBook(decodeURIComponent(id)));

export async function generateMetadata({ params }: PageProps<"/book/[id]">): Promise<Metadata> {
  const book = await loadBook((await params).id).catch(() => null);
  if (!book) return { title: "Book not found" };
  return {
    title: `${book.title} by ${book.authors[0]}`,
    description: book.description.slice(0, 160),
    openGraph: { images: book.cover ? [book.cover] : undefined },
  };
}

export default async function BookPage({ params }: PageProps<"/book/[id]">) {
  const { id } = await params;
  const book = await loadBook(id);
  if (!book) notFound();

  const series = book.series?.[0];
  const [similar, byAuthor, inSeries] = await Promise.all([
    similarBooks(book.id, { limit: 18 }).catch(() => []),
    booksByAuthor(book.authors[0], { exclude: book.id, limit: 18 }).catch(() => []),
    series ? seriesBooks(series.name).catch(() => []) : Promise.resolve([]),
  ]);
  const summary = asSummary(book);
  const topEmotions = (Object.entries(book.emotions) as [Emotion, number][])
    .filter(([k]) => k !== "neutral")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: book.authors.map((name) => ({ "@type": "Person", name })),
    image: book.cover || undefined,
    numberOfPages: book.pages || undefined,
    isbn: book.isbn13 || undefined,
    datePublished: book.year ? String(book.year) : undefined,
    aggregateRating: book.ratings ? { "@type": "AggregateRating", ratingValue: book.rating, ratingCount: book.ratings } : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="grid gap-8 py-10 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr_320px] lg:gap-12">
        <div className="mx-auto w-48 md:w-full">
          <Cover src={book.cover} title={book.title} author={book.authors[0]} sizes="lg" priority className="rounded-md" />
          <div className="mt-6 flex flex-col items-center gap-4 md:items-stretch">
            <ShelfButton book={summary} variant="large" className="justify-center" />
            <div className="flex justify-center">
              <MyRating book={summary} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {series && (
            <Link href={searchHref(series.name)} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              <Layers className="size-4" />
              {series.name}
              {series.position ? ` · Book ${series.position}` : ""}
            </Link>
          )}
          <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">{book.title}</h1>
          <p className="mt-3 text-lg text-ink-2">
            by{" "}
            {book.authors.map((a, i) => (
              <span key={a}>
                {i > 0 && ", "}
                <Link href={authorHref(a)} className="font-medium hover:text-accent hover:underline">
                  {a}
                </Link>
              </span>
            ))}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <RatingBadge rating={book.rating} ratings={book.ratings} className="text-sm" />
            {book.year > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" /> {book.year}
              </span>
            )}
            {book.pages > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" /> {book.pages} pages
              </span>
            )}
            {book.publisher && <span>{book.publisher}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/discover?category=${encodeURIComponent(book.category)}`} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-paper">
              {book.category}
            </Link>
            {topEmotions.map(([k]) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
                <span className="size-2 rounded-full" style={{ background: EMOTION_META[k].color }} />
                {EMOTION_META[k].label}
              </span>
            ))}
            {book.genres.slice(0, 6).map((g) => (
              <Link key={g} href={searchHref(g)} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-ink-2">
                {g}
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Description text={book.description || "No description available."} />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href={searchHref(`like ${book.title}`)} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              <Sparkles className="size-4" /> Find books like this
            </Link>
            <Link href={`/taste?seed=${encodeURIComponent(book.id)}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink-2">
              <Wand2 className="size-4" /> Like this, but…
            </Link>
          </div>
        </div>

        <aside className="space-y-4 md:col-span-2 lg:col-span-1">
          <YourMatch book={book} />
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <p className="font-semibold">At a glance</p>
            <dl className="mt-3 space-y-2">
              {[
                ["Readers", book.ratings ? formatCount(book.ratings) : "—"],
                ["Reader-love score", book.quality ? `${book.quality.toFixed(2)} / 5` : "—"],
                ["Mood", book.vibes.dark_light < -0.12 ? "Dark" : book.vibes.dark_light > 0.12 ? "Light" : "Balanced"],
                ["Pace", book.vibes.pacing < -0.12 ? "Fast" : book.vibes.pacing > 0.12 ? "Slow-burn" : "Steady"],
                ["ISBN", book.isbn13 || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </section>

      <section className="border-t border-line py-10">
        <h2 className="font-display mb-1 flex items-center gap-2 text-2xl font-semibold sm:text-[28px]">
          <Dna className="size-5 text-accent" /> Book DNA
        </h2>
        <p className="mb-6 text-sm text-muted">Emotional fingerprint and vibe, computed from the book&apos;s description with sentence embeddings.</p>
        <DnaPanel book={book} />
      </section>

      {inSeries.length > 1 && <Rail title={`${/^the\s/i.test(series!.name) ? series!.name : `The ${series!.name}`} series`} books={inSeries} />}
      <Rail title="If you like this, try…" subtitle="Nearest neighbours in meaning across the whole catalogue" icon={<Sparkles className="size-5 text-ai-1" />} books={similar.map(asSummary)} href={searchHref(`like ${book.title}`)} />
      {byAuthor.length > 0 && <Rail title={`More by ${book.authors[0]}`} books={byAuthor.map(asSummary)} href={authorHref(book.authors[0])} />}
    </div>
  );
}
