"use client";

import { ArrowUp, Loader2, RotateCcw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { Cover } from "@/components/Cover";
import { ShelfButton } from "@/components/ShelfButton";
import { useShelf } from "@/lib/shelf";
import type { ChatMessage, LibrarianPlan, ScoredBook } from "@/lib/types";
import { asSummary, bookHref, cn } from "@/lib/utils";

interface Turn extends ChatMessage {
  plan?: LibrarianPlan;
  streaming?: boolean;
  error?: string;
}

const STARTERS = [
  "I just finished The Martian and need something with the same energy",
  "A short, beautifully written novel I can read on a train journey",
  "Something cozy for a rainy weekend, but not too twee",
  "Help me get into fantasy — I usually read literary fiction",
  "A nonfiction book that reads like a thriller",
  "Recommend a book for my dad who loves WWII history and spy stories",
];

const STORE = "shelfsense.librarian.v1";

export function LibrarianChat() {
  const sp = useSearchParams();
  const shelfList = useShelf();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const booted = useRef(false);

  // restore the conversation for this browser tab
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let restored: Turn[] = [];
    try {
      restored = JSON.parse(sessionStorage.getItem(STORE) ?? "[]");
    } catch {}
    const q = sp.get("q");
    if (q) {
      setTurns([]);
      void send(`I searched for “${q}”. Help me find something even better.`, []);
    } else if (restored.length) {
      setTurns(restored.map((t) => ({ ...t, streaming: false })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-30)));
    } catch {}
  }, [turns]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(text: string, history = turns) {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setInput("");
    const userTurn: Turn = { role: "user", content };
    const next = [...history, userTurn];
    setTurns([...next, { role: "assistant", content: "", streaming: true }]);
    const previous = [...history].reverse().find((t) => t.plan)?.plan;
    const shownIds = history.flatMap((t) => t.books?.map((b) => b.id) ?? []);
    const readIds = shelfList.filter((s) => s.status === "read").map((s) => s.id);

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((all) => {
        const copy = [...all];
        copy[copy.length - 1] = fn(copy[copy.length - 1]);
        return copy;
      });

    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          previous,
          shownIds: shownIds.slice(-200),
          readIds: readIds.slice(0, 400),
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "The librarian is unavailable.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "plan") patch((t) => ({ ...t, plan: ev.plan }));
          else if (ev.type === "books") patch((t) => ({ ...t, books: ev.books }));
          else if (ev.type === "text") patch((t) => ({ ...t, content: t.content + ev.delta }));
          else if (ev.type === "error") patch((t) => ({ ...t, error: ev.message }));
        }
      }
    } catch (e) {
      patch((t) => ({ ...t, error: e instanceof Error ? e.message : "Something went wrong." }));
    } finally {
      patch((t) => ({ ...t, streaming: false }));
      setBusy(false);
      textarea.current?.focus();
    }
  }

  const empty = turns.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 sm:px-6">
      {empty ? (
        <div className="fade-up flex flex-1 flex-col justify-center py-12">
          <span className="ai-gradient grid size-14 place-items-center rounded-2xl text-white shadow-lg">
            <Sparkles className="size-7" />
          </span>
          <h1 className="font-display mt-6 text-4xl font-semibold sm:text-5xl">
            Your <span className="ai-text">AI librarian</span>
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Tell me what you loved, what you&apos;re in the mood for, or who you&apos;re buying for. I&apos;ll search the catalogue and explain every pick — then we refine together.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-line bg-surface p-3.5 text-left text-sm transition hover:border-ai-1/50 hover:bg-ai-soft">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-8 py-8">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                sessionStorage.removeItem(STORE);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> New conversation
            </button>
          </div>
          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-paper">{t.content}</p>
              </div>
            ) : (
              <AssistantTurn key={i} turn={t} />
            ),
          )}
          <div ref={bottom} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 bg-gradient-to-t from-paper via-paper to-transparent pt-6 pb-6"
      >
        <div className="ai-border flex items-end gap-2 rounded-2xl p-2 shadow-lg">
          <textarea
            ref={textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={empty ? "e.g. a smart thriller set in academia, under 400 pages" : "Refine: darker? shorter? more like the second one?"}
            aria-label="Message the librarian"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="ai-gradient grid size-11 shrink-0 place-items-center rounded-xl text-white transition disabled:opacity-40">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const plan = turn.plan;
  const chips = plan
    ? [
        plan.filters.category,
        plan.filters.tone,
        plan.filters.maxPages ? `≤ ${plan.filters.maxPages} pages` : null,
        plan.filters.minRating ? `★ ${plan.filters.minRating}+` : null,
        plan.filters.yearMin || plan.filters.yearMax ? `${plan.filters.yearMin ?? "…"}–${plan.filters.yearMax ?? "now"}` : null,
      ].filter(Boolean)
    : [];
  return (
    <div className="fade-up flex gap-3">
      <span className="ai-gradient mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-white">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-4">
        {plan && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Search className="size-3.5" /> Searched for <span className="font-medium text-ink-2">“{plan.searchQuery}”</span>
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-surface-2 px-2 py-0.5">
                {c}
              </span>
            ))}
          </p>
        )}
        {!turn.content && turn.streaming && !turn.error && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> {plan ? (turn.books ? "Choosing the best fits…" : "Searching the stacks…") : "Thinking…"}
          </p>
        )}
        {turn.content && <RichText text={turn.content} books={turn.books ?? []} streaming={turn.streaming} />}
        {turn.error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{turn.error}</p>}
        {turn.books && turn.books.length > 0 && <MiniCards books={turn.books} mentioned={turn.content} />}
      </div>
    </div>
  );
}

/** Minimal Markdown: paragraphs, **bold** (linked when it names a retrieved book), bullet lines. */
function RichText({ text, books, streaming }: { text: string; books: ScoredBook[]; streaming?: boolean }) {
  const byTitle = new Map(books.map((b) => [b.title.toLowerCase(), b]));
  const paras = text.split(/\n{2,}/);
  return (
    <div className={cn("space-y-3 leading-relaxed text-ink", streaming && "caret")}>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
            const m = seg.match(/^\*\*([^*]+)\*\*$/);
            if (!m) return <Fragment key={j}>{seg.replace(/^\s*[-*]\s+/gm, "• ")}</Fragment>;
            const book = byTitle.get(m[1].toLowerCase()) ?? books.find((b) => m[1].toLowerCase().includes(b.title.toLowerCase()));
            return book ? (
              <Link key={j} href={bookHref(book.id)} className="font-semibold text-accent hover:underline">
                {m[1]}
              </Link>
            ) : (
              <strong key={j}>{m[1]}</strong>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function MiniCards({ books, mentioned }: { books: ScoredBook[]; mentioned: string }) {
  // books the librarian talked about first, then the rest of the candidates
  const lower = mentioned.toLowerCase();
  const sorted = [...books].sort((a, b) => Number(lower.includes(b.title.toLowerCase())) - Number(lower.includes(a.title.toLowerCase())));
  return (
    <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {sorted.map((b) => (
        <div key={b.id} className="group relative w-32 shrink-0">
          <Link href={bookHref(b.id)}>
            <Cover src={b.cover} title={b.title} author={b.authors[0]} sizes="sm" />
            <p className="mt-2 line-clamp-2 text-xs font-semibold group-hover:text-accent">{b.title}</p>
            <p className="truncate text-[11px] text-muted">{b.authors[0]}</p>
          </Link>
          <div className="absolute top-1.5 right-1.5">
            <ShelfButton book={asSummary(b)} variant="icon" />
          </div>
        </div>
      ))}
    </div>
  );
}
