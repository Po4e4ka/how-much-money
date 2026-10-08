#!/usr/bin/env bash
set -Eeuo pipefail

: "${HMM_PROD_IMAGE:?HMM_PROD_IMAGE must be an immutable GHCR SHA tag}"
: "${PROD_DB_PATH:?PROD_DB_PATH must point to the production SQLite file}"
: "${PROD_ENV_PATH:?PROD_ENV_PATH must point to the production .env file}"
: "${GITHUB_WORKSPACE:?This script must run from GitHub Actions}"

if [[ ! "${HMM_PROD_IMAGE}" =~ ^ghcr\.io/po4e4ka/how-much-money-prod:[a-f0-9]{40}$ ]]; then
  echo "Refusing non-immutable or unexpected production image" >&2
  exit 1
fi

for var in PROD_DB_PATH PROD_ENV_PATH GITHUB_WORKSPACE; do
  path="${!var}"
  if [[ "${path}" != /* ]]; then
    echo "${var} must be an absolute path" >&2
    exit 1
  fi
done

PROD_ROOT="$(realpath -m "$(dirname "${PROD_ENV_PATH}")")"
PROD_DB_PATH="$(realpath -m "${PROD_DB_PATH}")"
PROD_ENV_PATH="$(realpath -m "${PROD_ENV_PATH}")"
WORKSPACE="$(realpath -m "${GITHUB_WORKSPACE}")"

if [[ "${PROD_ROOT}" == / || "${PROD_ROOT}" == "${WORKSPACE}" \
  || "${PROD_ROOT}" == "${WORKSPACE}/"* || "${WORKSPACE}" == "${PROD_ROOT}/"* ]]; then
  echo "Unsafe production directory" >&2
  exit 1
fi

# The existing cron container mounts ./database.sqlite and ./.env from this
# directory. Do not silently redirect the web app to another database.
if [[ "${PROD_ENV_PATH}" != "${PROD_ROOT}/.env" \
  || "${PROD_DB_PATH}" != "${PROD_ROOT}/database.sqlite" ]]; then
  echo "Production .env and database must match the existing Compose mounts" >&2
  exit 1
fi

if [[ ! -f "${PROD_ENV_PATH}" || ! -f "${PROD_DB_PATH}" \
  || ! -d "${PROD_ROOT}/storage" || ! -f "${PROD_ROOT}/docker-compose-prod.yaml" ]]; then
  echo "Missing existing production .env, SQLite database, storage, or Compose file" >&2
  exit 1
fi

if ! docker inspect hmm-laravel --format '{{.Config.Image}}' >/dev/null 2>&1; then
  echo "No existing production web container to roll back to" >&2
  exit 1
fi

export PROD_ROOT
COMPOSE_FILE="${PROD_ROOT}/docker-compose-prod.yaml"
RELEASE_DIR="${PROD_ROOT}/.deploy"
BACKUP_DIR="${RELEASE_DIR}/backups"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${GITHUB_SHA:-manual}"
PREVIOUS_COMPOSE="${RELEASE_DIR}/compose-before-${RELEASE_ID}.yaml"
NEXT_COMPOSE="${COMPOSE_FILE}.next"
DB_SNAPSHOT="${BACKUP_DIR}/database-${RELEASE_ID}.sqlite"
PREVIOUS_IMAGE="$(docker inspect hmm-laravel --format '{{.Config.Image}}')"
COMPOSE_INSTALLED=false
SWITCH_ATTEMPTED=false
HEALTH_HTML=""

compose() {
  docker compose --project-directory "${PROD_ROOT}" -f "${COMPOSE_FILE}" "$@"
}

on_exit() {
  status=$?
  trap - EXIT
  rm -f "${NEXT_COMPOSE}"
  if [[ -n "${HEALTH_HTML}" ]]; then
    rm -f "${HEALTH_HTML}"
  fi
  if [[ "${status}" -ne 0 && "${COMPOSE_INSTALLED}" == true ]]; then
    echo "Deployment failed; restoring previous production Compose configuration" >&2
    cp -f "${PREVIOUS_COMPOSE}" "${COMPOSE_FILE}"
    if [[ "${SWITCH_ATTEMPTED}" == true ]]; then
      echo "Attempting to restore the previous web container: ${PREVIOUS_IMAGE}" >&2
      export HMM_PROD_IMAGE="${PREVIOUS_IMAGE}"
      if ! compose up -d --no-deps --no-build --pull never hmm-laravel; then
        echo "Automatic web rollback FAILED; manual intervention required" >&2
      fi
    fi
    echo "SQLite snapshot retained at ${DB_SNAPSHOT}; database changes are NOT rolled back" >&2
  fi
  exit "${status}"
}

mkdir -p "${BACKUP_DIR}"
chmod 0700 "${RELEASE_DIR}" "${BACKUP_DIR}"
trap on_exit EXIT

# Validate the new Compose file without disturbing live containers.
cp "${GITHUB_WORKSPACE}/docker-compose-prod.yaml" "${NEXT_COMPOSE}"
docker compose --project-directory "${PROD_ROOT}" -f "${NEXT_COMPOSE}" config --quiet

docker pull "${HMM_PROD_IMAGE}"

# The image must contain matching Laravel, Vite and PWA assets.
EXPECTED_JS="$(docker run --rm --entrypoint php "${HMM_PROD_IMAGE}" \
  -r '$manifest=json_decode(file_get_contents("/var/www/public/build/manifest.json"),true); echo $manifest["resources/js/app.tsx"]["file"] ?? "";')"
EXPECTED_CSS="$(docker run --rm --entrypoint php "${HMM_PROD_IMAGE}" \
  -r '$manifest=json_decode(file_get_contents("/var/www/public/build/manifest.json"),true); echo $manifest["resources/css/app.css"]["file"] ?? "";')"
if [[ "${EXPECTED_JS}" != assets/* || "${EXPECTED_CSS}" != assets/* ]]; then
  echo "Production image has no valid Vite entrypoints" >&2
  exit 1
fi

docker run --rm --entrypoint sh "${HMM_PROD_IMAGE}" \
  -c 'test -f /var/www/artisan && test -f /var/www/public/build/sw.js && test -f /var/www/public/build/manifest.webmanifest'

# This is a consistent online SQLite snapshot (including WAL data). Never copy
# the raw, live database file with cp/rsync.
docker run --rm --user "$(id -u):$(id -g)" \
  -v "${PROD_ROOT}:/source:ro" -v "${BACKUP_DIR}:/backup" \
  -e "SNAPSHOT_FILENAME=$(basename "${DB_SNAPSHOT}")" \
  --entrypoint php "${HMM_PROD_IMAGE}" -r '
    $src=new SQLite3("/source/database.sqlite",SQLITE3_OPEN_READONLY);
    $dst=new SQLite3("/backup/" . getenv("SNAPSHOT_FILENAME"));
    if (!$src->backup($dst)) {fwrite(STDERR,"SQLite backup failed\n");exit(1);}
    $dst->close();$src->close();
  '

cp "${COMPOSE_FILE}" "${PREVIOUS_COMPOSE}"
chmod 0600 "${PREVIOUS_COMPOSE}" "${DB_SNAPSHOT}"
mv -f "${NEXT_COMPOSE}" "${COMPOSE_FILE}"
COMPOSE_INSTALLED=true

# Use the immutable new image for migration; no frontend or image builds on VPS.
compose run --rm --no-deps --entrypoint php hmm-laravel artisan migrate --force

SWITCH_ATTEMPTED=true
compose up -d --no-deps --no-build --pull never hmm-laravel

if [[ "$(docker inspect hmm-laravel --format '{{.Config.Image}}')" != "${HMM_PROD_IMAGE}" ]]; then
  echo "Running production image does not match the requested SHA" >&2
  exit 1
fi

HEALTH_HTML="$(mktemp)"
healthy=false
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 10 https://how-much-money.ru/ > "${HEALTH_HTML}" \
    && grep -Fq "${EXPECTED_JS}" "${HEALTH_HTML}" \
    && grep -Fq "${EXPECTED_CSS}" "${HEALTH_HTML}" \
    && curl --fail --silent --show-error --max-time 10 "https://how-much-money.ru/build/${EXPECTED_JS}" >/dev/null \
    && curl --fail --silent --show-error --max-time 10 "https://how-much-money.ru/build/${EXPECTED_CSS}" >/dev/null \
    && curl --fail --silent --show-error --max-time 10 https://how-much-money.ru/build/manifest.webmanifest >/dev/null \
    && [[ "$(curl --silent --show-error --max-time 10 --output /dev/null --write-out '%{redirect_url}' https://how-much-money.ru/dashboard)" == "https://how-much-money.ru/login" ]]; then
    healthy=true
    break
  fi
  sleep 3
done
rm -f "${HEALTH_HTML}"

if [[ "${healthy}" != true ]]; then
  echo "Production healthcheck failed" >&2
  compose logs --tail=150 hmm-laravel >&2 || true
  exit 1
fi

printf '%s\n' "${HMM_PROD_IMAGE}" > "${RELEASE_DIR}/current-image"
echo "Production deployment healthy: ${HMM_PROD_IMAGE}"

# Keep three confirmed snapshots without touching any other backups.
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'database-*.sqlite' \
  -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2- \
  | while IFS= read -r old_backup; do
      [[ -z "${old_backup}" ]] || rm -f -- "${old_backup}"
    done
