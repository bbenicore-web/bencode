# Интерактивная схема CPO на Canvas

Самодостаточная HTML/CSS/JS-схема по образцу организационной диаграммы МегаФона. Основная схема отрисована на HTML5 Canvas: бизнес-лидеры, CPO-домены, три платформы (Telecom, CX, VAS), зоны ответственности и команда телеком-платформы.

## Как открыть

**Онлайн:** https://bbenicore-web.github.io/bencode/

**Резюме:** https://bbenicore-web.github.io/bencode/resume.html

**Учёт электроэнергии:** https://bbenicore-web.github.io/bencode/electricity/

**Мега 5G:** https://bbenicore-web.github.io/bencode/mega-5g/

Публикация выполняется workflow `Deploy GitHub Pages`: корневой сайт сохраняется, а собранные приложения добавляются по маршрутам `/electricity/` и `/mega-5g/`. В [Settings → Pages](https://github.com/bbenicore-web/bencode/settings/pages) выберите **Deploy from a branch**, ветку `gh-pages` и папку `/ (root)`. Workflow обновляет эту ветку после каждого push в `main`.

Локально: откройте `index.html` в браузере или запустите любой статический сервер в корне репозитория.

## Возможности

- отрисовка схемы на `<canvas>`;
- кликабельные Canvas-блоки с панелью деталей;
- подсветка связанных элементов прямо на холсте;
- поиск по названиям, владельцам и описаниям;
- адаптивная верстка для широких и узких экранов.

## Импорт в Canva

Готовый пакет для Canva лежит в папке `canva/`:

- `cpo-scheme-canvas.png` — чистый экспорт схемы;
- `cpo-content.json` — структура блоков;
- `CANVA-IMPORT.md` — ручной импорт;
- `AUTO-IMPORT.md` — автоматический импорт через Canva MCP.

Для автоматического импорта подключи Canva в **Cursor → Settings → MCP → Canva**, затем попроси агента импортировать схему.

## Настройка Electricity Tracker

### 1. Создайте проект Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) и нажмите **New project**.
2. Выберите организацию, задайте имя проекта, надёжный пароль базы данных и регион.
3. Нажмите **Create new project** и дождитесь окончания инициализации.

Пароль базы данных не используется в браузерном приложении и не должен передаваться в Vite-переменные.

### 2. Создайте таблицу, политики и триггеры

1. В проекте Supabase откройте **SQL Editor → New query**.
2. Скопируйте туда всё содержимое файла `electricity/supabase/20260725000000_create_electricity_readings.sql`.
3. Нажмите **Run**. Скрипт создаёт `public.electricity_readings`, включает Row Level Security, добавляет политики доступа пользователя к собственным данным и создаёт триггеры проверки показаний.
4. Откройте **Table Editor → electricity_readings** и убедитесь, что таблица появилась.

Миграцию следует выполнять один раз для нового проекта.

### 3. Включите вход по email и паролю

1. Откройте **Authentication → Providers → Email**.
2. Включите **Enable Email provider** и сохраните изменения.
3. Для production оставьте **Confirm email** включённым: новый пользователь должен перейти по ссылке из письма до первого входа. Для локальной тестовой среды его можно отключить, чтобы тестовый аккаунт активировался сразу.
4. Откройте **Authentication → URL Configuration** и задайте **Site URL**:

   ```text
   https://bbenicore-web.github.io/bencode/electricity/
   ```

5. В **Redirect URLs** добавьте оба разрешённых адреса:

   ```text
   https://bbenicore-web.github.io/bencode/electricity/
   http://localhost:5173/
   ```

6. Сохраните изменения. При регистрации приложение динамически передаёт текущий каталог в Supabase как `emailRedirectTo`: локально это `http://localhost:5173/`, а после публикации — `https://bbenicore-web.github.io/bencode/electricity/`. Оба адреса должны быть разрешены при включённом **Confirm email**, чтобы переход по ссылке из письма возвращал пользователя в тот экземпляр приложения, где он зарегистрировался.

### 4. Настройте локальные публичные переменные

В **Project Settings → API** скопируйте **Project URL** и публичный ключ **anon**. Не используйте ключ `service_role`: он секретный и обходит Row Level Security.

В каждом новом терминале из корня репозитория задайте значения своего проекта:

```bash
export VITE_SUPABASE_URL='https://YOUR_PROJECT_REF.supabase.co'
export VITE_SUPABASE_ANON_KEY='YOUR_PUBLIC_ANON_KEY'
```

Vite встраивает эти публичные значения в браузерную сборку; безопасность данных обеспечивают политики Row Level Security из миграции.

### 5. Добавьте GitHub Actions secrets

Откройте **Settings → Secrets and variables → Actions → New repository secret** и создайте два секрета:

| Имя | Значение |
| --- | --- |
| `SUPABASE_URL` | **Project URL** из Supabase |
| `SUPABASE_ANON_KEY` | публичный ключ **anon** из Supabase |

Workflow передаёт их сборке как `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. После добавления секретов запустите **Actions → Deploy GitHub Pages → Run workflow** или отправьте commit в `main`.

Для текущего проекта в workflow уже задан безопасный публичный fallback: Project URL и `publishable` key. Поэтому приложение соберётся и без GitHub Secrets. Секреты нужны только для переключения на другой Supabase-проект и имеют приоритет над fallback-значениями. `service_role` по-прежнему нельзя добавлять ни в workflow, ни в клиентский код.

### 6. Установите зависимости, проверьте и запустите

Используйте Node.js 22 и выполните из корня репозитория:

```bash
npm ci
npm test
npm run dev:electricity
```

Откройте `http://localhost:5173/`. Vite использует фиксированный порт `5173` и завершится с ошибкой, если порт занят, поэтому локальный redirect не изменится незаметно. После локальной проверки остановите сервер сочетанием `Ctrl+C` и соберите production-версию:

```bash
npm run build:electricity
```

Результат появится в `dist/electricity`; deployment workflow копирует его в `_site/electricity`, не изменяя содержимое корневого сайта.
