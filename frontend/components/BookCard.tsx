"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, BookOpen, Calendar, Bookmark, BookmarkCheck, Sparkles, ChevronDown, ChevronUp, Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import { BookItem, ShelfCategory } from "@/lib/types";
import { addBookToShelf, getShelfBooks } from "@/lib/shelf";
import { RankingPopover } from "./RankingPopover";

interface BookCardProps {
  book: BookItem;
  onSelect: (book: BookItem) => void;
  onContrast?: (book: BookItem) => void;
  index?: number;
}

export function BookCard({ book, onSelect, onContrast, index = 0 }: BookCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shelfStatus, setShelfStatus] = useState<ShelfCategory | null>(() => {
    const list = getShelfBooks();
    const found = list.find((b) => b.book.isbn13 === book.isbn13);
    return found ? found.shelf : null;
  });
  const [showShelfMenu, setShowShelfMenu] = useState(false);

  // Top 2 dominant emotions
  const sortedEmotions = Object.entries(book.emotions || {})
    .filter(([_, score]) => score > 0.08)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const handleShelfChange = (category: ShelfCategory) => {
    addBookToShelf(book, category);
    setShelfStatus(category);
    setShowShelfMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      className="group relative bg-[var(--bg-surface)] border border-[var(--border-library)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        <div className="flex gap-4">
          {/* 3D Tilt Book Cover */}
          <div
            onClick={() => onSelect(book)}
            className="book-cover-container cursor-pointer shrink-0 w-24 sm:w-28 h-36 sm:h-40 rounded-xl overflow-hidden shadow-md relative bg-[var(--bg-surface-elevated)]"
          >
            <div className="book-cover-3d w-full h-full relative">
              <img
                src={book.thumbnail || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400"}
                alt={book.title}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400";
                }}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-amber)] truncate">
                  {book.categories || "Literature"}
                </span>
                <RankingPopover explanation={book.ranking_explanation} />
              </div>

              <h3
                onClick={() => onSelect(book)}
                className="font-editorial text-lg sm:text-xl font-bold text-[var(--text-primary)] hover:text-[var(--accent-amber)] transition-colors line-clamp-2 cursor-pointer leading-snug"
              >
                {book.title}
              </h3>

              <p className="text-xs text-[var(--text-muted)] line-clamp-1 font-medium mt-0.5">
                by {book.authors || "Unknown Author"}
              </p>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-2">
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                {book.average_rating ? book.average_rating.toFixed(1) : "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {book.num_pages || "~300"}p
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {book.published_year || "2000"}
              </span>
            </div>
          </div>
        </div>

        {/* Emotion Tone Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-library)]/60">
          {sortedEmotions.map(([emo, score]) => (
            <span
              key={emo}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-library)] capitalize"
            >
              {emo} {Math.round(score * 100)}%
            </span>
          ))}

          {book.vibe_scores?.pacing && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-library)]">
              {book.vibe_scores.pacing > 0.1 ? "Slow-burn" : (book.vibe_scores.pacing < -0.1 ? "Fast-paced" : "Balanced")}
            </span>
          )}
        </div>

        {/* Grounded "Why this book?" or Highlight Snippet */}
        {(book.explanation || book.matched_snippet) && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--accent-amber-glow)] border border-[var(--accent-amber)]/20 text-xs">
            <div className="flex items-center gap-1 font-bold text-[var(--accent-amber)] mb-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Why this book?</span>
            </div>
            <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
              {book.explanation || book.matched_snippet}
            </p>
          </div>
        )}

        {/* Description snippet with read more */}
        <div className="mt-2.5 text-xs text-[var(--text-muted)] leading-relaxed">
          <p className={isExpanded ? "" : "line-clamp-2"}>
            {book.description}
          </p>
          {book.description && book.description.length > 120 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-[11px] font-medium text-[var(--accent-amber)] hover:underline inline-flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>Show less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Read more <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--border-library)] flex items-center justify-between gap-2">
        <div className="relative">
          <button
            onClick={() => setShowShelfMenu(!showShelfMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              shelfStatus
                ? "bg-[var(--accent-amber)] text-white border-[var(--accent-amber)] shadow-xs"
                : "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border-[var(--border-library)] hover:border-[var(--accent-amber)]"
            }`}
          >
            {shelfStatus ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>
              {shelfStatus === "want_to_read"
                ? "Want to Read"
                : shelfStatus === "reading"
                ? "Reading"
                : shelfStatus === "finished"
                ? "Finished"
                : "Add to Shelf"}
            </span>
          </button>

          {showShelfMenu && (
            <div className="absolute left-0 bottom-full mb-1 w-36 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-lg z-30 py-1 text-xs">
              <button
                onClick={() => handleShelfChange("want_to_read")}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-elevated)]"
              >
                Want to read
              </button>
              <button
                onClick={() => handleShelfChange("reading")}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-elevated)]"
              >
                Currently reading
              </button>
              <button
                onClick={() => handleShelfChange("finished")}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-elevated)]"
              >
                Finished
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onContrast && (
            <button
              onClick={() => onContrast(book)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-amber)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
              title="Like this book, but..."
            >
              <Shuffle className="w-3 h-3" />
              <span className="hidden sm:inline">Contrast</span>
            </button>
          )}

          <button
            onClick={() => onSelect(book)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)] text-[var(--text-primary)] transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}
