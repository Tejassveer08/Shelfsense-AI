import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-accent">404</p>
      <h1 className="font-display mt-4 text-3xl font-semibold">This page has been checked out.</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find what you were looking for — maybe it&apos;s on another shelf.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Home</Link>
        <Link href="/librarian" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">Ask the librarian</Link>
      </div>
    </div>
  );
}
