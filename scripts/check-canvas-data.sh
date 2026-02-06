#!/bin/bash

# Canvas Data Recovery Check Script
# Перевіряє поточний стан canvas в базі даних

set -e

CANVAS_ID="58b61198-31fe-4131-a73a-8393c4645ee0"

# Load environment variables
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "Error: .env.local not found"
  exit 1
fi

# Check if SUPABASE_PAT is set
if [ -z "$SUPABASE_PAT" ]; then
  echo "Error: SUPABASE_PAT not set in .env.local"
  echo "Get your PAT from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

echo "=========================================="
echo "Canvas Data Recovery Check"
echo "=========================================="
echo "Canvas ID: $CANVAS_ID"
echo ""

# SQL Query to get canvas data
SQL_QUERY="
SELECT
  id,
  title,
  user_id,
  created_at,
  last_modified_at,
  jsonb_array_length(nodes) as nodes_count,
  jsonb_array_length(edges) as edges_count,
  length(nodes::text) as nodes_size_bytes,
  length(edges::text) as edges_size_bytes
FROM canvas_workspaces
WHERE id = '$CANVAS_ID';
"

echo "Checking canvas data in database..."
echo ""

# Execute query via Supabase Management API
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY" | jq -Rs .)}")

# Check if query was successful
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Error querying database:"
  echo "$RESPONSE" | jq -r '.error'
  exit 1
fi

# Display results
echo "📊 Canvas Information:"
echo "$RESPONSE" | jq -r '
  if (.result | length) > 0 then
    .result[0] |
    "  Title: \(.title // "N/A")
  Created: \(.created_at // "N/A")
  Modified: \(.last_modified_at // "N/A")
  Nodes: \(.nodes_count // 0) items (\(.nodes_size_bytes // 0) bytes)
  Edges: \(.edges_count // 0) items (\(.edges_size_bytes // 0) bytes)"
  else
    "  ⚠️  Canvas not found or empty"
  end
'

echo ""
echo "=========================================="
echo "Checking for recent autosaves..."
echo "=========================================="

# Query for all canvases modified in last hour
SQL_QUERY_RECENT="
SELECT
  id,
  title,
  last_modified_at,
  jsonb_array_length(nodes) as nodes_count
FROM canvas_workspaces
WHERE last_modified_at > NOW() - INTERVAL '1 hour'
ORDER BY last_modified_at DESC
LIMIT 5;
"

RESPONSE_RECENT=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_QUERY_RECENT" | jq -Rs .)}")

echo "Recent canvases (last hour):"
echo "$RESPONSE_RECENT" | jq -r '
  if (.result | length) > 0 then
    .result[] |
    "  📄 \(.title) - \(.nodes_count) nodes - Modified: \(.last_modified_at)"
  else
    "  No recent modifications found"
  end
'

echo ""
echo "=========================================="
echo "🔍 Next Steps:"
echo "=========================================="
echo ""
echo "If nodes_count is 0:"
echo "  1. Check Supabase Dashboard for Point-in-Time Recovery"
echo "  2. Check browser DevTools Network tab for saved payloads"
echo "  3. Contact Supabase support if on paid plan"
echo ""
echo "To enable history tracking (prevent future data loss):"
echo "  ./scripts/run-migration.sh supabase/migrations/20250206_canvas_history.sql"
echo ""
