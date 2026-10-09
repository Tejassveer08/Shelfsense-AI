"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { DiscoveryGalaxy } from "@/components/DiscoveryGalaxy";
import { BookDetailModal } from "@/components/BookDetailModal";
import { getGalaxyData, getBook } from "@/lib/api";
import { BookItem } from "@/lib/types";
import { Compass, Sparkles, Loader2 } from "lucide-react";

export default function GalaxyPage() {
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["galaxyData"],
    queryFn: getGalaxyData,
  });

  const handleSelectBook = async (isbn13: string) => {
    try {
      const book = await getBook(isbn13);
      setSelectedBook(book);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-[var(--accent-amber)] bg-[var(--accent-amber-glow)] border border-[var(--accent-amber)]/20 mb-2">
              <Compass className="w-3.5 h-3.5" />
              2D UMAP Semantic Manifold
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Discovery Galaxy
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
              Explore all 5,230 volumes projected into two-dimensional conceptual space. Nearby stars share semantic motifs, literary tone, and pacing.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-amber)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Mapping constellation of 5,230 books across semantic space...
            </p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-library)] p-6 text-center">
            <p className="text-sm font-medium text-red-500 mb-2">
              Failed to load Discovery Galaxy coordinates.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Ensure backend server is running on port 8000 and galaxy_nodes.json is compiled.
            </p>
          </div>
        ) : (
          <DiscoveryGalaxy
            nodes={data?.nodes || []}
            categories={data?.categories || []}
            onSelectBook={handleSelectBook}
          />
        )}
      </main>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onSelectBook={(b) => setSelectedBook(b)}
      />
    </div>
  );
}
