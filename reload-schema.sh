#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🔄 Оновлення схеми PostgREST..."

# Execute schema reload
curl -s \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "NOTIFY pgrst, '\''reload schema'\'';"}' \
  | jq .

echo ""
echo "✅ Схему оновлено. Спробуйте створити ціль ще раз."
