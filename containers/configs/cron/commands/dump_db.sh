#!/usr/bin/env bash
set -euo pipefail

set -a
source /var/.env
set +a

DATE_TAG="$(date +%d-%m-%y)"
OUT_FILE="/shared/database.sqlite"

curl -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument" \
  -H "Content-Type: multipart/form-data" \
  -F "chat_id=${TG_DATABASE_CHAT_ID}" \
  -F "document=@${OUT_FILE}" \
  -F "caption=Дамп на ${DATE_TAG}"

