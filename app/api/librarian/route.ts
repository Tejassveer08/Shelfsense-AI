import { z } from "zod";
import { hybridSearch } from "@/lib/server/search";
import { getBook } from "@/lib/server/books";
import { planSearch, streamLibrarianAnswer } from "@/lib/server/llm";
import { FiltersSchema, IdSchema, SlidersSchema, errorResponse, parseBody, rateLimit } from "@/lib/server/http";
import type { LibrarianPlan } from "@/lib/types";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(40),
  previous: z.object({ searchQuery: z.string().max(500), filters: FiltersSchema, sliders: SlidersSchema }).optional(),
  shownIds: z.array(IdSchema).max(300).optional(),
  readIds: z.array(IdSchema).max(500).optional(),
});

export const maxDuration = 60;

/**
 * The AI librarian. Streams newline-delimited JSON events:
 *   {"type":"plan", plan}      the search it decided to run
 *   {"type":"books", books}    the grounded candidates (rendered as cards)
 *   {"type":"text", delta}     the reply, token by token
 *   {"type":"done"} | {"type":"error", message}
 */
export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    rateLimit(req, "librarian", 20);
    body = await parseBody(req, Body);
  } catch (err) {
    return errorResponse(err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const plan: LibrarianPlan = await planSearch(body.messages, body.previous as LibrarianPlan | undefined);
        send({ type: "plan", plan });
        const excludeIds = [...(body.shownIds ?? []), ...(body.readIds ?? [])];
        const run = (query: string, limit: number, extra: { noAnchor?: boolean; affinityGenres?: string[] } = {}) =>
          hybridSearch({ query, filters: plan.filters, sliders: plan.sliders, raw: true, limit, excludeIds, ...extra });
        const search = await run(plan.searchQuery, plan.altQuery ? 6 : 8);
        // the description search stays in the anchor book's genre neighbourhood
        const anchorBook = plan.altQuery && search.intent.anchor ? await getBook(search.intent.anchor.id) : null;
        const alt = plan.altQuery ? await run(plan.altQuery, 8, { noAnchor: true, affinityGenres: anchorBook?.genres }) : null;
        let results = search.results;
        if (alt) {
          // interleave "close to the anchor" with "matches the difference", minus the anchor and its author
          const anchor = search.intent.anchor;
          const seen = new Set(results.map((b) => b.id));
          const extra = alt.results.filter(
            (b) => !seen.has(b.id) && b.id !== anchor?.id && !(anchor?.authors[0] && b.authors[0] === anchor.authors[0]),
          );
          results = results.flatMap((b, i) => (extra[i] ? [b, extra[i]] : [b])).concat(extra.slice(results.length)).slice(0, 10);
        }
        const books = results.map((b) => ({ ...b, description: b.description.slice(0, 400) }));
        send({ type: "books", books, mode: search.mode });
        for await (const delta of streamLibrarianAnswer(body.messages, results)) {
          send({ type: "text", delta });
        }
        send({ type: "done" });
      } catch (err) {
        console.error("[librarian]", err);
        send({ type: "error", message: err instanceof Error && /ECONNREFUSED|Server selection/.test(err.message) ? "The book database is unreachable right now." : "The librarian hit a snag. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
