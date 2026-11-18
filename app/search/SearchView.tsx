"use client";

import { MessagesSquare, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookCard, BookCardSkeleton } from "@/components/BookCard";
import { FiltersPanel } from "@/components/FiltersPanel";
import { VibeSliders } from "@/components/VibeSliders";
import { api } from "@/lib/api";
import { MOODS } from "@/lib/constants";
import { useShelf } from "@/lib/shelf";
import type { Emotion, Filters, SearchResponse, Sliders } from "@/lib/types";
import { cn } from "@/lib/utils";

const NUM = (v: string | null) => (v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const SLIDER_KEYS = { dark_light: "dl", pacing: "pc", cerebral_escapist: "ce", length_scale: "ls" } as const;

function readState(sp: URLSearchParams) {
  const mood = MOODS.find((m) => m.slug === sp.get("mood"));
  // only keys present in the URL: an explicit null would clear what the query parser inferred
  const raw: Filters = {
    category: sp.get("category"),
    tone: (sp.get("tone") as Emotion | null) ?? null,
    yearMin: NUM(sp.get("yearMin")),
    yearMax: NUM(sp.get("yearMax")),
    maxPages: NUM(sp.get("maxPages")),
    minRating: NUM(sp.get("minRating")),
    minRatings: NUM(sp.get("minRatings")),
  };
  const filters = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== undefined)) as Filters;
  const sliders: Sliders = { ...(mood?.sliders ?? {}) };
  for (const [axis, k] of Object.entries(SLIDER_KEYS)) {
    const v = NUM(sp.get(k));
    if (v !== null) sliders[axis as keyof Sliders] = v;
  }
  return { q: sp.get("q") ?? "", filters, sliders, mood };
}

export function SearchView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = useMemo(() => readState(new URLSearchParams(sp.toString())), [sp]);
  const [input, setInput] = useState(initial.q);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sliders, setSliders] = useState<Sliders>(initial.sliders);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(false);
  const [hideRead, setHideRead] = useState(true);
  const shelfList = useShelf();
  const readIds = useMemo(() => shelfList.filter((s) => s.status === "read").map((s) => s.id), [shelfList]);
  const ctrl = useRef<AbortController | null>(null);

  const written = useRef<string | null>(null);
  const adopted = useRef<string | null>(null);

  // when the URL changes (new search from the header, back/forward), adopt it —
  // but not when the change is our own replaceState mirroring below
  useEffect(() => {
    if (written.current === sp.toString()) return;
    setInput(initial.q);
    setFilters(initial.filters);
    setSliders(initial.sliders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const q = initial.q;
  const requestKey = JSON.stringify({ q, filters, sliders, hide: hideRead ? readIds : [] });

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setLoading(true);
      setError(null);
      api
        .search({ query: q, filters, sliders, limit: 24, excludeIds: hideRead ? readIds : [] }, c.signal)
        .then((r) => {
          setRes(r);
          // show what the query parser inferred in the sidebar, so it can be adjusted or cleared
          if (adopted.current !== q) {
            adopted.current = q;
            setFilters((prev) => ({ ...r.appliedFilters, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== null && v !== undefined)) }));
            setSliders((prev) => ({ ...r.appliedSliders, ...prev }));
          }
        })
        .catch((e: Error) => e.name !== "AbortError" && setError(e.message))
        .finally(() => !c.signal.aborted && setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // mirror filters/sliders into the URL (shareable searches) without a navigation
  useEffect(() => {
    if (!q) return;
    const p = new URLSearchParams({ q });
    if (initial.mood) p.set("mood", initial.mood.slug);
    for (const [k, v] of Object.entries(filters)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
    for (const [axis, k] of Object.entries(SLIDER_KEYS)) {
      const v = sliders[axis as keyof Sliders];
      if (v && Math.abs(v) > 0.05 && v !== initial.mood?.sliders[axis as keyof Sliders]) p.set(k, v.toFixed(2));
    }
    const next = `${pathname}?${p.toString()}`;
    if (p.toString() !== sp.toString()) {
      written.current = p.toString();
      window.history.replaceState(null, "", next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sliders]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) router.push(`/search?q=${encodeURIComponent(input.trim())}`);
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== null && v !== undefined && v !== "").length;
  const sidebar = (
    <div className="space-y-8">
      <VibeSliders value={sliders} onChange={setSliders} />
      <FiltersPanel value={filters} onChange={setFilters} />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        Hide books I&apos;ve read
      </label>
      {activeFilterCount > 0 && (
        <button type="button" onClick={() => setFilters({})} className="text-sm text-muted underline hover:text-ink">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <form onSubmit={submit} className="relative mb-6 max-w-3xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search books"
          placeholder="Describe the book you want…"
          className="h-14 w-full rounded-2xl border border-line bg-surface pr-28 pl-12 text-lg outline-none focus:border-accent"
        />
        <button type="submit" className="absolute top-2 right-2 h-10 rounded-xl bg-accent px-5 text-sm font-medium text-white hover:brightness-110">
          Search
        </button>
      </form>

      {!q ? (
        <EmptyState />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-8">{sidebar}</div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {initial.mood && (
                <span className={cn("rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white", initial.mood.gradient)}>{initial.mood.name}</span>
              )}
              {res?.intent.chips.length ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Sparkles className="size-3.5 text-ai-1" /> Understood:
                  </span>
                  {res.intent.chips.map((c) => (
                    <span key={c} className="rounded-full bg-ai-soft px-2.5 py-1 text-xs font-medium text-ink">
                      {c}
                    </span>
                  ))}
                </>
              ) : null}
              <button type="button" onClick={() => setPanel(true)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm lg:hidden">
                <SlidersHorizontal className="size-4" /> Refine{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
            </div>

            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">
                {res && !loading ? (res.results.length ? `${res.results.length} books for` : "No books found for") : "Searching for"}{" "}
                <span className="text-accent">“{q}”</span>
              </h1>
              {res && !loading && (
                <p className="hidden shrink-0 text-xs text-muted sm:block">
                  {res.mode === "hybrid" ? "Meaning + keywords" : res.mode === "semantic" ? "Meaning" : "Keywords only"} · {res.tookMs} ms
                </p>
              )}
            </div>

            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p>}

            <div className={cn("grid gap-4 transition-opacity xl:grid-cols-2", loading && res && "opacity-50")}>
              {!res && loading
                ? Array.from({ length: 6 }, (_, i) => <BookCardSkeleton key={i} />)
                : res?.results.map((b, i) => <BookCard key={b.id} book={b} query={q} index={i} />)}
            </div>

            {res && !loading && (
              <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-6 text-center sm:flex-row sm:text-left">
                <MessagesSquare className="size-8 shrink-0 text-ai-1" />
                <div className="flex-1">
                  <p className="font-semibold">Not quite it?</p>
                  <p className="text-sm text-muted">Tell the AI librarian what&apos;s missing and it will refine the search with you.</p>
                </div>
                <Link href={`/librarian?q=${encodeURIComponent(q)}`} className="ai-gradient rounded-full px-5 py-2 text-sm font-medium text-white">
                  Refine with AI
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {panel && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Refine results">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanel(false)} />
          <div className="fade-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-paper p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Refine</h2>
              <button type="button" onClick={() => setPanel(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
                <X className="size-5" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="font-display text-3xl font-semibold">What do you feel like reading?</p>
      <p className="mt-2 text-muted">Describe a mood, a plot, or a book you loved.</p>
    </div>
  );
}
