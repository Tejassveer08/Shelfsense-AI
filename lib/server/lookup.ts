import "server-only";
import { SUMMARY_PROJECTION, books, toSummary, type BookDoc } from "./books";
import { TEXT_INDEX } from "./mongo";
import type { BookSummary } from "../types";

export interface LookupItem {
  id?: string;
  isbn13?: string;
  title?: string;
  author?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Match imported books to the catalogue: Goodreads id first, then ISBN-13, then title + author
 * (the catalogue keeps one edition per work, so an export may reference a sibling edition).
 * Returns one entry per input index (null when not found).
 */
export async function lookupBooks(items: LookupItem[]): Promise<(BookSummary | null)[]> {
  const coll = await books();
  const out: (BookSummary | null)[] = items.map(() => null);
  const ids = items.map((i) => i.id).filter(Boolean) as string[];
  const isbns = items.map((i) => i.isbn13).filter(Boolean) as string[];
  const [byId, byIsbn] = await Promise.all([
    coll.find({ _id: { $in: ids } }, { projection: SUMMARY_PROJECTION }).toArray(),
    isbns.length ? coll.find({ isbn13: { $in: isbns } }, { projection: { ...SUMMARY_PROJECTION, isbn13: 1 } }).toArray() : Promise.resolve([] as BookDoc[]),
  ]);
  const idMap = new Map(byId.map((d) => [String(d._id), d]));
  const isbnMap = new Map(byIsbn.map((d) => [d.isbn13!, d]));
  const missing: number[] = [];
  items.forEach((it, i) => {
    const doc = (it.id && idMap.get(it.id)) || (it.isbn13 && isbnMap.get(it.isbn13));
    if (doc) out[i] = toSummary(doc);
    else if (it.title) missing.push(i);
  });

  // title + author fallback, a few at a time
  const queue = missing.slice(0, 400);
  for (let k = 0; k < queue.length; k += 8) {
    await Promise.all(
      queue.slice(k, k + 8).map(async (i) => {
        const it = items[i];
        const title = it.title!.replace(/\s*\(.*?\)\s*$/, "").slice(0, 150);
        const docs = await coll
          .aggregate<BookDoc>([
            {
              $search: {
                index: TEXT_INDEX,
                compound: {
                  must: [{ phrase: { query: title, path: "title" } }],
                  ...(it.author ? { should: [{ text: { query: it.author, path: "authors" } }] } : {}),
                },
              },
            },
            { $limit: 5 },
            { $project: SUMMARY_PROJECTION },
          ])
          .toArray()
          .catch(() => []);
        const t = norm(title);
        const a = it.author ? norm(it.author).split(" ").at(-1) : "";
        const hit = docs.find((d) => norm(d.title) === t && (!a || d.authors.some((x) => norm(x).includes(a))));
        if (hit) out[i] = toSummary(hit);
      }),
    );
  }
  return out;
}
