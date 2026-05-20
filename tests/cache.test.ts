import { describe, it, expect } from 'vitest';
import { Cache } from '../src/main/cache';

describe('Cache', () => {
  it('returns null for a missing key', () => {
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 });
    expect(c.get('foo')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 });
    c.set('foo', 'bar');
    expect(c.get('foo')).toBe('bar');
  });

  it('expires entries after ttlMs', () => {
    let now = 1000;
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 }, () => now);
    c.set('foo', 'bar');
    now = 1999;
    expect(c.get('foo')).toBe('bar');
    now = 2001;
    expect(c.get('foo')).toBeNull();
  });

  it('normalizes keys: case-insensitive and trims whitespace', () => {
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 });
    c.set('React', 'value');
    expect(c.get('react')).toBe('value');
    expect(c.get('  REACT  ')).toBe('value');
  });

  it('evicts least-recently-used entry when at capacity', () => {
    const c = new Cache<number>({ ttlMs: 10_000, maxEntries: 2 });
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBeNull();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });

  it('refreshes recency on get so subsequent writes evict the older one', () => {
    const c = new Cache<number>({ ttlMs: 10_000, maxEntries: 2 });
    c.set('a', 1);
    c.set('b', 2);
    c.get('a');
    c.set('c', 3);
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBeNull();
    expect(c.get('c')).toBe(3);
  });

  it('overwriting a key updates the value and the expiry', () => {
    let now = 0;
    const c = new Cache<string>({ ttlMs: 100, maxEntries: 10 }, () => now);
    c.set('k', 'one');
    now = 50;
    c.set('k', 'two');
    now = 120;
    expect(c.get('k')).toBe('two');
    now = 151;
    expect(c.get('k')).toBeNull();
  });

  it('clear() empties the cache', () => {
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 });
    c.set('foo', 'bar');
    c.set('baz', 'qux');
    c.clear();
    expect(c.get('foo')).toBeNull();
    expect(c.get('baz')).toBeNull();
    expect(c.size).toBe(0);
  });

  it('size reflects the current entry count', () => {
    const c = new Cache<string>({ ttlMs: 1000, maxEntries: 10 });
    expect(c.size).toBe(0);
    c.set('a', '1');
    c.set('b', '2');
    expect(c.size).toBe(2);
    c.set('a', '1-updated');
    expect(c.size).toBe(2);
  });

  it('purges expired entries from size', () => {
    let now = 0;
    const c = new Cache<string>({ ttlMs: 100, maxEntries: 10 }, () => now);
    c.set('a', '1');
    now = 50;
    c.set('b', '2');
    now = 101;
    c.get('a');
    expect(c.size).toBe(1);
  });
});
