"use client";

import React from "react";
import { BookItem } from "@/lib/types";

interface BookDNARadarProps {
  bookA: BookItem;
  bookB?: BookItem | null;
}

export function BookDNARadar({ bookA, bookB }: BookDNARadarProps) {
  // 9 Dimensions: 7 Emotions + Pace + Length
  const getRadarValues = (book: BookItem) => {
    const e = book.emotions || {};
    const v = book.vibe_scores || {};

    // Pacing mapped from [-1, 1] to [0, 1] (0 = Fast, 1 = Slow)
    const pacingNorm = Math.max(0, Math.min(1, ((v.pacing || 0) + 1) / 2));
    // Length mapped from [-1, 1] to [0, 1] (0 = Short, 1 = Epic)
    const lengthNorm = Math.max(0, Math.min(1, ((v.length_scale || 0) + 1) / 2));

    return [
      { axis: "Joy", value: Math.min(1, (e.joy || 0) * 1.5) },
      { axis: "Wonder", value: Math.min(1, (e.surprise || 0) * 2) },
      { axis: "Suspense", value: Math.min(1, (e.fear || 0) * 1.5) },
      { axis: "Intensity", value: Math.min(1, (e.anger || 0) * 2) },
      { axis: "Melancholy", value: Math.min(1, (e.sadness || 0) * 1.5) },
      { axis: "Grit", value: Math.min(1, (e.disgust || 0) * 2.5) },
      { axis: "Nuance", value: Math.min(1, (e.neutral || 0) * 1.2) },
      { axis: "Slow-burn", value: pacingNorm },
      { axis: "Epic Scope", value: lengthNorm },
    ];
  };

  const dataA = getRadarValues(bookA);
  const dataB = bookB ? getRadarValues(bookB) : null;

  // SVG Geometry Constants
  const size = 320;
  const center = size / 2;
  const radius = center - 46;
  const totalAxes = dataA.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = Math.max(0.08, Math.min(1.0, value)) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate polygon points
  const pointsA = dataA.map((d, i) => {
    const { x, y } = getCoordinates(d.value, i);
    return `${x},${y}`;
  }).join(" ");

  const pointsB = dataB
    ? dataB.map((d, i) => {
        const { x, y } = getCoordinates(d.value, i);
        return `${x},${y}`;
      }).join(" ")
    : null;

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-library)]">
      <div className="flex items-center gap-4 text-xs font-semibold mb-2">
        <div className="flex items-center gap-1.5 text-[var(--accent-amber)]">
          <span className="w-3 h-3 rounded-full bg-[var(--accent-amber)]" />
          <span className="truncate max-w-[140px]">{bookA.title}</span>
        </div>
        {bookB && (
          <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
            <span className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="truncate max-w-[140px]">{bookB.title}</span>
          </div>
        )}
      </div>

      <svg width={size} height={size} className="overflow-visible">
        {/* Background Concentric Grid Web */}
        {[0.25, 0.5, 0.75, 1.0].map((level, lvlIdx) => (
          <polygon
            key={lvlIdx}
            points={Array.from({ length: totalAxes }).map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = level * radius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            className="text-[var(--border-library)]"
          />
        ))}

        {/* Axis Spokes */}
        {dataA.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const outerX = center + radius * Math.cos(angle);
          const outerY = center + radius * Math.sin(angle);
          const labelX = center + (radius + 22) * Math.cos(angle);
          const labelY = center + (radius + 22) * Math.sin(angle);

          return (
            <g key={i}>
              <line
                x1={center}
                y1={center}
                x2={outerX}
                y2={outerY}
                stroke="currentColor"
                strokeWidth="0.75"
                className="text-[var(--border-library)]"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-medium fill-[var(--text-muted)]"
              >
                {d.axis}
              </text>
            </g>
          );
        })}

        {/* Book B Polygon (Compare) */}
        {pointsB && (
          <polygon
            points={pointsB}
            fill="rgba(20, 184, 166, 0.25)"
            stroke="#14B8A6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* Book A Polygon */}
        <polygon
          points={pointsA}
          fill="rgba(217, 119, 6, 0.25)"
          stroke="#D97706"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Dots for Book A */}
        {dataA.map((d, i) => {
          const { x, y } = getCoordinates(d.value, i);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              className="fill-[var(--accent-amber)] stroke-[var(--bg-surface)] stroke-2"
            />
          );
        })}
      </svg>
      <span className="text-[10px] text-[var(--text-muted)] mt-2">
        Composite 9-dimensional Book DNA profile
      </span>
    </div>
  );
}
