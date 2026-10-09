"use client";

import React from "react";
import { Filter, X, RotateCcw } from "lucide-react";
import { Filters } from "@/lib/types";

interface FilterDrawerProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORIES = [
  "All",
  "Fiction",
  "Mystery & Thriller",
  "Sci-Fi & Fantasy",
  "Romance",
  "Biography & Memoir",
  "History & Politics",
  "Philosophy & Religion",
  "Science & Nature",
  "Young Adult & Children",
  "Arts & Literature",
  "Comics & Graphic Novels",
  "Business & Self-Help",
];

const TONES = [
  { id: "all", label: "Any Tone" },
  { id: "joy", label: "Joy & Uplifting" },
  { id: "sadness", label: "Melancholic" },
  { id: "fear", label: "Suspense & Fear" },
  { id: "anger", label: "Conflict & Intensity" },
  { id: "surprise", label: "Twists & Wonder" },
];

export function FilterDrawer({ filters, onChange, isOpen, onToggle }: FilterDrawerProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== null && v !== undefined && v !== "");

  const handleReset = () => {
    onChange({
      category: null,
      tone: null,
      year_min: null,
      year_max: null,
      max_pages: null,
      min_rating: null,
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
            isOpen || hasActiveFilters
              ? "bg-[var(--bg-surface)] border-[var(--accent-amber)] text-[var(--accent-amber)] shadow-sm"
              : "bg-[var(--bg-surface)] border-[var(--border-library)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent-amber)] animate-pulse" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors px-2 py-1 rounded"
          >
            <RotateCcw className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Category Chips */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Genre / Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = (!filters.category && cat === "All") || filters.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onChange({ ...filters, category: cat === "All" ? null : cat })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-[var(--accent-amber)] text-white shadow-xs"
                        : "bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-library)]/50"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-[var(--border-library)]">
            {/* Tone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Emotional Tone
              </label>
              <select
                value={filters.tone || "all"}
                onChange={(e) => onChange({ ...filters, tone: e.target.value === "all" ? null : e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
              >
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Minimum Rating: {filters.min_rating ? `${filters.min_rating}★` : "Any"}
              </label>
              <select
                value={filters.min_rating || ""}
                onChange={(e) => onChange({ ...filters, min_rating: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
              >
                <option value="">Any Rating</option>
                <option value="3.5">3.5★ and up</option>
                <option value="4.0">4.0★ and up</option>
                <option value="4.2">4.2★ and up</option>
                <option value="4.5">4.5★ and up</option>
              </select>
            </div>

            {/* Max Pages */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Maximum Pages: {filters.max_pages ? `< ${filters.max_pages}p` : "Any Length"}
              </label>
              <select
                value={filters.max_pages || ""}
                onChange={(e) => onChange({ ...filters, max_pages: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-amber)]"
              >
                <option value="">Any Length</option>
                <option value="250">Short (&lt; 250 pages)</option>
                <option value="400">Medium (&lt; 400 pages)</option>
                <option value="600">Standard (&lt; 600 pages)</option>
                <option value="800">Long (&lt; 800 pages)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
