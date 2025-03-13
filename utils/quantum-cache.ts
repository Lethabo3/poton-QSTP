/**
 * Cache for expensive quantum computations
 */
export class QuantumCache<K, V> {
  private _cache: Map<string, { value: V; timestamp: number }>
  private _maxSize: number
  private _ttl: number // Time to live in milliseconds
  private _keySerializer: (key: K) => string
  private _hits = 0
  private _misses = 0

  /**
   * Creates a new quantum cache
   * @param maxSize Maximum number of entries in the cache
   * @param ttl Time to live in milliseconds (0 for no expiration)
   * @param keySerializer Function to serialize keys to strings
   */
  constructor(maxSize = 1000, ttl = 0, keySerializer?: (key: K) => string) {
    this._cache = new Map()
    this._maxSize = maxSize
    this._ttl = ttl
    this._keySerializer = keySerializer || JSON.stringify
  }

  /**
   * Gets a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found
   */
  get(key: K): V | undefined {
    const serializedKey = this._keySerializer(key)
    const entry = this._cache.get(serializedKey)

    if (!entry) {
      this._misses++
      return undefined
    }

    // Check if entry has expired
    if (this._ttl > 0 && Date.now() - entry.timestamp > this._ttl) {
      this._cache.delete(serializedKey)
      this._misses++
      return undefined
    }

    this._hits++
    return entry.value
  }

  /**
   * Sets a value in the cache
   * @param key Cache key
   * @param value Value to cache
   */
  set(key: K, value: V): void {
    const serializedKey = this._keySerializer(key)

    // Evict oldest entry if cache is full
    if (this._cache.size >= this._maxSize && !this._cache.has(serializedKey)) {
      const oldestKey = this._findOldestEntry()
      if (oldestKey) {
        this._cache.delete(oldestKey)
      }
    }

    this._cache.set(serializedKey, {
      value,
      timestamp: Date.now(),
    })
  }

  /**
   * Gets a value from the cache or computes it if not found
   * @param key Cache key
   * @param computeValue Function to compute the value if not in cache
   * @returns Cached or computed value
   */
  getOrCompute(key: K, computeValue: () => V): V {
    const cachedValue = this.get(key)
    if (cachedValue !== undefined) {
      return cachedValue
    }

    const value = computeValue()
    this.set(key, value)
    return value
  }

  /**
   * Finds the oldest entry in the cache
   * @returns Key of the oldest entry or undefined if cache is empty
   */
  private _findOldestEntry(): string | undefined {
    let oldestKey: string | undefined
    let oldestTimestamp = Number.POSITIVE_INFINITY

    for (const [key, entry] of this._cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this._hits + this._misses
    return {
      size: this._cache.size,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
    }
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this._cache.clear()
    this._hits = 0
    this._misses = 0
  }
}

