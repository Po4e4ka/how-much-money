#!/usr/bin/env bash
set -euo pipefail

set -a
source /var/.env
set +a

OUT_DIR="${OUT_DIR:-/tmp}"

if [[ -z "$DB_DATABASE" || -z "$DB_USERNAME" ]]; then
  echo "Missing DB_DATABASE or DB_USERNAME." >&2
  exit 1
fi

if [[ -n "$DB_PASSWORD" ]]; then
  export MYSQL_PWD="$DB_PASSWORD"
fi

DATE_TAG="$(date +%d-%m-%y)"
OUT_FILE="${OUT_DIR}/${DB_DATABASE}_dump_${DATE_TAG}.sql"

mysqldump \
  --single-transaction \
  --no-tablespaces \
  --quick \
  --skip-lock-tables \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USERNAME" \
  "$DB_DATABASE" \
  > "$OUT_FILE"


curl -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument" \
  -H "Content-Type: multipart/form-data" \
  -F "chat_id=${TG_DATABASE_CHAT_ID}" \
  -F "document=@${OUT_FILE}" \
  -F "caption=Дамп на ${DATE_TAG}"

rm $OUT_FILE
