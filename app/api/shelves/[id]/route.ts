import { getSharedShelf } from "@/lib/server/shelves";
import { HttpError, route } from "@/lib/server/http";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/shelves/[id]">) => {
  const { id } = await ctx.params;
  const shelf = await getSharedShelf(id);
  if (!shelf) throw new HttpError(404, "Shelf not found");
  return Response.json(shelf);
});
