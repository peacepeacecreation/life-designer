// Calendar Events Types
// Types for managing user calendar events with goal associations and Google Calendar sync

// Main Calendar Event interface
export interface CalendarEvent {
  id: string;
  userId: string;

  // Basic event information
  title: string;
  description?: string;
  location?: string;

  // Time and duration
  startTime: Date;
  endTime: Date;
  allDay: boolean;

  // Goal association (optional)
  goalId?: string;

  // Visual customization
  color?: string;

  // Google Calendar synchronization
  googleEventId?: string;
  googleCalendarId?: string;
  lastSyncedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Type for creating a new calendar event (omits auto-generated fields)
export type CreateCalendarEventInput = Omit<
  CalendarEvent,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'googleEventId' | 'googleCalendarId' | 'lastSyncedAt'
>;

// Type for updating an existing calendar event (all fields optional)
export type UpdateCalendarEventInput = Partial<
  Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

// Database row type (snake_case matching database schema)
export interface CalendarEventRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string; // ISO timestamp string in database
  end_time: string;   // ISO timestamp string in database
  all_day: boolean;
  goal_id?: string;
  color?: string;
  google_event_id?: string;
  google_calendar_id?: string;
  last_synced_at?: string; // ISO timestamp string in database
  created_at: string;      // ISO timestamp string in database
  updated_at: string;      // ISO timestamp string in database
}

// Extended event with goal information (for API responses)
export interface CalendarEventWithGoal extends CalendarEvent {
  goal?: {
    id: string;
    name: string;
    category: string;
    iconUrl?: string;
  };
}

// Type for API query parameters
export interface CalendarEventsQueryParams {
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  goalId?: string;    // Filter by specific goal
}
