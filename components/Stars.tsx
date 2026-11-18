"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn, formatCount } from "@/lib/utils";

export function RatingBadge({ rating, ratings, className }: { rating: number; ratings?: number; className?: string }) {
  if (!rating) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted tabular-nums", className)}>
      <Star className="size-3.5 fill-star text-star" aria-hidden />
      <span className="font-medium text-ink-2">{rating.toFixed(2)}</span>
      {ratings ? <span>({formatCount(ratings)})</span> : null}
    </span>
  );
}

/** Interactive 1-5 star input. */
export function StarInput({
  value,
  onChange,
  size = "md",
  label = "Your rating",
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="inline-flex items-center" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(value === n ? undefined : n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn(size === "sm" ? "size-4" : "size-5", n <= shown ? "fill-star text-star" : "text-line")}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
