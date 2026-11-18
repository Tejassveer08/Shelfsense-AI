// Shared types for the ShelfSense API and UI.

export const EMOTIONS = ["joy", "sadness", "fear", "anger", "surprise", "disgust", "neutral"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export type Emotions = Record<Emotion, number>;

export const VIBE_AXES = ["dark_light", "pacing", "cerebral_escapist", "length_scale"] as const;
export type VibeAxis = (typeof VIBE_AXES)[number];
export type Vibes = Record<VibeAxis, number>;

export interface SeriesRef {
  id?: string;
  name: string;
  position?: number | null;
}

export interface Book {
  id: string;
  title: string;
  fullTitle?: string;
  authors: string[];
  description: string;
  rating: number;
  ratings: number;
  pages: number;
  year: number;
  cover: string;
  genres: string[];
  category: string;
  emotions: Emotions;
  vibes: Vibes;
  quality: number;
  isbn13?: string;
  series?: SeriesRef[];
  language?: string;
  publisher?: string;
}

/** Compact shape for rails, autocomplete and shelves. */
export interface BookSummary {
  id: string;
  title: string;
  authors: string[];
  cover: string;
  year?: number;
  rating?: number;
  ratings?: number;
  category?: string;
}

export interface RankingExplanation {
  final: number;
  rrf: number;
  denseRank: number | null;
  denseScore: number | null;
  textRank: number | null;
  textScore: number | null;
  vibeMultiplier: number;
  vibeAdjustments: Partial<Record<VibeAxis, number>>;
  qualityPrior: number;
  /** Shelf overlap with the source book(s) for "like X" / taste searches. */
  genreAffinity?: number;
}

export interface ScoredBook extends Book {
  score?: number;
  similarity?: number;
  snippet?: string;
  ranking?: RankingExplanation;
}

export interface Filters {
  category?: string | null;
  tone?: Emotion | null;
  yearMin?: number | null;
  yearMax?: number | null;
  maxPages?: number | null;
  minRating?: number | null;
  minRatings?: number | null;
}

export type Sliders = Partial<Vibes>;

/** What the query parser understood from a free-text request. */
export interface QueryIntent {
  semanticQuery: string;
  /** Content words for keyword (BM25) search, with vibe adjectives removed. */
  keywords?: string;
  filters: Filters;
  sliders: Sliders;
  chips: string[];
  /** Set when the query was "like <book>": results are neighbours of that book. */
  anchor?: { id: string; title: string; authors: string[] };
}

export type SearchMode = "hybrid" | "semantic" | "keyword";

export interface SearchResponse {
  query: string;
  results: ScoredBook[];
  total: number;
  mode: SearchMode;
  intent: QueryIntent;
  appliedFilters: Filters;
  appliedSliders: Sliders;
  tookMs: number;
}

export type ShelfStatus = "want" | "reading" | "read";

export interface ShelfEntry extends BookSummary {
  status: ShelfStatus;
  /** 1-5 stars; 4-5 = loved (pulls recommendations closer), 1-2 = not for me (pushes away). */
  myRating?: number;
  addedAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  books?: ScoredBook[];
}

export interface LibrarianPlan {
  searchQuery: string;
  filters: Filters;
  sliders: Sliders;
  reply?: string;
  /** For "like X but …": a plain description of the book wanted, searched alongside the anchor. */
  altQuery?: string;
}

export interface ReaderInsights {
  count: number;
  emotions: Emotions;
  vibes: Vibes;
  categories: { name: string; count: number }[];
  genres: { name: string; count: number }[];
  avgPages: number;
  avgYear: number;
  avgRating: number;
  decades: { decade: number; count: number }[];
  persona: { title: string; summary: string; suggestions: string[] };
  aiPowered: boolean;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  database: { connected: boolean; books: number; error?: string };
  search: { textIndex: boolean; vectorIndex: boolean };
  embeddings: { provider: string; ready: boolean; error?: string };
  llm: { provider: string; model?: string };
  version: string;
}
