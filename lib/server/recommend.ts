import "server-only";
import { getBookDocs, toBook, type BookDoc } from "./books";
import { combine, decodeVector, embedQuery } from "./embeddings";
import { attachSnippets, cleanGenre, neighbours } from "./search";
import { parseQuery } from "./intent";
import { fitVerdict, readerPersona } from "./llm";
import type { Emotions, Filters, ReaderInsights, ScoredBook, Sliders, Vibes } from "../types";
import { EMOTIONS, VIBE_AXES } from "../types";
import { TTLCache } from "./cache";

const similarCache = new TTLCache<ScoredBook[]>(3600_000, 300);

/** "More like this": nearest neighbours of the book's own vector, skipping its series. */
export async function similarBooks(id: string, opts: { limit?: number } = {}): Promise<ScoredBook[]> {
  const limit = opts.limit ?? 18;
  return similarCache.wrap(`${id}:${limit}`, async () => {
    const doc = (await getBookDocs([id], true)).get(id);
    const vec = decodeVector(doc?.embedding);
    if (!doc || !vec) return [];
    return neighbours(vec, {
      limit,
      exclude: [id],
      excludeSeries: doc.series?.map((s) => s.name) ?? [],
      // the book page has its own "More by this author" rail
      excludeAuthors: doc.authors?.slice(0, 1) ?? [],
      minRatings: 500,
      genres: [doc.genres ?? []],
    });
  });
}

export interface TasteRequest {
  loved: { id: string; rating?: number }[];
  disliked?: string[];
  modifier?: string;
  exclude?: string[];
  filters?: Filters;
  sliders?: Sliders;
  limit?: number;
}

/**
 * Taste profile: a rating-weighted centroid of the books someone loved, pushed away from
 * the ones they didn't, optionally steered by a free-text modifier ("but funnier").
 */
export async function recommendFromTaste(req: TasteRequest) {
  const ids = [...new Set([...req.loved.map((l) => l.id), ...(req.disliked ?? [])])];
  const docs = await getBookDocs(ids, true);
  const parts: { v: Float32Array; w: number }[] = [];
  const basedOn: { id: string; title: string; weight: number }[] = [];
  for (const { id, rating } of req.loved) {
    const doc = docs.get(id);
    const v = decodeVector(doc?.embedding);
    if (!doc || !v) continue;
    const w = Math.max(0.2, ((rating ?? 5) / 5) ** 1.5);
    parts.push({ v, w });
    basedOn.push({ id, title: doc.title, weight: Math.round(w * 100) / 100 });
  }
  if (!parts.length) return { results: [] as ScoredBook[], basedOn, modifier: null as string | null, mode: "taste_profile" };

  const totalW = parts.reduce((s, p) => s + p.w, 0);
  const normalized = parts.map((p) => ({ v: p.v, w: p.w / totalW }));
  const disliked = (req.disliked ?? []).map((id) => decodeVector(docs.get(id)?.embedding)).filter((v): v is Float32Array => !!v);
  for (const v of disliked) normalized.push({ v, w: -0.35 / disliked.length });
  let taste = combine(normalized);

  let modifierApplied: string | null = null;
  let modVec: Float32Array | null = null;
  let modifierSliders: Sliders = {};
  if (req.modifier) {
    // vibe words ("darker", "shorter", "funnier") steer the sliders; what's left ("set in Japan",
    // "with dragons") steers the vector — embeddings alone would just find titles with "Dark" in them
    const intent = parseQuery(req.modifier);
    modifierSliders = intent.sliders;
    const content = intent.keywords?.replace(/\b(more|less|much|bit|lot|slightly|way)\b/gi, " ").trim();
    modVec = content ? await embedQuery(content) : null;
    if (modVec) taste = combine([{ v: taste, w: 1 }, { v: modVec, w: 0.5 }]);
    if (modVec || Object.keys(modifierSliders).length) modifierApplied = req.modifier;
  }

  const exclude = [...new Set([...ids, ...(req.exclude ?? [])])];
  const blockSeries = [...docs.values()].flatMap((d) => d.series?.map((s) => s.name) ?? []);
  const results = await neighbours(taste, {
    limit: req.limit ?? 24,
    exclude,
    excludeSeries: blockSeries,
    filters: req.filters,
    sliders: { ...modifierSliders, ...(req.sliders ?? {}) },
    minRatings: 300,
    genres: req.loved.map((l) => docs.get(l.id)?.genres ?? []).filter((g) => g.length),
  });
  if (req.modifier) await attachSnippets(results, req.modifier, modVec, 8);
  return { results, basedOn, modifier: modifierApplied, mode: modifierApplied ? "contrast" : "taste_profile" };
}

// ----------------------------------------------------------------------------- reading DNA

const zeroEmotions = () => Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Emotions;
const zeroVibes = (): Vibes => ({ dark_light: 0, pacing: 0, cerebral_escapist: 0, length_scale: 0 });

