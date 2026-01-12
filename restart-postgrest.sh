#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🔄 Перезапуск PostgREST сервісу..."

# Restart PostgREST service
curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/restart" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  | jq .

echo ""
echo "⏳ Зачекайте 10-15 секунд і спробуйте створити ціль ще раз."
