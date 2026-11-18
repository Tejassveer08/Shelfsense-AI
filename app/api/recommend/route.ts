import { z } from "zod";
import { recommendFromTaste } from "@/lib/server/recommend";
import { FiltersSchema, IdSchema, SlidersSchema, parseBody, route } from "@/lib/server/http";

const Body = z.object({
  loved: z.array(z.object({ id: IdSchema, rating: z.number().min(1).max(5).optional() })).min(1).max(50),
  disliked: z.array(IdSchema).max(50).optional(),
  modifier: z.string().trim().max(200).optional(),
  exclude: z.array(IdSchema).max(500).optional(),
  filters: FiltersSchema.optional(),
  sliders: SlidersSchema.optional(),
  limit: z.number().int().min(1).max(48).optional(),
});

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  return Response.json(await recommendFromTaste(body));
});
