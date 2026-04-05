#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TextDiff — Скрипт первоначальной установки (macOS / Linux)
# Запустить один раз из папки проекта: bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      TextDiff — Setup Script         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js не найден.${NC}"
  echo "  Установите с https://nodejs.org (рекомендуется LTS версия)"
  exit 1
fi
NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VER}${NC}"

# 2. Check Rust
if ! command -v rustc &>/dev/null; then
  echo -e "${YELLOW}⚠ Rust не найден. Устанавливаю...${NC}"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
RUST_VER=$(rustc --version)
echo -e "${GREEN}✓ ${RUST_VER}${NC}"

# 3. macOS: Xcode Command Line Tools
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! xcode-select -p &>/dev/null; then
    echo -e "${YELLOW}⚠ Устанавливаю Xcode Command Line Tools...${NC}"
    xcode-select --install
    echo "  После установки запустите setup.sh снова."
    exit 0
  fi
  echo -e "${GREEN}✓ Xcode CLT установлен${NC}"
fi

# 4. npm install
echo ""
echo -e "${CYAN}📦 Устанавливаю npm зависимости...${NC}"
npm install

# 5. Done
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Установка завершена!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "  Для запуска в режиме разработки:"
echo -e "  ${CYAN}npm run tauri dev${NC}"
echo ""
echo "  Для сборки финального приложения (.dmg / .exe):"
echo -e "  ${CYAN}npm run tauri build${NC}"
echo ""
