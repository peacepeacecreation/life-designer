/**
 * Migration 007: Add Time Entry Tracking to Calendar Events
 *
 * This migration adds bi-directional linking between calendar_events and time_entries
 * and creates automatic triggers to sync them.
 *
 * Changes:
 * 1. Add creates_time_entry field to calendar_events (controls auto-creation)
 * 2. Add time_entry_id to calendar_events (link to created time entry)
 * 3. Add calendar_event_id to time_entries (reverse link)
 * 4. Create trigger to automatically create/update/delete time_entries when calendar events change
 */

-- 1. Add creates_time_entry flag to calendar_events
ALTER TABLE calendar_events
ADD COLUMN creates_time_entry BOOLEAN DEFAULT TRUE NOT NULL;

COMMENT ON COLUMN calendar_events.creates_time_entry IS 'Whether this calendar event should automatically create a time entry';

-- 2. Add link from calendar_events to time_entries
ALTER TABLE calendar_events
ADD COLUMN time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL;

COMMENT ON COLUMN calendar_events.time_entry_id IS 'The time entry automatically created from this calendar event';

-- 3. Add reverse link from time_entries to calendar_events
ALTER TABLE time_entries
ADD COLUMN calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

COMMENT ON COLUMN time_entries.calendar_event_id IS 'The calendar event that created this time entry';

-- 4. Create indexes for the new foreign keys
CREATE INDEX idx_calendar_events_time_entry_id ON calendar_events(time_entry_id);
CREATE INDEX idx_time_entries_calendar_event_id ON time_entries(calendar_event_id);

-- 5. Create trigger function to sync calendar_events to time_entries
CREATE OR REPLACE FUNCTION sync_calendar_event_to_time_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_time_entry_id UUID;
BEGIN
  -- If creates_time_entry is FALSE or goal_id is NULL, delete existing time entry
  IF NEW.creates_time_entry = FALSE OR NEW.goal_id IS NULL THEN
    IF NEW.time_entry_id IS NOT NULL THEN
      DELETE FROM time_entries WHERE id = NEW.time_entry_id;
      NEW.time_entry_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- If time_entry_id exists, update the existing time entry
  IF NEW.time_entry_id IS NOT NULL THEN
    UPDATE time_entries SET
      description = NEW.title,
      start_time = NEW.start_time,
      end_time = NEW.end_time,
      goal_id = NEW.goal_id,
      updated_at = NOW()
    WHERE id = NEW.time_entry_id;

    RETURN NEW;
  END IF;

  -- Otherwise, create new time entry
  INSERT INTO time_entries (
    user_id,
    description,
    start_time,
    end_time,
    goal_id,
    source,
    sync_status,
    calendar_event_id
  ) VALUES (
    NEW.user_id,
    NEW.title,
    NEW.start_time,
    NEW.end_time,
    NEW.goal_id,
    'calendar_event',
    'synced',
    NEW.id
  )
  RETURNING id INTO v_time_entry_id;

  -- Update calendar_event with the new time_entry_id
  NEW.time_entry_id := v_time_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger on calendar_events for INSERT and UPDATE
CREATE TRIGGER trigger_sync_calendar_event_to_time_entry
  BEFORE INSERT OR UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_calendar_event_to_time_entry();

-- 7. Create trigger to clean up time_entry_id when time entry is deleted
CREATE OR REPLACE FUNCTION cleanup_calendar_event_time_entry_link()
RETURNS TRIGGER AS $$
BEGIN
  -- If this time entry was created from a calendar event, clear the link
  IF OLD.calendar_event_id IS NOT NULL THEN
    UPDATE calendar_events
    SET time_entry_id = NULL
    WHERE id = OLD.calendar_event_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_calendar_event_time_entry_link
  BEFORE DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_calendar_event_time_entry_link();

-- 8. Backfill: Create time_entries for existing calendar events that have goals
-- (Only for events that don't already have time entries)
DO $$
DECLARE
  v_event RECORD;
  v_time_entry_id UUID;
BEGIN
  FOR v_event IN
    SELECT id, user_id, title, start_time, end_time, goal_id
    FROM calendar_events
    WHERE goal_id IS NOT NULL
      AND creates_time_entry = TRUE
      AND time_entry_id IS NULL
      AND end_time IS NOT NULL  -- Only for completed events
  LOOP
    -- Create time entry
    INSERT INTO time_entries (
      user_id,
      description,
      start_time,
      end_time,
      goal_id,
      source,
      sync_status,
      calendar_event_id
    ) VALUES (
      v_event.user_id,
      v_event.title,
      v_event.start_time,
      v_event.end_time,
      v_event.goal_id,
      'calendar_event',
      'synced',
      v_event.id
    )
    RETURNING id INTO v_time_entry_id;

    -- Update calendar event with link
    UPDATE calendar_events
    SET time_entry_id = v_time_entry_id
    WHERE id = v_event.id;
  END LOOP;
END;
$$;

-- 9. Add comment explaining the integration
COMMENT ON TABLE time_entries IS 'Unified time tracking: records from Clockify, calendar events, or manual entry';
COMMENT ON TABLE calendar_events IS 'Calendar events with optional time tracking via time_entries table';
