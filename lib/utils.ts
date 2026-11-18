import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(".0K", "K") : String(n);

export const bookHref = (id: string) => `/book/${encodeURIComponent(id)}`;
export const authorHref = (name: string) => `/author/${encodeURIComponent(name)}`;

export function searchHref(query: string, params: Record<string, string | number | undefined | null> = {}) {
  const sp = new URLSearchParams({ q: query });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  return `/search?${sp.toString()}`;
}

/** Deterministic pleasant colours for generated covers. */
export function coverPalette(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return [`hsl(${hue} 45% 32%)`, `hsl(${(hue + 40) % 360} 55% 18%)`];
}

export function asSummary<T extends { id: string; title: string; authors: string[]; cover: string; year?: number; rating?: number; ratings?: number; category?: string }>(b: T) {
  return { id: b.id, title: b.title, authors: b.authors, cover: b.cover, year: b.year, rating: b.rating, ratings: b.ratings, category: b.category };
}
