export type CacheOptions = {
  ttlMs: number;
  maxEntries: number;
};

type Entry<T> = {
  value: T;
  expiresAt: number;
};

export class Cache<T> {
  private map = new Map<string, Entry<T>>();

  constructor(
    private readonly opts: CacheOptions,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    this.purgeExpired();
    return this.map.size;
  }

  get(key: string): T | null {
    const k = this.normalize(key);
    const entry = this.map.get(k);
    if (!entry) return null;
    if (this.now() >= entry.expiresAt) {
      this.map.delete(k);
      return null;
    }
    this.map.delete(k);
    this.map.set(k, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const k = this.normalize(key);
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, { value, expiresAt: this.now() + this.opts.ttlMs });
    while (this.map.size > this.opts.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }

  private normalize(key: string): string {
    return key.trim().toLowerCase();
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [k, entry] of this.map) {
      if (now >= entry.expiresAt) this.map.delete(k);
    }
  }
}
