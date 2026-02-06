/**
 * Local Canvas Backup System
 * Automatically backs up canvas to localStorage as safety net
 */

import { Node, Edge } from 'reactflow';

const BACKUP_KEY_PREFIX = 'canvas_backup_';
const MAX_BACKUPS = 50; // Keep last 50 versions

export interface CanvasBackup {
  canvasId: string;
  nodes: Node[];
  edges: Edge[];
  title?: string;
  timestamp: string;
  version: number;
}

/**
 * Compare two canvas states for equality
 */
function isCanvasEqual(
  backup1: { nodes: Node[]; edges: Edge[] },
  backup2: { nodes: Node[]; edges: Edge[] }
): boolean {
  // Quick check: different lengths = different
  if (backup1.nodes.length !== backup2.nodes.length) return false;
  if (backup1.edges.length !== backup2.edges.length) return false;

  // Deep comparison using JSON stringify
  // This is simple but effective for our use case
  return (
    JSON.stringify(backup1.nodes) === JSON.stringify(backup2.nodes) &&
    JSON.stringify(backup1.edges) === JSON.stringify(backup2.edges)
  );
}

/**
 * Save canvas backup to localStorage
 */
export function saveCanvasBackup(
  canvasId: string,
  nodes: Node[],
  edges: Edge[],
  title?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    // Get existing backups
    const backups = getCanvasBackups(canvasId);

    // Check if latest backup is identical to current state
    const latestBackup = backups[backups.length - 1];
    if (latestBackup && isCanvasEqual({ nodes, edges }, latestBackup)) {
      console.log(`[LocalBackup] No changes detected, skipping backup for canvas ${canvasId}`);
      return;
    }

    // Create new backup
    const newBackup: CanvasBackup = {
      canvasId,
      nodes,
      edges,
      title,
      timestamp: new Date().toISOString(),
      version: backups.length + 1,
    };

    // Add to backups list
    backups.push(newBackup);

    // Keep only last MAX_BACKUPS versions
    const trimmedBackups = backups.slice(-MAX_BACKUPS);

    // Save to localStorage
    const key = `${BACKUP_KEY_PREFIX}${canvasId}`;
    localStorage.setItem(key, JSON.stringify(trimmedBackups));

    console.log(`[LocalBackup] Saved backup v${newBackup.version} for canvas ${canvasId}`);
  } catch (error) {
    console.error('[LocalBackup] Failed to save backup:', error);
  }
}

/**
 * Get all backups for a canvas
 */
export function getCanvasBackups(canvasId: string): CanvasBackup[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = `${BACKUP_KEY_PREFIX}${canvasId}`;
    const data = localStorage.getItem(key);

    if (!data) return [];

    return JSON.parse(data) as CanvasBackup[];
  } catch (error) {
    console.error('[LocalBackup] Failed to load backups:', error);
    return [];
  }
}

/**
 * Get latest backup for a canvas
 */
export function getLatestBackup(canvasId: string): CanvasBackup | null {
  const backups = getCanvasBackups(canvasId);
  return backups[backups.length - 1] || null;
}

/**
 * Restore canvas from a specific backup version
 */
export function restoreFromBackup(
  canvasId: string,
  version: number
): CanvasBackup | null {
  const backups = getCanvasBackups(canvasId);
  return backups.find(b => b.version === version) || null;
}

/**
 * Clear all backups for a canvas
 */
export function clearCanvasBackups(canvasId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${BACKUP_KEY_PREFIX}${canvasId}`;
    localStorage.removeItem(key);
    console.log(`[LocalBackup] Cleared backups for canvas ${canvasId}`);
  } catch (error) {
    console.error('[LocalBackup] Failed to clear backups:', error);
  }
}

/**
 * Get storage usage info
 */
export function getBackupStorageInfo(canvasId: string): {
  backupCount: number;
  totalSizeKB: number;
  oldestBackup?: string;
  newestBackup?: string;
} {
  const backups = getCanvasBackups(canvasId);

  if (backups.length === 0) {
    return {
      backupCount: 0,
      totalSizeKB: 0,
    };
  }

  const key = `${BACKUP_KEY_PREFIX}${canvasId}`;
  const data = localStorage.getItem(key);
  const sizeBytes = new Blob([data || '']).size;

  return {
    backupCount: backups.length,
    totalSizeKB: Math.round(sizeBytes / 1024),
    oldestBackup: backups[0]?.timestamp,
    newestBackup: backups[backups.length - 1]?.timestamp,
  };
}
