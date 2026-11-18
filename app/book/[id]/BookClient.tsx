"use client";

import { GitCompareArrows, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookAutocomplete } from "@/components/BookAutocomplete";
import { DnaRadar, VibeBars } from "@/components/DnaRadar";
import { StarInput } from "@/components/Stars";
import { api } from "@/lib/api";
import { shelf, tasteSignals, useShelf, useShelfEntry } from "@/lib/shelf";
import type { Book, BookSummary } from "@/lib/types";
import { bookHref, cn } from "@/lib/utils";

export function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 650;
  return (
    <div>
      <div className={cn("space-y-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-2", !open && long && "line-clamp-[8]")}>{text}</div>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-medium text-accent hover:underline">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function MyRating({ book }: { book: BookSummary }) {
  const entry = useShelfEntry(book.id);
  return (
    <div className="flex items-center gap-3">
      <StarInput value={entry?.myRating} onChange={(v) => shelf.rate(book, v)} />
      <span className="text-xs text-muted">{entry?.myRating ? "Your rating" : "Rate it"}</span>
    </div>
  );
}

/** "Your match": how this book fits the reader's shelf, with an AI verdict. */
export function YourMatch({ book }: { book: Book }) {
  const list = useShelf();
  const signals = useMemo(() => tasteSignals(list.filter((e) => e.id !== book.id)), [list, book.id]);
  const key = signals.loved.map((l) => l.id + l.rating).join(",") + signals.disliked.join(",");
  const [state, setState] = useState<{ key: string; data?: Awaited<ReturnType<typeof api.fit>>; error?: boolean } | null>(null);

  useEffect(() => {
    if (!signals.loved.length) return;
    let live = true;
    api
      .fit(book.id, signals.loved.slice(0, 40), signals.disliked)
      .then((data) => live && setState({ key, data }))
      .catch(() => live && setState({ key, error: true }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, book.id]);

  if (!signals.loved.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-5">
        <p className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-ai-1" /> Is this for you?
        </p>
        <p className="mt-1 text-sm text-muted">
          Rate a few books you&apos;ve read (or add them to your <Link href="/shelf" className="underline">shelf</Link>) and ShelfSense will score every book against your taste.
        </p>
      </div>
    );
  }
  const loading = state?.key !== key;
  const data = !loading ? state?.data : undefined;
  const color = !data ? "var(--line)" : data.score >= 75 ? "#16a34a" : data.score >= 50 ? "var(--star)" : "#dc2626";
  return (
    <div className="ai-border rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative grid size-16 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
            {data && <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(data.score / 100) * 97.4} 97.4`} />}
          </svg>
          {loading ? <Loader2 className="size-5 animate-spin text-muted" /> : <span className="text-lg font-bold tabular-nums">{data ? data.score : "–"}</span>}
        </div>
        <div>
          <p className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-4 text-ai-1" /> Your match
          </p>
          <p className="text-xs text-muted">Based on {signals.loved.length} book{signals.loved.length > 1 ? "s" : ""} you loved</p>
        </div>
      </div>
      {data && <p className="fade-up mt-4 text-sm leading-relaxed">{data.verdict}</p>}
      {data?.closest.length ? (
        <p className="mt-3 text-xs text-muted">
          Closest on your shelf:{" "}
          {data.closest.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={bookHref(c.id)} className="underline hover:text-ink">
                {c.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {state?.error && !loading && <p className="mt-3 text-sm text-muted">Couldn&apos;t score this one right now.</p>}
    </div>
  );
}

export function DnaPanel({ book }: { book: Book }) {
  const [other, setOther] = useState<Book | null>(null);
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <DnaRadar emotions={book.emotions} compare={other?.emotions} labels={[book.title, other?.title]} />
      </div>
      <div className="flex flex-col">
        <VibeBars vibes={book.vibes} compare={other?.vibes} />
        <div className="mt-6">
          {other ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ai-soft px-4 py-3 text-sm">
              <span className="min-w-0 truncate">
                Comparing with <Link href={bookHref(other.id)} className="font-semibold hover:underline">{other.title}</Link>
              </span>
              <button type="button" onClick={() => setOther(null)} aria-label="Stop comparing" className="shrink-0 text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          ) : picking ? (
            <div className="relative">
              <BookAutocomplete
                autoFocus
                exclude={[book.id]}
                placeholder="Compare with another book…"
                onPick={async (b) => {
                  setLoading(true);
                  try {
                    setOther(await api.book(b.id));
                    setPicking(false);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              {loading && <Loader2 className="absolute top-3.5 right-10 size-4 animate-spin" />}
            </div>
          ) : (
            <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink-2">
              <GitCompareArrows className="size-4" /> Compare DNA with another book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
