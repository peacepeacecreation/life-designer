// ============================================================================
// CLOCKIFY INTEGRATION TYPES
// ============================================================================
// TypeScript types for Clockify time tracking integration
// Includes both application types (camelCase) and database row types (snake_case)
// ============================================================================

// ============================================================================
// APPLICATION TYPES (camelCase - for use in components and logic)
// ============================================================================

/**
 * Clockify connection with user API credentials
 */
export interface ClockifyConnection {
  id: string;
  userId: string;
  workspaceId: string;
  clockifyUserId: string;
  isActive: boolean;
  lastSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  syncStatus: 'pending' | 'syncing' | 'success' | 'error';
  lastSyncError?: string;
  autoSyncEnabled: boolean;
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  syncFrequencyMinutes: number;
  webhookId?: string;
  webhookSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cached Clockify project from workspace
 */
export interface ClockifyProject {
  id: string;
  connectionId: string;
  clockifyProjectId: string;
  name: string;
  clientName?: string;
  color?: string;
  isArchived: boolean;
  fetchedAt: Date;
}

/**
 * Mapping between Clockify project and Life Designer goal
 */
export interface ClockifyProjectGoalMapping {
  id: string;
  userId: string;
  clockifyProjectId: string;
  goalId: string;
  isActive: boolean;
  autoCategorize: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time entry from any source (Clockify, calendar, manual)
 */
export interface TimeEntry {
  id: string;
  userId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
  goalId?: string;
  clockifyEntryId?: string;
  clockifyProjectId?: string;
  isBillable: boolean;
  source: 'manual' | 'clockify' | 'calendar_event';
  lastSyncedAt?: Date;
  syncStatus: 'synced' | 'pending_push';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time entry with joined goal and project details
 */
export interface TimeEntryWithDetails extends TimeEntry {
  goal?: {
    id: string;
    name: string;
    category: string;
    iconUrl?: string;
  };
  clockifyProject?: {
    id: string;
    name: string;
    color?: string;
  };
}

/**
 * Sync log entry for audit trail
 */
export interface ClockifySyncLog {
  id: string;
  connectionId: string;
  syncType: 'full' | 'incremental' | 'webhook' | 'manual';
  direction: 'import' | 'export' | 'bidirectional';
  status: 'started' | 'completed' | 'failed' | 'partial';
  entriesImported: number;
  entriesExported: number;
  entriesUpdated: number;
  entriesSkipped: number;
  conflictsDetected: number;
  errorMessage?: string;
  errorDetails?: any;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
}

/**
 * Aggregated time statistics by goal
 */
export interface TimeByGoalStats {
  goalId: string;
  goalName: string;
  goalCategory: string;
  goalIconUrl?: string;
  totalSeconds: number;
  totalHours: number;
  entryCount: number;
}

// ============================================================================
// DATABASE ROW TYPES (snake_case - for database operations)
// ============================================================================

/**
 * Database row type for clockify_connections table
 */
export interface ClockifyConnectionRow {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  workspace_id: string;
  clockify_user_id: string;
  is_active: boolean;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  sync_status: string;
  last_sync_error?: string;
  auto_sync_enabled: boolean;
  sync_direction: string;
  sync_frequency_minutes: number;
  webhook_id?: string;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for clockify_projects table
 */
export interface ClockifyProjectRow {
  id: string;
  connection_id: string;
  clockify_project_id: string;
  name: string;
  client_name?: string;
  color?: string;
  is_archived: boolean;
  fetched_at: string;
}

/**
 * Database row type for clockify_project_goal_mappings table
 */
export interface ClockifyProjectGoalMappingRow {
  id: string;
  user_id: string;
  clockify_project_id: string;
  goal_id: string;
  is_active: boolean;
  auto_categorize: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for time_entries table
 */
export interface TimeEntryRow {
  id: string;
  user_id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  goal_id?: string;
  clockify_entry_id?: string;
  clockify_project_id?: string;
  is_billable: boolean;
  source: string;
  last_synced_at?: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for clockify_sync_logs table
 */
export interface ClockifySyncLogRow {
  id: string;
  connection_id: string;
  sync_type: string;
  direction: string;
  status: string;
  entries_imported: number;
  entries_exported: number;
  entries_updated: number;
  entries_skipped: number;
  conflicts_detected: number;
  error_message?: string;
  error_details?: any;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  created_at: string;
}

// ============================================================================
// CLOCKIFY API TYPES (from Clockify API documentation)
// ============================================================================

/**
 * Clockify user from API
 */
export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  status: string;
}

/**
 * Clockify workspace from API
 */
export interface ClockifyWorkspace {
  id: string;
  name: string;
  hourlyRate?: {
    amount: number;
    currency: string;
  };
  memberships: any[];
}

/**
 * Clockify project from API
 */
export interface ClockifyProjectAPI {
  id: string;
  name: string;
  clientName?: string;
  color: string;
  archived: boolean;
  workspaceId: string;
  billable: boolean;
  public: boolean;
}

/**
 * Clockify tag from API
 */
export interface ClockifyTag {
  id: string;
  name: string;
  workspaceId: string;
  archived: boolean;
}

/**
 * Clockify time entry from API
 */
export interface ClockifyTimeEntry {
  id: string;
  description: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  tagIds: string[];
  billable: boolean;
  timeInterval: {
    start: string;
    end?: string;
    duration?: string;
  };
  workspaceId: string;
  customFieldValues?: any[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for create time entry request
 */
export interface CreateTimeEntryRequest {
  description?: string;
  startTime: Date;
  endTime?: Date;
  goalId?: string;
  clockifyProjectId?: string;
  isBillable?: boolean;
  source?: 'manual' | 'clockify' | 'calendar_event';
}

/**
 * Type for update time entry request
 */
export interface UpdateTimeEntryRequest {
  description?: string;
  startTime?: Date;
  endTime?: Date;
  goalId?: string;
  clockifyProjectId?: string;
  isBillable?: boolean;
}

/**
 * Type for time entries query filters
 */
export interface TimeEntriesFilters {
  startDate?: Date;
  endDate?: Date;
  goalId?: string;
  source?: 'manual' | 'clockify' | 'calendar_event';
  page?: number;
  pageSize?: number;
}

/**
 * Type for sync request
 */
export interface SyncRequest {
  connectionId?: string;
  syncType?: 'full' | 'incremental';
}

/**
 * Type for sync response
 */
export interface SyncResponse {
  success: boolean;
  stats: {
    imported: number;
    exported: number;
    updated: number;
    skipped: number;
    conflicts: number;
  };
  duration: number;
}

/**
 * Type for connect request
 */
export interface ConnectClockifyRequest {
  apiKey: string;
  workspaceId: string;
}

/**
 * Type for create mapping request
 */
export interface CreateMappingRequest {
  clockifyProjectId: string;
  goalId: string;
  autoCategorize?: boolean;
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a time entry has ended
 */
export function isTimeEntryCompleted(entry: TimeEntry): entry is TimeEntry & { endTime: Date; durationSeconds: number } {
  return entry.endTime !== undefined && entry.durationSeconds !== undefined;
}

/**
 * Type guard to check if a time entry is from Clockify
 */
export function isClockifyEntry(entry: TimeEntry): entry is TimeEntry & { clockifyEntryId: string } {
  return entry.source === 'clockify' && entry.clockifyEntryId !== undefined;
}

/**
 * Type guard to check if a time entry is from calendar
 */
export function isCalendarEntry(entry: TimeEntry): boolean {
  return entry.source === 'calendar_event';
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert database row to application type for ClockifyConnection
 */
export function rowToClockifyConnection(row: ClockifyConnectionRow): ClockifyConnection {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    clockifyUserId: row.clockify_user_id,
    isActive: row.is_active,
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
    lastSuccessfulSyncAt: row.last_successful_sync_at ? new Date(row.last_successful_sync_at) : undefined,
    syncStatus: row.sync_status as ClockifyConnection['syncStatus'],
    lastSyncError: row.last_sync_error,
    autoSyncEnabled: row.auto_sync_enabled,
    syncDirection: row.sync_direction as ClockifyConnection['syncDirection'],
    syncFrequencyMinutes: row.sync_frequency_minutes,
    webhookId: row.webhook_id,
    webhookSecret: row.webhook_secret,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database row to application type for TimeEntry
 */
export function rowToTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    durationSeconds: row.duration_seconds,
    goalId: row.goal_id,
    clockifyEntryId: row.clockify_entry_id,
    clockifyProjectId: row.clockify_project_id,
    isBillable: row.is_billable,
    source: row.source as TimeEntry['source'],
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    syncStatus: row.sync_status as TimeEntry['syncStatus'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert database row to application type for ClockifyProject
 */
export function rowToClockifyProject(row: ClockifyProjectRow): ClockifyProject {
  return {
    id: row.id,
    connectionId: row.connection_id,
    clockifyProjectId: row.clockify_project_id,
    name: row.name,
    clientName: row.client_name,
    color: row.color,
    isArchived: row.is_archived,
    fetchedAt: new Date(row.fetched_at),
  };
}

/**
 * Format duration in seconds to HH:MM format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}хв`;
  }

  if (minutes === 0) {
    return `${hours}год`;
  }

  return `${hours}год ${minutes}хв`;
}

/**
 * Convert hours to seconds
 */
export function hoursToSeconds(hours: number): number {
  return Math.floor(hours * 3600);
}

/**
 * Convert seconds to hours (decimal)
 */
export function secondsToHours(seconds: number): number {
  return parseFloat((seconds / 3600).toFixed(2));
}
