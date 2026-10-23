// Short-lived, page-memory snapshots only. Authorization stays on the server.
export class ReadCache {
  constructor({ ttl = 15000, limit = 24, now = Date.now } = {}) {
    this.ttl = ttl; this.limit = limit; this.now = now; this.entries = new Map();
  }
  peek(key) {
    const entry = this.entries.get(key);
    return entry?.expires > this.now() ? entry.value : undefined;
  }
  get(key, loader) {
    const entry = this.entries.get(key);
    if (entry?.expires > this.now()) return Promise.resolve(entry.value);
    if (entry?.promise) return entry.promise;
    const next = {};
    next.promise = Promise.resolve().then(loader).then(value => {
      if (this.entries.get(key) === next) { next.value = value; next.expires = this.now() + this.ttl; delete next.promise; }
      return value;
    }, error => { if (this.entries.get(key) === next) this.entries.delete(key); throw error; });
    this.entries.delete(key); this.entries.set(key, next);
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value);
    return next.promise;
  }
  clear() { this.entries.clear(); }
}
