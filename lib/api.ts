"use client";

import type {
  BookSummary, Filters, ReaderInsights, ScoredBook, SearchResponse, ShelfEntry, Sliders,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

const post = <T,>(url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }).then(json<T>);

export const api = {
  search: (body: { query: string; filters?: Filters; sliders?: Sliders; limit?: number; excludeIds?: string[] }, signal?: AbortSignal) =>
    post<SearchResponse>("/api/search", body, signal),
  explain: (id: string, query: string, snippet?: string) =>
    post<{ explanation: string; snippet: string; aiPowered: boolean }>("/api/explain", { id, query, snippet }),
  recommend: (
    body: { loved: { id: string; rating?: number }[]; disliked?: string[]; modifier?: string; exclude?: string[]; limit?: number; filters?: Filters; sliders?: Sliders },
    signal?: AbortSignal,
  ) => post<{ results: ScoredBook[]; basedOn: { id: string; title: string; weight: number }[]; modifier: string | null; mode: string }>("/api/recommend", body, signal),
  autocomplete: (q: string, signal?: AbortSignal) =>
    fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, { signal }).then(json<{ results: BookSummary[] }>),
  similar: (id: string, limit = 18) => fetch(`/api/books/${encodeURIComponent(id)}/similar?limit=${limit}`).then(json<{ results: ScoredBook[] }>),
  insights: (books: { id: string; rating?: number }[]) => post<ReaderInsights>("/api/insights", { books }),
  surprise: (category?: string) =>
    fetch(`/api/surprise${category ? `?category=${encodeURIComponent(category)}` : ""}`, { cache: "no-store" }).then(json<{ book: BookSummary | null }>),
  fit: (id: string, loved: { id: string; rating?: number }[], disliked: string[]) =>
    post<{ score: number; closest: { id: string; title: string; similarity: number }[]; warnings: { id: string; title: string }[]; verdict: string; aiPowered: boolean }>(
      "/api/fit",
      { id, loved, disliked },
    ),
  book: (id: string) => fetch(`/api/books/${encodeURIComponent(id)}`).then(json<import("./types").Book>),
  lookup: (items: { id?: string; isbn13?: string; title?: string; author?: string }[]) =>
    post<{ results: (BookSummary | null)[] }>("/api/books/lookup", { items }),
  shareShelf: (body: { name?: string; owner?: string; books: Omit<ShelfEntry, "addedAt">[] }) =>
    post<{ id: string; url: string }>("/api/shelves", body),
};
