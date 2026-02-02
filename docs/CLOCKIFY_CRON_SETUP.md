# Clockify Auto-Sync Cron Setup

## Overview

Автоматична синхронізація поточного тижня для всіх активних користувачів через cron-job.org.

**Що синхронізує:**
- Тільки **поточний тиждень** (понеділок 00:00 → зараз)
- Максимум **10 користувачів** за один запуск (BATCH_SIZE)
- Пріоритет: користувачі які давно не синхронізувались

**Переваги:**
- ✅ Hash-based change detection (оновлює тільки змінені записи)
- ✅ Швидка синхронізація (тільки поточний тиждень)
- ✅ Працює з Vercel Free tier (10s timeout)
- ✅ Безкоштовний cron через cron-job.org

---

## Крок 1: Додати CRON_SECRET до Vercel

### 1.1 Згенерувати secret

Використай існуючий secret з `.env.local`:
```bash
CRON_SECRET=f06ab5bb6392794846da5422bca0991768a2c5b0a284c898e320bc78b4ae5a25
```

Або згенеруй новий:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Додати до Vercel Environment Variables

1. Зайти на https://vercel.com/dashboard
2. Вибрати проект `life-designer`
3. Settings → Environment Variables
4. Add New Variable:
   - **Name:** `CRON_SECRET`
   - **Value:** `f06ab5bb6392794846da5422bca0991768a2c5b0a284c898e320bc78b4ae5a25`
   - **Environment:** Production (або All)
5. Save

### 1.3 Redeploy

```bash
git add .
git commit -m "feat: add cron auto-sync with hash detection"
git push
```

Або через Vercel Dashboard → Deployments → Redeploy

---

## Крок 2: Налаштувати Cron-job.org

### 2.1 Створити акаунт

1. Зайти на https://cron-job.org
2. Sign Up (безкоштовно)
3. Verify email

### 2.2 Створити новий cron job

**Перейти:** Dashboard → Create cronjob

**Налаштування:**

| Параметр | Значення |
|----------|----------|
| **Title** | Life Designer - Clockify Auto Sync |
| **Address (URL)** | `https://life-designer.pp.ua/api/integrations/clockify/auto-sync` |
| **Request Method** | POST |
| **Request Timeout** | 30 seconds |

**Schedule:**
- **Every:** 15 minutes (або 30 хвилин, або 1 година - на твій вибір)
- **Cron Expression:** `*/15 * * * *` (кожні 15 хвилин)

**Request Headers:**
```
Authorization: Bearer f06ab5bb6392794846da5422bca0991768a2c5b0a284c898e320bc78b4ae5a25
```

**Advanced:**
- ✅ Enable job
- ✅ Save responses
- ❌ HTTP Authentication (не потрібно, використовуємо Authorization header)

### 2.3 Зберегти та активувати

Click "Create cronjob" →Job активний!

---

## Крок 3: Перевірити роботу

### 3.1 Тестовий запуск

В cron-job.org Dashboard:
1. Знайти створений job
2. Click "Execute now"
3. Чекати ~5-10 секунд
4. Перевірити статус

**Успішний результат:**
- HTTP Status: **200 OK**
- Response body:
```json
{
  "success": true,
  "totalUsers": 1,
  "syncedUsers": 1,
  "totalImported": 5,
  "totalUpdated": 2,
  "totalSkipped": 35,
  "errors": [],
  "duration": 3
}
```

### 3.2 Перевірити логи

**Vercel Dashboard:**
1. Deployments → Functions → Logs
2. Шукати "Auto-sync"

