"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const db = /MONGODB_URI|ECONNREFUSED|Server selection|unreachable/i.test(error.message);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{db ? "The library is closed right now" : "Something went wrong"}</h1>
      <p className="mt-2 text-muted">
        {db ? "ShelfSense can't reach its book database. Check MONGODB_URI and /api/health." : "An unexpected error occurred while loading this page."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Try again</button>
        <Link href="/" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">Home</Link>
      </div>
    </div>
  );
}
