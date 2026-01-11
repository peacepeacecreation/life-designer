/**
 * Search Cache
 *
 * Simple in-memory cache for search results with TTL (Time To Live).
 * Reduces API calls and embedding generation for frequently searched queries.
 *
 * Features:
 * - Automatic expiration after 5 minutes
 * - Cache key includes userId and query for isolation
 * - Optional content type filtering
 * - Memory-efficient with size limits
 */

import { SearchResponse } from '@/types/search';

interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
}

class SearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private maxSize: number = 100; // Maximum cache entries

  /**
   * Generate cache key from userId, query, and types
   */
  private getCacheKey(userId: string, query: string, types?: string[]): string {
    const normalizedQuery = query.trim().toLowerCase();
    const typesKey = types?.sort().join(',') || 'all';
    return `${userId}:${normalizedQuery}:${typesKey}`;
  }

  /**
   * Get cached search results if available and not expired
   */
  get(userId: string, query: string, types?: string[]): SearchResponse | null {
    const key = this.getCacheKey(userId, query, types);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store search results in cache
   */
  set(userId: string, query: string, data: SearchResponse, types?: string[]): void {
    const key = this.getCacheKey(userId, query, types);

    // Enforce max cache size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for specific user
   */
  clearUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached search results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict oldest cache entries to make room for new ones
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}

// Singleton instance
let searchCache: SearchCache | null = null;

/**
 * Get or create singleton search cache
 */
export function getSearchCache(): SearchCache {
  if (!searchCache) {
    searchCache = new SearchCache();

    // Set up periodic cleanup of expired entries (every 10 minutes)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        searchCache?.cleanExpired();
      }, 10 * 60 * 1000);
    }
  }
  return searchCache;
}

/**
 * Reset search cache (useful for testing)
 */
export function resetSearchCache(): void {
  searchCache = null;
}

// Export singleton instance
export const cache = getSearchCache();
