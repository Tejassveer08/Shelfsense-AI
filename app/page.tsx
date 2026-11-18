import { ArrowRight, Flame, Gem, MessagesSquare, Sparkles, Trophy, Wand2 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { ForYouRail } from "@/components/ForYouRail";
import { HeroSearch } from "@/components/HeroSearch";
import { MoodGrid } from "@/components/MoodGrid";
import { Rail } from "@/components/Rail";
import { Cover } from "@/components/Cover";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { catalogStats, hiddenGems, popularBooks, topRatedBooks } from "@/lib/server/books";
import { formatCount } from "@/lib/utils";

export default async function Home() {
  await connection();
  const [popular, top, gems, stats] = await Promise.allSettled([
    popularBooks({ limit: 20 }),
    topRatedBooks({ limit: 20 }),
    hiddenGems({ limit: 20 }),
    catalogStats(),
  ]);
  const ok = <T,>(r: PromiseSettledResult<T>, fallback: T) => (r.status === "fulfilled" ? r.value : fallback);
  const popularBooksList = ok(popular, []);
  const statsValue = ok(stats, null);
  const dbDown = popular.status === "rejected";
  const heroCovers = popularBooksList.filter((b) => b.cover).slice(0, 7);

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20 lg:pb-16">
          <div className="fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="size-3.5 text-ai-1" />
              {statsValue?.books ? `${formatCount(statsValue.books)} books · ${formatCount(statsValue.authors)} authors` : "AI book discovery"}
            </p>
            <h1 className="font-display text-[44px] leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
              Find the book
              <br />
              you&apos;ll <em className="text-accent">love</em> next.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2/80">
              Describe a feeling, a plot, a book you adored — ShelfSense reads the whole Goodreads catalogue and explains every pick.
            </p>
            <div className="mt-8 max-w-2xl">
              <HeroSearch />
            </div>
          </div>
          <div className="relative hidden h-[420px] lg:block" aria-hidden>
            {heroCovers.map((b, i) => {
              const pos = [
                "left-[8%] top-[6%] w-36 -rotate-6",
                "left-[38%] top-0 w-40 rotate-3 z-10",
                "left-[68%] top-[10%] w-32 rotate-6",
                "left-[0%] top-[48%] w-32 rotate-3",
                "left-[26%] top-[44%] w-40 -rotate-3 z-20",
                "left-[58%] top-[50%] w-36 rotate-[-8deg] z-10",
                "left-[84%] top-[46%] w-28 rotate-6",
              ][i];
              return (
                <Link key={b.id} href={`/book/${b.id}`} className={`absolute transition duration-500 hover:z-30 hover:scale-105 hover:rotate-0 ${pos}`}>
                  <Cover src={b.cover} title={b.title} author={b.authors[0]} priority />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {dbDown && <DatabaseNotice />}

        <section className="grid gap-4 py-6 md:grid-cols-3">
          <FeatureCard
            href="/librarian"
            icon={<MessagesSquare className="size-5" />}
            title="Ask the AI librarian"
            body="Chat about what you're in the mood for. It searches, picks, and tells you why."
            ai
          />
          <FeatureCard href="/taste" icon={<Wand2 className="size-5" />} title="Taste Match" body="Pick books you loved. Get uncanny matches — or “like this, but darker.”" />
          <FeatureCard href="/shelf" icon={<Sparkles className="size-5" />} title="Your reading DNA" body="Build a shelf and see the patterns in your taste, with a reader persona." />
        </section>

        <ForYouRail />

        <section className="py-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-[28px]">Read the room</h2>
              <p className="mt-1 text-sm text-muted">Start from a mood instead of a genre</p>
            </div>
            <Link href="/discover" className="text-sm font-medium text-muted hover:text-accent">
              All moods
            </Link>
          </div>
          <MoodGrid limit={8} />
        </section>

        <Rail title="Most read" icon={<Flame className="size-5 text-accent" />} subtitle="The books everyone has on their shelf" books={popularBooksList} ranked href="/discover?view=popular" />
        <Rail title="Critically adored" icon={<Trophy className="size-5 text-star" />} subtitle="Highest-rated, with tens of thousands of ratings" books={ok(top, [])} href="/discover?view=top" />
        <Rail title="Hidden gems" icon={<Gem className="size-5 text-ai-1" />} subtitle="Loved by readers, undiscovered by most — reshuffled through the day" books={ok(gems, [])} href="/discover?view=gems" />
      </div>
    </>
  );
}

function FeatureCard({ href, icon, title, body, ai }: { href: string; icon: React.ReactNode; title: string; body: string; ai?: boolean }) {
  return (
    <Link href={href} className={`group rounded-2xl p-5 transition hover:-translate-y-0.5 ${ai ? "ai-border" : "border border-line bg-surface"}`}>
      <span className={`grid size-10 place-items-center rounded-xl ${ai ? "ai-gradient text-white" : "bg-surface-2 text-ink"}`}>{icon}</span>
      <h3 className="mt-4 flex items-center gap-1 font-semibold">
        {title} <ArrowRight className="size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
      </h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
