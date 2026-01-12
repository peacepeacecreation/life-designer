#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"
SQL_FILE="supabase/migrations/010_fix_status_constraint.sql"

echo "🚀 Запуск міграції: Fix Status Constraint"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Файл міграції не знайдено: $SQL_FILE"
  exit 1
fi

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

# Read SQL content
SQL_CONTENT=$(cat "$SQL_FILE")

echo "📄 SQL:"
echo "────────────────────────────────────────────────────────────"
cat "$SQL_FILE"
echo "────────────────────────────────────────────────────────────"
echo ""

# Execute migration
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
  echo "✅ Міграція виконана успішно!"
else
  echo "❌ Міграція провалилась"
  echo "Response: $BODY"
  exit 1
fi
