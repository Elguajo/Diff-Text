@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: TextDiff — Скрипт первоначальной установки (Windows)
:: Запустить один раз из папки проекта: setup.bat
:: ─────────────────────────────────────────────────────────────────────────────
echo ==========================================
echo   TextDiff — Setup (Windows)
echo ==========================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ОШИБКА] Node.js не найден.
  echo Установите с https://nodejs.org (LTS версия^)
  echo После установки запустите setup.bat снова.
  pause
  exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

:: 2. Check Rust
where rustc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [!] Rust не найден.
  echo Открываю страницу установки Rust...
  start https://rustup.rs
  echo После установки Rust запустите setup.bat снова.
  pause
  exit /b 1
)
for /f "tokens=*" %%i in ('rustc --version') do set RUST_VER=%%i
echo [OK] %RUST_VER%

:: 3. npm install
echo.
echo [..] Устанавливаю npm зависимости...
npm install
if %ERRORLEVEL% NEQ 0 (
  echo [ОШИБКА] npm install провалился.
  pause
  exit /b 1
)

:: 4. Done
echo.
echo ==========================================
echo   Установка завершена!
echo ==========================================
echo.
echo   Запуск в режиме разработки:
echo     npm run tauri dev
echo.
echo   Сборка приложения (.exe / .msi):
echo     npm run tauri build
echo.
pause
