#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"
SQL_FILE="supabase/migrations/014_update_clockify_projects_connection_id.sql"

echo "🚀 Supabase Database Migration Script"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Migration file not found: $SQL_FILE"
  exit 1
fi

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

# Read SQL content
SQL_CONTENT=$(cat "$SQL_FILE")

echo "📄 SQL to execute:"
echo "────────────────────────────────────────────────────────────"
cat "$SQL_FILE"
echo "────────────────────────────────────────────────────────────"
echo ""

# Check if PAT is available
if [ -z "$SUPABASE_PAT" ]; then
  echo "⚠️  SUPABASE_PAT not found in .env.local"
  echo ""
  echo "Please add to .env.local:"
  echo "SUPABASE_PAT=your_personal_access_token"
  echo ""
  echo "Get PAT from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

echo "📡 Sending request to Management API..."
echo "Project: $PROJECT_REF"
echo ""

# Execute migration via Management API
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .), \"read_only\": false}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Migration executed successfully!"
  echo ""
  echo "Updated clockify_projects with connection_id:"
  echo "  • Set connection_id for existing projects"
  echo "  • Based on user_id and workspace_id"
  echo "  • Enables proper project-goal mapping in sync"
  echo ""
else
  echo "❌ Migration failed"
  echo "Response: $BODY"
  echo ""

  if [ "$HTTP_CODE" = "401" ]; then
    echo "💡 Authentication failed. Token might be invalid or expired."
    echo ""
    echo "To get a valid Personal Access Token:"
    echo "1. Go to https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Name: 'CLI Migrations'"
    echo "4. Scope: 'database:write'"
    echo "5. Copy token (starts with 'sbp_')"
    echo "6. Add to .env.local: SUPABASE_PAT=sbp_your_token_here"
  fi

  exit 1
fi
