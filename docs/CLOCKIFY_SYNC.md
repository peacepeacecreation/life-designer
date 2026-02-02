# Clockify Hash-Based Synchronization

## Overview

Hash-based синхронізація дозволяє ефективно виявляти зміни в записах часу Clockify без необхідності порівнювати всі поля. Це економить час та ресурси бази даних.

## Як працює Hash Detection

### 1. Hash Components

Hash складається з 4-х критичних полів (в чіткому порядку):

```typescript
hash = SHA256(description | start_time | end_time | project_id)
```

**Чому ці поля?**
- `description` - може редагуватись користувачем
- `start_time` - може змінюватись при редагуванні
- `end_time` - може змінюватись при редагуванні
- `project_id` - може змінюватись при перепризначенні проекту

**Інші поля (не включені):**
- `id` - не змінюється
- `user_id` - не змінюється
- `billable` - можна додати пізніше якщо потрібно
- `tags` - можна додати пізніше якщо потрібно

### 2. Sync Algorithm

```typescript
// Крок 1: Отримати записи з Clockify за тиждень
const entries = await clockify.getTimeEntries(weekStart, weekEnd)

// Крок 2: Для кожного запису
for (const entry of entries) {
  // Згенерувати hash
  const currentHash = hash(entry.description, entry.start, entry.end, entry.project)

  // Перевірити чи існує в БД
  const existing = await db.findByClockifyId(entry.id)

  if (!existing) {
    // Новий запис → INSERT
    await db.insert(entry, currentHash)
  } else if (existing.content_hash !== currentHash) {
    // Hash змінився → щось редагували → UPDATE
    await db.update(entry, currentHash)
  } else {
    // Hash однаковий → нічого не змінилось → SKIP
    skip++
  }
}
```

### 3. Приклади

**Сценарій 1: Створення нового запису**
```
Clockify: "Meeting" | 10:00 | 12:00 | ProjectA
Hash: abc123

DB: не існує

Результат: INSERT з hash=abc123
```

**Сценарій 2: Редагування опису**
```
Clockify: "Client Meeting" | 10:00 | 12:00 | ProjectA
Hash: def456

DB: "Meeting" | 10:00 | 12:00 | ProjectA | hash=abc123

Порівняння: def456 !== abc123 → UPDATE
```

**Сценарій 3: Без змін**
```
Clockify: "Meeting" | 10:00 | 12:00 | ProjectA
Hash: abc123

DB: "Meeting" | 10:00 | 12:00 | ProjectA | hash=abc123

Порівняння: abc123 === abc123 → SKIP
```

## Auto-Sync Logic (5-minute interval)

### Client-Side Implementation

```typescript
// Перевірка кожні 60 секунд
setInterval(() => {
  const now = new Date()
  const timeSinceLastSync = now - lastSyncTime

  if (timeSinceLastSync > 5 minutes) {
    syncWeek()  // Auto-sync
  }
}, 60 * 1000)
```

### Sync Triggers

1. **Відкриття сторінки** → Якщо last_sync > 5 хв → sync
2. **Кожну хвилину** → Перевірка чи минуло 5 хв → sync
3. **Кнопка "Оновити зараз"** → Примусова синхронізація

## Database Schema

```sql
time_entries {
  id                    UUID PRIMARY KEY
  user_id               UUID
  clockify_entry_id     TEXT UNIQUE
  description           TEXT
  start_time            TIMESTAMP
  end_time              TIMESTAMP
  clockify_project_id   UUID
  goal_id               UUID
  content_hash          TEXT  -- ✨ NEW FIELD
  last_synced_at        TIMESTAMP
  ...
}

-- Index for fast hash lookups
CREATE INDEX idx_time_entries_content_hash
ON time_entries(clockify_entry_id, content_hash);
```

## API Endpoints

### POST /api/clockify/sync-week

Синхронізує конкретний тиждень з Clockify.

**Request:**
```json
{
  "weekStart": "2026-01-13T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "weekStart": "2026-01-13T00:00:00.000Z",
  "weekEnd": "2026-01-19T23:59:59.999Z",
  "stats": {
    "total": 42,
    "inserted": 5,    // Нові записи
    "updated": 2,     // Змінені записи (hash не співпав)
    "skipped": 35     // Незмінені записи (hash співпав)
  },
  "duration": 1234
}
```

