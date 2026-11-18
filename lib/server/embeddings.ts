import "server-only";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { Binary } from "mongodb";
import { getDb, vectorFormat } from "./mongo";
import { TTLCache } from "./cache";

/**
 * Query embeddings with sentence-transformers/all-MiniLM-L6-v2 — the model the catalogue was
 * embedded with, so query and book vectors live in the same space.
 *
 * Providers (EMBEDDINGS_PROVIDER):
 *   local @huggingface/transformers running ONNX in Node — free, no key, works locally and on
 *         Vercel (the model is bundled into the function by `npm run build`)
 *   hf    Hugging Face Inference API (needs HF_TOKEN with credits; falls back to local on error)
 *   auto  (default) = local
 *   none  keyword search only
 */

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const LOCAL_MODEL = "Xenova/all-MiniLM-L6-v2";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`;
export const EMBEDDING_DIM = 384;

type Provider = "hf" | "local" | "none";
const memory = new TTLCache<Float32Array>(6 * 3600_000, 2000);
let lastError: string | undefined;

export function embeddingProvider(): Provider {
  const configured = (process.env.EMBEDDINGS_PROVIDER || "auto").toLowerCase();
  if (configured === "hf" || configured === "local" || configured === "none") return configured;
  return "local";
}

export function embeddingStatus() {
  return { provider: embeddingProvider(), error: lastError };
}

function normalize(v: ArrayLike<number>): Float32Array {
  const out = new Float32Array(v.length);
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

async function embedHF(texts: string[]): Promise<Float32Array[]> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN is not set");
  const res = await fetch(HF_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Hugging Face ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as number[] | number[][] | number[][][];
  // Sentence-transformers models return pooled vectors; guard against token-level output.
  const rows: number[][] = typeof data[0] === "number" ? [data as number[]] : (data as number[][] | number[][][]).map(
    (row) => (Array.isArray(row[0]) ? meanPool(row as number[][]) : (row as number[])),
  );
  return rows.map(normalize);
}

function meanPool(tokens: number[][]): number[] {
  const out = new Array(tokens[0].length).fill(0);
  for (const t of tokens) for (let i = 0; i < t.length; i++) out[i] += t[i] / tokens.length;
  return out;
}

type Extractor = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;
let localExtractor: Promise<Extractor> | undefined;

async function embedLocal(texts: string[]): Promise<Float32Array[]> {
  if (!localExtractor) {
    localExtractor = (async () => {
      const tf = await import("@huggingface/transformers");
      // `npm run build` downloads the model into ./models, which ships inside the Vercel function
      const modelsDir = path.join(process.cwd(), "models");
      if (existsSync(path.join(modelsDir, LOCAL_MODEL, "onnx", "model.onnx"))) {
        tf.env.localModelPath = modelsDir;
        tf.env.allowRemoteModels = false;
      } else if (process.env.VERCEL) {
        tf.env.cacheDir = "/tmp/transformers-cache"; // the deployment itself is read-only
      }
      return (await tf.pipeline("feature-extraction", LOCAL_MODEL, { dtype: "fp32" })) as unknown as Extractor;
    })().catch((err) => {
      localExtractor = undefined;
      throw err;
    });
  }
  const extractor = await localExtractor;
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist().map((row) => Float32Array.from(row));
}

async function embedRaw(texts: string[]): Promise<Float32Array[] | null> {
  const provider = embeddingProvider();
  if (provider === "none" || texts.length === 0) return null;
  try {
    const result = provider === "hf" ? await embedHF(texts) : await embedLocal(texts);
    lastError = undefined;
    return result;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.warn(`[embeddings] ${provider} failed: ${lastError}`);
  }
  if (provider === "hf") {
    // out of Hugging Face credits, rate-limited or down: the bundled model gives identical vectors
    try {
      const result = await embedLocal(texts);
      lastError = undefined;
      return result;
    } catch (err) {
      console.warn(`[embeddings] local fallback failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return null;
}

const key = (text: string) => createHash("sha1").update(`${MODEL}\n${text}`).digest("hex");

/** Embed one query, with in-memory + MongoDB caching (survives cold starts). */
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const clean = text.trim().toLowerCase().slice(0, 1000);
  if (!clean) return null;
  const id = key(clean);
  const hit = memory.get(id);
  if (hit) return hit;

  const db = await getDb().catch(() => null);
  const cached = db
    ? await db
        .collection<{ _id: string; v: Binary; created_at: Date }>("embedding_cache")
        .findOne({ _id: id })
        .catch(() => null)
    : null;
  if (cached?.v) {
    const v = cached.v.toFloat32Array();
    memory.set(id, v);
    return v;
  }

  const [vec] = (await embedRaw([clean])) ?? [];
  if (!vec) return null;
  memory.set(id, vec);
  if (db) {
    db.collection<{ _id: string; v: Binary; created_at: Date }>("embedding_cache")
      .updateOne({ _id: id }, { $set: { v: Binary.fromFloat32Array(vec), created_at: new Date() } }, { upsert: true })
      .catch(() => undefined);
  }
  return vec;
}

/** Embed many short texts in one call (used for snippet highlighting). Not cached. */
export async function embedMany(texts: string[]): Promise<Float32Array[] | null> {
  return embedRaw(texts.map((t) => t.slice(0, 500)));
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function combine(parts: { v: ArrayLike<number>; w: number }[]): Float32Array {
  const out = new Float32Array(EMBEDDING_DIM);
  for (const { v, w } of parts) for (let i = 0; i < EMBEDDING_DIM; i++) out[i] += v[i] * w;
  return normalize(out);
}

/** Book vectors are stored as BSON binary vectors (float32 or int8). */
export function decodeVector(bin: Binary | undefined | null): Float32Array | null {
  if (!bin) return null;
  try {
    if (vectorFormat() === "int8") return normalize(bin.toInt8Array());
    return bin.toFloat32Array();
  } catch {
    try {
      return normalize(bin.toInt8Array());
    } catch {
      return null;
    }
  }
}

/** The query vector in the format the index was built with. */
export function encodeQueryVector(v: Float32Array): Binary | number[] {
  if (vectorFormat() === "int8") {
    let max = 0;
    for (const x of v) max = Math.max(max, Math.abs(x));
    const scale = 127 / (max || 1);
    return Binary.fromInt8Array(Int8Array.from(v, (x) => Math.max(-127, Math.min(127, Math.round(x * scale)))));
  }
  return Array.from(v);
}
