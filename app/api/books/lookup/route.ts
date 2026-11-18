import { z } from "zod";
import { lookupBooks } from "@/lib/server/lookup";
import { parseBody, route } from "@/lib/server/http";

const Body = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(40).optional(),
        isbn13: z.string().max(20).optional(),
        title: z.string().max(300).optional(),
        author: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(3000),
});

export const maxDuration = 60;

/** Resolve a Goodreads library export (ids, ISBNs, titles) to catalogue books. */
export const POST = route(async (req: Request) => {
  const { items } = await parseBody(req, Body);
  return Response.json({ results: await lookupBooks(items) });
});
