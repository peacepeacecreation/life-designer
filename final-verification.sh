#!/bin/bash

PROJECT_REF="gxzzkcthcdtmkdwfdrhv"

# Load PAT from .env.local
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep SUPABASE_PAT | xargs)
fi

echo "✅ Фінальна перевірка міграцій"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📋 Перевірка всіх необхідних колонок..."
echo ""

# Check for required columns
COLUMNS=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_name = '\''goals'\'' AND column_name IN ('\''currency'\'', '\''hourly_rate'\'', '\''payment_type'\'', '\''fixed_rate'\'', '\''fixed_rate_period'\'', '\''icon_url'\'', '\''url'\'') ORDER BY column_name;"}' \
  | jq -r '.[] | .column_name')

echo "Знайдені колонки:"
echo "$COLUMNS" | while read col; do
  echo "  ✓ $col"
done
echo ""

# Count columns
COUNT=$(echo "$COLUMNS" | wc -l | tr -d ' ')

if [ "$COUNT" = "7" ]; then
  echo "✅ Всі 7 колонок присутні!"
  echo ""
  echo "🔄 Повторне оновлення схеми PostgREST..."
  curl -s -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_PAT}" \
    -H "Content-Type: application/json" \
    -d '{"query": "NOTIFY pgrst, '\''reload schema'\'';"}'  > /dev/null

  echo "✅ Команда NOTIFY відправлена"
  echo ""
  echo "⏳ Очікування 10 секунд для застосування змін..."
  sleep 10
  echo ""
  echo "🎉 Готово! Тепер можна тестувати:"
  echo "   1. Відкрийте http://localhost:3077"
  echo "   2. Спробуйте створити нову ціль"
  echo "   3. Якщо все ще є помилка, почекайте ще 30 секунд і спробуйте знову"
  echo ""
else
  echo "❌ Знайдено лише $COUNT колонок з 7 необхідних"
  exit 1
fi
