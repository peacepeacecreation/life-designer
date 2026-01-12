#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "🔄 Перезапуск Supabase проекту..."
echo ""

# Try to pause and unpause the project (which restarts services)
echo "⏸️  Призупинення проекту..."
PAUSE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/pause" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json")

PAUSE_CODE=$(echo "$PAUSE_RESPONSE" | tail -n1)
echo "Status: $PAUSE_CODE"

if [ "$PAUSE_CODE" = "201" ] || [ "$PAUSE_CODE" = "200" ]; then
  echo "⏸️  Проект призупинено"
  echo ""
  echo "⏳ Очікування 5 секунд..."
  sleep 5

  echo "▶️  Відновлення проекту..."
  RESTORE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/restore" \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Content-Type: application/json")

  RESTORE_CODE=$(echo "$RESTORE_RESPONSE" | tail -n1)
  echo "Status: $RESTORE_CODE"

  if [ "$RESTORE_CODE" = "201" ] || [ "$RESTORE_CODE" = "200" ]; then
    echo ""
    echo "✅ Проект перезапущено! Схема PostgREST оновлена."
    echo "⏳ Зачекайте 10-20 секунд поки сервіси запустяться."
  else
    echo "❌ Не вдалось відновити проект"
    echo "$RESTORE_RESPONSE" | sed '$d'
  fi
else
  echo "❌ Не вдалось призупинити проект"
  echo "$PAUSE_RESPONSE" | sed '$d'
  echo ""
  echo "💡 Спробуйте вручну через Dashboard:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/settings/general"
fi

echo ""
