import "server-only";
import type { Binary, Document, Filter } from "mongodb";
import { getDb } from "./mongo";
import { TTLCache } from "./cache";
import type { Book, BookSummary, Emotions, Filters, SeriesRef, Vibes } from "../types";
import { EMOTIONS } from "../types";

export interface BookDoc {
  _id: string;
  title: string;
  full_title?: string;
  authors: string[];
  description: string;
  rating: number;
  ratings: number;
  pages: number;
  year: number;
  cover: string;
  genres: string[];
  category: string;
  emotions: Emotions;
  vibes: Vibes;
  quality: number;
  popularity?: number;
  embedding?: Binary;
  isbn13?: string;
  series?: SeriesRef[];
  language?: string;
  publisher?: string;
}

/** Everything except the vector, which is large and never sent to the browser. */
export const BOOK_PROJECTION = { embedding: 0 } as const;
export const SUMMARY_PROJECTION = { title: 1, authors: 1, cover: 1, year: 1, rating: 1, ratings: 1, category: 1 } as const;

const ZERO_EMOTIONS = Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Emotions;
const ZERO_VIBES: Vibes = { dark_light: 0, pacing: 0, cerebral_escapist: 0, length_scale: 0 };

/** Strip control characters and Goodreads "alternate cover edition" notes from descriptions. */
export function cleanDescription(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/^\s*(?:note:)?[^\n]{0,160}\b(?:alternate|alternative)[- ]cover edition[^\n]*\n+/i, "")
    .trim();
}

export function toBook(doc: BookDoc, descriptionChars?: number): Book {
  let description = cleanDescription(doc.description || "");
  if (descriptionChars && description.length > descriptionChars) {
    description = description.slice(0, description.lastIndexOf(" ", descriptionChars)) + "…";
  }
  return {
    id: String(doc._id),
    title: doc.title,
    fullTitle: doc.full_title,
    authors: doc.authors?.length ? doc.authors : ["Unknown"],
    description,
    rating: doc.rating ?? 0,
    ratings: doc.ratings ?? 0,
    pages: doc.pages ?? 0,
    year: doc.year ?? 0,
    cover: doc.cover || "",
    genres: doc.genres ?? [],
    category: doc.category || "Fiction",
    emotions: { ...ZERO_EMOTIONS, ...(doc.emotions || {}) },
    vibes: { ...ZERO_VIBES, ...(doc.vibes || {}) },
    quality: doc.quality ?? 0,
    isbn13: doc.isbn13,
    series: doc.series,
    language: doc.language,
    publisher: doc.publisher,
  };
}

export function toSummary(doc: Pick<BookDoc, "_id" | "title" | "authors" | "cover"> & Partial<BookDoc>): BookSummary {
  return {
    id: String(doc._id),
    title: doc.title,
    authors: doc.authors?.length ? doc.authors : ["Unknown"],
    cover: doc.cover || "",
    year: doc.year,
    rating: doc.rating,
    ratings: doc.ratings,
    category: doc.category,
  };
}

export async function books() {
  return (await getDb()).collection<BookDoc>("books");
}

export async function getBook(id: string): Promise<Book | null> {
  const coll = await books();
  const doc =
    (await coll.findOne({ _id: id }, { projection: BOOK_PROJECTION })) ??
    (/^\d{13}$/.test(id) ? await coll.findOne({ isbn13: id }, { projection: BOOK_PROJECTION }) : null);
  return doc ? toBook(doc) : null;
}

export async function getBookDocs(ids: string[], withVector = false): Promise<Map<string, BookDoc>> {
  const coll = await books();
  const docs = await coll
    .find({ _id: { $in: ids } }, withVector ? {} : { projection: BOOK_PROJECTION })
    .toArray();
  return new Map(docs.map((d) => [String(d._id), d]));
}

export function filtersToMatch(filters: Filters = {}): Filter<BookDoc> {
  const match: Filter<BookDoc> = {};
  if (filters.category) match.category = filters.category;
  if (filters.yearMin || filters.yearMax) {
    match.year = { ...(filters.yearMin ? { $gte: filters.yearMin } : { $gt: 0 }), ...(filters.yearMax ? { $lte: filters.yearMax } : {}) };
  }
  if (filters.maxPages) match.pages = { $lte: filters.maxPages };
  if (filters.minRating) match.rating = { $gte: filters.minRating };
  if (filters.minRatings) match.ratings = { $gte: filters.minRatings };
  return match;
}