export async function readerInsights(entries: { id: string; rating?: number }[]): Promise<ReaderInsights> {
  const docs = await getBookDocs(entries.map((e) => e.id));
  const ratingById = new Map(entries.map((e) => [e.id, e.rating]));
  const list = [...docs.values()];
  const emotions = zeroEmotions();
  const vibes = zeroVibes();
  const categories = new Map<string, number>();
  const genres = new Map<string, number>();
  const decades = new Map<number, number>();
  let pages = 0, pagesN = 0, years = 0, yearsN = 0, rating = 0, totalW = 0;

  for (const d of list) {
    // books they rated highly shape the profile more
    const r = ratingById.get(String(d._id));
    const w = r ? Math.max(0.3, (r / 5) ** 1.5) : 0.8;
    totalW += w;
    for (const e of EMOTIONS) emotions[e] += (d.emotions?.[e] ?? 0) * w;
    for (const a of VIBE_AXES) vibes[a] += (d.vibes?.[a] ?? 0) * w;
    categories.set(d.category, (categories.get(d.category) ?? 0) + 1);
    for (const raw of (d.genres ?? []).slice(0, 6)) {
      const g = cleanGenre(raw);
      if (!g || /^(fiction|nonfiction|non fiction|novels?|adult|adult fiction|literature)$/i.test(g)) continue;
      genres.set(g, (genres.get(g) ?? 0) + 1);
    }
    if (d.pages > 0) {
      pages += d.pages;
      pagesN++;
    }
    if (d.year > 0) {
      years += d.year;
      yearsN++;
      const dec = Math.floor(d.year / 10) * 10;
      decades.set(dec, (decades.get(dec) ?? 0) + 1);
    }
    rating += d.rating ?? 0;
  }
  if (totalW) {
    for (const e of EMOTIONS) emotions[e] = round(emotions[e] / totalW);
    for (const a of VIBE_AXES) vibes[a] = round(vibes[a] / totalW);
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  const stats = {
    count: list.length,
    emotions,
    vibes,
    categories: sorted(categories),
    genres: sorted(genres).slice(0, 12),
    avgPages: pagesN ? Math.round(pages / pagesN) : 0,
    avgYear: yearsN ? Math.round(years / yearsN) : 0,
    avgRating: list.length ? round(rating / list.length, 2) : 0,
    decades: [...decades.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count })),
  };
  if (!list.length) {
    return { ...stats, persona: { title: "The Blank Page", summary: "Add a few books to your shelf to reveal your reading DNA.", suggestions: [] }, aiPowered: false };
  }
  const titles = list.map((d: BookDoc) => ({ title: d.title, author: d.authors?.[0] ?? "", rating: ratingById.get(String(d._id)) }));
  const { persona, ai } = await readerPersona(stats, titles);
  return { ...stats, persona, aiPowered: ai };
}

export { toBook };

function round(v: number, digits = 3) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

// ----------------------------------------------------------------------------- personal fit

export interface FitResult {
  score: number; // 0-100
  closest: { id: string; title: string; similarity: number }[];
  warnings: { id: string; title: string; similarity: number }[];
  verdict: string;
  aiPowered: boolean;
}

/** How well one book fits a reader's shelf: vector similarity to what they loved (and didn't). */
export async function personalFit(id: string, loved: { id: string; rating?: number }[], disliked: string[] = []): Promise<FitResult | null> {
  const ids = [id, ...loved.map((l) => l.id), ...disliked].filter((v, i, a) => a.indexOf(v) === i);
  const docs = await getBookDocs(ids, true);
  const target = docs.get(id);
  const tv = decodeVector(target?.embedding);
  if (!target || !tv) return null;
  const sims = loved
    .filter((l) => l.id !== id)
    .map((l) => ({ l, doc: docs.get(l.id), v: decodeVector(docs.get(l.id)?.embedding) }))
    .filter((x): x is { l: { id: string; rating?: number }; doc: BookDoc; v: Float32Array } => !!x.doc && !!x.v)
    .map((x) => ({ id: x.l.id, title: x.doc.title, w: Math.max(0.2, ((x.l.rating ?? 4) / 5) ** 1.5), similarity: cosine(tv, x.v) }));
  if (!sims.length) return null;
  const centroid = combine(sims.map((s) => ({ v: decodeVector(docs.get(s.id)!.embedding)!, w: s.w })));
  const centroidSim = cosine(tv, centroid);
  const best = Math.max(...sims.map((s) => s.similarity));
  const warnings = disliked
    .filter((d) => d !== id)
    .map((d) => ({ id: d, title: docs.get(d)?.title ?? "", similarity: cosine(tv, decodeVector(docs.get(d)?.embedding) ?? tv) }))
    .filter((w) => w.title && w.similarity > 0.55)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2);
  // MiniLM cosine for related books sits roughly in 0.2-0.8; map that onto 0-100
  let raw = 0.55 * centroidSim + 0.45 * best - (warnings[0] ? (warnings[0].similarity - 0.5) * 0.5 : 0);
  // all-MiniLM-L6-v2 cosine: unrelated books ≈ 0.1, close genre-mates ≈ 0.5-0.6
  raw = Math.max(0, Math.min(1, (raw - 0.1) / 0.42));
  const score = Math.round(raw * 100);
  const closest = sims.sort((a, b) => b.similarity - a.similarity).slice(0, 3).map(({ id, title, similarity }) => ({ id, title, similarity: round(similarity) }));
  const { text, ai } = await fitVerdict(toBook(target), score, closest.map((c) => c.title), warnings.map((w) => w.title));
  return { score, closest, warnings: warnings.map((w) => ({ ...w, similarity: round(w.similarity) })), verdict: text, aiPowered: ai };
}

function cosine(a: Float32Array, b: Float32Array) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na * nb) || 1);
}