## Performance Benefits

### Without Hash:
```typescript
// Завантажити 100 записів з Clockify
// Для КОЖНОГО запису:
//   - SELECT з БД
//   - Порівняти ВСІ поля (description, start, end, project, billable, etc.)
//   - UPDATE якщо хоч одне поле відрізняється

Запитів до БД: 100 SELECT + ~50 UPDATE = 150 запитів
Час: ~3-5 секунд
```

### With Hash:
```typescript
// Завантажити 100 записів з Clockify
// Згенерувати batch hashes (паралельно): ~50ms
// Для КОЖНОГО запису:
//   - SELECT з БД (тільки id + content_hash)
//   - Порівняти ОДИН hash
//   - UPDATE тільки якщо hash відрізняється

Запитів до БД: 100 SELECT + ~2 UPDATE = 102 запити
Час: ~1-2 секунди
Економія: 60-70% часу синхронізації
```

## File Structure

```
src/
├── lib/
│   └── clockify/
│       ├── hash.ts                 # Hash utilities
│       ├── client.ts               # Clockify API client
│       └── encryption.ts           # API key encryption
├── app/
│   ├── api/
│   │   └── clockify/
│   │       ├── sync-week/
│   │       │   └── route.ts        # Week sync endpoint
│   │       └── weekly-entries/
│   │           └── route.ts        # Get entries from DB
│   ├── clockify-test/
│   │   └── page.tsx                # Original page (no sync)
│   └── clockify/
│       └── page.tsx                # NEW: Hash-based sync page
└── components/
    └── clockify/
        ├── ClockifyWeeklyTable.tsx # Original component
        └── ClockifySyncTable.tsx   # NEW: Auto-sync component

supabase/
└── migrations/
    └── 013_add_content_hash_to_time_entries.sql

docs/
└── CLOCKIFY_SYNC.md               # This file
```

## Usage

### For Users:

1. Відкрити http://localhost:3077/clockify-sync
2. Сторінка автоматично синхронізує дані якщо минуло 5+ хвилин
3. Натиснути "Оновити зараз" для примусової синхронізації
4. Переглядати дані з бази (швидко, без затримок)

### For Developers:

```typescript
import { generateTimeEntryHash, hasEntryChanged } from '@/lib/clockify/hash'

// Generate hash for entry
const hash = await generateTimeEntryHash({
  description: entry.description,
  start_time: entry.timeInterval.start,
  end_time: entry.timeInterval.end,
  project_id: entry.projectId
})

// Check if entry changed
const changed = await hasEntryChanged(clockifyEntry, storedHash)
if (changed) {
  await updateEntry(clockifyEntry)
}
```

## Roadmap

### Phase 1 (Current): ✅
- [x] Hash-based change detection
- [x] Auto-sync every 5 minutes
- [x] Manual sync button
- [x] Sync stats display
- [x] Read from database

### Phase 2 (Future):
- [ ] Cron-based background sync (current week only)
- [ ] Conflict resolution (if edited in both places)
- [ ] Two-way sync (push changes back to Clockify)
- [ ] Webhook integration (for Clockify Premium users)
- [ ] Include `billable` and `tags` in hash

## Troubleshooting

### "Sync не спрацьовує автоматично"
- Перевірити чи є активне підключення Clockify
- Подивитись console.log для auto-sync triggers
- Перевірити чи `lastSyncTime` встановлено

### "Всі записи UPDATE, хоч нічого не змінювалось"
- Можливо старі записи без `content_hash` (legacy)
- Перший sync після міграції оновить всі записи з hash
- Наступні syncs будуть тільки changed records

### "Помилка 401 Unauthorized"
- Перевірити чи Clockify connection активний
- Перевірити чи API key валідний
- Переімпортувати підключення в /settings

## References

- Hash algorithm: SHA-256 (Node.js `crypto`)
- Week calculation: `date-fns` (Monday start)
- Sync strategy: Incremental with hash detection
- Database: Supabase PostgreSQL with RLS
