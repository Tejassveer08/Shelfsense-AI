import { similarBooks } from "@/lib/server/recommend";
import { HttpError, IdSchema, route } from "@/lib/server/http";

export const GET = route(async (req: Request, ctx: RouteContext<"/api/books/[id]/similar">) => {
  const { id } = await ctx.params;
  if (!IdSchema.safeParse(id).success) throw new HttpError(400, "Invalid book id");
  const limit = Math.min(36, Number(new URL(req.url).searchParams.get("limit")) || 18);
  const results = await similarBooks(id, { limit });
  return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
});
