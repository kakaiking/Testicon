#!/usr/bin/env bash
# push.sh — Commit, push to GitHub, and deploy to Vercel production

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
  echo -e "${RED}Usage: ./push.sh \"commit message\"${NC}"
  exit 1
fi

MESSAGE="$*"

for cmd in git vercel; do
  if ! command -v "$cmd" >/dev/null; then
    echo -e "${RED}Error: $cmd is required.${NC}"
    exit 1
  fi
done

echo -e "${CYAN}=== Testicon push & deploy ===${NC}"

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo -e "${YELLOW}No changes to commit.${NC}"
else
  echo -e "${YELLOW}Committing...${NC}"
  git add -A
  git commit -m "$MESSAGE"
fi

echo -e "${YELLOW}Pushing to origin...${NC}"
git push origin HEAD

echo -e "${YELLOW}Deploying to Vercel production...${NC}"
vercel deploy --prod --yes

echo -e "${GREEN}Done.${NC} https://testicon-zeta.vercel.app"
