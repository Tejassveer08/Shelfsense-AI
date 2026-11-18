"use client";

import { EMOTION_META, VIBE_META } from "@/lib/constants";
import type { Emotion, Emotions, Vibes } from "@/lib/types";
import { VIBE_AXES } from "@/lib/types";
import { cn } from "@/lib/utils";

const AXES: Emotion[] = ["joy", "surprise", "fear", "anger", "disgust", "sadness"];

/** Emotion fingerprint as a radar chart; optional second series for comparisons. */
export function DnaRadar({
  emotions,
  compare,
  labels = ["This book"],
  size = 300,
}: {
  emotions: Emotions;
  compare?: Emotions | null;
  labels?: [string, string?] | string[];
  size?: number;
}) {
  const c = size / 2;
  const r = size / 2 - 42;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  // emotion scores are a softmax over 7 anchors (~0.05-0.3); stretch them to fill the chart
  const scale = (v: number) => Math.max(0.06, Math.min(1, (v - 0.06) / 0.22));
  const poly = (e: Emotions) => AXES.map((k, i) => point(i, scale(e[k] ?? 0)).join(",")).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[320px]" role="img" aria-label={`Emotional profile: ${AXES.map((k) => `${EMOTION_META[k].label} ${Math.round((emotions[k] ?? 0) * 100)}%`).join(", ")}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={AXES.map((_, i) => point(i, f).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />
        ))}
        {AXES.map((k, i) => {
          const [x, y] = point(i, 1);
          const [lx, ly] = point(i, 1.2);
          return (
            <g key={k}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--muted)] text-[11px] font-medium">
                {EMOTION_META[k].label}
              </text>
            </g>
          );
        })}
        {compare && <polygon points={poly(compare)} fill="var(--ai-1)" fillOpacity={0.16} stroke="var(--ai-1)" strokeWidth={2} strokeDasharray="5 4" />}
        <polygon points={poly(emotions)} fill="var(--accent)" fillOpacity={0.22} stroke="var(--accent)" strokeWidth={2} />
        {AXES.map((k, i) => {
          const [x, y] = point(i, scale(emotions[k] ?? 0));
          return <circle key={k} cx={x} cy={y} r={3} fill="var(--accent)" />;
        })}
      </svg>
      {compare && (
        <figcaption className="mt-2 flex justify-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-accent" /> {labels[0]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-ai-1" /> {labels[1]}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

export function VibeBars({ vibes, compare, className }: { vibes: Vibes; compare?: Vibes | null; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {VIBE_AXES.map((axis) => {
        const m = VIBE_META[axis];
        const pos = (v: number) => `${((Math.max(-1, Math.min(1, v * 1.6)) + 1) / 2) * 100}%`;
        return (
          <div key={axis}>
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>{m.left}</span>
              <span className="font-medium text-ink-2">{m.label}</span>
              <span>{m.right}</span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="absolute top-0 left-1/2 h-full w-px bg-line" />
              {compare && <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ai-1 bg-surface" style={{ left: pos(compare[axis]) }} />}
              <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow" style={{ left: pos(vibes[axis]) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
