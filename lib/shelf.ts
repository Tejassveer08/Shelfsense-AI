"use client";

import { useSyncExternalStore } from "react";
import type { BookSummary, ShelfEntry, ShelfStatus } from "./types";

/** The reading shelf lives in localStorage (no account needed) and syncs across tabs. */

const KEY = "shelfsense.shelf.v2";
const EMPTY: ShelfEntry[] = [];
let cache: ShelfEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): ShelfEntry[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShelfEntry[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: ShelfEntry[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable; keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShelf(): ShelfEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useShelfEntry(id: string): ShelfEntry | undefined {
  const shelf = useShelf();
  return shelf.find((e) => e.id === id);
}

export const shelf = {
  set(book: BookSummary, status: ShelfStatus) {
    const list = read();
    const existing = list.find((e) => e.id === book.id);
    if (existing) {
      write(list.map((e) => (e.id === book.id ? { ...e, status } : e)));
    } else {
      const entry: ShelfEntry = {
        id: book.id,
        title: book.title,
        authors: book.authors,
        cover: book.cover,
        year: book.year,
        rating: book.rating,
        category: book.category,
        status,
        addedAt: Date.now(),
      };
      write([entry, ...list]);
    }
  },
  rate(book: BookSummary, myRating: number | undefined) {
    const list = read();
    if (!list.some((e) => e.id === book.id)) this.set(book, "read");
    write(read().map((e) => (e.id === book.id ? { ...e, myRating } : e)));
  },
  remove(id: string) {
    write(read().filter((e) => e.id !== id));
  },
  importMany(entries: Omit<ShelfEntry, "addedAt">[]) {
    const list = read();
    const have = new Set(list.map((e) => e.id));
    const fresh = entries.filter((e) => !have.has(e.id)).map((e) => ({ ...e, addedAt: Date.now() }));
    write([...fresh, ...list]);
    return fresh.length;
  },
};

/** Books that should shape recommendations: rated 4-5 (or read/reading without a rating). */
export function tasteSignals(entries: ShelfEntry[]) {
  const loved = entries
    .filter((e) => (e.myRating ? e.myRating >= 4 : e.status !== "want"))
    .map((e) => ({ id: e.id, rating: e.myRating ?? 4 }));
  const disliked = entries.filter((e) => e.myRating && e.myRating <= 2).map((e) => e.id);
  return { loved, disliked };
}
