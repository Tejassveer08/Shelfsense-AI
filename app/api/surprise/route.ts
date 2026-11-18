import { surpriseBook } from "@/lib/server/books";
import { route } from "@/lib/server/http";

export const GET = route(async (req: Request) => {
  const category = new URL(req.url).searchParams.get("category") || undefined;
  const book = await surpriseBook({ category });
  return Response.json({ book }, { headers: { "Cache-Control": "no-store" } });
});
