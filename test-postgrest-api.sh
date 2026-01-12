#!/bin/bash

# Load env vars
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep -E 'NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY' | xargs)
fi

echo "🧪 Тестування PostgREST API (Supabase Client)..."
echo ""

# Get a test user ID first
USER_ID="061dd691-2d9a-460e-83e7-5b1a55e6298e"

echo "📝 Створення цілі через PostgREST API..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/goals" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "'"$USER_ID"'",
    "name": "PostgREST Test Goal",
    "description": "Testing PostgREST API",
    "category": "work_startups",
    "priority": "high",
    "status": "not_started",
    "time_allocated": 0,
    "progress_percentage": 0,
    "start_date": "2026-01-12T00:00:00.000Z",
    "target_end_date": "2026-02-12T00:00:00.000Z",
    "currency": "USD",
    "hourly_rate": 75.50,
    "payment_type": "hourly",
    "tags": []
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ SUCCESS! PostgREST бачить нові колонки!"
  echo ""
  echo "Response:"
  echo "$BODY" | jq .

  # Clean up - delete the test goal
  GOAL_ID=$(echo "$BODY" | jq -r '.[0].id')
  if [ ! -z "$GOAL_ID" ] && [ "$GOAL_ID" != "null" ]; then
    echo ""
    echo "🗑️  Видалення тестової цілі..."
    curl -s -X DELETE \
      "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/goals?id=eq.${GOAL_ID}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null
    echo "✅ Тестову ціль видалено"
  fi

  echo ""
  echo "🎉 PostgREST готовий! Можна тестувати через UI."
else
  echo "❌ FAILED - PostgREST ще не оновив кеш"
  echo ""
  echo "Response:"
  echo "$BODY" | jq . || echo "$BODY"
  echo ""
  echo "💡 Зачекайте ще 30-60 секунд і спробуйте ще раз."
fi

echo ""
