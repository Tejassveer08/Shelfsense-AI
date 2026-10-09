"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, X, CornerDownLeft } from "lucide-react";

interface HeroSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q: string) => void;
  isLoading?: boolean;
}

const EXAMPLE_PROMPTS = [
  "A slow, melancholic novel about leaving home, nothing too long",
  "Philosophical sci-fi with sentient machines and existential questions",
  "Dark academia mystery in a stormy gothic university",
  "Uplifting and heartwarming cozy fantasy with found family",
  "Gripping psychological thriller with an unreliable narrator",
  "Thoughtful historical fiction set in 1920s Paris",
];

export function HeroSearch({ query, onQueryChange, onSearch, isLoading }: HeroSearchProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotating placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="relative py-8 md:py-12 text-center max-w-4xl mx-auto px-4">
      {/* Editorial Header */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-[var(--accent-amber)] bg-[var(--accent-amber-glow)] border border-[var(--accent-amber)]/20 mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        Semantic Literary Discovery
      </div>

      <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-4 tracking-tight leading-tight">
        Describe What You Want to Read
      </h1>

      <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
        Search beyond keywords. Tell ShelfSense the mood, pacing, and emotional landscape you desire, and receive explainable, ranked discoveries.
      </p>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-5">
        <div
          className={`relative flex items-center bg-[var(--bg-surface)] rounded-2xl border transition-all duration-300 shadow-lg ${
            isFocused
              ? "border-[var(--accent-amber)] ring-4 ring-[var(--accent-amber-glow)] shadow-xl"
              : "border-[var(--border-library)] hover:border-[var(--text-muted)]"
          }`}
        >
          <div className="pl-4 sm:pl-5 text-[var(--text-muted)]">
            <Search className={`w-5 h-5 sm:w-6 sm:h-6 ${isLoading ? "animate-spin text-[var(--accent-amber)]" : ""}`} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={EXAMPLE_PROMPTS[placeholderIndex]}
            aria-label="Describe what you want to read"
            className="w-full py-4 px-3 sm:px-4 text-base sm:text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 bg-transparent focus:outline-none rounded-2xl"
          />

          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] mr-2 transition-colors rounded-lg"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className="mr-2 sm:mr-3 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[var(--accent-amber)] text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md shrink-0"
          >
            <span>Search</span>
            <CornerDownLeft className="w-3.5 h-3.5 opacity-70 hidden sm:inline" />
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:flex justify-end mt-1.5 mr-2">
          <span className="text-xs text-[var(--text-muted)]/70">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] font-mono text-[10px] text-[var(--text-primary)]">/</kbd> to focus
          </span>
        </div>
      </form>

      {/* Example Prompt Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-3xl mx-auto">
        <span className="text-xs text-[var(--text-muted)] font-medium mr-1">Inspirations:</span>
        {EXAMPLE_PROMPTS.slice(0, 4).map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onQueryChange(prompt);
              onSearch(prompt);
            }}
            className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-library)] transition-all duration-150 hover:border-[var(--accent-amber)] hover:scale-102 shadow-2xs"
          >
            &ldquo;{prompt}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
