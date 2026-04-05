# Project Plan

## Status
Current version: 0.1.0
Last updated: 2026-04-06

## Phase 1 — MVP Core (done)
- [x] Базовый каркас Tauri + React + Monaco
- [x] Открыть левый и правый файл (диалог ОС)
- [x] Сохранить правый файл
- [x] Drag & Drop файлов
- [x] Подсветка изменений (строки и внутри строк)
- [x] Навигация (Next/Prev, F7)
- [x] Базовые настройки отображения (wrap, пробелы, тема)

## Phase 2 — UI/UX Revamp & Frameless Window (in progress)
- [-] Перевод окна в режим frameless (кастомный заголовок)
- [ ] Редизайн UI в стиле VS Code / Cursor (по скриншоту 1)
- [ ] Добавление визуальных линий-связей изменений (как в Meld, по скриншоту 2)

## Phase 3 — MVP Polish
- [ ] Добавление иконок приложения (фикс сборки)
- [ ] Индекс текущего изменения «3 из 12»
- [ ] Кнопки «принять/отклонить блок» (accept left → right, reject)
- [ ] Свернуть неизменённые блоки (collapse unchanged)
- [ ] Кнопка «Сохранить как»
- [ ] Переключатель синхронного / независимого скролла

## Backlog
- [ ] Сохранение настроек сессии (tauri-plugin-store)
- [ ] Overview ruler (карта изменений)
- [ ] Recent files
- [ ] Сравнение папок
- [ ] Интеграция с Git

## Known Issues
- Сборка (npm run tauri build) падает из-за отсутствия иконок в папке src-tauri/icons.