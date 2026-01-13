# Cron Job Setup - Weekly Snapshots

Автоматичне створення weekly snapshots кожного понеділка.

## Налаштування на cron-job.org

### 1. Згенеруй CRON_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Додай в `.env.local` і на production:
```bash
CRON_SECRET=your_generated_secret_here
```

### 2. Налаштуй на https://console.cron-job.org

**URL:**
```
https://your-domain.com/api/cron/weekly-snapshots
```

**Method:** POST

**Schedule:**
- Щопонеділка о 00:01
- Cron expression: `1 0 * * 1`

**Headers:**
```
Authorization: Bearer your_generated_secret_here
Content-Type: application/json
```

**Timeout:** 300 секунд (5 хвилин)

### 3. Тест

Перевір що працює:
```bash
curl -X POST https://your-domain.com/api/cron/weekly-snapshots \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json"
```

Очікувана відповідь:
```json
{
  "success": true,
  "weekStart": "2025-01-06T00:00:00.000Z",
  "weekEnd": "2025-01-12T23:59:59.999Z",
  "results": {
    "total": 5,
    "created": 4,
    "skipped": 1,
    "failed": 0,
    "errors": []
  }
}
```

## Health Check

Перевір статус:
```bash
curl https://your-domain.com/api/cron/weekly-snapshots
```

## Що робить cron job?

1. Перевіряє authorization (CRON_SECRET)
2. Отримує всіх користувачів з БД
3. Для кожного користувача:
   - Перевіряє чи є вже snapshot за минулий тиждень
   - Якщо є - пропускає
   - Якщо немає - створює новий snapshot з:
     - Налаштуваннями goals (time_allocated, payment, etc)
     - Налаштуваннями recurring events (schedule, duration, etc)
     - Статистикою часу (completed, scheduled, free)
4. Повертає звіт: скільки створено, пропущено, failed

## Troubleshooting

**401 Unauthorized:**
- Перевір що CRON_SECRET правильний
- Перевір header `Authorization: Bearer ...`

**500 Error:**
- Перевір логи Vercel/production
- Можливо timeout (збільши до 300 сек)

**Snapshots не створюються:**
- Перевір що у користувачів є goals
- Перевір що cron запускається (логи на cron-job.org)
