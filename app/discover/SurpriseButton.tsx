"use client";

import { Dices, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { bookHref } from "@/lib/utils";

export function SurpriseButton({ category }: { category?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { book } = await api.surprise(category);
          if (book) router.push(bookHref(book.id));
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Dices className="size-4" />}
      Surprise me{category ? ` · ${category}` : ""}
    </button>
  );
}
