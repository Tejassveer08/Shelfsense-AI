import { z } from "zod";
import { hybridSearch } from "@/lib/server/search";
import { FiltersSchema, IdSchema, SlidersSchema, parseBody, route } from "@/lib/server/http";

const Body = z.object({
  query: z.string().trim().min(1).max(500),
  filters: FiltersSchema.optional(),
  sliders: SlidersSchema.optional(),
  limit: z.number().int().min(1).max(60).optional(),
  excludeIds: z.array(IdSchema).max(500).optional(),
});

export const maxDuration = 30;

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  const res = await hybridSearch(body);
  return Response.json(res);
});
