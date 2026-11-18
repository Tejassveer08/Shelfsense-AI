import "server-only";
import { MongoClient, type Db } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

export const TEXT_INDEX = "books_text";
export const VECTOR_INDEX = "books_vector";

type GlobalMongo = typeof globalThis & { __shelfsenseMongo?: Promise<MongoClient> };
const g = globalThis as GlobalMongo;

export class ConfigError extends Error {}

/**
 * One MongoClient per server instance. On Vercel (Fluid compute) the pool is attached so idle
 * connections are released before the instance is suspended; in dev the client survives HMR.
 */
export function getClient(): Promise<MongoClient> {
  if (!g.__shelfsenseMongo) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new ConfigError("MONGODB_URI is not set. Copy .env.example to .env.local.");
    const client = new MongoClient(uri, {
      appName: "shelfsense",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    try {
      attachDatabasePool(client);
    } catch {
      // not running on Vercel
    }
    g.__shelfsenseMongo = client.connect().catch((err) => {
      g.__shelfsenseMongo = undefined;
      throw err;
    });
  }
  return g.__shelfsenseMongo;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "shelfsense");
}

export function vectorFormat(): "float32" | "int8" {
  return process.env.VECTOR_FORMAT === "int8" ? "int8" : "float32";
}
