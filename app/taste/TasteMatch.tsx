"use client";

import { Library, ThumbsDown, Wand2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookAutocomplete } from "@/components/BookAutocomplete";
import { BookCard, BookCardSkeleton } from "@/components/BookCard";
import { Cover } from "@/components/Cover";
import { StarInput } from "@/components/Stars";
import { api } from "@/lib/api";
import { tasteSignals, useShelf } from "@/lib/shelf";
import type { BookSummary, ScoredBook } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Pick extends BookSummary {
  rating: number;
}

const MODIFIERS = ["darker", "funnier", "shorter", "more romantic", "more literary", "set in space", "with magic", "more hopeful"];

export function TasteMatch() {
  const sp = useSearchParams();
  const shelfList = useShelf();
  const [loved, setLoved] = useState<Pick[]>([]);
  const [disliked, setDisliked] = useState<BookSummary[]>([]);
  const [modifier, setModifier] = useState("");
  const [appliedModifier, setAppliedModifier] = useState("");
  const [results, setResults] = useState<ScoredBook[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDislike, setShowDislike] = useState(false);

  // ?seed=<id> from a book page ("Like this, but…")
  useEffect(() => {
    const seed = sp.get("seed");
    if (!seed) return;
    api
      .book(seed)
      .then((b) => setLoved([{ id: b.id, title: b.title, authors: b.authors, cover: b.cover, year: b.year, rating: 5 }]))
      .catch(() => {});
  }, [sp]);

  const key = JSON.stringify([loved.map((l) => [l.id, l.rating]), disliked.map((d) => d.id), appliedModifier]);
  useEffect(() => {
    if (!loved.length) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .recommend(
          {
            loved: loved.map((l) => ({ id: l.id, rating: l.rating })),
            disliked: disliked.map((d) => d.id),
            modifier: appliedModifier || undefined,
            exclude: shelfList.filter((s) => s.status === "read").map((s) => s.id),
            limit: 24,
          },
          ctrl.signal,
        )
        .then((r) => setResults(r.results))
        .catch((e: Error) => e.name !== "AbortError" && setError(e.message))
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const shelfSignals = useMemo(() => tasteSignals(shelfList), [shelfList]);
  const importShelf = () => {
    const byId = new Map(shelfList.map((s) => [s.id, s]));
    const picks: Pick[] = shelfSignals.loved
      .slice(0, 12)
      .map((l) => ({ ...byId.get(l.id)!, rating: l.rating }))
      .filter((p) => p.id);
    setLoved((cur) => [...cur, ...picks.filter((p) => !cur.some((c) => c.id === p.id))].slice(0, 15));
    const dis = shelfSignals.disliked.map((id) => byId.get(id)!).filter(Boolean);
    if (dis.length) {
      setDisliked((cur) => [...cur, ...dis.filter((d) => !cur.some((c) => c.id === d.id))].slice(0, 8));
      setShowDislike(true);
    }
  };

  const allIds = [...loved.map((l) => l.id), ...disliked.map((d) => d.id)];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Taste Match</h1>
        <p className="mt-2 text-lg text-muted">
          Add books you loved. ShelfSense blends them into a taste profile and finds their closest relatives across the catalogue — then lets you bend it: <em>“like these, but darker.”</em>
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Books you loved</h2>
              {shelfSignals.loved.length > 0 && (
                <button type="button" onClick={importShelf} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                  <Library className="size-3.5" /> From my shelf
                </button>
              )}
            </div>
            <BookAutocomplete
              exclude={allIds}
              placeholder="Add a book you loved…"
              onPick={(b) => setLoved((cur) => (cur.length >= 15 ? cur : [...cur, { ...b, rating: 5 }]))}
            />
            <ul className="mt-4 space-y-3">
              {loved.map((l) => (
                <li key={l.id} className="fade-up flex items-center gap-3">
                  <Cover src={l.cover} title={l.title} author={l.authors[0]} className="w-10 shrink-0" sizes="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <StarInput size="sm" value={l.rating} onChange={(v) => setLoved((cur) => cur.map((c) => (c.id === l.id ? { ...c, rating: v ?? 3 } : c)))} label={`How much you loved ${l.title}`} />
                  </div>
                  <button type="button" aria-label={`Remove ${l.title}`} onClick={() => setLoved((cur) => cur.filter((c) => c.id !== l.id))} className="text-muted hover:text-ink">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
              {!loved.length && <li className="py-6 text-center text-sm text-muted">Start with one or more favourites.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Wand2 className="size-4 text-ai-1" /> Like these, but…
            </h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedModifier(modifier.trim());
              }}
            >
              <input
                value={modifier}
                onChange={(e) => setModifier(e.target.value)}
                placeholder="e.g. set in Japan, with more humour"
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-accent"
              />
              <button type="submit" className="rounded-xl bg-ink px-3 text-sm font-medium text-paper">
                Apply
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MODIFIERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const next = appliedModifier === m ? "" : m;
                    setModifier(next);
                    setAppliedModifier(next);
                  }}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", appliedModifier === m ? "border-ai-1 bg-ai-soft text-ink" : "border-line text-ink-2 hover:border-ink-2")}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <button type="button" onClick={() => setShowDislike((s) => !s)} className="flex w-full items-center justify-between font-semibold">
              <span className="flex items-center gap-2">
                <ThumbsDown className="size-4 text-muted" /> Not for me <span className="text-xs font-normal text-muted">(optional)</span>
              </span>
              <span className="text-xs text-muted">{showDislike ? "Hide" : disliked.length ? `${disliked.length} added` : "Add"}</span>
            </button>
            {showDislike && (
              <div className="mt-3">
                <p className="mb-3 text-xs text-muted">Recommendations are pushed away from these.</p>
                <BookAutocomplete exclude={allIds} placeholder="A book that wasn't for you…" onPick={(b) => setDisliked((cur) => (cur.length >= 8 ? cur : [...cur, b]))} />
                <ul className="mt-3 flex flex-wrap gap-2">
                  {disliked.map((d) => (
                    <li key={d.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pr-1.5 pl-3 text-xs">
                      {d.title}
                      <button type="button" aria-label={`Remove ${d.title}`} onClick={() => setDisliked((cur) => cur.filter((c) => c.id !== d.id))}>
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </aside>

        <section className="min-w-0">
          {!loved.length || (!results && !loading && !error) ? (
            <div className="grid h-full min-h-80 place-items-center rounded-3xl border border-dashed border-line p-10 text-center">
              <div>
                <Wand2 className="mx-auto size-10 text-ai-1" />
                <p className="font-display mt-4 text-2xl font-semibold">Your matches appear here</p>
                <p className="mt-1 text-muted">Add a favourite on the left to begin.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-semibold">
                  {appliedModifier ? (
                    <>
                      Like your picks, but <span className="ai-text">{appliedModifier}</span>
                    </>
                  ) : (
                    "Your closest matches"
                  )}
                </h2>
                {results && <p className="text-xs text-muted">Weighted by your star ratings{disliked.length ? ", steering away from dislikes" : ""}</p>}
              </div>
              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p>}
              <div className={cn("grid gap-4 transition-opacity xl:grid-cols-2", loading && results && "opacity-50")}>
                {!results && loading
                  ? Array.from({ length: 6 }, (_, i) => <BookCardSkeleton key={i} />)
                  : results?.map((b, i) => <BookCard key={b.id} book={{ ...b, snippet: b.snippet ?? b.description.split(/(?<=[.!?])\s/)[0] }} query={appliedModifier ? `like ${loved.map((l) => l.title).join(", ")} but ${appliedModifier}` : `books like ${loved.map((l) => l.title).join(", ")}`} index={i} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
