# Автоматический импорт в Canva

После подключения Canva MCP агент выполняет импорт одной командой через инструмент `import-design-from-url`.

## Шаг 1. Подключи Canva в Cursor (один раз)

1. Открой **Cursor Desktop**
2. Перейди в **Settings → MCP → Canva**
3. Нажми **Connect** и войди в Canva
4. Дождись статуса **Connected**

## Шаг 2. Попроси агента импортировать

Напиши:

```text
Импортируй CPO-схему в Canva автоматически
```

Агент вызовет:

- `import-design-from-url`
- URL: `https://raw.githubusercontent.com/bbenicore-web/bencode/cursor/interactive-touchpoint-map-d6fd/canva/cpo-scheme-canvas.png`
- title: `CPO — схема платформ МегаФон`

## Что получишь на выходе

- новый Canva-дизайн со схемой;
- ссылку `edit_url` для редактирования в Canva.

## Если автоматический импорт не сработал

Проверь, что Canva MCP показывает статус **Connected**, а не `needsAuth`.
