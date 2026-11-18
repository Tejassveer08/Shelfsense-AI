import "server-only";
import { getDb } from "./mongo";
import type { ShelfEntry } from "../types";

export interface SharedShelf {
  id: string;
  name: string;
  owner: string | null;
  books: Omit<ShelfEntry, "addedAt">[];
  createdAt: string;
}

export async function getSharedShelf(id: string): Promise<SharedShelf | null> {
  if (!/^[\w-]{4,20}$/.test(id)) return null;
  const db = await getDb();
  const doc = await db.collection<{ _id: string; name: string; owner: string | null; books: SharedShelf["books"]; created_at: Date }>("shelves").findOne({ _id: id });
  if (!doc) return null;
  return { id: doc._id, name: doc.name, owner: doc.owner, books: doc.books, createdAt: doc.created_at.toISOString() };
}
