import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/server/mongo";
import { IdSchema, parseBody, route } from "@/lib/server/http";

const Entry = z.object({
  id: IdSchema,
  title: z.string().max(300),
  authors: z.array(z.string().max(120)).max(5),
  cover: z.string().max(500),
  status: z.enum(["want", "reading", "read"]),
  myRating: z.number().min(1).max(5).optional(),
});
const Body = z.object({
  name: z.string().trim().max(80).optional(),
  owner: z.string().trim().max(60).optional(),
  books: z.array(Entry).min(1).max(300),
});

/** Publish a read-only snapshot of a shelf and return its share id. */
export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  const id = randomBytes(6).toString("base64url");
  const db = await getDb();
  await db.collection("shelves").insertOne({
    _id: id as never,
    name: body.name || "My ShelfSense shelf",
    owner: body.owner || null,
    books: body.books,
    created_at: new Date(),
  });
  return Response.json({ id, url: `/s/${id}` }, { status: 201 });
});
