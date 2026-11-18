import { getBook } from "@/lib/server/books";
import { HttpError, IdSchema, route } from "@/lib/server/http";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/books/[id]">) => {
  const { id } = await ctx.params;
  if (!IdSchema.safeParse(id).success) throw new HttpError(400, "Invalid book id");
  const book = await getBook(id);
  if (!book) throw new HttpError(404, "Book not found");
  return Response.json(book, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
});
