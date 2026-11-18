import "server-only";
import type { Book, ChatMessage, Filters, LibrarianPlan, ReaderInsights, ScoredBook, Sliders } from "../types";
import { CATEGORIES, EMOTION_META } from "../constants";
import { mergeFilters, mergeSliders, parseQuery } from "./intent";
import { TTLCache } from "./cache";

/**
 * Groq-backed AI features (free tier, OpenAI-compatible API), each with a deterministic offline
 * fallback so the app is fully usable without an API key (and keeps working if the API errors,
 * rate-limits or times out).
 */

// Overridable for tests or another OpenAI-compatible host.
const groqUrl = () => `${(process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "")}/chat/completions`;

function apiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key && !key.startsWith("your_") ? key : null;
}

export const llmModel = () => process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
export function llmStatus() {
  return apiKey() ? { provider: "Groq", model: llmModel() } : { provider: "Offline fallback" };
}

interface ChatOptions {
  system: string;
  prompt: string;
  temperature: number;
  json?: boolean;
  stream?: boolean;
  maxTokens?: number;
  timeoutMs: number;
}

/** POST a chat completion to Groq. Returns null when no key is configured. */
async function groq(opts: ChatOptions): Promise<Response | null> {
  const key = apiKey();
  if (!key) return null;
  const model = llmModel();
  const res = await fetch(groqUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(opts.timeoutMs),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
      temperature: opts.temperature,
      max_completion_tokens: opts.maxTokens ?? 1024,
      stream: opts.stream ?? false,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      // gpt-oss models reason before answering: keep it short and out of the reply
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Groq ${res.status}: ${detail}`);
  }
  return res;
}

async function complete(opts: Omit<ChatOptions, "stream">): Promise<string | null> {
  try {
    const res = await groq(opts);
    if (!res) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("[llm] call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function generateJSON<T>(prompt: string, system: string, timeoutMs = 15_000): Promise<T | null> {
  const text = await complete({ prompt, system: `${system}\nRespond with a single JSON object only.`, temperature: 0.4, json: true, timeoutMs });
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function generateText(prompt: string, system: string, timeoutMs = 15_000): Promise<string | null> {
  return complete({ prompt, system, temperature: 0.7, maxTokens: 400, timeoutMs });
}

/** Stream a completion as text deltas (server-sent events from the OpenAI-compatible API). */
async function* streamText(prompt: string, system: string, timeoutMs = 45_000): AsyncGenerator<string> {
  const res = await groq({ prompt, system, temperature: 0.7, stream: true, maxTokens: 900, timeoutMs });
  if (!res?.body) return;
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const delta = (JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore keep-alive / partial lines
      }
    }
  }
}

const bookLine = (b: Book | ScoredBook, i: number) =>
  `[${i + 1}] "${b.title}" by ${b.authors.join(", ")} (${b.year || "n.d."}; ${b.category}; ★${b.rating.toFixed(2)} from ${b.ratings.toLocaleString()} ratings; ${b.pages || "?"} pages)\n    ${(("snippet" in b && b.snippet) || b.description).slice(0, 420)}`;

// ----------------------------------------------------------------------------- explanations

const explainCache = new TTLCache<string>(12 * 3600_000, 1000);

export async function explainMatch(book: Book, query: string, snippet: string): Promise<{ text: string; ai: boolean }> {
  const cacheKey = `${book.id}|${query.toLowerCase()}`;
  const hit = explainCache.get(cacheKey);
  if (hit) return { text: hit, ai: true };
  const text = await generateText(
    `Reader's request: "${query}"\n\nBook: "${book.title}" by ${book.authors.join(", ")}\nGenres: ${book.genres.slice(0, 5).join(", ")}\nDescription: ${book.description.slice(0, 1500)}\nMost relevant sentence: "${snippet}"\n\nIn 1-2 sentences, tell the reader why this book fits their request.`,
    "You are ShelfSense, a warm, sharp librarian. Ground every claim ONLY in the description provided — never invent plot points, characters or facts. No preamble, no spoilers, no quotation of the whole description.",
  );
  if (text) {
    explainCache.set(cacheKey, text);
    return { text, ai: true };
  }
  return { text: offlineExplanation(book, query, snippet), ai: false };
}

