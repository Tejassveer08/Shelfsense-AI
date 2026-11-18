"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Cover } from "./Cover";
import { api } from "@/lib/api";
import type { BookSummary } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

/** Title/author typeahead backed by Atlas Search autocomplete. */
export function BookAutocomplete({
  onPick,
  placeholder = "Search by title or author…",
  exclude = [],
  autoFocus,
  className,
}: {
  onPick: (b: BookSummary) => void;
  placeholder?: string;
  exclude?: string[];
  autoFocus?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      api
        .autocomplete(q, ctrl.signal)
        .then((r) => {
          setItems(r.results.filter((b) => !exclude.includes(b.id)));
          setActive(0);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const visible = q.trim().length >= 2 ? items : [];

  const pick = (b: BookSummary) => {
    onPick(b);
    setQ("");
    setItems([]);
    setOpen(false);
  };

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !visible.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(visible.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(visible[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-12 w-full rounded-xl border border-line bg-surface pr-10 pl-10 text-sm outline-none focus:border-accent"
      />
      {loading && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" />}
      {open && visible.length > 0 && (
        <ul id={listId} role="listbox" className="fade-up absolute z-40 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-2xl">
          {visible.map((b, i) => (
            <li key={b.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(b)}
                className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left", i === active && "bg-surface-2")}
              >
                <Cover src={b.cover} title={b.title} author={b.authors[0]} className="w-9 shrink-0" sizes="sm" />
                <span className="min-w-0">
                  <span className="line-clamp-1 text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {b.authors[0]}
                    {b.year ? ` · ${b.year}` : ""}
                    {b.ratings ? ` · ${formatCount(b.ratings)} ratings` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
