/**
 * API Client for ShelfSense Backend
 */

import {
  SearchRequest,
  SearchResponse,
  SimilarRequest,
  SimilarResponse,
  ExplainRequest,
  ExplainResponse,
  ChatRequest,
  ChatResponse,
  BookItem,
  GalaxyResponse,
  HealthResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let message = `API request failed with status ${res.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.detail) message = parsed.detail;
    } catch {
      if (errorBody) message = errorBody;
    }
    throw new Error(message);
  }

  return res.json();
}

export async function searchBooks(req: SearchRequest): Promise<SearchResponse> {
  return fetchJson<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getSimilarBooks(req: SimilarRequest): Promise<SimilarResponse> {
  return fetchJson<SimilarResponse>("/api/similar", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function explainBook(req: ExplainRequest): Promise<ExplainResponse> {
  return fetchJson<ExplainResponse>("/api/explain", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function chatRefine(req: ChatRequest): Promise<ChatResponse> {
  return fetchJson<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getBook(isbn13: string): Promise<BookItem> {
  return fetchJson<BookItem>(`/api/book/${isbn13}`);
}

export async function getGalaxyData(): Promise<GalaxyResponse> {
  return fetchJson<GalaxyResponse>("/api/galaxy");
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health");
}
