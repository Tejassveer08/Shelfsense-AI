"use client";

import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EXAMPLE_QUERIES } from "@/lib/constants";
import { searchHref } from "@/lib/utils";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLE_QUERIES.length), 3800);
    return () => clearInterval(t);
  }, []);

  const go = (query: string) => query.trim() && router.push(searchHref(query.trim()));

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q || EXAMPLE_QUERIES[i]);
        }}
        className="group relative flex items-center rounded-2xl border border-line bg-surface p-2 shadow-[0_10px_40px_-15px_rgb(var(--shadow)/0.35)] transition focus-within:border-accent"
      >
        <Search className="ml-3 size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor="hero-q" className="sr-only">
          Describe the book you want to read
        </label>
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={EXAMPLE_QUERIES[i]}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted/80 sm:text-lg"
        />
        <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-white transition hover:brightness-110 sm:px-6">
          <span className="hidden sm:inline">Find books</span>
          <ArrowRight className="size-5" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 text-muted">
          <Sparkles className="size-3.5 text-ai-1" /> Try:
        </span>
        {EXAMPLE_QUERIES.slice(0, 4).map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => go(ex)}
            className="rounded-full border border-line bg-surface/70 px-3 py-1 text-ink-2 transition hover:border-accent hover:text-accent"
          >
            {ex.length > 44 ? `${ex.slice(0, 42)}…` : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