function dominantEmotion(book: Book) {
  return (Object.entries(book.emotions) as [keyof typeof EMOTION_META, number][])
    .filter(([k]) => k !== "neutral")
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function offlineExplanation(book: Book, query: string, snippet: string): string {
  const s = snippet.length > 170 ? `${snippet.slice(0, 167)}…` : snippet;
  const emotion = dominantEmotion(book);
  const mood = emotion ? EMOTION_META[emotion].label.toLowerCase() : "distinctive";
  const pace = book.vibes.pacing < -0.15 ? "brisk" : book.vibes.pacing > 0.15 ? "unhurried" : "steady";
  return `A ${pace}, ${mood}-leaning ${book.category.toLowerCase()} pick that speaks to "${query}": “${s}”`;
}

// ----------------------------------------------------------------------------- librarian

const LIBRARIAN_SYSTEM = `You are the ShelfSense AI librarian — a widely-read, warm, opinionated book expert.
You help readers find their next book from the ShelfSense catalogue (Goodreads data).`;

/** Turn the conversation into a search: query, filters and vibe sliders. */
export async function planSearch(messages: ChatMessage[], previous?: LibrarianPlan): Promise<LibrarianPlan> {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const transcript = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Reader" : "Librarian"}: ${m.content.slice(0, 600)}`)
    .join("\n");
  const plan = await generateJSON<{
    search_query?: string;
    category?: string | null;
    tone?: string | null;
    year_min?: number | null;
    year_max?: number | null;
    max_pages?: number | null;
    min_rating?: number | null;
    sliders?: Partial<Record<keyof Sliders, number | null>>;
    anchor_title?: string | null;
    difference?: string | null;
  }>(
    `Conversation so far:\n${transcript}\n\nPrevious search: ${JSON.stringify(previous ?? null)}\n\n` +
      `Write the catalogue search that best serves the reader's LATEST message, keeping earlier preferences unless they changed them.\n` +
      `Return JSON: {"search_query": "a rich descriptive query of themes, setting, style and comparable titles/authors (not a question)", ` +
      `"category": one of ${JSON.stringify(CATEGORIES)} or null, "tone": one of ["joy","sadness","fear","anger","surprise"] or null, ` +
      `"year_min": int|null, "year_max": int|null, "max_pages": int|null, "min_rating": number|null, ` +
      `"sliders": {"dark_light": -1..1|null (dark→light), "pacing": -1..1|null (fast→slow), "cerebral_escapist": -1..1|null, "length_scale": -1..1|null (short→epic)}}. ` +
      `"anchor_title": if the reader wants books similar to ONE specific book they name, its exact title, else null; ` +
      `"difference": when anchor_title is set, a few words on how they want it to differ (e.g. "funnier, less science"), else null}. ` +
      `Only set filters the reader actually asked for.`,
    LIBRARIAN_SYSTEM,
    10_000,
  );
  if (plan?.search_query) {
    const filters: Filters = {
      category: CATEGORIES.includes(plan.category as (typeof CATEGORIES)[number]) ? plan.category : null,
      tone: (["joy", "sadness", "fear", "anger", "surprise"] as const).find((t) => t === plan.tone) ?? null,
      yearMin: plan.year_min ?? null,
      yearMax: plan.year_max ?? null,
      maxPages: plan.max_pages ?? null,
      minRating: plan.min_rating ?? null,
    };
    const anchor = plan.anchor_title?.trim();
    return {
      // "like <title>" makes the search engine anchor on that book's own vector
      searchQuery: anchor ? `like ${anchor}${plan.difference ? ` but ${plan.difference}` : ""}` : plan.search_query,
      filters: mergeFilters(filters),
      sliders: mergeSliders(Object.fromEntries(Object.entries(plan.sliders ?? {}).filter(([, v]) => typeof v === "number")) as Sliders),
    };
  }
  // offline: "I loved <Title> …" → anchor on that book; otherwise parse the message
  const named = last.match(/\b(?:finished|loved|read|enjoyed|liked|adored|like|similar to)\s+["“]?((?:[A-Z0-9][\w'’:-]*|of|the|a|an|and|in|on|to|for)(?:\s+(?:[A-Z0-9][\w'’:-]*|of|the|a|an|and|in|on|to|for))*)/);
  if (named && named[1].split(" ").length <= 8 && /[A-Z]/.test(named[1])) {
    const title = named[1].replace(/\s+(?:and|of|the|a|an|in|on|to|for)$/i, "");
    const rest = last.slice((named.index ?? 0) + named[0].length).replace(/^[\s,.!?-]+/, "");
    const diff = rest.match(/\b(?:but|except|only)\s+(.+)$/i)?.[1];
    return { searchQuery: `like ${title}${diff ? ` but ${diff}` : ""}`, filters: parseQuery(rest).filters, sliders: parseQuery(rest).sliders };
  }
  const parsed = parseQuery(last);
  const refining = previous && last.split(" ").length < 12 && /\b(more|less|but|instead|shorter|longer|darker|lighter|older|newer|another|else|different)\b/i.test(last);
  return {
    searchQuery: refining ? `${previous!.searchQuery} ${parsed.semanticQuery}`.trim() : parsed.semanticQuery || last,
    filters: mergeFilters(refining ? previous!.filters : {}, parsed.filters),
    sliders: mergeSliders(refining ? previous!.sliders : {}, parsed.sliders),
  };
}

/** Stream the librarian's answer, grounded in the retrieved books. */
export async function* streamLibrarianAnswer(messages: ChatMessage[], books: ScoredBook[]): AsyncGenerator<string> {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  let any = false;
  if (apiKey() && books.length) {
    try {
      const transcript = messages
        .slice(-8)
        .map((m) => `${m.role === "user" ? "Reader" : "Librarian"}: ${m.content.slice(0, 800)}`)
        .join("\n");
      const prompt =
        `Conversation:\n${transcript}\n\nCandidate books retrieved from the catalogue for the latest message:\n${books.map(bookLine).join("\n")}\n\n` +
        `Reply to the reader. Recommend the 3-4 candidates that fit best (you may skip poor fits). For each: put the exact title in **bold**, then 1-2 sentences on why it fits THIS reader, grounded in the text shown. ` +
        `Keep it conversational and under 220 words. End with one short question that would help you refine further. ` +
        `Never recommend a book that is not in the candidate list. Use Markdown bold only — no headings, no tables.`;
      for await (const t of streamText(prompt, LIBRARIAN_SYSTEM)) {
        any = true;
        yield t;
      }
      if (any) return;
    } catch (err) {
      console.warn("[llm] librarian stream failed:", err instanceof Error ? err.message : err);
      // a reply that broke off mid-way is kept as-is rather than followed by a second answer
      if (any) return;
    }
  }
  yield offlineLibrarianAnswer(last, books);
}

function offlineLibrarianAnswer(last: string, books: ScoredBook[]): string {
  if (!books.length) {
    return "I couldn't find anything in the catalogue for that yet. Could you describe it differently — a setting, a feeling, or a book you loved?";
  }
  const picks = books.slice(0, 4).map((b) => {
    const s = b.snippet ? b.snippet.slice(0, 160) : b.description.slice(0, 160);
    return `**${b.title}** by ${b.authors[0]} — ★${b.rating.toFixed(1)} · ${b.category}. “${s}${s.length >= 160 ? "…" : ""}”`;
  });
  return `Here's what I'd pull off the shelf for “${last.slice(0, 80)}”:\n\n${picks.join("\n\n")}\n\nWant me to go darker, lighter, shorter, or closer to a specific book you love?`;
}

// ----------------------------------------------------------------------------- reader persona

export async function readerPersona(
  stats: Omit<ReaderInsights, "persona" | "aiPowered">,
  titles: { title: string; author: string; rating?: number }[],
): Promise<{ persona: ReaderInsights["persona"]; ai: boolean }> {
  const top = (Object.entries(stats.emotions) as [string, number][]).filter(([k]) => k !== "neutral").sort((a, b) => b[1] - a[1]);
  const res = await generateJSON<ReaderInsights["persona"]>(
    `A reader's shelf (${stats.count} books):\n${titles.slice(0, 40).map((t) => `- ${t.title} — ${t.author}${t.rating ? ` (they rated ${t.rating}/5)` : ""}`).join("\n")}\n\n` +
      `Aggregate profile: top categories ${stats.categories.slice(0, 4).map((c) => c.name).join(", ")}; recurring genres ${stats.genres.slice(0, 8).map((g) => g.name).join(", ")}; ` +
      `dominant emotions ${top.slice(0, 3).map(([k]) => k).join(", ")}; mood ${stats.vibes.dark_light.toFixed(2)} (−1 dark…+1 light), pace ${stats.vibes.pacing.toFixed(2)} (−1 fast…+1 slow), ` +
      `depth ${stats.vibes.cerebral_escapist.toFixed(2)} (−1 cerebral…+1 escapist); average ${Math.round(stats.avgPages)} pages, average publication year ${Math.round(stats.avgYear)}.\n\n` +
      `Return JSON {"title": "an evocative 2-4 word reader archetype, e.g. 'The Midnight Cartographer'", "summary": "2-3 warm, specific sentences describing their taste, referencing patterns in their actual books", ` +
      `"suggestions": ["3 vivid search queries for books they haven't read but would love — descriptive, not titles they already have"]}`,
    "You are ShelfSense, an insightful librarian who reads people through their bookshelves. Be specific and kind; never generic.",
  );
  if (res?.title && res.summary) {
    return { persona: { title: res.title, summary: res.summary, suggestions: (res.suggestions ?? []).slice(0, 3) }, ai: true };
  }
  return { persona: offlinePersona(stats), ai: false };
}

function offlinePersona(stats: Omit<ReaderInsights, "persona" | "aiPowered">): ReaderInsights["persona"] {
  const v = stats.vibes;
  const mood = v.dark_light < -0.12 ? "Midnight" : v.dark_light > 0.12 ? "Sunlit" : "Twilight";
  const role = v.cerebral_escapist < -0.12 ? "Philosopher" : v.cerebral_escapist > 0.12 ? "Adventurer" : v.pacing < -0.12 ? "Thrill-Seeker" : "Wanderer";
  const cat = stats.categories[0]?.name ?? "Fiction";
  const genres = stats.genres.slice(0, 3).map((g) => g.name.toLowerCase());
  const pace = v.pacing < -0.1 ? "propulsive, fast-moving" : v.pacing > 0.1 ? "patient, atmospheric" : "well-paced";
  return {
    title: `The ${mood} ${role}`,
    summary: `Your shelf leans toward ${cat.toLowerCase()}${genres.length ? `, with a soft spot for ${genres.join(", ")}` : ""}. You gravitate to ${pace} stories averaging around ${Math.round(stats.avgPages)} pages${stats.avgYear ? `, mostly from the ${Math.floor(stats.avgYear / 10) * 10}s` : ""}.`,
    suggestions: [
      `${v.dark_light < 0 ? "dark, " : "warm, "}${pace} ${genres[0] ?? cat.toLowerCase()} with unforgettable characters`,
      `a hidden-gem ${cat.toLowerCase()} novel that critics loved`,
      `${genres[1] ?? "literary"} story ${v.cerebral_escapist < 0 ? "full of big ideas" : "that is pure joy to read"}`,
    ],
  };
}

// ----------------------------------------------------------------------------- personal fit

export async function fitVerdict(book: Book, score: number, closest: string[], warnings: string[]): Promise<{ text: string; ai: boolean }> {
  const text = await generateText(
    `Book: "${book.title}" by ${book.authors.join(", ")} — ${book.description.slice(0, 900)}\n\n` +
      `The reader loved: ${closest.map((t) => `"${t}"`).join(", ")} (most similar books on their shelf).` +
      (warnings.length ? ` They disliked: ${warnings.map((t) => `"${t}"`).join(", ")}, which resemble this book.` : "") +
      `\nComputed fit score: ${score}/100.\n\nIn 2 short sentences, tell the reader honestly whether this book is likely for them and why, comparing it to the books named. No preamble.`,
    "You are ShelfSense, a candid, warm librarian. Ground claims in the description; never invent plot details.",
    12_000,
  );
  if (text) return { text, ai: true };
  const level = score >= 75 ? "a strong match" : score >= 50 ? "a reasonable bet" : "a stretch";
  return {
    text: `This looks like ${level} for you — it sits closest to ${closest.slice(0, 2).map((t) => `“${t}”`).join(" and ")} on your shelf.${warnings.length ? ` Heads-up: it also resembles “${warnings[0]}”, which you didn't enjoy.` : ""}`,
    ai: false,
  };
}
