import { hiddenGems, popularBooks, topRatedBooks } from "@/lib/server/books";
import { HttpError, route } from "@/lib/server/http";

export const GET = route(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const kind = p.get("kind") ?? "popular";
  const category = p.get("category") || undefined;
  const limit = Math.min(48, Number(p.get("limit")) || 18);
  const results =
    kind === "popular" ? await popularBooks({ category, limit })
    : kind === "top" ? await topRatedBooks({ category, limit, minRatings: category ? 2000 : 20000 })
    : kind === "gems" ? await hiddenGems({ category, limit })
    : null;
  if (!results) throw new HttpError(400, "kind must be popular, top or gems");
  return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } });
});
