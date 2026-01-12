#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🔍 Перевірка схеми таблиці goals..."
echo ""

# Check if columns exist
curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '\''goals'\'' AND column_name IN ('\''payment_type'\'', '\''fixed_rate'\'', '\''fixed_rate_period'\'', '\''currency'\'', '\''hourly_rate'\'') ORDER BY column_name;"}' \
  | jq .

echo ""
