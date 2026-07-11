# Как включить публикацию (исправить 404)

Сейчас файлы сайта уже лежат в репозитории, но **GitHub Pages не включён** — поэтому по адресу https://bbenicore-web.github.io/bencode/ отдаётся 404.

## Быстрое решение (2 минуты)

1. Откройте: **https://github.com/bbenicore-web/bencode/settings/pages**
2. В блоке **Build and deployment** → **Source** выберите **Deploy from a branch**
3. Укажите:
   - **Branch:** `main`
   - **Folder:** `/docs`
4. Нажмите **Save**
5. Подождите 1–2 минуты и откройте: **https://bbenicore-web.github.io/bencode/**

## Альтернатива: ветка gh-pages

Если удобнее публиковать из отдельной ветки:

1. Там же в **Settings → Pages**
2. **Branch:** `gh-pages`
3. **Folder:** `/ (root)`
4. **Save**

Ветка `gh-pages` обновляется автоматически при каждом push в `main`.

## Проверка

После включения Pages в настройках репозитория статус должен стать **«Your site is live at …»**.

Если через 5 минут всё ещё 404:

- убедитесь, что репозиторий **публичный**;
- проверьте, что выбрана папка `/docs` на ветке `main` (или `/` на `gh-pages`);
- откройте вкладку **Actions** — workflow **Deploy GitHub Pages** должен быть зелёным.

## Локальный просмотр

Откройте `index.html` в браузере или запустите статический сервер в корне репозитория.
