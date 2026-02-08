#!/usr/bin/env bash
set -euo pipefail
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="${MYSQL_DATABASE:-}"
DB_USER="${MYSQL_USER:-}"
DB_PASS="${MYSQL_PASSWORD:-}"
OUT_DIR="${OUT_DIR:-/tmp}"

if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "Missing DB_NAME or DB_USER." >&2
  exit 1
fi

if [[ -n "$DB_PASS" ]]; then
  export MYSQL_PWD="$DB_PASS"
fi

DATE_TAG="$(date +%d-%m-%y)"
OUT_FILE="${OUT_DIR}/${DB_NAME}_dump_${DATE_TAG}.sql"

mysqldump \
  --single-transaction \
  --no-tablespaces \
  --quick \
  --skip-lock-tables \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  "$DB_NAME" \
  > "$OUT_FILE"


curl -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument" \
  -H "Content-Type: multipart/form-data" \
  -F "chat_id=${TG_DATABASE_CHAT_ID}" \
  -F "document=@${OUT_FILE}" \
  -F "caption=Дамп на ${DATE_TAG}"

rm $OUT_FILE
