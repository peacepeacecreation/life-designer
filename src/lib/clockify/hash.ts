/**
 * Clockify Time Entry Content Hashing
 *
 * Purpose: Detect changes in Clockify entries to avoid unnecessary database updates
 *
 * Hash Components (in order):
 * 1. description    - Entry description text
 * 2. start_time     - ISO timestamp when entry started
 * 3. end_time       - ISO timestamp when entry ended (or null for running entries)
 * 4. project_id     - Clockify project ID
 *
 * Why these fields?
 * - These are the main editable fields in Clockify
 * - If ANY of these change, we need to update the database
 * - Other fields (tags, billable) can be added later if needed
 *
 * Hash Algorithm: SHA-256
 * - Fast, deterministic, collision-resistant
 * - Node.js crypto module (server-side)
 * - Web Crypto API (client-side)
 *
 * Usage:
 * ```typescript
 * const hash = await generateTimeEntryHash({
 *   description: "Client meeting",
 *   start_time: "2026-01-14T10:00:00Z",
 *   end_time: "2026-01-14T11:00:00Z",
 *   project_id: "abc123"
 * })
 *
 * // Compare with stored hash
 * if (hash !== storedHash) {
 *   // Entry was modified in Clockify → update database
 * }
 * ```
 */

import crypto from 'crypto';

/**
 * Time entry data used for hash calculation
 * Only includes fields that matter for change detection
 */
export interface TimeEntryHashData {
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  project_id: string | null;
}

/**
 * Generate SHA-256 hash for time entry content
 *
 * @param data - Time entry data (description, start_time, end_time, project_id)
 * @returns SHA-256 hash string (hex format)
 *
 * @example
 * ```typescript
 * const hash = await generateTimeEntryHash({
 *   description: "Meeting",
 *   start_time: "2026-01-14T10:00:00Z",
 *   end_time: "2026-01-14T11:00:00Z",
 *   project_id: "proj_123"
 * })
 * // Returns: "a1b2c3d4e5f6..."
 * ```
 */
export async function generateTimeEntryHash(
  data: TimeEntryHashData
): Promise<string> {
  // Normalize data to consistent format
  const normalized = normalizeHashData(data);

  // Create deterministic string representation
  const content = [
    normalized.description,
    normalized.start_time,
    normalized.end_time,
    normalized.project_id,
  ].join('|');

  // Generate SHA-256 hash
  // Server-side: use Node.js crypto
  if (typeof window === 'undefined') {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Client-side: use Web Crypto API
  const encoder = new TextEncoder();
  const data_buffer = encoder.encode(content);
  const hash_buffer = await crypto.subtle.digest('SHA-256', data_buffer);
  const hash_array = Array.from(new Uint8Array(hash_buffer));
  return hash_array.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize hash data to consistent format
 * Handles null values and ensures consistent ordering
 */
function normalizeHashData(data: TimeEntryHashData): TimeEntryHashData {
  return {
    description: data.description || '',
    start_time: data.start_time || '',
    end_time: data.end_time || '',
    project_id: data.project_id || '',
  };
}

/**
 * Sync strategy helper: Check if entry needs update
 *
 * @param clockifyEntry - Entry from Clockify API
 * @param storedHash - Hash stored in database
 * @returns true if entry was modified and needs update
 *
 * @example
 * ```typescript
 * const needsUpdate = await hasEntryChanged(clockifyEntry, dbEntry.content_hash)
 * if (needsUpdate) {
 *   await updateEntry(clockifyEntry)
 * }
 * ```
 */
export async function hasEntryChanged(
  clockifyEntry: any,
  storedHash: string | null
): Promise<boolean> {
  if (!storedHash) {
    // No stored hash → new entry or legacy entry without hash
    return true;
  }

  const currentHash = await generateTimeEntryHash({
    description: clockifyEntry.description || null,
    start_time: clockifyEntry.timeInterval?.start || null,
    end_time: clockifyEntry.timeInterval?.end || null,
    project_id: clockifyEntry.projectId || null,
  });

  return currentHash !== storedHash;
}

/**
 * Batch hash generation for multiple entries
 * More efficient than calling generateTimeEntryHash in a loop
 *
 * @param entries - Array of Clockify time entries
 * @returns Map of entry ID to hash
 */
export async function generateBatchHashes(
  entries: any[]
): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();

  await Promise.all(
    entries.map(async (entry) => {
      const hash = await generateTimeEntryHash({
        description: entry.description || null,
        start_time: entry.timeInterval?.start || null,
        end_time: entry.timeInterval?.end || null,
        project_id: entry.projectId || null,
      });
      hashes.set(entry.id, hash);
    })
  );

  return hashes;
}
