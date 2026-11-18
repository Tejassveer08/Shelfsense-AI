"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Rail } from "./Rail";
import { api } from "@/lib/api";
import { tasteSignals, useShelf } from "@/lib/shelf";
import type { ScoredBook } from "@/lib/types";

/** Personal recommendations from the reader's shelf (hidden until they have one). */
export function ForYouRail() {
  const shelf = useShelf();
  const signals = useMemo(() => tasteSignals(shelf), [shelf]);
  const key = signals.loved.map((l) => `${l.id}:${l.rating}`).join(",") + "|" + signals.disliked.join(",");
  const [state, setState] = useState<{ key: string; books: ScoredBook[] } | null>(null);

  useEffect(() => {
    if (!signals.loved.length) return;
    const ctrl = new AbortController();
    api
      .recommend({ loved: signals.loved.slice(0, 30), disliked: signals.disliked, exclude: shelf.map((s) => s.id), limit: 18 }, ctrl.signal)
      .then((r) => setState({ key, books: r.results }))
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!signals.loved.length) return null;
  const loading = state?.key !== key;
  return (
    <Rail
      title={<span>Picked for <span className="ai-text">you</span></span>}
      icon={<Sparkles className="size-5 text-ai-1" />}
      subtitle={`Based on ${signals.loved.length} book${signals.loved.length > 1 ? "s" : ""} on your shelf`}
      books={state?.books ?? []}
      loading={loading}
      href="/shelf"
    />
  );
}
