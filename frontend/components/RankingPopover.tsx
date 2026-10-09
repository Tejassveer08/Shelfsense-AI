"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, Sparkles, Binary, Sliders, CheckCircle2 } from "lucide-react";
import { RankingExplanation } from "@/lib/types";

interface RankingPopoverProps {
  explanation?: RankingExplanation;
}

export function RankingPopover({ explanation }: RankingPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!explanation) return null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-library)]"
        title="View explainable ranking math"
      >
        <HelpCircle className="w-3 h-3" />
        <span>How ranked?</span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-library)] shadow-xl z-50 text-xs text-[var(--text-primary)] space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-library)] pb-2">
            <span className="font-bold flex items-center gap-1.5 text-[var(--accent-amber)]">
              <Sparkles className="w-3.5 h-3.5" />
              Explainable Ranking Formula
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              Score: {explanation.final_score}
            </span>
          </div>

          <div className="space-y-2">
            {/* Dense Semantic */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-elevated)]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Dense Semantic Rank</span>
              </div>
              <span className="font-mono font-medium">
                #{explanation.dense_rank ?? "—"} ({Math.round((explanation.dense_score || 0) * 100)}%)
              </span>
            </div>

            {/* BM25 Keyword */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-elevated)]">
              <div className="flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-emerald-500" />
                <span>BM25 Keyword Match</span>
              </div>
              <span className="font-mono font-medium">
                #{explanation.bm25_rank ?? "None"} ({Math.round((explanation.bm25_score || 0) * 100)}%)
              </span>
            </div>

            {/* RRF Base */}
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
              <span>Reciprocal Rank Fusion (RRF):</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{explanation.rrf_score}</span>
            </div>

            {/* Vibe Sliders Multiplier */}
            {explanation.vibe_multiplier && (
              <div className="p-2 rounded-lg bg-[var(--accent-amber-glow)] border border-[var(--accent-amber)]/20 space-y-1">
                <div className="flex items-center justify-between font-semibold text-[var(--accent-amber)]">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> Vibe Slider Adjustment:
                  </span>
                  <span className="font-mono">{explanation.vibe_multiplier}x</span>
                </div>
                {explanation.vibe_adjustments && Object.keys(explanation.vibe_adjustments).length > 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] space-y-0.5 pt-1">
                    {Object.entries(explanation.vibe_adjustments).map(([axis, val]) => (
                      <div key={axis} className="flex justify-between">
                        <span className="capitalize">{axis.replace("_", " ")}:</span>
                        <span className={`font-mono ${val >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                          {val >= 0 ? `+${val}` : val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--text-muted)] italic pt-1 border-t border-[var(--border-library)]">
            Ranked by fusing vector cosine geometry with exact lexical term frequency and reader vibe tuning.
          </p>
        </div>
      )}
    </div>
  );
}
