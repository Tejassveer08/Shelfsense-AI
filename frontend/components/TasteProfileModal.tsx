"use client";

import React, { useState } from "react";
import { X, Sparkles, Star, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { BookItem } from "@/lib/types";
import { getSimilarBooks } from "@/lib/api";

interface TasteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: BookItem[];
  onSelectBook: (book: BookItem) => void;
}

interface PickedBook {
  book: BookItem;
  rating: number;
}

export function TasteProfileModal({ isOpen, onClose, catalog, onSelectBook }: TasteProfileModalProps) {
  const [search, setSearch] = useState("");
  const [pickedBooks, setPickedBooks] = useState<PickedBook[]>([]);
  const [recommendations, setRecommendations] = useState<BookItem[]>([]);
  const [attributedTitles, setAttributedTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const searchResults = search.trim()
    ? catalog
        .filter(
          (b) =>
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            b.authors.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleAddBook = (book: BookItem) => {
    if (pickedBooks.length >= 5) return;
    if (pickedBooks.some((p) => p.book.isbn13 === book.isbn13)) return;
    setPickedBooks([...pickedBooks, { book, rating: 5 }]);
    setSearch("");
  };

  const handleRemoveBook = (isbn13: string) => {
    setPickedBooks(pickedBooks.filter((p) => p.book.isbn13 !== isbn13));
  };

  const handleRatingChange = (isbn13: string, rating: number) => {
    setPickedBooks(
      pickedBooks.map((p) => (p.book.isbn13 === isbn13 ? { ...p, rating } : p))
    );
  };

  const handleSynthesizeTaste = async () => {
    if (pickedBooks.length === 0) return;
    setLoading(true);
    try {
      const isbn13s = pickedBooks.map((p) => p.book.isbn13);
      const ratingsMap: Record<string, number> = {};
      pickedBooks.forEach((p) => {
        ratingsMap[p.book.isbn13] = p.rating;
      });

      const res = await getSimilarBooks({
        isbn13s,
        ratings: ratingsMap,
        limit: 8,
      });

      setRecommendations(res.results);
      setAttributedTitles(res.attributed_to || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-2xl p-6 sm:p-8"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-[var(--accent-amber-glow)] text-[var(--accent-amber)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              Taste Profile &mdash; &ldquo;Books I Love&rdquo;
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Pick 1 to 5 books and we will calculate your multi-vector taste profile.
            </p>
          </div>
        </div>

        {/* Selected Books List */}
        <div className="my-5 p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Your Anchors ({pickedBooks.length}/5)</span>
            {pickedBooks.length === 0 && <span className="text-amber-500">Pick at least 1 book below</span>}
          </div>

          {pickedBooks.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic py-3 text-center">
              No books selected yet. Search the catalog below to add books you love.
            </p>
          ) : (
            <div className="space-y-2">
              {pickedBooks.map(({ book, rating }) => (
                <div
                  key={book.isbn13}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={book.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                      alt={book.title}
                      className="w-8 h-12 object-cover rounded shadow-2xs shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-editorial text-sm font-bold text-[var(--text-primary)] truncate">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {book.authors}
                      </p>
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(book.isbn13, star)}
                          className={`p-1 hover:scale-110 transition-transform ${
                            star <= rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleRemoveBook(book.isbn13)}
                      className="text-red-500 hover:text-red-700 p-1 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search to add */}
          {pickedBooks.length < 5 && (
            <div className="relative pt-2">
              <input
                type="text"
                placeholder="Search catalog by title or author to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
              />

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-library)] rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-[var(--border-library)]">
                  {searchResults.map((b) => (
                    <button
                      key={b.isbn13}
                      onClick={() => handleAddBook(b)}
                      className="w-full text-left p-2.5 hover:bg-[var(--bg-surface-elevated)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-[var(--text-primary)] block truncate">{b.title}</span>
                        <span className="text-[11px] text-[var(--text-muted)] truncate">{b.authors}</span>
                      </div>
                      <Plus className="w-4 h-4 text-[var(--accent-amber)] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleSynthesizeTaste}
            disabled={pickedBooks.length === 0 || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent-amber)] text-white text-sm font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? "Synthesizing Taste Vector..." : "Recommend from My Taste"}</span>
          </button>
        </div>

        {/* Results */}
        {recommendations.length > 0 && (
          <div className="border-t border-[var(--border-library)] pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-amber)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Recommended because of your taste in: {attributedTitles.slice(0, 3).join(", ")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.isbn13}
                  onClick={() => onSelectBook(rec)}
                  className="cursor-pointer group p-3 rounded-2xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)]/40 border border-[var(--border-library)] transition-all hover:scale-102"
                >
                  <div className="h-36 rounded-xl overflow-hidden bg-zinc-200 mb-2 shadow-xs">
                    <img
                      src={rec.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="font-editorial text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                    {rec.title}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                    {rec.authors}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