const railCache = new TTLCache<BookSummary[]>(30 * 60_000, 200);

export async function popularBooks(opts: { category?: string; limit?: number } = {}): Promise<BookSummary[]> {
  const { category, limit = 18 } = opts;
  return railCache.wrap(`popular:${category}:${limit}`, async () => {
    const coll = await books();
    const docs = await coll
      .find(category ? { category } : {}, { projection: SUMMARY_PROJECTION })
      .sort({ ratings: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toSummary);
  });
}

export async function topRatedBooks(opts: { category?: string; limit?: number; minRatings?: number } = {}) {
  const { category, limit = 18, minRatings = 20000 } = opts;
  return railCache.wrap(`top:${category}:${limit}:${minRatings}`, async () => {
    const coll = await books();
    const docs = await coll
      .find({ ...(category ? { category } : {}), ratings: { $gte: minRatings } }, { projection: SUMMARY_PROJECTION })
      .sort({ quality: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toSummary);
  });
}

/** Well-loved books that few people have found: high rating, modest number of ratings. */
export async function hiddenGems(opts: { category?: string; limit?: number; seed?: string } = {}) {
  const { category, limit = 18, seed = "" } = opts;
  return railCache.wrap(`gems:${category}:${limit}:${seed}`, async () => {
    const coll = await books();
    const docs = await coll
      .aggregate<BookDoc>([
        { $match: { ...(category ? { category } : {}), rating: { $gte: 4.2 }, ratings: { $gte: 300, $lte: 15000 }, cover: { $ne: "" } } },
        { $sample: { size: limit } },
        { $project: SUMMARY_PROJECTION },
      ])
      .toArray();
    return docs.map(toSummary);
  });
}

export async function surpriseBook(filters: Filters = {}): Promise<BookSummary | null> {
  const coll = await books();
  const [doc] = await coll
    .aggregate<BookDoc>([
      { $match: { ...filtersToMatch(filters), quality: { $gte: 4.0 }, ratings: { $gte: 2000 } } as Document },
      { $sample: { size: 1 } },
      { $project: SUMMARY_PROJECTION },
    ])
    .toArray();
  return doc ? toSummary(doc) : null;
}

export async function booksByAuthor(name: string, opts: { exclude?: string; limit?: number } = {}) {
  const coll = await books();
  const docs = await coll
    .find({ authors: name, ...(opts.exclude ? { _id: { $ne: opts.exclude } } : {}) }, { projection: BOOK_PROJECTION })
    .sort({ ratings: -1 })
    .limit(opts.limit ?? 30)
    .toArray();
  return docs.map((d) => toBook(d, 400));
}

export async function seriesBooks(name: string): Promise<BookSummary[]> {
  const coll = await books();
  const docs = await coll
    .find({ "series.name": name }, { projection: { ...SUMMARY_PROJECTION, series: 1 } })
    .sort({ "series.position": 1, year: 1 })
    .limit(40)
    .toArray();
  return docs.map(toSummary);
}

export interface AuthorDoc {
  _id: string;
  name: string;
  books: number;
  total_ratings: number;
  avg_rating: number;
  categories: string[];
}

export async function getAuthor(name: string): Promise<AuthorDoc | null> {
  const db = await getDb();
  return db.collection<AuthorDoc>("authors").findOne({ _id: name });
}

export interface CatalogStats {
  books: number;
  authors: number;
  series: number;
  categories: { name: string; count: number }[];
}

const statsCache = new TTLCache<CatalogStats>(30 * 60_000, 1);

export async function catalogStats(): Promise<CatalogStats> {
  return statsCache.wrap("stats", async () => {
    const db = await getDb();
    const meta = await db.collection<CatalogStats & { _id: string }>("meta").findOne({ _id: "stats" });
    if (meta) return { books: meta.books, authors: meta.authors, series: meta.series, categories: meta.categories ?? [] };
    const n = await db.collection("books").estimatedDocumentCount();
    return { books: n, authors: 0, series: 0, categories: [] };
  });
}
