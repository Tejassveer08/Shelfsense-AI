"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components/Header";
import { BookDNARadar } from "@/components/BookDNARadar";
import { getBook, getSimilarBooks } from "@/lib/api";
import { Star, BookOpen, Calendar, ArrowLeft, BookmarkCheck, Bookmark, Sparkles, Loader2 } from "lucide-react";
import { addBookToShelf, getShelfBooks } from "@/lib/shelf";
import { ShelfCategory } from "@/lib/types";

export default function BookDetailPage({ params }: { params: Promise<{ isbn13: string }> }) {
  const resolvedParams = use(params);
  const isbn13 = resolvedParams.isbn13;

  const { data: book, isLoading, error } = useQuery({
    queryKey: ["bookDetail", isbn13],
    queryFn: () => getBook(isbn13),
  });

  const { data: similarData } = useQuery({
    queryKey: ["bookSimilar", isbn13],
    queryFn: () => getSimilarBooks({ isbn13s: [isbn13], limit: 4 }),
    enabled: !!book,
  });

  const [shelfStatus, setShelfStatus] = React.useState<ShelfCategory | null>(null);

  React.useEffect(() => {
    if (book) {
      const shelf = getShelfBooks();
      const found = shelf.find((b) => b.book.isbn13 === book.isbn13);
      setShelfStatus(found ? found.shelf : null);
    }
  }, [book]);

  const handleShelfChange = (category: ShelfCategory) => {
    if (!book) return;
    addBookToShelf(book, category);
    setShelfStatus(category);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library Explorer</span>
        </Link>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-amber)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Retrieving volume from archives...</p>
          </div>
        ) : error || !book ? (
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] text-center">
            <h2 className="font-editorial text-2xl font-bold text-red-500 mb-2">Book Not Found</h2>
            <p className="text-xs text-[var(--text-muted)]">
              No book with ISBN {isbn13} was found in the library catalog.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-library)] rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Cover Column */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="book-cover-container w-48 sm:w-56 h-72 sm:h-80 rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-surface-elevated)] mb-4">
                  <img
                    src={book.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                    alt={book.title}
                    className="w-full h-full object-cover rounded-2xl book-cover-3d"
                  />
                </div>

                {/* Shelf Buttons */}
                <div className="w-full space-y-2">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">
                    Shelf Actions
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleShelfChange("want_to_read")}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                        shelfStatus === "want_to_read"
                          ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-xs"
                          : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                      }`}
                    >
                      Want to Read
                    </button>
                    <button
                      onClick={() => handleShelfChange("reading")}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                        shelfStatus === "reading"
                          ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-xs"
                          : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                      }`}
                    >
                      Reading
                    </button>
                    <button
                      onClick={() => handleShelfChange("finished")}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                        shelfStatus === "finished"
                          ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-xs"
                          : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                      }`}
                    >
                      Finished
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-[11px] font-mono text-[var(--text-muted)]">
                  ISBN: {book.isbn13}
                </div>
              </div>

              {/* Information Column */}
              <div className="md:col-span-8 space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-[var(--accent-amber)] bg-[var(--accent-amber-glow)] mb-2">
                    {book.categories}
                  </span>
                  <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-1 leading-tight">
                    {book.title}
                  </h1>
                  <p className="text-base text-[var(--text-muted)] font-medium">
                    by <span className="text-[var(--text-primary)]">{book.authors}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-muted)] py-3 border-y border-[var(--border-library)]">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                    {book.average_rating ? book.average_rating.toFixed(1) : "N/A"} ({book.ratings_count || 0} ratings)
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {book.num_pages || "~300"} pages
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Published {book.published_year || "2000"}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Description &amp; Themes
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">
                    {book.description}
                  </p>
                </div>

                {/* DNA Radar */}
                <div className="pt-4 border-t border-[var(--border-library)] space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    9-Dimensional Book DNA
                  </h3>
                  <BookDNARadar bookA={book} />
                </div>
              </div>
            </div>

            {/* Similar Books */}
            {similarData && similarData.results.length > 0 && (
              <div className="pt-6 border-t border-[var(--border-library)] space-y-4">
                <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">
                  Volumes Closely Aligned in Vector Space
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {similarData.results.map((sim) => (
                    <Link
                      key={sim.isbn13}
                      href={`/book/${sim.isbn13}`}
                      className="group p-3 rounded-2xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)]/40 border border-[var(--border-library)] transition-all hover:scale-102"
                    >
                      <div className="h-40 rounded-xl overflow-hidden bg-zinc-200 mb-2 shadow-xs">
                        <img
                          src={sim.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                          alt={sim.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h4 className="font-editorial text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                        {sim.title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                        {sim.authors}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
