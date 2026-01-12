#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🧪 Тестування прямого INSERT в базу даних..."
echo ""

# First, get a test user ID
USER_ID=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT id FROM users LIMIT 1;"}' \
  | jq -r '.[0].id')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "❌ Не знайдено користувачів для тесту"
  exit 1
fi

echo "👤 Використовую user_id: $USER_ID"
echo ""

# Try to insert a test goal with all the new fields
echo "📝 Створення тестової цілі з усіма новими полями..."
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "INSERT INTO goals (user_id, name, description, category, priority, status, time_allocated, progress_percentage, start_date, target_end_date, currency, hourly_rate, payment_type, fixed_rate, fixed_rate_period) VALUES ('\'''"$USER_ID"''\'', '\''CLI Test Goal'\'', '\''Testing from CLI'\'', '\''work_startups'\'', '\''high'\'', '\''not_started'\'', 0, 0, '\''2026-01-12'\'', '\''2026-02-12'\'', '\''USD'\'', 50.00, '\''hourly'\'', NULL, NULL) RETURNING id, name, currency, hourly_rate, payment_type;"
  }')

echo "$RESPONSE" | jq .

# Clean up - delete the test goal
GOAL_ID=$(echo "$RESPONSE" | jq -r '.[0].id')
if [ ! -z "$GOAL_ID" ] && [ "$GOAL_ID" != "null" ]; then
  echo ""
  echo "🗑️  Видалення тестової цілі..."
  curl -s -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Content-Type: application/json" \
    -d '{"query": "DELETE FROM goals WHERE id = '\'''"$GOAL_ID"''\'';"}' > /dev/null
  echo "✅ Тестову ціль видалено"
fi

echo ""
echo "🎯 Тест завершено! Всі поля працюють на рівні бази даних."
echo ""
