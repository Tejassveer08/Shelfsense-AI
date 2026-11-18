import { getDb, TEXT_INDEX, VECTOR_INDEX } from "@/lib/server/mongo";
import { embeddingStatus, embedQuery } from "@/lib/server/embeddings";
import { llmStatus } from "@/lib/server/llm";
import type { HealthResponse } from "@/lib/types";

export async function GET() {
  const out: HealthResponse = {
    status: "ok",
    database: { connected: false, books: 0 },
    search: { textIndex: false, vectorIndex: false },
    embeddings: { provider: embeddingStatus().provider, ready: false },
    llm: llmStatus(),
    version: "2.0.0",
  };
  try {
    const db = await getDb();
    const books = db.collection("books");
    out.database = { connected: true, books: await books.estimatedDocumentCount() };
    const indexes = (await books.listSearchIndexes().toArray()) as { name: string; queryable?: boolean }[];
    out.search = {
      textIndex: indexes.some((i) => i.name === TEXT_INDEX && i.queryable),
      vectorIndex: indexes.some((i) => i.name === VECTOR_INDEX && i.queryable),
    };
  } catch (err) {
    out.database.error = err instanceof Error ? err.message : String(err);
  }
  const vec = await embedQuery("health check").catch(() => null);
  out.embeddings = { provider: embeddingStatus().provider, ready: !!vec, error: embeddingStatus().error };
  if (!out.database.connected) out.status = "error";
  else if (!out.search.textIndex || !out.search.vectorIndex || !out.embeddings.ready) out.status = "degraded";
  return Response.json(out, { status: out.status === "error" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
