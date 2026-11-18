"use client";

import { useState } from "react";
import { cn, coverPalette } from "@/lib/utils";

/** Book cover with a typographic fallback for missing or broken images. */
export function Cover({
  src,
  title,
  author,
  className,
  sizes = "md",
  priority = false,
}: {
  src?: string;
  title: string;
  author?: string;
  className?: string;
  sizes?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  // Goodreads serves a sharper "l" (large) variant next to the stored "m" (medium) cover.
  const hiRes = src?.replace(/(\/books\/\d+)m\//, "$1l/");
  const [attempt, setAttempt] = useState(0);
  const current = attempt === 0 ? hiRes : attempt === 1 && hiRes !== src ? src : undefined;
  const failed = !current;
  const showImage = src && !failed;
  const [a, b] = coverPalette(title + (author ?? ""));
  return (
    <div className={cn("book-spine book-shadow relative aspect-[2/3] overflow-hidden rounded-[4px] bg-surface-2", className)}>
      {showImage ? (
        <img
          src={current}
          alt={`Cover of ${title}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setAttempt((a) => a + 1)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[8%] text-white"
          style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}
          role="img"
          aria-label={`Cover of ${title}`}
        >
          <div className="h-px w-1/3 bg-white/50" />
          <p
            className={cn(
              "font-display leading-[1.1] font-semibold [overflow-wrap:anywhere]",
              sizes === "sm" ? "text-[11px]" : sizes === "lg" ? "text-2xl" : "text-sm",
            )}
          >
            {title.length > 70 ? `${title.slice(0, 67)}…` : title}
          </p>
          {author ? (
            <p className={cn("tracking-wide text-white/75 uppercase", sizes === "lg" ? "text-xs" : "text-[9px]")}>{author}</p>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
