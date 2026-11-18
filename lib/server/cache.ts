import "server-only";

/** Tiny per-instance TTL cache (serverless instances are reused between requests). */
export class TTLCache<V> {
  private store = new Map<string, { value: V; expires: number }>();
  constructor(private readonly ttlMs: number, private readonly max = 500) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU position
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V): void {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  async wrap(key: string, fn: () => Promise<V>): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    this.set(key, value);
    return value;
  }
}
