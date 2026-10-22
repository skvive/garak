#!/usr/bin/env bash
# LEXI Vercel 배포 자동화 — docs/lexi-master-spec.md §4.4
# lexi.vercel.app → lexi0 → lexi1 ... 선점 시 순차 폴백
set -euo pipefail

BASE="${LEXI_ALIAS_BASE:-lexi}"
MAX_TRIES=20

echo "▶ vercel production deploy"
DEPLOY_URL=$(vercel --prod --yes | tail -1)
echo "  deployed: $DEPLOY_URL"

N=""
i=0
while ! vercel alias set "$DEPLOY_URL" "${BASE}${N}.vercel.app" 2>/dev/null; do
  N="$i"
  i=$((i + 1))
  if [ "$i" -gt "$MAX_TRIES" ]; then
    echo "✖ alias exhausted after ${MAX_TRIES} tries" >&2
    exit 1
  fi
done

echo "✅ live: https://${BASE}${N}.vercel.app"
