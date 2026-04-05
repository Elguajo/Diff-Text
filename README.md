<!-- Badges -->
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Tauri](https://img.shields.io/badge/Tauri-24c6dc?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-61dafb?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-in_development-yellow)

# TextDiff

> Визуальное сравнение текстов и файлов (Desktop-приложение на базе Tauri 2)

## Live Demo
[Local Desktop App](https://localhost) — *(Desktop application)*

---

## About
TextDiff — это кроссплатформенное desktop-приложение для наглядного и быстрого сравнения двух версий текста или файлов, вдохновлённое такими инструментами как Meld. Обладает современным интерфейсом благодаря React и Monaco Editor, и работает невероятно быстро за счет использования Rust и Tauri в качестве backend-оболочки.

## Features
- Режим «Текст» — вставка двух текстов из буфера обмена для мгновенного получения diff'а.
- Режим «Файлы» — выбор и сравнение двух файлов с диска.
- Drag & Drop — поддержка перетаскивания файлов прямо на панели редактора.
- Интеллектуальная подсветка — добавленное (зелёное), удалённое (красное), изменённое (жёлтое), детальная подсветка на уровне символов.
- Быстрая навигация — перемещение по блокам изменений через F7 / Shift+F7.
- Редактирование на лету — возможность редактировать правую панель прямо в окне сравнения и сохранять.
- Темная и светлая темы — адаптация под системные настройки.
- Автоопределение языка — автоматическая подсветка синтаксиса (JS, TS, Python, JSON, Markdown и др.).

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Tauri 2 |
| Styling | React / CSS |
| Content | Monaco Editor |
| Comments | None |
| Deployment | Desktop (.exe, .app, .deb) |

## Project Structure
```
textdiff/
├── src/                    # React UI (TypeScript)
│   ├── App.tsx             # Главный компонент логики и UI
│   └── main.tsx            # Точка входа React
├── src-tauri/              # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs         # Точка входа Rust
│   │   └── lib.rs          # Tauri плагины и команды
│   ├── capabilities/       # Файлы настроек разрешений (доступ к FS, диалогам)
│   ├── Cargo.toml          # Зависимости Rust и настройки сборки пакета
│   └── tauri.conf.json     # Основной конфигурационный файл Tauri
├── index.html              # HTML входная точка для Vite
├── package.json            # Зависимости и скрипты Node.js
└── vite.config.ts          # Конфигурация сборщика Vite
```

## Getting Started

### Prerequisites
- Node.js LTS
- npm 9+
- Rust (rustup)
- Windows: Visual Studio Build Tools (C++) & WebView2

### Installation
```bash
git clone https://github.com/yourusername/textdiff.git
cd textdiff
npm install
bash setup.sh
# Для Windows: setup.bat
npm run tauri dev
```

## Environment Variables
| Variable | Description | Required |
|---|---|---|
| N/A | No environment variables required | No |

## Available Scripts
| Command | Description |
|---|---|
| `npm run tauri dev` | Start dev server and Tauri application |
| `npm run tauri build` | Build for production (.exe, .msi, .app) |
| `npm run dev` | Start Vite dev server only |

## KiloCode Workflows
| Command | Description |
|---|---|
| `/status.md` | Project progress dashboard |
| `/release.md` | Tag and release a new version |
| `/audit.md` | Full project health check |

## Changelog
See [CHANGELOG.md](./CHANGELOG.md)

## License
MIT