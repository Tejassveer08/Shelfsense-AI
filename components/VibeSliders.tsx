"use client";

import { RotateCcw } from "lucide-react";
import { VIBE_META } from "@/lib/constants";
import type { Sliders, VibeAxis } from "@/lib/types";
import { VIBE_AXES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VibeSliders({ value, onChange, compact = false }: { value: Sliders; onChange: (v: Sliders) => void; compact?: boolean }) {
  const active = VIBE_AXES.some((a) => Math.abs(value[a] ?? 0) > 0.08);
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Vibe</h3>
        {active && (
          <button type="button" onClick={() => onChange({})} className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
            <RotateCcw className="size-3" /> Reset
          </button>
        )}
      </div>
      {VIBE_AXES.map((axis: VibeAxis) => {
        const meta = VIBE_META[axis];
        const v = value[axis] ?? 0;
        return (
          <div key={axis}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className={cn("transition", v < -0.08 ? "font-semibold text-ink" : "text-muted")}>{meta.left}</span>
              <span className={cn("transition", v > 0.08 ? "font-semibold text-ink" : "text-muted")}>{meta.right}</span>
            </div>
            <input
              type="range"
              className="vibe"
              min={-1}
              max={1}
              step={0.05}
              value={v}
              aria-label={`${meta.label}: ${meta.left} to ${meta.right}`}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange({ ...value, [axis]: Math.abs(n) < 0.06 ? 0 : n });
              }}
              onDoubleClick={() => onChange({ ...value, [axis]: 0 })}
            />
          </div>
        );
      })}
    </div>
  );
}
