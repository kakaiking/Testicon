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

echo -e "${CYAN}=== Testicon Vercel deployment ===${NC}"

if ! command -v vercel >/dev/null; then
  echo -e "${RED}Vercel CLI is required.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Turso database (Vercel marketplace)${NC}"
if ! vercel integration installations 2>/dev/null | grep -q tursocloud; then
  echo "Accept Turso terms in your browser if prompted, then provisioning database..."
  vercel integration add tursocloud/database \
    --name testicon-db \
    --plan starter \
    -m region=iad1 \
    -e production \
    -e preview \
    --json || {
      echo -e "${YELLOW}If terms are required, open:${NC}"
      echo "https://vercel.com/tomalvin926-3808s-projects/~/integrations/accept-terms/tursocloud?source=cli"
      echo "Then re-run: npm run deploy:vercel"
      exit 1
    }
fi

echo -e "${YELLOW}Step 2: Pull production env and push schema${NC}"
vercel env pull .env.production.local --environment=production --yes
set -a
# shellcheck disable=SC1091
source .env.production.local
set +a

if [[ -z "${TURSO_DATABASE_URL:-}" || -z "${TURSO_AUTH_TOKEN:-}" ]]; then
  echo -e "${RED}TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing after integration.${NC}"
  exit 1
fi

export DATABASE_URL="$TURSO_DATABASE_URL"
npm run db:setup

echo -e "${YELLOW}Step 3: Production deploy${NC}"
vercel deploy --prod --yes

echo -e "${GREEN}Done.${NC} Open your production URL from the deploy output."
echo "Admin login: /admin/login (email from ADMIN_EMAILS)"
