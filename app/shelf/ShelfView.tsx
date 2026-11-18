"use client";

import { Check, Dna, Link2, Loader2, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Cover } from "@/components/Cover";
import { DnaRadar, VibeBars } from "@/components/DnaRadar";
import { ForYouRail } from "@/components/ForYouRail";
import { STATUS_LABEL } from "@/components/ShelfButton";
import { StarInput } from "@/components/Stars";
import { api } from "@/lib/api";
import { parseGoodreadsExport } from "@/lib/goodreadsImport";
import { shelf, useShelf } from "@/lib/shelf";
import type { ReaderInsights, ShelfEntry, ShelfStatus } from "@/lib/types";
import { bookHref, cn, searchHref } from "@/lib/utils";

const TABS: ("all" | ShelfStatus)[] = ["all", "reading", "want", "read"];

export function ShelfView() {
  const list = useShelf();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const shown = useMemo(() => (tab === "all" ? list : list.filter((e) => e.status === tab)), [list, tab]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t, t === "all" ? list.length : list.filter((e) => e.status === t).length])), [list]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">My Shelf</h1>
          <p className="mt-2 text-muted">Saved in this browser. Rate what you&apos;ve read — 4-5 stars pull recommendations closer, 1-2 push them away.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GoodreadsImport />
          {list.length > 0 && <ShareShelf entries={list} />}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line p-12 text-center">
          <p className="font-display text-2xl font-semibold">Your shelf is empty</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Add books from search, the librarian or any book page — or import your whole Goodreads library in one go.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/discover" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
              Browse books
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ReadingDna entries={list} />
          <ForYouRail />
          <div className="mt-6 flex gap-1 border-b border-line" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn("-mb-px border-b-2 px-4 py-3 text-sm font-medium", tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {t === "all" ? "All" : STATUS_LABEL[t]} <span className="ml-1 text-xs text-muted">{counts[t]}</span>
              </button>
            ))}
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e) => (
              <ShelfItem key={e.id} entry={e} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ShelfItem({ entry }: { entry: ShelfEntry }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
      <Link href={bookHref(entry.id)} className="w-16 shrink-0">
        <Cover src={entry.cover} title={entry.title} author={entry.authors[0]} sizes="sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={bookHref(entry.id)} className="line-clamp-2 leading-snug font-semibold hover:text-accent">
          {entry.title}
        </Link>
        <p className="truncate text-xs text-muted">{entry.authors.join(", ")}</p>
        <div className="mt-2">
          <StarInput size="sm" value={entry.myRating} onChange={(v) => shelf.rate(entry, v)} label={`Your rating for ${entry.title}`} />
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <select
            value={entry.status}
            onChange={(e) => shelf.set(entry, e.target.value as ShelfStatus)}
            aria-label="Shelf"
            className="h-8 rounded-lg border border-line bg-paper px-2 text-xs outline-none"
          >
            {(Object.keys(STATUS_LABEL) as ShelfStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => shelf.remove(entry.id)} aria-label={`Remove ${entry.title}`} className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ReadingDna({ entries }: { entries: ShelfEntry[] }) {
  const [data, setData] = useState<ReaderInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligible = entries.filter((e) => e.status !== "want" || e.myRating);
  const source = eligible.length >= 3 ? eligible : entries;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.insights(source.slice(0, 300).map((e) => ({ id: e.id, rating: e.myRating }))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't analyse your shelf.");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <section className="ai-border mt-8 flex flex-col items-start gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
        <span className="ai-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-white">
          <Dna className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold">Reveal your reading DNA</h2>
          <p className="text-sm text-muted">An emotional fingerprint of your shelf, your vibe, favourite genres — and an AI-written reader persona.</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <button type="button" onClick={run} disabled={loading} className="ai-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Analyse {source.length} book{source.length === 1 ? "" : "s"}
        </button>
      </section>
    );
  }

  const maxCat = Math.max(...data.categories.map((c) => c.count), 1);
  const maxDec = Math.max(...data.decades.map((d) => d.count), 1);
  return (
    <section className="fade-up mt-8 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="hero-glow border-b border-line p-6 sm:p-8">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
          <Sparkles className="size-3.5 text-ai-1" /> Your reader persona {data.aiPowered ? "" : "(offline)"}
        </p>
        <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">{data.persona.title}</h2>
        <p className="mt-3 max-w-3xl text-ink-2">{data.persona.summary}</p>
        {data.persona.suggestions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-xs text-muted">Go looking for:</span>
            {data.persona.suggestions.map((s) => (
              <Link key={s} href={searchHref(s)} className="rounded-full border border-ai-1/40 bg-surface/70 px-3 py-1 text-xs font-medium hover:bg-ai-soft">
                {s}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Emotional fingerprint</h3>
          <DnaRadar emotions={data.emotions} size={260} />
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Your vibe</h3>
            <VibeBars vibes={data.vibes} />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Books", data.count],
              ["Avg pages", data.avgPages || "—"],
              ["Avg rating", data.avgRating ? data.avgRating.toFixed(2) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-2 p-3">
                <dd className="font-display text-2xl font-semibold">{v}</dd>
                <dt className="text-xs text-muted">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Top categories</h3>
            <ul className="space-y-2">
              {data.categories.slice(0, 5).map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-muted tabular-nums">{c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {data.decades.length > 1 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Eras you read</h3>
              <div className="flex h-20 items-end gap-1">
                {data.decades.slice(-10).map((d) => (
                  <div key={d.decade} className="flex flex-1 flex-col items-center gap-1" title={`${d.decade}s: ${d.count}`}>
                    <div className="w-full rounded-t bg-ai-1/70" style={{ height: `${(d.count / maxDec) * 60 + 4}px` }} />
                    <span className="text-[10px] text-muted">{String(d.decade).slice(2)}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.genres.slice(0, 10).map((g) => (
                <Link key={g.name} href={searchHref(g.name)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink-2">
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-line px-6 py-3 text-right">
        <button type="button" onClick={run} className="text-xs text-muted hover:text-ink">
          {loading ? "Refreshing…" : "Refresh analysis"}
        </button>
      </div>
    </section>
  );
}

function ShareShelf({ entries }: { entries: ShelfEntry[] }) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const share = async () => {
    setState("busy");
    try {
      const res = await api.shareShelf({
        books: entries.slice(0, 300).map((rest) => ({
          id: rest.id,
          title: rest.title,
          authors: rest.authors.slice(0, 5),
          cover: rest.cover,
          status: rest.status,
          myRating: rest.myRating,
        })),
      });
      const full = `${location.origin}${res.url}`;
      setUrl(full);
      await navigator.clipboard?.writeText(full).catch(() => {});
      setState("copied");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={share} disabled={state === "busy"} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink-2">
        {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : state === "copied" ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
        {state === "copied" ? "Link copied" : state === "error" ? "Try again" : "Share shelf"}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted underline">
          <Link2 className="size-3.5" /> Open
        </a>
      )}
    </div>
  );
}

function GoodreadsImport() {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col items-end">
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setMsg(null);
          try {
            const rows = parseGoodreadsExport(await file.text()).slice(0, 3000);
            const { results } = await api.lookup(rows.map(({ id, isbn13, title, author }) => ({ id, isbn13, title, author })));
            const entries = results.flatMap((b, i) => (b ? [{ ...b, status: rows[i].status, myRating: rows[i].rating }] : []));
            const added = shelf.importMany(entries);
            setMsg(`Imported ${added} new book${added === 1 ? "" : "s"} (${entries.length} of ${rows.length} found in the catalogue).`);
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Import failed.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink-2" title="Goodreads → My Books → Import and export → Export library">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import Goodreads library
      </button>
      {msg && <p className="mt-2 max-w-xs text-right text-xs text-muted">{msg}</p>}
    </div>
  );
}
