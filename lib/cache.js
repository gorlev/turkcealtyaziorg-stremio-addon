function estimateSize(value) {
  if (Buffer.isBuffer(value)) return value.length;
  if (value && Buffer.isBuffer(value.body)) return value.body.length;

  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return 1;
  }
}

class TtlCache {
  constructor({ maxEntries = 500, maxBytes = Infinity } = {}) {
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs, size = estimateSize(value)) {
    this.delete(key);
    if (size > this.maxBytes) return value;

    this.entries.set(key, {
      value,
      size,
      expiresAt: Date.now() + ttlMs,
    });
    this.bytes += size;
    this.trim();
    return value;
  }

  delete(key) {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.bytes -= entry.size;
    return true;
  }

  clear() {
    this.entries.clear();
    this.bytes = 0;
  }

  trim() {
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value;
      this.delete(oldestKey);
    }
  }
}

class SingleFlight {
  constructor() {
    this.inFlight = new Map();
  }

  run(key, operation) {
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = Promise.resolve()
      .then(operation)
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, promise);
    return promise;
  }
}

function createLimiter(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError('concurrency must be a positive integer');
  }

  let active = 0;
  const queue = [];

  function drain() {
    while (active < concurrency && queue.length > 0) {
      const job = queue.shift();
      active += 1;

      Promise.resolve()
        .then(job.operation)
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  }

  return function limit(operation) {
    return new Promise((resolve, reject) => {
      queue.push({ operation, resolve, reject });
      drain();
    });
  };
}

module.exports = {
  SingleFlight,
  TtlCache,
  createLimiter,
  estimateSize,
};
