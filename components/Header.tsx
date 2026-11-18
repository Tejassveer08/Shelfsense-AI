"use client";

import { Library, Menu, Moon, Search, Sparkles, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useShelf } from "@/lib/shelf";
import { cn, searchHref } from "@/lib/utils";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/librarian", label: "AI Librarian", ai: true },
  { href: "/taste", label: "Taste Match" },
  { href: "/shelf", label: "My Shelf" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const shelf = useShelf();
  // the mobile menu belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);
  const [q, setQ] = useState("");
  const showSearch = pathname !== "/";


  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="ShelfSense home">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-paper">
            <Library className="size-[18px]" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">ShelfSense</span>
        </Link>

        {showSearch && (
          <form
            className="relative ml-4 hidden max-w-md flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(searchHref(q.trim()));
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Describe a book you'd love…"
              aria-label="Search books"
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
          </form>
        )}

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition",
                  active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {n.ai && <Sparkles className="size-3.5 text-ai-1" />}
                {n.label}
                {n.href === "/shelf" && shelf.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-accent px-1.5 text-[10px] leading-4 font-semibold text-white tabular-nums">{shelf.length}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <ThemeToggle />
          <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="fade-up border-t border-line bg-paper px-4 py-3 lg:hidden" aria-label="Mobile">
          <form
            className="relative mb-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(searchHref(q.trim()));
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe a book you'd love…" className="h-11 w-full rounded-xl border border-line bg-surface pr-4 pl-9 text-sm outline-none focus:border-accent" />
          </form>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium hover:bg-surface-2">
              {n.ai && <Sparkles className="size-4 text-ai-1" />}
              {n.label}
              {n.href === "/shelf" && shelf.length > 0 && <span className="ml-auto text-sm text-muted">{shelf.length}</span>}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains("dark"), () => null);
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("shelfsense.theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
