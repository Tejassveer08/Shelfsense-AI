"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { ShelfBoard } from "@/components/ShelfBoard";
import { BookDetailModal } from "@/components/BookDetailModal";
import { BookItem } from "@/lib/types";
import { BookmarkCheck } from "lucide-react";

export default function ShelfPage() {
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <ShelfBoard onSelectBook={(b) => setSelectedBook(b)} />
      </main>

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onSelectBook={(b) => setSelectedBook(b)}
      />
    </div>
  );
}
