#!/usr/bin/env bash
# Complete Vercel deployment: Turso DB + schema + production deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV_FILE=".env.production.local"

echo -e "${CYAN}=== Testicon Vercel deployment ===${NC}"

if ! command -v vercel >/dev/null; then
  echo -e "${RED}Vercel CLI is required.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Turso database (Vercel marketplace)${NC}"
if ! vercel integration list 2>/dev/null | grep -q testicon-db; then
  echo "Provisioning Turso database (accept terms in browser if prompted)..."
  if ! vercel integration add tursocloud/database \
    --name testicon-db \
    --plan starter \
    -m region=iad1 \
    -e production \
    -e preview; then
    echo -e "${YELLOW}If terms are required, open:${NC}"
    echo "https://vercel.com/tomalvin926-3808s-projects/~/integrations/accept-terms/tursocloud?source=cli"
    echo "Then re-run: npm run deploy:vercel"
    exit 1
  fi
else
  echo "Turso database testicon-db already provisioned."
fi

echo -e "${YELLOW}Step 2: Pull production env and push schema${NC}"
if ! vercel env pull "$ENV_FILE" --environment=production --yes; then
  echo -e "${RED}Failed to pull production environment variables.${NC}"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Expected $ENV_FILE after vercel env pull, but file was not created.${NC}"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

if [[ -z "${TURSO_DATABASE_URL:-}" || -z "${TURSO_AUTH_TOKEN:-}" ]]; then
  echo -e "${RED}TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing.${NC}"
  echo "Wait a few seconds for Vercel to sync integration env vars, then re-run."
  exit 1
fi

export DATABASE_URL="$TURSO_DATABASE_URL"
npm run db:setup:turso

echo -e "${YELLOW}Step 3: Production deploy${NC}"
vercel deploy --prod --yes

echo -e "${GREEN}Done.${NC} https://testicon-zeta.vercel.app"
echo "Admin login: /admin/login (email from ADMIN_EMAILS)"
