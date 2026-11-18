import "server-only";
import type { Document } from "mongodb";
import { TEXT_INDEX, VECTOR_INDEX } from "./mongo";
import { BOOK_PROJECTION, books, getBookDocs, toBook, type BookDoc } from "./books";
import { combine, decodeVector, dot, embedMany, embedQuery, encodeQueryVector } from "./embeddings";
import { mergeFilters, mergeSliders, parseQuery } from "./intent";
import type {
  Emotion, Filters, QueryIntent, RankingExplanation, ScoredBook, SearchMode, SearchResponse, Sliders, VibeAxis,
} from "../types";
import { EMOTIONS, VIBE_AXES } from "../types";

/**
 * Hybrid retrieval over MongoDB Atlas:
 *   1. dense:   $vectorSearch on all-MiniLM-L6-v2 embeddings (semantic meaning)
 *   2. lexical: $search (Lucene BM25) on title / authors / description / genres (exact words)
 *   3. Reciprocal Rank Fusion: 0.6 / (60 + dense rank) + 0.4 / (60 + text rank)
 *   4. hard filters + tone, then vibe-slider alignment and a mild quality prior
 *   5. grounded snippet: the description sentence closest to the query
 */

const RRF_K = 60;
const MISSING_RANK = 500;
const DENSE_WEIGHT = 0.6;
const TEXT_WEIGHT = 0.4;

const STOPWORDS = new Set(
  "a an the and or of to in on for with about that this it its is are was were be as at by from i me my you your we our nothing too very some any want like not no book books novel novels read reading story stories something anything just finished need same similar looking recommend please really love loved liked enjoyed also more else can could would should give suggest".split(
    " ",
  ),
);

export function queryTokens(q: string): string[] {
  const tokens = [...new Set(q.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [])];
  const informative = tokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  return (informative.length ? informative : tokens).slice(0, 14);
}

function vectorFilter(filters: Filters): Document | undefined {
  const and: Document[] = [];
  if (filters.category) and.push({ category: { $eq: filters.category } });
  if (filters.yearMin) and.push({ year: { $gte: filters.yearMin } });
  if (filters.yearMax) and.push({ year: { $lte: filters.yearMax } });
  if ((filters.yearMin || filters.yearMax) && !filters.yearMin) and.push({ year: { $gt: 0 } });
  if (filters.maxPages) and.push({ pages: { $lte: filters.maxPages } });
  if (filters.minRating) and.push({ rating: { $gte: filters.minRating } });
  if (filters.minRatings) and.push({ ratings: { $gte: filters.minRatings } });
  if (!and.length) return undefined;
  return and.length === 1 ? and[0] : { $and: and };
}

function searchFilter(filters: Filters): Document[] {
  const out: Document[] = [];
  if (filters.category) out.push({ equals: { path: "category", value: filters.category } });
  if (filters.yearMin || filters.yearMax)
    out.push({ range: { path: "year", ...(filters.yearMin ? { gte: filters.yearMin } : { gt: 0 }), ...(filters.yearMax ? { lte: filters.yearMax } : {}) } });
  if (filters.maxPages) out.push({ range: { path: "pages", lte: filters.maxPages } });
  if (filters.minRating) out.push({ range: { path: "rating", gte: filters.minRating } });
  if (filters.minRatings) out.push({ range: { path: "ratings", gte: filters.minRatings } });
  return out;
}

