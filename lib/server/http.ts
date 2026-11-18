import "server-only";
import { z } from "zod";
import { ConfigError } from "./mongo";
import { EMOTIONS } from "../types";

export const FiltersSchema = z
  .object({
    category: z.string().max(60).nullish(),
    tone: z.enum(EMOTIONS).nullish(),
    yearMin: z.number().int().min(0).max(2100).nullish(),
    yearMax: z.number().int().min(0).max(2100).nullish(),
    maxPages: z.number().int().min(1).max(10000).nullish(),
    minRating: z.number().min(0).max(5).nullish(),
    minRatings: z.number().int().min(0).nullish(),
  })
  .partial();

const axis = z.number().min(-1).max(1).optional();
export const SlidersSchema = z
  .object({ dark_light: axis, pacing: axis, cerebral_escapist: axis, length_scale: axis })
  .partial();

export const IdSchema = z.string().min(1).max(40).regex(/^[\w-]+$/);

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

const hits = new Map<string, number[]>();

/**
 * Best-effort per-IP limit for the endpoints that call the LLM (per server instance; put Vercel
 * Firewall rate limiting in front for a hard guarantee).
 */
export function rateLimit(req: Request, bucket: string, limit = 30, windowMs = 60_000): void {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) throw new HttpError(429, "Too many requests — please slow down a little.");
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof ConfigError) return Response.json({ error: err.message }, { status: 503 });
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api]", err);
  const dbDown = /ECONNREFUSED|Server selection timed out|getaddrinfo|MongoServerSelectionError/i.test(message);
  return Response.json(
    { error: dbDown ? "The book database is unreachable right now." : "Something went wrong.", detail: process.env.NODE_ENV === "production" ? undefined : message },
    { status: dbDown ? 503 : 500 },
  );
}

/** Wrap a route handler with uniform error handling. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
