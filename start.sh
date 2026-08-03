#!/usr/bin/env bash
# start.sh — Bootstrap and run Testicon locally

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORT="${PORT:-3000}"

echo -e "${CYAN}======================================================${NC}"
echo -e "${GREEN}🧪 Starting Testicon...${NC}"
echo -e "${CYAN}======================================================${NC}"

# --- Prerequisites ---
if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is required. Install Node 18+ and retry.${NC}"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo -e "${RED}Error: npm is required.${NC}"
  exit 1
fi

# --- Environment ---
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo -e "${YELLOW}No .env found — copying from .env.example${NC}"
    cp .env.example .env
  else
    echo -e "${RED}Error: .env and .env.example are both missing.${NC}"
    exit 1
  fi
fi

# --- Dependencies ---
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}Installing npm dependencies...${NC}"
  npm install
else
  echo "Dependencies OK (node_modules present)"
fi

# --- Database ---
echo -e "${YELLOW}Setting up database...${NC}"
npx prisma generate
npx prisma db push

if [ ! -f prisma/dev.db ]; then
  echo -e "${YELLOW}Seeding database...${NC}"
  npx tsx prisma/seed.ts
else
  # Seed is idempotent (upserts) — run to ensure admin + demo app exist
  npx tsx prisma/seed.ts 2>/dev/null || true
fi

# --- Optional: local Internal-App (set START_INTERNAL_APP=1) ---
INTERNAL_APP="../internal-app"
if [ "${START_INTERNAL_APP:-0}" = "1" ] && [ -d "$INTERNAL_APP" ] && [ -f "$INTERNAL_APP/start.sh" ]; then
  INTERNAL_PORT="${INTERNAL_APP_PORT:-3001}"
  echo -e "${YELLOW}Starting Internal-App on port ${INTERNAL_PORT}...${NC}"
  (cd "$INTERNAL_APP" && PORT="$INTERNAL_PORT" ./start.sh) &
  echo "Internal-App running in background (port ${INTERNAL_PORT})"
fi

echo ""
echo -e "${GREEN}Testicon ready${NC}"
echo -e "  App:        ${CYAN}http://localhost:${PORT}${NC}"
echo -e "  Admin:      ${CYAN}http://localhost:${PORT}/admin/login${NC}"
echo -e "  Tester:     ${CYAN}http://localhost:${PORT}/login${NC}"
echo -e "  Admin email: ${YELLOW}$(grep ADMIN_EMAILS .env | cut -d= -f2 | cut -d, -f1)${NC}"
echo ""

# --- Dev server ---
echo -e "${GREEN}Starting Next.js dev server on port ${PORT}...${NC}"
echo -e "${CYAN}======================================================${NC}"

if command -v xdg-open &>/dev/null; then
  (sleep 2 && xdg-open "http://localhost:${PORT}" 2>/dev/null) &
fi

exec npm run dev -- --port "$PORT"
