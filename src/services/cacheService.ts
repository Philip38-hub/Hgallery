interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set a cache item with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    console.log(`📦 Cached: ${key} (expires in ${Math.round((expiresAt - now) / 1000)}s)`);
  }

  /**
   * Get a cache item if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now > item.expiresAt) {
      console.log(`🗑️ Cache expired: ${key}`);
      this.cache.delete(key);
      return null;
    }

    const ageSeconds = Math.round((now - item.timestamp) / 1000);
    console.log(`✅ Cache hit: ${key} (age: ${ageSeconds}s)`);
    return item.data;
  }

  /**
   * Check if a cache item exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific cache item
   */
  delete(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache deleted: ${key}`);
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache items`);
    }
  }

  /**
   * Get or set a cache item with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch and cache
    console.log(`🔄 Cache miss: ${key}, fetching...`);
    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }
}

// Create a singleton instance
export const cacheService = new CacheService();

// Clean up expired items every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

export default cacheService;
