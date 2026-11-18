import { z } from "zod";
import { getBook } from "@/lib/server/books";
import { explainMatch } from "@/lib/server/llm";
import { splitSentences } from "@/lib/server/search";
import { HttpError, IdSchema, parseBody, rateLimit, route } from "@/lib/server/http";

const Body = z.object({ id: IdSchema, query: z.string().trim().min(1).max(500), snippet: z.string().max(600).optional() });

export const POST = route(async (req: Request) => {
  rateLimit(req, "explain", 40);
  const { id, query, snippet } = await parseBody(req, Body);
  const book = await getBook(id);
  if (!book) throw new HttpError(404, "Book not found");
  const best = snippet || splitSentences(book.description)[0] || book.description.slice(0, 200);
  const res = await explainMatch(book, query, best);
  return Response.json({ id, explanation: res.text, snippet: best, aiPowered: res.ai });
});