export async function vectorCandidates(
  vector: Float32Array,
  opts: { limit: number; filters?: Filters },
): Promise<{ id: string; score: number }[]> {
  const coll = await books();
  const filter = vectorFilter(opts.filters ?? {});
  const docs = await coll
    .aggregate<{ _id: string; s: number }>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector: encodeQueryVector(vector),
          numCandidates: Math.min(10_000, Math.max(opts.limit * 12, 200)),
          limit: opts.limit,
          ...(filter ? { filter } : {}),
        },
      },
      { $project: { _id: 1, s: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();
  // Atlas reports cosine as (1 + cos) / 2; convert back to cosine similarity.
  return docs.map((d) => ({ id: String(d._id), score: d.s * 2 - 1 }));
}

async function textCandidates(query: string, opts: { limit: number; filters?: Filters }) {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const text = tokens.join(" ");
  // long descriptive queries are about content, not titles
  const titleBoost = tokens.length > 4 ? 1 : 2;
  const coll = await books();
  const filter = searchFilter(opts.filters ?? {});
  const docs = await coll
    .aggregate<{ _id: string; s: number }>([
      {
        $search: {
          index: TEXT_INDEX,
          compound: {
            should: [
              { phrase: { query: query.slice(0, 120), path: "title", score: { boost: { value: 6 } } } },
              { text: { query: text, path: "title", score: { boost: { value: titleBoost } } } },
              { text: { query: text, path: "authors", score: { boost: { value: 2.5 } } } },
              { text: { query: text, path: "genres", score: { boost: { value: 1.5 } } } },
              { text: { query: text, path: "description" } },
            ],
            minimumShouldMatch: 1,
            ...(filter.length ? { filter } : {}),
          },
        },
      },
      { $limit: opts.limit },
      { $project: { _id: 1, s: { $meta: "searchScore" } } },
    ])
    .toArray();
  const max = docs[0]?.s || 1;
  return docs.map((d) => ({ id: String(d._id), score: d.s / max }));
}

/**
 * Descriptive queries ("space opera with found family") shouldn't be won by books whose short
 * title merely repeats the query's words ("Space Opera"): the stored embeddings include the
 * title, so such books look closer than they are.
 */
function titleEcho(title: string, queryWords: Set<string>): number {
  if (queryWords.size < 3) return 1;
  const words = queryTokens(title.replace(/[:(].*$/, ""));
  if (!words.length || words.length > 3) return 1;
  return words.every((w) => queryWords.has(w)) ? 0.6 : 1;
}

/** Tone filter: the requested emotion must be one of the book's two strongest. */
function matchesTone(doc: BookDoc, tone: Emotion): boolean {
  const ranked = EMOTIONS.filter((e): e is Emotion => e !== "neutral").sort((a, b) => (doc.emotions?.[b] ?? 0) - (doc.emotions?.[a] ?? 0));
  return ranked.slice(0, 2).includes(tone);
}

export function vibeMultiplier(doc: Pick<BookDoc, "vibes">, sliders: Sliders) {
  let multiplier = 1;
  const adjustments: Partial<Record<VibeAxis, number>> = {};
  for (const axis of VIBE_AXES) {
    const user = sliders[axis] ?? 0;
    if (Math.abs(user) <= 0.08) continue;
    const book = doc.vibes?.[axis] ?? 0;
    const alignment = Math.max(0, 1 - Math.abs(user - book) / 2);
    const bonus = Math.abs(user) * (alignment - 0.5) * 0.8;
    multiplier += bonus;
    adjustments[axis] = Math.round(bonus * 1000) / 1000;
  }
  return { multiplier: Math.max(0.2, multiplier), adjustments };
}

/** Mild preference for well-loved books: 0.88 (unknown / poorly rated) → 1.0 (beloved classics). */
const STUDY_GUIDE = /\b(summary|study guide|sparknotes|cliffs ?notes|bookrags|analysis of|reader'?s guide|quicklet|trivia)\b/i;
const COMPILATION = /\b(box(?:ed)? set|boxset|omnibus|bundle|collection: books|books \d+\s*[-–]\s*\d+|#\d+\s*[-–]\s*\d+|\d+-book)\b/i;

/**
 * Reader-love prior: books with a real readership and good ratings rank a little higher, so a
 * catalogue of 500K+ titles doesn't surface 3-rating obscurities or box sets first.
 *   readership: 0.62 (a handful of ratings) → 1.0 (≈50K ratings)
 *   rating:     ×0.92 (Bayesian rating ≤ 3.5) → ×1.0 (≥ 4.3)
 */
export function qualityPrior(doc: Pick<BookDoc, "quality" | "ratings" | "title">): number {
  const pop = Math.min(1, Math.log10((doc.ratings ?? 0) + 1) / 4.7);
  const rating = Math.max(0, Math.min(1, ((doc.quality ?? 3.5) - 3.5) / 0.8));
  const compilation = !doc.title ? 1 : STUDY_GUIDE.test(doc.title) ? 0.4 : COMPILATION.test(doc.title) ? 0.75 : 1;
  return (0.62 + 0.38 * pop) * (0.92 + 0.08 * rating) * compilation;
}

const GENERIC_GENRES = new Set(["fiction", "adult", "adult fiction", "novels", "novel", "literature", "books", "audiobook", "audible", "kindle", "owned", "book club", "series", "default", "favorites", "re read"]);

/** Normalise a Goodreads shelf name; null for junk (mangled unicode, personal shelves). */
export function cleanGenre(g: string): string | null {
  const s = g.normalize("NFKC").trim();
  if (!s || /[^\x20-\x7E]/.test(s)) return null;
  const k = s.toLowerCase();
  if (GENERIC_GENRES.has(k) || /^read in|\d{4}|favou?rites?|to read|my books|wish ?list/.test(k)) return null;
  return s;
}

export function genreProfile(lists: string[][]): Map<string, number> {
  const out = new Map<string, number>();
  for (const genres of lists)
    genres.slice(0, 8).forEach((g, i) => {
      const k = cleanGenre(g)?.toLowerCase();
      if (k) out.set(k, (out.get(k) ?? 0) + 1 / (1 + i * 0.25));
    });
  return out;
}

/**
 * How much a book's Goodreads shelves overlap a target profile (0-1). Shelves are crowd-sourced,
 * so this catches "same kind of book" where the embedding over-weights shared title words.
 */
export function genreAffinity(genres: string[] | undefined, profile: Map<string, number>): number {
  if (!profile.size || !genres?.length) return 0.5;
  const mine = genreProfile([genres]);
  if (!mine.size) return 0.5;
  let hit = 0, total = 0;
  for (const [g, w] of mine) {
    total += w;
    if (profile.has(g)) hit += w;
  }
  return hit / total;
}

export function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+(?=[A-Z"“'‘(])/)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 4 && s.length <= 400);
  return parts.length ? parts : [text.slice(0, 220)];
}

function lexicalSnippet(description: string, tokens: string[]): string {
  const sentences = splitSentences(description);
  let best = sentences[0] ?? "";
  let bestScore = -1;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    const score = tokens.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/** Pick the description sentence that best answers the query (semantic when embeddings are up). */
export async function attachSnippets(results: ScoredBook[], query: string, queryVec: Float32Array | null, semanticTop = 12) {
  const tokens = queryTokens(query);
  const head = results.slice(0, semanticTop);
  if (queryVec && head.length) {
    const perBook = head.map((b) => splitSentences(b.description).slice(0, 10));
    const flat = perBook.flat();
    const vecs = flat.length ? await embedMany(flat) : null;
    if (vecs) {
      let k = 0;
      head.forEach((book, i) => {
        let best = perBook[i][0];
        let bestScore = -Infinity;
        for (const sentence of perBook[i]) {
          const s = dot(vecs[k++], queryVec);
          if (s > bestScore) {
            bestScore = s;
            best = sentence;
          }
        }
        book.snippet = best;
      });
    }
  }
  for (const b of results) if (!b.snippet) b.snippet = lexicalSnippet(b.description, tokens);
}

export interface SearchOptions {
  query: string;
  filters?: Filters;
  sliders?: Sliders;
  limit?: number;
  excludeIds?: string[];
  /** Skip the rule-based query parser (the caller already decided filters/sliders). */
  raw?: boolean;
  snippets?: boolean;
  /** Treat "like X" in the query as plain words rather than anchoring on book X. */
  noAnchor?: boolean;
  /** Favour books whose Goodreads shelves overlap these (as a "like X" search does with X's). */
  affinityGenres?: string[];
}

const LIKE_PATTERN = /\b(?:like|similar to|in the vein of|reminds? me of|fans? of|if i (?:liked|loved|enjoyed))\s+(?:the (?:book|novel) )?["“']?(.+?)["”']?(?:\s+(?:but|except|with|only|and|,)\s+(.*))?$/i;

/** "like The Martian but funnier" → the catalogue book "The Martian" + the modifier "funnier". */
async function resolveAnchor(query: string): Promise<{ doc: BookDoc; modifier: string } | null> {
  const m = query.match(LIKE_PATTERN);
  if (!m) return null;
  let title = m[1].replace(/\s+by\s+.+$/i, "").replace(/[.?!]+$/, "").trim();
  const byAuthor = m[1].match(/\s+by\s+(.+)$/i)?.[1]?.trim();
  if (title.length < 2 || title.split(" ").length > 10) return null;
  title = title.replace(/^(the|a|an)\s+/i, "");
  const coll = await books();
  const hits = await coll
    .aggregate<BookDoc & { s: number }>([
      {
        $search: {
          index: TEXT_INDEX,
          compound: {
            must: [{ phrase: { query: title, path: "title" } }],
            ...(byAuthor ? { should: [{ text: { query: byAuthor, path: "authors" } }] } : {}),
          },
        },
      },
      { $limit: 12 },
      { $project: { embedding: 1, title: 1, authors: 1, series: 1, ratings: 1, genres: 1, s: { $meta: "searchScore" } } },
    ])
    .toArray()
    .catch(() => []);
  // prefer the most-read book whose title actually starts with the phrase (not "Guide to …")
  const lower = title.toLowerCase();
  const best = hits
    .filter((h) => h.title.toLowerCase().replace(/^(the|a|an)\s+/, "").startsWith(lower))
    .sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0))[0];
  return best ? { doc: best, modifier: (m[2] ?? "").trim() } : null;
}

async function matchAuthor(query: string): Promise<string | null> {
  const q = query.trim();
  if (q.length < 4 || q.split(/\s+/).length > 5 || /\d/.test(q)) return null;
  const db = (await books()).db;
  const hit = await db
    .collection<{ _id: string; name: string }>("authors")
    .findOne({ name: q.replace(/^(books|novels) by\s+/i, "") }, { collation: { locale: "en", strength: 1 }, projection: { name: 1 } })
    .catch(() => null);
  return hit?.name ?? null;
}

export async function hybridSearch(opts: SearchOptions): Promise<SearchResponse> {
  const started = Date.now();
  const limit = Math.min(opts.limit ?? 24, 60);
  const [anchor, author] = await Promise.all([opts.noAnchor ? null : resolveAnchor(opts.query), matchAuthor(opts.query)]);
  // For "like <title> but <modifier>", only the modifier carries constraints — a title such as
  // "A Short History of…" must not turn into a length filter.
  const parseText = anchor ? anchor.modifier : opts.query;
  const intent: QueryIntent = opts.raw
    ? { semanticQuery: opts.query, filters: {}, sliders: {}, chips: [] }
    : parseText
      ? parseQuery(parseText)
      : { semanticQuery: opts.query, filters: {}, sliders: {}, chips: [] };
  // Explicit UI choices beat what the parser guessed; an explicit null clears a guessed filter.
  // A floor of a few dozen ratings hides unreviewed self-published duplicates; the UI's
  // "Popularity: Any" sends minRatings:null to lift it.
  const filters = mergeFilters({ minRatings: anchor ? 1000 : 25 }, intent.filters, opts.filters);
  for (const [k, v] of Object.entries(opts.filters ?? {})) if (v === null) delete (filters as Record<string, unknown>)[k];
  const sliders = mergeSliders(intent.sliders, opts.sliders);
  const exclude = new Set(opts.excludeIds ?? []);
  const anchorSeries = new Set((anchor?.doc.series ?? []).map((s) => s.name.toLowerCase()));
  const anchorTitle = anchor?.doc.title.toLowerCase();
  const anchorGenres = anchor
    ? genreProfile([anchor.doc.genres ?? []])
    : opts.affinityGenres?.length
      ? genreProfile([opts.affinityGenres])
      : null;
  const queryWords = new Set(queryTokens(intent.semanticQuery || opts.query));
  const exactTitle = opts.query.trim().toLowerCase().replace(/^the\s+/, "");
  if (anchor) {
    exclude.add(String(anchor.doc._id));
    intent.anchor = { id: String(anchor.doc._id), title: anchor.doc.title, authors: anchor.doc.authors };
    intent.chips.unshift(`like ${anchor.doc.title}`);
  }
  if (author) intent.chips.unshift(`by ${author}`);

  const postFilter = Boolean(filters.tone) || exclude.size > 0 || !!anchor;
  const pool = postFilter ? 300 : 150;

  let queryVec: Float32Array | null;
  const anchorVec = anchor ? decodeVector(anchor.doc.embedding) : null;
  if (anchorVec) {
    // the book itself, nudged toward whatever the reader wants to be different
    const modVec = anchor!.modifier ? await embedQuery(intent.semanticQuery) : null;
    queryVec = modVec ? combine([{ v: anchorVec, w: 1 }, { v: modVec, w: 0.7 }]) : anchorVec;
  } else {
    queryVec = await embedQuery(intent.semanticQuery || opts.query);
  }
  const [dense, text] = await Promise.all([
    queryVec ? vectorCandidates(queryVec, { limit: pool, filters }).catch((e) => (console.warn("[search] vector", e.message), [])) : [],
    // a "like X" search is about the book, not about the words in its title
    anchorVec
      ? []
      : textCandidates(intent.keywords ?? opts.query, { limit: pool, filters }).catch((e) => (console.warn("[search] text", e.message), [])),
  ]);
  const mode: SearchMode = dense.length && text.length ? "hybrid" : dense.length ? "semantic" : "keyword";

  type Cand = { id: string; rrf: number; dr: number | null; ds: number | null; tr: number | null; ts: number | null };
  const cands = new Map<string, Cand>();
  const get = (id: string) => cands.get(id) ?? cands.set(id, { id, rrf: 0, dr: null, ds: null, tr: null, ts: null }).get(id)!;
  dense.forEach((d, i) => Object.assign(get(d.id), { dr: i + 1, ds: d.score }));
  text.forEach((t, i) => Object.assign(get(t.id), { tr: i + 1, ts: t.score }));
  const denseW = text.length ? DENSE_WEIGHT : 1;
  const textW = dense.length ? TEXT_WEIGHT : 1;
  for (const c of cands.values()) {
    c.rrf = denseW / (RRF_K + (c.dr ?? MISSING_RANK)) + textW / (RRF_K + (c.tr ?? MISSING_RANK));
  }
  const maxRrf = Math.max(0, ...[...cands.values()].map((c) => c.rrf)) || 1;

  const docs = await getBookDocs([...cands.keys()].filter((id) => !exclude.has(id)));
  let scored: ScoredBook[] = [];
  const offTone = new Set<string>();
  for (const c of cands.values()) {
    const doc = docs.get(c.id);
    if (!doc) continue;
    // tone is a soft-hard filter: off-tone books are held back and only used if too few match
    if (filters.tone && !matchesTone(doc, filters.tone)) offTone.add(c.id);
    if (anchor) {
      // skip the rest of its series and companion books ("The Hunger Games Tribute Guide")
      if (doc.series?.some((s) => anchorSeries.has(s.name.toLowerCase()))) continue;
      if (anchorTitle && doc.title.toLowerCase().includes(anchorTitle)) continue;
      // the reader already knows this author: skip sequels, translations and other editions
      if (doc.authors?.[0] && doc.authors[0] === anchor.doc.authors?.[0]) continue;
    }
    const rrf = c.rrf / maxRrf;
    const { multiplier, adjustments } = vibeMultiplier(doc, sliders);
    const prior = qualityPrior(doc);
    const affinity = anchorGenres ? genreAffinity(doc.genres, anchorGenres) : null;
    let final = rrf * multiplier * prior * (affinity === null ? 1 : 0.45 + 0.55 * affinity) * titleEcho(doc.title, queryWords);
    if (doc.title.toLowerCase().replace(/^the\s+/, "") === exactTitle) final *= 2;
    // "brandon sanderson": that author's books first, best-known first
    if (author && doc.authors?.includes(author)) final = 3 + 2 * Math.min(1, Math.log10((doc.ratings ?? 0) + 1) / 5.5) + 0.5 * rrf;
    const ranking: RankingExplanation = {
      final: round(final),
      rrf: round(rrf),
      denseRank: c.dr,
      denseScore: c.ds === null ? null : round(c.ds),
      textRank: c.tr,
      textScore: c.ts === null ? null : round(c.ts),
      vibeMultiplier: round(multiplier, 3),
      vibeAdjustments: adjustments,
      qualityPrior: round(prior, 3),
      ...(affinity === null ? {} : { genreAffinity: round(affinity, 3) }),
    };
    scored.push({ ...toBook(doc, 700), score: final, similarity: c.ds ?? undefined, ranking });
  }
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (offTone.size) {
    const onTone = scored.filter((b) => !offTone.has(b.id));
    const MIN_ON_TONE = Math.min(limit, 6);
    scored = onTone.length >= MIN_ON_TONE ? onTone : [...onTone, ...scored.filter((b) => offTone.has(b.id))];
  }
  const results = scored.slice(0, limit);
  if (opts.snippets !== false) await attachSnippets(results, intent.semanticQuery || opts.query, queryVec);

  return {
    query: opts.query,
    results,
    total: scored.length,
    mode,
    intent,
    appliedFilters: filters,
    appliedSliders: sliders,
    tookMs: Date.now() - started,
  };
}

/** Nearest neighbours of an arbitrary vector (taste profiles, "more like this", contrast mode). */
export async function neighbours(
  vector: Float32Array,
  opts: {
    limit?: number;
    exclude?: string[];
    excludeSeries?: string[];
    excludeAuthors?: string[];
    filters?: Filters;
    sliders?: Sliders;
    minRatings?: number;
    /** shelves of the source book(s): candidates sharing them rank higher */
    genres?: string[][];
  } = {},
): Promise<ScoredBook[]> {
  const limit = opts.limit ?? 18;
  const exclude = new Set(opts.exclude ?? []);
  const blockAuthors = new Set(opts.excludeAuthors ?? []);
  const profile = opts.genres?.length ? genreProfile(opts.genres) : null;
  const filters = { minRatings: opts.minRatings ?? 50, ...(opts.filters ?? {}) };
  const hits = await vectorCandidates(vector, { limit: Math.min(400, limit * 5 + exclude.size), filters });
  const docs = await getBookDocs(hits.map((h) => h.id).filter((id) => !exclude.has(id)));
  const seriesBlock = new Set((opts.excludeSeries ?? []).map((s) => s.toLowerCase()));
  const seenTitles = new Set<string>();
  const out: ScoredBook[] = [];
  for (const h of hits) {
    const doc = docs.get(h.id);
    if (!doc) continue;
    const titleKey = `${doc.title.toLowerCase()}|${doc.authors?.[0]?.toLowerCase()}`;
    if (seenTitles.has(titleKey)) continue;
    if (doc.series?.some((s) => seriesBlock.has(s.name.toLowerCase()))) continue;
    if (doc.authors?.[0] && blockAuthors.has(doc.authors[0])) continue;
    seenTitles.add(titleKey);
    const { multiplier, adjustments } = vibeMultiplier(doc, opts.sliders ?? {});
    const prior = qualityPrior(doc);
    const affinity = profile ? genreAffinity(doc.genres, profile) : null;
    const final = h.score * multiplier * prior * (affinity === null ? 1 : 0.5 + 0.5 * affinity);
    out.push({
      ...toBook(doc, 500),
      similarity: round(h.score),
      score: final,
      ranking: {
        final: round(final),
        rrf: round(h.score),
        denseRank: out.length + 1,
        denseScore: round(h.score),
        textRank: null,
        textScore: null,
        vibeMultiplier: round(multiplier, 3),
        vibeAdjustments: adjustments,
        qualityPrior: round(prior, 3),
        ...(affinity === null ? {} : { genreAffinity: round(affinity, 3) }),
      },
    });
  }
  out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return out.slice(0, limit);
}

export async function autocomplete(q: string, limit = 8) {
  const coll = await books();
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return [];
  const docs = await coll
    .aggregate<BookDoc & { s: number }>([
      {
        $search: {
          index: TEXT_INDEX,
          compound: {
            should: [
              { autocomplete: { query, path: "title", score: { boost: { value: 3 } } } },
              { autocomplete: { query, path: "authors" } },
              { phrase: { query, path: "title", score: { boost: { value: 5 } } } },
            ],
            minimumShouldMatch: 1,
          },
        },
      },
      { $limit: 40 },
      { $project: { title: 1, authors: 1, cover: 1, year: 1, ratings: 1, rating: 1, category: 1, popularity: 1, s: { $meta: "searchScore" } } },
    ])
    .toArray();
  return docs
    .map((d) => ({ d, rank: d.s * (1 + (d.popularity ?? 0) / 3) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ d }) => ({
      id: String(d._id),
      title: d.title,
      authors: d.authors,
      cover: d.cover,
      year: d.year,
      rating: d.rating,
      ratings: d.ratings,
      category: d.category,
    }));
}

export { BOOK_PROJECTION };

function round(v: number, digits = 4) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
