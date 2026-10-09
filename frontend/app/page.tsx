"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { HeroSearch } from "@/components/HeroSearch";
import { VibeSliders } from "@/components/VibeSliders";
import { FilterDrawer } from "@/components/FilterDrawer";
import { BookCard } from "@/components/BookCard";
import { BookDetailModal } from "@/components/BookDetailModal";
import { TasteProfileModal } from "@/components/TasteProfileModal";
import { ChatDrawer } from "@/components/ChatDrawer";
import { searchBooks } from "@/lib/api";
import { BookItem, Filters, VibeScores, SearchRequest } from "@/lib/types";
import { Sparkles, LayoutGrid, List, BookOpen, AlertCircle } from "lucide-react";

const INITIAL_SLIDERS: VibeScores = {
  dark_light: 0.0,
  pacing: 0.0,
  cerebral_escapist: 0.0,
  length_scale: 0.0,
};

const INITIAL_FILTERS: Filters = {
  category: null,
  tone: null,
  year_min: null,
  year_max: null,
  max_pages: null,
  min_rating: null,
};

export default function HomePage() {
  const [query, setQuery] = useState("A slow, melancholic novel about leaving home, nothing too long");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sliders, setSliders] = useState<VibeScores>(INITIAL_SLIDERS);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTasteOpen, setIsTasteOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  // Main search query
  const searchPayload: SearchRequest = {
    query: debouncedQuery.trim() || "compelling literature",
    filters,
    sliders,
    limit: 28,
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["searchBooks", debouncedQuery, filters, sliders],
    queryFn: () => searchBooks(searchPayload),
  });

  const books = data?.results || [];
  const total = data?.total || 0;

  // Handle conversational updates from ChatDrawer
  const handleChatUpdates = (updates: {
    query?: string;
    filters?: any;
    sliders?: any;
    results?: BookItem[];
  }) => {
    if (updates.query) setQuery(updates.query);
    if (updates.filters) setFilters((prev) => ({ ...prev, ...updates.filters }));
    if (updates.sliders) setSliders((prev) => ({ ...prev, ...updates.sliders }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Navigation Header */}
      <Header
        onOpenTasteProfile={() => setIsTasteOpen(true)}
        onOpenChatDrawer={() => setIsChatOpen(true)}
      />

      {/* Hero Section */}
      <HeroSearch
        query={query}
        onQueryChange={setQuery}
        onSearch={(q) => {
          setDebouncedQuery(q);
          refetch();
        }}
        isLoading={isFetching}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Vibe Sliders Toolbar */}
        <VibeSliders sliders={sliders} onChange={setSliders} />

        {/* Filter Drawer */}
        <FilterDrawer
          filters={filters}
          onChange={setFilters}
          isOpen={isFilterOpen}
          onToggle={() => setIsFilterOpen(!isFilterOpen)}
        />

        {/* Results Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[var(--border-library)]">
          <div className="flex items-center gap-2">
            <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              Curated Recommendations
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-library)]">
              {isLoading ? "Searching..." : `${total} matched`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)]">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid View"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-[var(--accent-amber)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("compact")}
                aria-label="Compact View"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "compact"
                    ? "bg-[var(--accent-amber)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid / Skeleton Loaders */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-96 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-library)] p-5 animate-pulse space-y-4"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-[var(--bg-surface-elevated)] rounded-xl" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-2/3" />
                  </div>
                </div>
                <div className="h-14 bg-[var(--bg-surface-elevated)] rounded-xl" />
                <div className="h-10 bg-[var(--bg-surface-elevated)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-sm">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)] mb-2">
              Unable to Retrieve Recommendations
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto mb-4">
              Please check that the ShelfSense backend server is running on port 8000.
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-amber)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : books.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-sm space-y-3">
            <BookOpen className="w-12 h-12 text-[var(--accent-amber)] mx-auto opacity-70 mb-2" />
            <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              No Direct Matches in this Corner of the Library
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Try adjusting your active filters, resetting the vibe sliders, or phrasing your desire with broader emotional themes.
            </p>
            <button
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                setSliders(INITIAL_SLIDERS);
              }}
              className="px-5 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-amber)] transition-colors"
            >
              Reset Filters &amp; Sliders
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {books.map((book, idx) => (
              <BookCard
                key={book.isbn13}
                book={book}
                index={idx}
                onSelect={(b) => setSelectedBook(b)}
                onContrast={(b) => setSelectedBook(b)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onSelectBook={(b) => setSelectedBook(b)}
        currentQuery={debouncedQuery}
        allBooksCatalog={books}
      />

      {/* Taste Profile Modal */}
      <TasteProfileModal
        isOpen={isTasteOpen}
        onClose={() => setIsTasteOpen(false)}
        catalog={books}
        onSelectBook={(b) => {
          setIsTasteOpen(false);
          setSelectedBook(b);
        }}
      />

      {/* Conversational Refine Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentState={{
          query: debouncedQuery,
          sliders,
          filters,
        }}
        onApplyUpdates={handleChatUpdates}
      />
    </div>
  );
}
