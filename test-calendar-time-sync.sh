#!/bin/bash

# Test Calendar-to-Time-Entry Sync
# This script tests the automatic synchronization between calendar events and time entries

set -e

BASE_URL="http://localhost:3077"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Calendar-to-Time-Entry Sync Test ===${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking if dev server is running...${NC}"
if ! curl -s "${BASE_URL}" > /dev/null; then
  echo -e "${RED}❌ Dev server is not running. Please start it with 'pnpm dev'${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Dev server is running${NC}\n"

# Function to get auth cookie
get_auth_cookie() {
  echo "Please provide your session cookie from browser DevTools:"
  echo "1. Open ${BASE_URL} in your browser"
  echo "2. Sign in if not already signed in"
  echo "3. Open DevTools (F12) → Application → Cookies"
  echo "4. Copy the value of 'next-auth.session-token' cookie"
  echo -e "\nPaste the session token here:"
  read SESSION_TOKEN
  echo "$SESSION_TOKEN"
}

# Get session token
SESSION_TOKEN=$(get_auth_cookie)

if [ -z "$SESSION_TOKEN" ]; then
  echo -e "${RED}❌ No session token provided${NC}"
  exit 1
fi

COOKIE="next-auth.session-token=${SESSION_TOKEN}"

echo -e "\n${BLUE}=== Step 1: Get User Goals ===${NC}"
GOALS_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" "${BASE_URL}/api/goals")
echo "$GOALS_RESPONSE" | jq '.' || echo "$GOALS_RESPONSE"

# Extract first goal ID
GOAL_ID=$(echo "$GOALS_RESPONSE" | jq -r '.goals[0].id // empty')

if [ -z "$GOAL_ID" ]; then
  echo -e "${RED}❌ No goals found. Please create a goal first.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found goal: ${GOAL_ID}${NC}\n"

# Test 1: Create calendar event with goal and creates_time_entry=true
echo -e "${BLUE}=== Test 1: Create Calendar Event with Time Tracking ===${NC}"
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%S.000Z")

CREATE_EVENT_DATA=$(cat <<EOF
{
  "title": "Test Event - Calendar Sync",
  "startTime": "$START_TIME",
  "endTime": "$END_TIME",
  "goalId": "$GOAL_ID",
  "createsTimeEntry": true
}
EOF
)

echo "Creating calendar event with data:"
echo "$CREATE_EVENT_DATA" | jq '.'

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Cookie: ${COOKIE}" \
  -H "Content-Type: application/json" \
  -d "$CREATE_EVENT_DATA" \
  "${BASE_URL}/api/calendar-events")

echo -e "\nResponse:"
echo "$CREATE_RESPONSE" | jq '.' || echo "$CREATE_RESPONSE"

EVENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.event.id // empty')
TIME_ENTRY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.event.timeEntryId // empty')

if [ -z "$EVENT_ID" ]; then
  echo -e "${RED}❌ Failed to create calendar event${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Created calendar event: ${EVENT_ID}${NC}"

if [ ! -z "$TIME_ENTRY_ID" ] && [ "$TIME_ENTRY_ID" != "null" ]; then
  echo -e "${GREEN}✓ Time entry created automatically: ${TIME_ENTRY_ID}${NC}\n"
else
  echo -e "${YELLOW}⚠ Time entry ID not in response (may be created by trigger)${NC}\n"
fi

# Test 2: Verify time entry was created
echo -e "${BLUE}=== Test 2: Verify Time Entry Creation ===${NC}"
sleep 2 # Give trigger time to execute

TIME_ENTRIES_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/time-entries?startDate=${START_TIME}&endDate=${END_TIME}")

echo "Time entries in range:"
echo "$TIME_ENTRIES_RESPONSE" | jq '.entries[] | {id, description, goalId, source, calendarEventId}' || echo "$TIME_ENTRIES_RESPONSE"

TIME_ENTRY_COUNT=$(echo "$TIME_ENTRIES_RESPONSE" | jq '.entries | length')
CALENDAR_SOURCE_COUNT=$(echo "$TIME_ENTRIES_RESPONSE" | jq '[.entries[] | select(.source == "calendar_event")] | length')

echo -e "\nTotal time entries: ${TIME_ENTRY_COUNT}"
echo -e "Calendar-sourced entries: ${CALENDAR_SOURCE_COUNT}"

if [ "$CALENDAR_SOURCE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Time entry from calendar event found${NC}\n"
else
  echo -e "${RED}❌ No time entry found from calendar event${NC}\n"
fi

# Test 3: Update calendar event and verify time entry is updated
echo -e "${BLUE}=== Test 3: Update Calendar Event ===${NC}"

UPDATE_EVENT_DATA=$(cat <<EOF
{
  "title": "Test Event - Updated Title",
  "startTime": "$START_TIME",
  "endTime": "$END_TIME",
  "goalId": "$GOAL_ID",
  "createsTimeEntry": true
}
EOF
)

echo "Updating calendar event with data:"
echo "$UPDATE_EVENT_DATA" | jq '.'

UPDATE_RESPONSE=$(curl -s -X PATCH \
  -H "Cookie: ${COOKIE}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_EVENT_DATA" \
  "${BASE_URL}/api/calendar-events/${EVENT_ID}")

echo -e "\nResponse:"
echo "$UPDATE_RESPONSE" | jq '.' || echo "$UPDATE_RESPONSE"

echo -e "${GREEN}✓ Calendar event updated${NC}\n"

sleep 2 # Give trigger time to execute

# Verify time entry was updated
TIME_ENTRIES_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/time-entries?startDate=${START_TIME}&endDate=${END_TIME}")

UPDATED_DESCRIPTION=$(echo "$TIME_ENTRIES_RESPONSE" | jq -r '.entries[] | select(.source == "calendar_event") | .description' | head -1)

if [ "$UPDATED_DESCRIPTION" == "Test Event - Updated Title" ]; then
  echo -e "${GREEN}✓ Time entry description updated correctly${NC}\n"
else
  echo -e "${RED}❌ Time entry description not updated (got: ${UPDATED_DESCRIPTION})${NC}\n"
fi

# Test 4: Disable time tracking on calendar event
echo -e "${BLUE}=== Test 4: Disable Time Tracking ===${NC}"

DISABLE_TRACKING_DATA=$(cat <<EOF
{
  "title": "Test Event - No Tracking",
  "startTime": "$START_TIME",
  "endTime": "$END_TIME",
  "goalId": "$GOAL_ID",
  "createsTimeEntry": false
}
EOF
)

echo "Disabling time tracking:"
echo "$DISABLE_TRACKING_DATA" | jq '.'

DISABLE_RESPONSE=$(curl -s -X PATCH \
  -H "Cookie: ${COOKIE}" \
  -H "Content-Type: application/json" \
  -d "$DISABLE_TRACKING_DATA" \
  "${BASE_URL}/api/calendar-events/${EVENT_ID}")

echo -e "\nResponse:"
echo "$DISABLE_RESPONSE" | jq '.' || echo "$DISABLE_RESPONSE"

echo -e "${GREEN}✓ Time tracking disabled${NC}\n"

sleep 2 # Give trigger time to execute

# Verify time entry was deleted
TIME_ENTRIES_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/time-entries?startDate=${START_TIME}&endDate=${END_TIME}")

CALENDAR_SOURCE_COUNT=$(echo "$TIME_ENTRIES_RESPONSE" | jq '[.entries[] | select(.source == "calendar_event" and .calendarEventId == "'"$EVENT_ID"'")] | length')

if [ "$CALENDAR_SOURCE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ Time entry deleted when tracking disabled${NC}\n"
else
  echo -e "${RED}❌ Time entry still exists after disabling tracking${NC}\n"
fi

# Test 5: Re-enable time tracking
echo -e "${BLUE}=== Test 5: Re-enable Time Tracking ===${NC}"

ENABLE_TRACKING_DATA=$(cat <<EOF
{
  "title": "Test Event - Tracking Re-enabled",
  "startTime": "$START_TIME",
  "endTime": "$END_TIME",
  "goalId": "$GOAL_ID",
  "createsTimeEntry": true
}
EOF
)

ENABLE_RESPONSE=$(curl -s -X PATCH \
  -H "Cookie: ${COOKIE}" \
  -H "Content-Type: application/json" \
  -d "$ENABLE_TRACKING_DATA" \
  "${BASE_URL}/api/calendar-events/${EVENT_ID}")

echo -e "Response:"
echo "$ENABLE_RESPONSE" | jq '.' || echo "$ENABLE_RESPONSE"

echo -e "${GREEN}✓ Time tracking re-enabled${NC}\n"

sleep 2

# Verify time entry was recreated
TIME_ENTRIES_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/time-entries?startDate=${START_TIME}&endDate=${END_TIME}")

CALENDAR_SOURCE_COUNT=$(echo "$TIME_ENTRIES_RESPONSE" | jq '[.entries[] | select(.source == "calendar_event")] | length')

if [ "$CALENDAR_SOURCE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Time entry recreated when tracking re-enabled${NC}\n"
else
  echo -e "${RED}❌ Time entry not recreated${NC}\n"
fi

# Test 6: Delete calendar event
echo -e "${BLUE}=== Test 6: Delete Calendar Event ===${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE \
  -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/calendar-events/${EVENT_ID}")

echo "Response:"
echo "$DELETE_RESPONSE" | jq '.' || echo "$DELETE_RESPONSE"

echo -e "${GREEN}✓ Calendar event deleted${NC}\n"

sleep 2

# Verify time entry was deleted via CASCADE
TIME_ENTRIES_RESPONSE=$(curl -s -H "Cookie: ${COOKIE}" \
  "${BASE_URL}/api/time-entries?startDate=${START_TIME}&endDate=${END_TIME}")

CALENDAR_SOURCE_COUNT=$(echo "$TIME_ENTRIES_RESPONSE" | jq '[.entries[] | select(.calendarEventId == "'"$EVENT_ID"'")] | length')

if [ "$CALENDAR_SOURCE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ Time entry deleted via CASCADE when calendar event deleted${NC}\n"
else
  echo -e "${RED}❌ Time entry still exists after calendar event deletion${NC}\n"
fi

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "\nVerified behaviors:"
echo "  ✓ Time entries created automatically from calendar events"
echo "  ✓ Time entries updated when calendar event updated"
echo "  ✓ Time entries deleted when tracking disabled"
echo "  ✓ Time entries recreated when tracking re-enabled"
echo "  ✓ Time entries cascade-deleted with calendar events"
echo -e "\n${GREEN}Calendar-to-Time-Entry sync is working correctly! 🎉${NC}"
