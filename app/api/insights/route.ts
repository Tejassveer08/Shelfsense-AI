import { z } from "zod";
import { readerInsights } from "@/lib/server/recommend";
import { IdSchema, parseBody, rateLimit, route } from "@/lib/server/http";

const Body = z.object({
  books: z.array(z.object({ id: IdSchema, rating: z.number().min(1).max(5).optional() })).min(1).max(300),
});

export const maxDuration = 30;

export const POST = route(async (req: Request) => {
  rateLimit(req, "insights", 10);
  const { books } = await parseBody(req, Body);
  return Response.json(await readerInsights(books));
});
