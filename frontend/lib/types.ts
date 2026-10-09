/**
 * TypeScript types for ShelfSense Frontend
 * Generated from OpenAPI schema and backend models
 */

export interface VibeScores {
  dark_light: number;
  pacing: number;
  cerebral_escapist: number;
  length_scale: number;
}

export interface Emotions {
  anger: number;
  disgust: number;
  fear: number;
  joy: number;
  sadness: number;
  surprise: number;
  neutral: number;
  [key: string]: number;
}

export interface RankingExplanation {
  final_score: number;
  rrf_score: number;
  dense_rank?: number | null;
  dense_score?: number | null;
  bm25_rank?: number | null;
  bm25_score?: number | null;
  vibe_multiplier?: number;
  vibe_adjustments?: Record<string, number>;
}

export interface BookItem {
  isbn13: string;
  isbn10?: string;
  title: string;
  authors: string;
  categories: string;
  raw_category?: string;
  thumbnail: string;
  description: string;
  published_year: number;
  average_rating: number;
  num_pages: number;
  ratings_count: number;
  emotions: Emotions;
  vibe_scores: VibeScores;
  galaxy_x: number;
  galaxy_y: number;

  search_score?: number;
  dense_score?: number;
  bm25_score?: number;
  matched_snippet?: string;
  explanation?: string;
  ranking_explanation?: RankingExplanation;
}

export interface Filters {
  category?: string | null;
  tone?: string | null;
  year_min?: number | null;
  year_max?: number | null;
  max_pages?: number | null;
  min_rating?: number | null;
}

export interface SearchRequest {
  query: string;
  filters?: Filters | null;
  sliders?: VibeScores | null;
  limit?: number;
  rerank?: boolean;
}

export interface SearchResponse {
  results: BookItem[];
  total: number;
  query: string;
  applied_filters: Record<string, any>;
  applied_sliders: Record<string, number>;
}

export interface SimilarRequest {
  isbn13s: string[];
  ratings?: Record<string, number> | null;
  modifier?: string | null;
  limit?: number;
}

export interface SimilarResponse {
  results: BookItem[];
  total: number;
  mode: "taste_profile" | "contrast_mode";
  attributed_to: string[];
  modifier_applied?: string | null;
}

export interface ExplainRequest {
  isbn13: string;
  query: string;
}

export interface ExplainResponse {
  isbn13: string;
  explanation: string;
  highlighted_snippet: string;
  confidence: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  state?: Record<string, any>;
}

export interface ChatResponse {
  reply: string;
  updated_query?: string | null;
  updated_filters?: Record<string, any> | null;
  updated_sliders?: Record<string, number> | null;
  results: BookItem[];
}

export interface GalaxyNode {
  isbn13: string;
  title: string;
  authors: string;
  category: string;
  rating: number;
  pages: number;
  year: number;
  cover: string;
  x: number;
  y: number;
  vibe_scores: VibeScores;
  emotions: Emotions;
}

export interface GalaxyResponse {
  total: number;
  nodes: GalaxyNode[];
  categories: string[];
}

export interface HealthResponse {
  status: string;
  indexed_books: number;
  llm_provider: string;
  version: string;
}

export type ShelfCategory = "want_to_read" | "reading" | "finished";

export interface ShelfBook {
  book: BookItem;
  addedAt: string;
  shelf: ShelfCategory;
  userRating?: number;
  userNotes?: string;
}