**Суперbase:**
```sql
SELECT * FROM clockify_sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### 3.3 Перевірити в додатку

1. Відкрити `/clockify`
2. Подивитись час останньої синхронізації
3. Має бути "тільки що" або "1хв назад"

---

## Моніторинг

### Cron-job.org Execution History

Dashboard → Your Jobs → Life Designer - Clockify Auto Sync → History

**Що дивитись:**
- HTTP Status (має бути 200)
- Duration (має бути < 10s)
- Response body (success: true)

### Vercel Function Logs

https://vercel.com/your-team/life-designer/deployments

**Фільтр:** `Auto-sync`

**Що дивитись:**
- "Auto-sync: Request received"
- "Auto-sync: Found N active connections to sync"
- "Auto-sync completed in Xs"

### Database Stats

```sql
-- Перевірити останні синхронізації
SELECT
  u.email,
  cc.last_sync_at,
  cc.last_successful_sync_at,
  cc.sync_status
FROM clockify_connections cc
JOIN users u ON u.id = cc.user_id
WHERE cc.is_active = true
ORDER BY cc.last_sync_at DESC;

-- Підрахувати записи за сьогодні
SELECT COUNT(*)
FROM time_entries
WHERE source = 'clockify'
AND last_synced_at > NOW() - INTERVAL '1 day';
```

---

## Troubleshooting

### Помилка 401 Unauthorized

**Причина:** CRON_SECRET не співпадає

**Рішення:**
1. Перевірити CRON_SECRET в Vercel env vars
2. Перевірити Authorization header в cron-job.org
3. Redeploy Vercel після додавання CRON_SECRET

### Помилка 500 Internal Server Error

**Причина:** Помилка в коді або БД

**Рішення:**
1. Дивитись Vercel logs для деталей
2. Перевірити чи існує таблиця `time_entries.content_hash`
3. Перевірити чи є активні Clockify connections

### Timeout Error

**Причина:** Синхронізація занадто довга (>10s на Vercel Free)

**Рішення:**
1. Зменшити BATCH_SIZE з 10 до 5
2. Збільшити частоту cron (кожні 10 хв замість 30)
3. Перевірити швидкість Clockify API

### No active connections to sync

**Причина:** Немає користувачів з активним Clockify підключенням

**Рішення:**
- Нормально! Просто чекати поки користувачі підключать Clockify

---

## Рекомендовані інтервали Cron

| Кількість користувачів | Інтервал | Cron Expression |
|-------------------------|----------|-----------------|
| 1-10 | 30 хвилин | `*/30 * * * *` |
| 10-50 | 15 хвилин | `*/15 * * * *` |
| 50-100 | 10 хвилин | `*/10 * * * *` |
| 100+ | 5 хвилин | `*/5 * * * *` |

**Примітка:** При більше 10 користувачів деякі будуть синхронізуватись по черзі (BATCH_SIZE = 10).

---

## Оптимізація

### Batch Size

Файл: `src/app/api/integrations/clockify/auto-sync/route.ts`
```typescript
const BATCH_SIZE = 10; // Змінити на 5 якщо timeout
```

### Page Size

```typescript
pageSize: 500, // Змінити на 100 якщо потрібно швидше
```

### Пріоритизація

Поточна логіка: старші `last_successful_sync_at` → вища пріоритет

Можна змінити на інше:
```sql
.order('created_at', { ascending: true }) -- Старші користувачі першими
```

---

## Альтернативи (для growth)

Якщо виросте до 100+ користувачів:

1. **Vercel Cron Jobs** (Pro Plan: $20/mo)
   - Вбудований в Vercel
   - Не треба зовнішній сервіс

2. **GitHub Actions**
   - Безкоштовно 2000 хв/місяць
   - `.github/workflows/clockify-sync.yml`

3. **Railway.app**
   - Довші timeouts
   - Background workers

4. **Upstash QStash**
   - Managed queue service
   - Безкоштовний tier: 500 requests/day

---

## Summary

✅ **Налаштовано:**
- Hash-based change detection
- Current week sync only
- Batch processing (10 users/run)
- Vercel Free compatible (<10s)

✅ **Треба зробити:**
1. Додати CRON_SECRET до Vercel env vars
2. Створити cron job на cron-job.org
3. Протестувати "Execute now"
4. Моніторити перші кілька запусків

🎯 **Результат:**
- Автоматична синхронізація поточного тижня
- Тільки змінені записи оновлюються
- Без затримок для користувачів
