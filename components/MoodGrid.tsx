import Link from "next/link";
import { MOODS } from "@/lib/constants";
import { cn, searchHref } from "@/lib/utils";

export function moodHref(slug: string) {
  const m = MOODS.find((x) => x.slug === slug)!;
  return searchHref(m.query, { mood: m.slug });
}

export function MoodGrid({ limit }: { limit?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MOODS.slice(0, limit).map((m) => (
        <Link
          key={m.slug}
          href={moodHref(m.slug)}
          className={cn(
            "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5",
            m.gradient,
          )}
        >
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/15 blur-xl transition group-hover:scale-125" />
          <p className="font-display relative text-lg leading-tight font-semibold sm:text-xl">{m.name}</p>
          <p className="relative mt-1 text-xs text-white/85 sm:text-sm">{m.blurb}</p>
        </Link>
      ))}
    </div>
  );
}
