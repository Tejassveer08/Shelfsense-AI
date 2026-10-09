"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw, Flame, Moon, Sparkles, BookOpen } from "lucide-react";
import { VibeScores } from "@/lib/types";

interface VibeSlidersProps {
  sliders: VibeScores;
  onChange: (sliders: VibeScores) => void;
}

export function VibeSliders({ sliders, onChange }: VibeSlidersProps) {
  const isModified = Object.values(sliders).some((v) => Math.abs(v) > 0.05);

  const updateAxis = (axis: keyof VibeScores, value: number) => {
    onChange({
      ...sliders,
      [axis]: value,
    });
  };

  const handleReset = () => {
    onChange({
      dark_light: 0.0,
      pacing: 0.0,
      cerebral_escapist: 0.0,
      length_scale: 0.0,
    });
  };

  const getSliderLabel = (axis: keyof VibeScores, val: number) => {
    if (Math.abs(val) <= 0.08) return "Neutral";
    switch (axis) {
      case "dark_light":
        return val < 0 ? `Dark (${Math.round(Math.abs(val) * 100)}%)` : `Light (${Math.round(val * 100)}%)`;
      case "pacing":
        return val < 0 ? `Fast-paced (${Math.round(Math.abs(val) * 100)}%)` : `Slow-burn (${Math.round(val * 100)}%)`;
      case "cerebral_escapist":
        return val < 0 ? `Cerebral (${Math.round(Math.abs(val) * 100)}%)` : `Escapist (${Math.round(val * 100)}%)`;
      case "length_scale":
        return val < 0 ? `Short (${Math.round(Math.abs(val) * 100)}%)` : `Epic (${Math.round(val * 100)}%)`;
      default:
        return "Neutral";
    }
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-library)] rounded-2xl p-5 shadow-sm mb-6 transition-colors">
      <div className="flex items-center justify-between mb-4 border-b border-[var(--border-library)] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--accent-amber-glow)] text-[var(--accent-amber)]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Vibe Sliders</h2>
            <p className="text-xs text-[var(--text-muted)]">Live multidimensional re-ranking</p>
          </div>
        </div>

        {isModified && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--bg-surface-elevated)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Sliders
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Dark <-> Light */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Moon className="w-3.5 h-3.5" /> Dark
            </span>
            <span className="text-[var(--accent-amber)] font-mono">{getSliderLabel("dark_light", sliders.dark_light)}</span>
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Light
            </span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={sliders.dark_light}
            onChange={(e) => updateAxis("dark_light", parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-amber)] cursor-pointer h-1.5 bg-[var(--bg-surface-elevated)] rounded-lg"
          />
        </div>

        {/* 2. Fast-paced <-> Slow-burn */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Fast-paced
            </span>
            <span className="text-[var(--accent-amber)] font-mono">{getSliderLabel("pacing", sliders.pacing)}</span>
            <span className="text-[var(--text-muted)]">Slow-burn</span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={sliders.pacing}
            onChange={(e) => updateAxis("pacing", parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-amber)] cursor-pointer h-1.5 bg-[var(--bg-surface-elevated)] rounded-lg"
          />
        </div>

        {/* 3. Cerebral <-> Escapist */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--text-muted)]">Cerebral</span>
            <span className="text-[var(--accent-amber)] font-mono">{getSliderLabel("cerebral_escapist", sliders.cerebral_escapist)}</span>
            <span className="text-[var(--text-muted)]">Escapist</span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={sliders.cerebral_escapist}
            onChange={(e) => updateAxis("cerebral_escapist", parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-amber)] cursor-pointer h-1.5 bg-[var(--bg-surface-elevated)] rounded-lg"
          />
        </div>

        {/* 4. Short <-> Epic */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--text-muted)]">Short (&lt;250p)</span>
            <span className="text-[var(--accent-amber)] font-mono">{getSliderLabel("length_scale", sliders.length_scale)}</span>
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <BookOpen className="w-3.5 h-3.5" /> Epic (600p+)
            </span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={sliders.length_scale}
            onChange={(e) => updateAxis("length_scale", parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-amber)] cursor-pointer h-1.5 bg-[var(--bg-surface-elevated)] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
