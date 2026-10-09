"use client";

import React, { useState, useEffect } from "react";
import { X, Star, BookOpen, Calendar, BookmarkCheck, Bookmark, Sparkles, Shuffle, GitCompare, ExternalLink } from "lucide-react";
import { BookItem, ShelfCategory } from "@/lib/types";
import { addBookToShelf, getShelfBooks } from "@/lib/shelf";
import { BookDNARadar } from "./BookDNARadar";
import { getSimilarBooks } from "@/lib/api";

interface BookDetailModalProps {
  book: BookItem | null;
  onClose: () => void;
  onSelectBook: (book: BookItem) => void;
  currentQuery?: string;
  allBooksCatalog?: BookItem[];
}

export function BookDetailModal({
  book,
  onClose,
  onSelectBook,
  currentQuery = "",
  allBooksCatalog = [],
}: BookDetailModalProps) {
  const [shelfStatus, setShelfStatus] = useState<ShelfCategory | null>(null);
  const [compareBook, setCompareBook] = useState<BookItem | null>(null);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const [compareSearch, setCompareSearch] = useState("");
  const [similarBooks, setSimilarBooks] = useState<BookItem[]>([]);
  const [contrastText, setContrastText] = useState("");
  const [contrastLoading, setContrastLoading] = useState(false);

  useEffect(() => {
    if (!book) return;
    const shelf = getShelfBooks();
    const found = shelf.find((b) => b.book.isbn13 === book.isbn13);
    setShelfStatus(found ? found.shelf : null);
    setCompareBook(null);
    setShowComparePicker(false);
    setContrastText("");

    // Fetch similar books
    getSimilarBooks({ isbn13s: [book.isbn13], limit: 4 })
      .then((res) => setSimilarBooks(res.results))
      .catch((e) => console.error("Error fetching similar books", e));
  }, [book]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!book) return null;

  const handleShelfChange = (category: ShelfCategory) => {
    addBookToShelf(book, category);
    setShelfStatus(category);
  };

  const handleContrastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrastText.trim()) return;
    setContrastLoading(true);
    try {
      const res = await getSimilarBooks({
        isbn13s: [book.isbn13],
        modifier: contrastText.trim(),
        limit: 4,
      });
      setSimilarBooks(res.results);
    } catch (err) {
      console.error(err);
    } finally {
      setContrastLoading(false);
    }
  };

  // Filter candidates for compare selector
  const compareCandidates = allBooksCatalog
    .filter((b) => b.isbn13 !== book.isbn13 && b.title.toLowerCase().includes(compareSearch.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-2xl p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Cover & Actions */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="book-cover-container w-44 sm:w-52 h-64 sm:h-76 rounded-2xl overflow-hidden shadow-xl mb-4 bg-[var(--bg-surface-elevated)]">
              <img
                src={book.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                alt={book.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400";
                }}
                className="w-full h-full object-cover rounded-2xl book-cover-3d"
              />
            </div>

            {/* Shelf Actions */}
            <div className="w-full space-y-2 mt-2">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center mb-1">
                Reading Shelf
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleShelfChange("want_to_read")}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                    shelfStatus === "want_to_read"
                      ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-sm"
                      : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                  }`}
                >
                  Want to Read
                </button>
                <button
                  onClick={() => handleShelfChange("reading")}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                    shelfStatus === "reading"
                      ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-sm"
                      : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                  }`}
                >
                  Reading
                </button>
                <button
                  onClick={() => handleShelfChange("finished")}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                    shelfStatus === "finished"
                      ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-sm"
                      : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
                  }`}
                >
                  Finished
                </button>
              </div>
            </div>

            {/* Quick deep link identifier */}
            <div className="mt-4 text-[11px] text-[var(--text-muted)] font-mono text-center">
              ISBN: {book.isbn13}
            </div>
          </div>

          {/* Right Column: Title, Metadata, DNA Radar, Full Description */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-[var(--accent-amber)] bg-[var(--accent-amber-glow)] mb-2">
                {book.categories || "Fiction"}
              </div>

              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-1 leading-tight">
                {book.title}
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-muted)] font-medium mb-3">
                by <span className="text-[var(--text-primary)]">{book.authors || "Unknown Author"}</span>
              </p>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-muted)] py-2.5 border-y border-[var(--border-library)] mb-4">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  {book.average_rating?.toFixed(1) || "N/A"} ({book.ratings_count || 0} reviews)
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

              {/* Matched sentence or explanation */}
              {(book.explanation || book.matched_snippet) && (
                <div className="p-3.5 rounded-2xl bg-[var(--accent-amber-glow)] border border-[var(--accent-amber)]/30 text-xs sm:text-sm mb-4">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--accent-amber)] mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Why This Matches Your Inquiry</span>
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {book.explanation || book.matched_snippet}
                  </p>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Overview
                </h4>
                <p className="text-xs sm:text-sm text-[var(--text-primary)]/90 leading-relaxed font-normal whitespace-pre-line">
                  {book.description}
                </p>
              </div>
            </div>

            {/* Book DNA Radar Chart & Compare */}
            <div className="pt-4 border-t border-[var(--border-library)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Book DNA Radar</span>
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">Emotion spectrum and pacing balance</p>
                </div>

                <button
                  onClick={() => setShowComparePicker(!showComparePicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] hover:border-[var(--accent-amber)] text-[var(--text-primary)] transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
                  <span>{compareBook ? "Change Comparison" : "Compare with Book"}</span>
                </button>
              </div>

              {showComparePicker && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] space-y-2">
                  <input
                    type="text"
                    placeholder="Search book to compare DNA..."
                    value={compareSearch}
                    onChange={(e) => setCompareSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-library)] text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {compareCandidates.map((cb) => (
                      <button
                        key={cb.isbn13}
                        onClick={() => {
                          setCompareBook(cb);
                          setShowComparePicker(false);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs bg-[var(--bg-surface)] hover:bg-[var(--accent-amber)] hover:text-white transition-colors truncate max-w-[200px]"
                      >
                        {cb.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <BookDNARadar bookA={book} bookB={compareBook} />
            </div>

            {/* Contrast Mode Panel ("Like this, but...") */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] space-y-3">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-[var(--accent-amber)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Contrast Mode
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  &mdash; &ldquo;Like this book, but...&rdquo;
                </span>
              </div>

              <form onSubmit={handleContrastSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. but happier, but shorter, set in medieval times..."
                  value={contrastText}
                  onChange={(e) => setContrastText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
                />
                <button
                  type="submit"
                  disabled={contrastLoading}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-amber)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {contrastLoading ? "Contrasting..." : "Re-rank"}
                </button>
              </form>
            </div>

            {/* More Like This Row */}
            {similarBooks.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {contrastText ? `Contrasted Discoveries ("${contrastText}")` : "More Like This Volume"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {similarBooks.map((sim) => (
                    <div
                      key={sim.isbn13}
                      onClick={() => onSelectBook(sim)}
                      className="cursor-pointer group p-2 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)]/40 transition-colors"
                    >
                      <div className="h-28 rounded-lg overflow-hidden bg-zinc-200 mb-1.5 shadow-xs">
                        <img
                          src={sim.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                          alt={sim.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="font-editorial text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                        {sim.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                        {sim.authors}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
