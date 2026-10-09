"use client";

import React, { useState, useEffect } from "react";
import { BookmarkCheck, Trash2, ArrowRight, Download, Sparkles, Star, BookOpen, MoveHorizontal } from "lucide-react";
import { ShelfBook, ShelfCategory, BookItem } from "@/lib/types";
import { getShelfBooks, updateBookShelf, removeBookFromShelf, exportShelfJson, clearShelf } from "@/lib/shelf";
import { getSimilarBooks } from "@/lib/api";

interface ShelfBoardProps {
  onSelectBook: (book: BookItem) => void;
}

const COLUMNS: { id: ShelfCategory; title: string; subtitle: string }[] = [
  { id: "want_to_read", title: "Want to Read", subtitle: "Queued for discovery" },
  { id: "reading", title: "Currently Reading", subtitle: "Active journeys" },
  { id: "finished", title: "Finished", subtitle: "Completed volumes" },
];

export function ShelfBoard({ onSelectBook }: ShelfBoardProps) {
  const [shelfBooks, setShelfBooks] = useState<ShelfBook[]>([]);
  const [recommended, setRecommended] = useState<BookItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [draggedIsbn, setDraggedIsbn] = useState<string | null>(null);

  const loadShelf = () => {
    setShelfBooks(getShelfBooks());
  };

  useEffect(() => {
    loadShelf();
    window.addEventListener("shelfsense_shelf_updated", loadShelf);
    return () => window.removeEventListener("shelfsense_shelf_updated", loadShelf);
  }, []);

  const handleDragStart = (isbn13: string) => {
    setDraggedIsbn(isbn13);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetShelf: ShelfCategory) => {
    if (draggedIsbn) {
      updateBookShelf(draggedIsbn, targetShelf);
      loadShelf();
      setDraggedIsbn(null);
    }
  };

  const handleMoveShelf = (isbn13: string, targetShelf: ShelfCategory) => {
    updateBookShelf(isbn13, targetShelf);
    loadShelf();
  };

  const handleRemove = (isbn13: string) => {
    removeBookFromShelf(isbn13);
    loadShelf();
  };

  const handleExport = () => {
    const jsonStr = exportShelfJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shelfsense-reading-shelf-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRecommendFromShelf = async () => {
    if (shelfBooks.length === 0) return;
    setLoadingRecs(true);
    try {
      // Pick up to 5 books across shelves, prioritizing 'finished' or 'reading'
      const isbns = shelfBooks.map((b) => b.book.isbn13).slice(0, 5);
      const res = await getSimilarBooks({ isbn13s: isbns, limit: 6 });
      setRecommended(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Shelf Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-sm">
        <div>
          <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
            Personal Reading Shelf
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {shelfBooks.length} volume{shelfBooks.length === 1 ? "" : "s"} saved &bull; Drag and drop between columns or use quick move buttons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRecommendFromShelf}
            disabled={shelfBooks.length === 0 || loadingRecs}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-amber)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingRecs ? "Synthesizing..." : "Recommend from My Shelf"}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={shelfBooks.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-[var(--text-primary)] text-xs font-semibold hover:border-[var(--accent-amber)] transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          {shelfBooks.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear your reading shelf?")) {
                  clearShelf();
                  loadShelf();
                }
              }}
              className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Clear Shelf"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Shelf Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const booksInCol = shelfBooks.filter((b) => b.shelf === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
              className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] p-5 flex flex-col min-h-[460px] shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-library)]">
                <div>
                  <h3 className="font-editorial text-lg font-bold text-[var(--text-primary)]">
                    {col.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">{col.subtitle}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-library)]">
                  {booksInCol.length}
                </span>
              </div>

              {/* Books in Column */}
              <div className="flex-1 space-y-3">
                {booksInCol.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-[var(--border-library)] rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                      Drop books here or add from Explorer
                    </p>
                  </div>
                ) : (
                  booksInCol.map(({ book, shelf }) => (
                    <div
                      key={book.isbn13}
                      draggable
                      onDragStart={() => handleDragStart(book.isbn13)}
                      className="group p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] hover:border-[var(--accent-amber)] transition-all shadow-2xs cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex gap-3">
                        <img
                          src={book.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                          alt={book.title}
                          onClick={() => onSelectBook(book)}
                          className="w-12 h-16 object-cover rounded-lg shadow-xs shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4
                            onClick={() => onSelectBook(book)}
                            className="font-editorial text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-amber)] truncate cursor-pointer"
                          >
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {book.authors}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                              {book.average_rating ? book.average_rating.toFixed(1) : "N/A"}
                            </span>
                            <span>{book.num_pages}p</span>
                          </div>
                        </div>
                      </div>

                      {/* Move and delete controls */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--border-library)]/60 text-[10px]">
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                          <span>Move:</span>
                          {COLUMNS.filter((c) => c.id !== shelf).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleMoveShelf(book.isbn13, c.id)}
                              className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] hover:text-[var(--accent-amber)] border border-[var(--border-library)] capitalize"
                            >
                              {c.id.replace("_to_", " ").replace("_", " ")}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleRemove(book.isbn13)}
                          className="text-zinc-400 hover:text-red-500 p-0.5 transition-colors"
                          title="Remove from Shelf"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended from Shelf Discoveries */}
      {recommended.length > 0 && (
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-amber)]" />
            <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">
              Discoveries Curated from Your Reading Shelf
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recommended.map((b) => (
              <div
                key={b.isbn13}
                onClick={() => onSelectBook(b)}
                className="cursor-pointer group p-3 rounded-2xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)]/40 border border-[var(--border-library)] transition-all hover:scale-102"
              >
                <div className="h-36 rounded-xl overflow-hidden bg-zinc-200 mb-2 shadow-xs">
                  <img
                    src={b.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-editorial text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                  {b.title}
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                  {b.authors}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
