/**
 * Supabase Connection Pooling for Serverless
 *
 * In serverless environments (Vercel), each function invocation creates a new context.
 * Supabase handles connection pooling on their end via PgBouncer in transaction mode.
 *
 * This module caches the Supabase client instance within a single execution context
 * to avoid creating multiple clients for the same request.
 */

import { createServerClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Cache for server client (per-execution context)
let cachedServerClient: SupabaseClient<Database> | null = null;

/**
 * Get or create a cached server Supabase client
 * Reuses the same client within a single execution context
 *
 * @returns Cached Supabase server client
 */
export function getServerClient(): SupabaseClient<Database> {
  if (!cachedServerClient) {
    cachedServerClient = createServerClient();
  }
  return cachedServerClient;
}

/**
 * Reset the cached server client
 * Useful for testing or explicit cleanup
 */
export function resetServerClientCache(): void {
  cachedServerClient = null;
}
