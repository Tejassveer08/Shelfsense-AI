import { z } from "zod";
import { personalFit } from "@/lib/server/recommend";
import { HttpError, IdSchema, parseBody, rateLimit, route } from "@/lib/server/http";

const Body = z.object({
  id: IdSchema,
  loved: z.array(z.object({ id: IdSchema, rating: z.number().min(1).max(5).optional() })).min(1).max(60),
  disliked: z.array(IdSchema).max(30).optional(),
});

export const POST = route(async (req: Request) => {
  rateLimit(req, "fit", 30);
  const { id, loved, disliked } = await parseBody(req, Body);
  const fit = await personalFit(id, loved, disliked);
  if (!fit) throw new HttpError(404, "Not enough information to score this book");
  return Response.json(fit);
});
