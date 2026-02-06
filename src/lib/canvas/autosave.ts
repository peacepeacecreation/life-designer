/**
 * Canvas autosave module
 * Handles debounced saving to the backend with status tracking
 * INCLUDES LOCAL BACKUP FOR DISASTER RECOVERY
 */

import { Node, Edge } from 'reactflow';
import { saveCanvasBackup } from './local-backup';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutosaveOptions {
  canvasId?: string;
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
  onError?: (error: Error) => void;
}

export interface CanvasData {
  canvasId?: string;
  nodes: Node[];
  edges: Edge[];
  title?: string;
}

export interface LoadCanvasResponse {
  nodes: Node[];
  edges: Edge[];
  title: string;
  canvasId?: string;
  lastModified?: string;
  exists: boolean;
}

export interface AutosaveResponse {
  success: boolean;
  canvasId: string;
  action: 'created' | 'updated';
}

/**
 * Creates an autosave instance for canvas data
 */
export function createAutosave(options: AutosaveOptions = {}) {
  const {
    canvasId,
    debounceMs = 3000,
    onStatusChange,
    onError,
  } = options;

  let currentCanvasId = canvasId;
  let debounceTimer: NodeJS.Timeout | null = null;
  let saveInProgress = false;
  let pendingSave = false;
  let currentStatus: SaveStatus = 'idle';
  let pendingData: CanvasData | null = null;
  let lastSavedData: CanvasData | null = null; // Track last saved state

  /**
   * Check if canvas data has actually changed
   */
  function hasDataChanged(newData: CanvasData): boolean {
    if (!lastSavedData) return true; // First save always goes through

    // Compare using JSON stringify (simple but effective)
    const oldJson = JSON.stringify({
      nodes: lastSavedData.nodes,
      edges: lastSavedData.edges,
    });
    const newJson = JSON.stringify({
      nodes: newData.nodes,
      edges: newData.edges,
    });

    return oldJson !== newJson;
  }

  /**
   * Updates the current status and notifies listeners
   */
  function setStatus(status: SaveStatus) {
    currentStatus = status;
    onStatusChange?.(status);
  }

  /**
   * Performs the actual save operation
   */
  async function performSave(data: CanvasData): Promise<void> {
    if (saveInProgress) {
      pendingSave = true;
      pendingData = data;
      return;
    }

    // Check if data has actually changed
    if (!hasDataChanged(data)) {
      console.log('[Autosave] No changes detected, skipping save');
      setStatus('saved'); // Show as saved even though we skipped
      setTimeout(() => {
        if (currentStatus === 'saved') {
          setStatus('idle');
        }
      }, 1000);
      return;
    }

    saveInProgress = true;
    setStatus('saving');

    try {
      const dataWithCanvasId = {
        ...data,
        canvasId: currentCanvasId,
      };

      // CRITICAL: Save local backup BEFORE server request
      // This ensures we always have a recovery point
      if (currentCanvasId) {
        saveCanvasBackup(currentCanvasId, data.nodes, data.edges, data.title);
      }

      const response = await fetch('/api/canvas/autosave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataWithCanvasId),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Autosave] Server error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          canvasId: currentCanvasId,
          nodeCount: data.nodes?.length,
          edgeCount: data.edges?.length,
        });
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: AutosaveResponse = await response.json();

      if (!result.success) {
        throw new Error('Save failed');
      }

      // Update last saved state
      lastSavedData = {
        nodes: data.nodes,
        edges: data.edges,
        title: data.title,
      };

      setStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => {
        if (currentStatus === 'saved') {
          setStatus('idle');
        }
      }, 2000);

    } catch (error) {
      console.error('Autosave error:', error);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error(String(error)));

      // Reset to idle after 5 seconds on error
      setTimeout(() => {
        if (currentStatus === 'error') {
          setStatus('idle');
        }
      }, 5000);

    } finally {
      saveInProgress = false;

      // If there's a pending save, perform it now
      if (pendingSave && pendingData) {
        pendingSave = false;
        const dataToSave = pendingData;
        pendingData = null;
        await performSave(dataToSave);
      }
    }
  }

  /**
   * Schedules a save with debounce
   * Cancels previous scheduled saves
   */
  function scheduleSave(nodes: Node[], edges: Edge[], title?: string) {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Schedule new save
    debounceTimer = setTimeout(() => {
      performSave({ nodes, edges, title });
    }, debounceMs);
  }

  /**
   * Saves immediately without debounce
   */
  async function saveNow(nodes: Node[], edges: Edge[], title?: string): Promise<void> {
    // Clear any pending debounced save
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    await performSave({ nodes, edges, title });
  }

  /**
   * Loads the saved canvas data
   */
  async function load(loadCanvasId?: string): Promise<LoadCanvasResponse> {
    try {
      const canvasIdToLoad = loadCanvasId || currentCanvasId;
      const url = canvasIdToLoad
        ? `/api/canvas/autosave?canvasId=${canvasIdToLoad}`
        : '/api/canvas/autosave';

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: LoadCanvasResponse = await response.json();

      // Update last saved state to prevent unnecessary saves
      if (data.exists) {
        lastSavedData = {
          nodes: data.nodes,
          edges: data.edges,
          title: data.title,
        };
      }

      return data;

    } catch (error) {
      console.error('Load canvas error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));

      // Return empty data on error
      return {
        nodes: [],
        edges: [],
        title: 'Робочий Canvas',
        exists: false,
      };
    }
  }

  /**
   * Gets the current save status
   */
  function getStatus(): SaveStatus {
    return currentStatus;
  }

  /**
   * Updates the canvas ID (useful when switching canvases)
   */
  function setCanvasId(newCanvasId: string | undefined) {
    currentCanvasId = newCanvasId;
  }

  /**
   * Gets the current canvas ID
   */
  function getCanvasId(): string | undefined {
    return currentCanvasId;
  }

  /**
   * Cleanup function
   */
  function destroy() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  return {
    scheduleSave,
    saveNow,
    load,
    getStatus,
    setCanvasId,
    getCanvasId,
    destroy,
  };
}
