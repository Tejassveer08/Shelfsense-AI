import { autocomplete } from "@/lib/server/search";
import { route } from "@/lib/server/http";

export const GET = route(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = q.trim().length >= 2 ? await autocomplete(q) : [];
  return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=600" } });
});
