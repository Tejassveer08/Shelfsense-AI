import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/Cover";
import { STATUS_LABEL } from "@/components/ShelfButton";
import { getSharedShelf } from "@/lib/server/shelves";
import { bookHref } from "@/lib/utils";
import { ImportShared } from "./ImportShared";

export async function generateMetadata({ params }: PageProps<"/s/[id]">): Promise<Metadata> {
  const shelf = await getSharedShelf((await params).id).catch(() => null);
  return { title: shelf ? `${shelf.name} (${shelf.books.length} books)` : "Shared shelf" };
}

export default async function SharedShelfPage({ params }: PageProps<"/s/[id]">) {
  const shelf = await getSharedShelf((await params).id);
  if (!shelf) notFound();
  const groups = (["reading", "read", "want"] as const).map((s) => ({ status: s, books: shelf.books.filter((b) => b.status === s) })).filter((g) => g.books.length);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium tracking-wider text-muted uppercase">Shared shelf</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">{shelf.name}</h1>
          <p className="mt-2 text-muted">
            {shelf.books.length} books · shared {new Date(shelf.createdAt).toLocaleDateString("en", { dateStyle: "medium" })}
          </p>
        </div>
        <ImportShared books={shelf.books} />
      </div>
      {groups.map((g) => (
        <section key={g.status} className="mt-10">
          <h2 className="font-display mb-5 text-2xl font-semibold">
            {STATUS_LABEL[g.status]} <span className="text-base font-normal text-muted">{g.books.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {g.books.map((b) => (
              <Link key={b.id} href={bookHref(b.id)} className="group">
                <Cover src={b.cover} title={b.title} author={b.authors[0]} sizes="sm" className="transition group-hover:-translate-y-1" />
                <p className="mt-2 line-clamp-2 text-xs font-medium group-hover:text-accent">{b.title}</p>
                {b.myRating ? <p className="text-[11px] text-star">{"★".repeat(b.myRating)}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
