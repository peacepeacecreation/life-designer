#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🔍 Усі колонки таблиці goals..."
echo ""

# Check all columns
curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '\''goals'\'' ORDER BY ordinal_position;"}' \
  | jq '.[] | .column_name'

echo ""
