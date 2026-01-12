/**
 * Clockify API Client
 * Handles all communication with Clockify time tracking API
 *
 * Features:
 * - API key authentication via X-Api-Key header
 * - Automatic retry logic with exponential backoff
 * - Rate limiting (50 requests/second)
 * - Type-safe responses
 * - Comprehensive error handling
 *
 * API Documentation: https://docs.clockify.me/
 * Base URL: https://api.clockify.me/api/v1
 */

import {
  ClockifyUser,
  ClockifyWorkspace,
  ClockifyProjectAPI,
  ClockifyTag,
  ClockifyTimeEntry,
} from '@/types/clockify';

export interface ClockifyAPIError {
  message: string;
  code: number;
}

export class ClockifyClient {
  private apiKey: string;
  private baseUrl = 'https://api.clockify.me/api/v1';
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private rateLimit = 50; // requests per second (Clockify limit)
  private requestQueue: Promise<any>[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    if (!this.apiKey) {
      throw new Error('Clockify API key is required');
    }
  }

  /**
   * Generic API request handler with retry logic and rate limiting
   * @param endpoint - API endpoint (e.g., '/user' or '/workspaces')
   * @param options - Fetch options
   * @returns Parsed JSON response
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Enforce rate limiting
    await this.enforceRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
            ...options.headers,
          },
        });

        if (!response.ok) {
          let errorMessage = response.statusText;

          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // If error response is not JSON, use status text
          }

          throw new Error(
            `Clockify API error (${response.status}): ${errorMessage}`
          );
        }

        // Handle empty responses (e.g., DELETE requests)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          return {} as T;
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors (401, 403)
        if (
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('Invalid API key') ||
          lastError.message.includes('Unauthorized')
        ) {
          throw new Error(
            `Authentication failed: ${lastError.message}. Please check your Clockify API key.`
          );
        }

        // Don't retry on 404 (resource not found)
        if (lastError.message.includes('404')) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw new Error(
      `Failed to complete Clockify API request after ${this.maxRetries} attempts. ` +
      `Last error: ${lastError?.message}`
    );
  }

  /**
   * Enforce rate limiting to stay within Clockify's limits
   * Simple implementation - can be enhanced with token bucket algorithm
   */
  private async enforceRateLimit(): Promise<void> {
    // Clean up completed promises
    this.requestQueue = this.requestQueue.filter(p => {
      const isPending = (p as any).isPending !== false;
      return isPending;
    });

    // If we're at rate limit, wait for oldest request to complete
    if (this.requestQueue.length >= this.rateLimit) {
      await Promise.race(this.requestQueue);
    }

    // Add current request to queue
    let resolveFn: ((value: boolean) => void) | undefined;
    const promise: any = new Promise(resolve => {
      resolveFn = resolve;
    });
    promise.isPending = true;

    this.requestQueue.push(promise);

    // Auto-resolve after 1 second
    setTimeout(() => {
      promise.isPending = false;
      if (resolveFn) resolveFn(true);
    }, 1000);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  /**
   * Get current authenticated user
   * Use this to validate API key and get user's default workspace
   *
   * @returns Current user information
   */
  async getCurrentUser(): Promise<ClockifyUser> {
    return this.request<ClockifyUser>('/user');
  }

  // ============================================================================
  // WORKSPACE ENDPOINTS
  // ============================================================================

  /**
   * Get all workspaces the user has access to
   *
   * @returns Array of workspaces
   */
  async getWorkspaces(): Promise<ClockifyWorkspace[]> {
    return this.request<ClockifyWorkspace[]>('/workspaces');
  }

  /**
   * Get specific workspace by ID
   *
   * @param workspaceId - Workspace ID
   * @returns Workspace information
   */
  async getWorkspace(workspaceId: string): Promise<ClockifyWorkspace> {
    return this.request<ClockifyWorkspace>(`/workspaces/${workspaceId}`);
  }

  // ============================================================================
  // PROJECT ENDPOINTS
  // ============================================================================

  /**
   * Get all projects in a workspace
   *
   * @param workspaceId - Workspace ID
   * @param archived - Include archived projects (default: false)
   * @returns Array of projects
   */
  async getProjects(
    workspaceId: string,
    archived = false
  ): Promise<ClockifyProjectAPI[]> {
    return this.request<ClockifyProjectAPI[]>(
      `/workspaces/${workspaceId}/projects?archived=${archived}`
    );
  }

  /**
   * Get specific project by ID
   *
   * @param workspaceId - Workspace ID
   * @param projectId - Project ID
   * @returns Project information
   */
  async getProject(
    workspaceId: string,
    projectId: string
  ): Promise<ClockifyProjectAPI> {
    return this.request<ClockifyProjectAPI>(
      `/workspaces/${workspaceId}/projects/${projectId}`
    );
  }

  // ============================================================================
  // TAG ENDPOINTS
  // ============================================================================

  /**
   * Get all tags in a workspace
   *
   * @param workspaceId - Workspace ID
   * @param archived - Include archived tags (default: false)
   * @returns Array of tags
   */
  async getTags(
    workspaceId: string,
    archived = false
  ): Promise<ClockifyTag[]> {
    return this.request<ClockifyTag[]>(
      `/workspaces/${workspaceId}/tags?archived=${archived}`
    );
  }

  // ============================================================================
  // TIME ENTRY ENDPOINTS
  // ============================================================================

  /**
   * Get time entries for a user
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of time entries
   */
  async getTimeEntries(
    workspaceId: string,
    userId: string,
    options: {
      start?: string; // ISO 8601 format (e.g., '2024-01-01T00:00:00Z')
      end?: string; // ISO 8601 format
      page?: number;
      pageSize?: number;
      projectId?: string;
    } = {}
  ): Promise<ClockifyTimeEntry[]> {
    const params = new URLSearchParams();

    if (options.start) params.append('start', options.start);
    if (options.end) params.append('end', options.end);
    if (options.page !== undefined) params.append('page', options.page.toString());
    if (options.pageSize !== undefined) params.append('page-size', options.pageSize.toString());
    if (options.projectId) params.append('project', options.projectId);

    const queryString = params.toString();
    const endpoint = `/workspaces/${workspaceId}/user/${userId}/time-entries${
      queryString ? `?${queryString}` : ''
    }`;

    return this.request<ClockifyTimeEntry[]>(endpoint);
  }

  /**
   * Create a new time entry
   *
   * @param workspaceId - Workspace ID
   * @param timeEntry - Time entry data
   * @returns Created time entry
   */
  async createTimeEntry(
    workspaceId: string,
    timeEntry: {
      description?: string;
      start: string; // ISO 8601 format (required)
      end?: string; // ISO 8601 format (omit for running timer)
      projectId?: string;
      taskId?: string;
      tagIds?: string[];
      billable?: boolean;
    }
  ): Promise<ClockifyTimeEntry> {
    return this.request<ClockifyTimeEntry>(
      `/workspaces/${workspaceId}/time-entries`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: timeEntry.description || '',
          start: timeEntry.start,
          end: timeEntry.end,
          projectId: timeEntry.projectId || null,
          taskId: timeEntry.taskId || null,
          tagIds: timeEntry.tagIds || [],
          billable: timeEntry.billable ?? false,
        }),
      }
    );
  }

  /**
   * Update an existing time entry
   *
   * @param workspaceId - Workspace ID
   * @param timeEntryId - Time entry ID
   * @param updates - Fields to update
   * @returns Updated time entry
   */
  async updateTimeEntry(
    workspaceId: string,
    timeEntryId: string,
    updates: {
      description?: string;
      start?: string;
      end?: string;
      projectId?: string;
      tagIds?: string[];
      billable?: boolean;
    }
  ): Promise<ClockifyTimeEntry> {
    return this.request<ClockifyTimeEntry>(
      `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * Delete a time entry
   *
   * @param workspaceId - Workspace ID
   * @param timeEntryId - Time entry ID
   */
  async deleteTimeEntry(
    workspaceId: string,
    timeEntryId: string
  ): Promise<void> {
    await this.request<void>(
      `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      { method: 'DELETE' }
    );
  }

  // ============================================================================
  // WEBHOOK ENDPOINTS (for future use)
  // ============================================================================

  /**
   * Create a webhook for time entry events
   * Note: Webhooks are a paid feature in Clockify
   *
   * @param workspaceId - Workspace ID
   * @param webhook - Webhook configuration
   * @returns Created webhook with ID and secret
   */
  async createWebhook(
    workspaceId: string,
    webhook: {
      name: string;
      webhookUrl: string;
      eventType: 'NEW_TIME_ENTRY' | 'UPDATED_TIME_ENTRY' | 'DELETED_TIME_ENTRY';
    }
  ): Promise<{ id: string; secret: string }> {
    return this.request<{ id: string; secret: string }>(
      `/workspaces/${workspaceId}/webhooks`,
      {
        method: 'POST',
        body: JSON.stringify(webhook),
      }
    );
  }

  /**
   * Delete a webhook
   *
   * @param workspaceId - Workspace ID
   * @param webhookId - Webhook ID
   */
  async deleteWebhook(workspaceId: string, webhookId: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${workspaceId}/webhooks/${webhookId}`,
      { method: 'DELETE' }
    );
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

/**
 * Cache for Clockify clients (keyed by API key hash)
 * Allows multiple users to have their own cached clients
 */
const clockifyClientCache = new Map<string, ClockifyClient>();

/**
 * Get or create a Clockify client for the given API key
 * Reuses cached client to avoid recreating connections
 *
 * @param apiKey - Clockify API key
 * @returns Cached or new Clockify client
 */
export function getClockifyClient(apiKey: string): ClockifyClient {
  if (!apiKey) {
    throw new Error('Clockify API key is required');
  }

  // Use first 8 characters of API key as cache key (for privacy)
  const cacheKey = apiKey.substring(0, 8);

  if (!clockifyClientCache.has(cacheKey)) {
    clockifyClientCache.set(cacheKey, new ClockifyClient(apiKey));
  }

  return clockifyClientCache.get(cacheKey)!;
}

/**
 * Clear all cached Clockify clients
 * Useful for testing or when API keys change
 */
export function clearClockifyClientCache(): void {
  clockifyClientCache.clear();
}

/**
 * Remove specific client from cache
 *
 * @param apiKey - API key of client to remove
 */
export function removeClockifyClient(apiKey: string): void {
  const cacheKey = apiKey.substring(0, 8);
  clockifyClientCache.delete(cacheKey);
}
