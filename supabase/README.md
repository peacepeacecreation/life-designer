# Supabase Setup Instructions

Цей файл містить інструкції для налаштування Supabase бази даних для Life Designer.

## Крок 1: Створити Supabase проект

1. Перейти на [supabase.com](https://supabase.com)
2. Натиснути "Start your project"
3. Створити новий проект:
   - **Name**: life-designer (або будь-яка інша назва)
   - **Database Password**: згенерувати сильний пароль
   - **Region**: вибрати найближчий регіон (Europe West для України)
   - **Pricing Plan**: Free (достатньо для малого проекту)

4. Зачекати 2-3 хвилини поки проект створюється

## Крок 2: Отримати API Keys

1. В Supabase dashboard перейти в **Settings** → **API**
2. Скопіювати наступні значення:
   - **Project URL** (зберегти як `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (зберегти як `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (зберегти як `SUPABASE_SERVICE_ROLE_KEY`)

⚠️ **УВАГА**: `service_role` key має повний доступ до бази даних. Ніколи не використовуйте його в браузері!

## Крок 3: Додати environment variables

1. Скопіювати `.env.local.example` в `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Відкрити `.env.local` та додати Supabase credentials:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Крок 4: Запустити database migrations

1. В Supabase dashboard перейти в **SQL Editor**
2. Натиснути **New Query**
3. Скопіювати весь вміст файлу `supabase/migrations/001_initial_schema.sql`
4. Вставити в SQL Editor
5. Натиснути **Run** (або Cmd/Ctrl + Enter)

Це створить:
- ✅ pgvector extension
- ✅ Таблиці (users, goals, goal_connections, notes, reflections)
- ✅ Індекси (включаючи vector indexes)
- ✅ Triggers (updated_at)
- ✅ Row Level Security policies
- ✅ Search functions (search_goals, search_notes, search_reflections)

## Крок 5: Перевірити створення таблиць

1. В Supabase dashboard перейти в **Table Editor**
2. Переконатись що всі таблиці створені:
   - users
   - goals
   - goal_connections
   - notes
   - reflections

## Крок 6: (Опціонально) Створити тестового користувача

Для тестування можна створити тестового користувача:

1. В Supabase dashboard перейти в **SQL Editor**
2. Запустити:
   ```sql
   INSERT INTO users (email)
   VALUES ('test@example.com')
   RETURNING *;
   ```

## Troubleshooting

### Помилка: "extension vector does not exist"

Якщо pgvector extension не встановлюється автоматично:
1. Перейти в **Database** → **Extensions**
2. Знайти "vector" в списку
3. Натиснути **Enable**
4. Запустити міграцію ще раз

### Помилка: "permission denied for schema public"

Переконайтесь що використовуєте SQL Editor від імені адміністратора проекту.

### Помилка: RLS policies блокують доступ

Row Level Security policies вимагають автентифікованого користувача.
При використанні service_role key (в API routes) RLS bypasses автоматично.

## Наступні кроки

Після завершення setup:

1. ✅ Supabase проект створено
2. ✅ Database migrations запущено
3. ✅ Environment variables додано
4. ⏭️ Перейти до Фази 2: Embeddings Infrastructure

Тепер можна продовжити імплементацію з створення OpenAI клієнта та embedding сервісів.
