"use client";

import { BookmarkPlus, Check, ChevronDown, BookOpen, BookMarked, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { shelf, useShelfEntry } from "@/lib/shelf";
import type { BookSummary, ShelfStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<ShelfStatus, string> = { want: "Want to read", reading: "Reading", read: "Read" };
const STATUS_ICON = { want: BookmarkPlus, reading: BookOpen, read: BookMarked };

export function ShelfButton({ book, variant = "default", className }: { book: BookSummary; variant?: "default" | "icon" | "large"; className?: string }) {
  const entry = useShelfEntry(book.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const Icon = entry ? STATUS_ICON[entry.status] : BookmarkPlus;
  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (entry) setOpen((o) => !o);
            else shelf.set(book, "want");
          }}
          aria-label={entry ? `On shelf: ${STATUS_LABEL[entry.status]}` : "Add to Want to read"}
          title={entry ? STATUS_LABEL[entry.status] : "Want to read"}
          className={cn(
            "grid size-9 place-items-center rounded-full border shadow-sm backdrop-blur transition",
            entry ? "border-accent bg-accent text-white" : "border-line bg-surface/90 text-ink hover:border-accent hover:text-accent",
          )}
        >
          {entry ? <Check className="size-4" /> : <BookmarkPlus className="size-4" />}
        </button>
      ) : (
        <div className={cn("inline-flex overflow-hidden rounded-full border text-sm font-medium", entry ? "border-accent" : "border-ink")}>
          <button
            type="button"
            onClick={() => (entry ? setOpen((o) => !o) : shelf.set(book, "want"))}
            className={cn(
              "inline-flex items-center gap-2 transition",
              variant === "large" ? "px-5 py-2.5" : "px-3.5 py-1.5",
              entry ? "bg-accent-soft text-accent" : "bg-ink text-paper hover:opacity-90",
            )}
          >
            <Icon className="size-4" />
            {entry ? STATUS_LABEL[entry.status] : "Want to read"}
          </button>
          <button
            type="button"
            aria-label="Choose shelf"
            onClick={() => setOpen((o) => !o)}
            className={cn("border-l px-2 transition", entry ? "border-accent bg-accent-soft text-accent" : "border-paper/30 bg-ink text-paper hover:opacity-90")}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
      {open && (
        <div
          role="menu"
          className="fade-up absolute top-full right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {(Object.keys(STATUS_LABEL) as ShelfStatus[]).map((s) => {
            const I = STATUS_ICON[s];
            return (
              <button
                key={s}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  shelf.set(book, s);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <I className="size-4 text-muted" />
                {STATUS_LABEL[s]}
                {entry?.status === s && <Check className="ml-auto size-4 text-accent" />}
              </button>
            );
          })}
          {entry && (
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                shelf.remove(book.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-surface-2 dark:text-red-400"
            >
              <Trash2 className="size-4" /> Remove from shelf
            </button>
          )}
        </div>
      )}
    </div>
  );
}
