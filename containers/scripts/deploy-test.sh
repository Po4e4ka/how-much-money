#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROD_DB_PATH:?PROD_DB_PATH must point to the production SQLite database}"
: "${PROD_ENV_PATH:?PROD_ENV_PATH must point to the production .env file}"
: "${TEST_DEPLOY_DIR:?TEST_DEPLOY_DIR must point to the persistent test deployment directory}"
: "${TEST_BASIC_AUTH:?TEST_BASIC_AUTH must contain a Traefik basic-auth htpasswd entry}"
: "${TEST_PROXY_HOST:?TEST_PROXY_HOST must contain the proxy URL, for example https://171.22.119.96:8443}"
: "${TEST_PROXY_USERNAME:?TEST_PROXY_USERNAME must be set}"
: "${TEST_PROXY_PASSWORD:?TEST_PROXY_PASSWORD must be set}"

SOURCE_DIR="${GITHUB_WORKSPACE:-$(pwd)}"
IMAGE_TAG="${GITHUB_SHA:-local}"
TEST_DB_DIR="${TEST_DEPLOY_DIR}/var/test"
TEST_DB_PATH="${TEST_DB_DIR}/database.sqlite"

for path_var in PROD_DB_PATH PROD_ENV_PATH TEST_DEPLOY_DIR; do
  path_value="${!path_var}"
  if [[ "${path_value}" != /* ]]; then
    echo "${path_var} must be an absolute path: ${path_value}" >&2
    exit 1
  fi
done

PROD_DIR="$(realpath -m "$(dirname "${PROD_ENV_PATH}")")"
TEST_DIR_REAL="$(realpath -m "${TEST_DEPLOY_DIR}")"
SOURCE_DIR_REAL="$(realpath -m "${SOURCE_DIR}")"

if [[ "${TEST_DIR_REAL}" == "/" \
   || "${TEST_DIR_REAL}" == "${PROD_DIR}" \
   || "${TEST_DIR_REAL}" == "${PROD_DIR}/"* \
   || "${PROD_DIR}" == "${TEST_DIR_REAL}/"* \
   || "${TEST_DIR_REAL}" == "${SOURCE_DIR_REAL}" \
   || "${TEST_DIR_REAL}" == "${SOURCE_DIR_REAL}/"* \
   || "${SOURCE_DIR_REAL}" == "${TEST_DIR_REAL}/"* ]]; then
  echo "Unsafe TEST_DEPLOY_DIR: ${TEST_DEPLOY_DIR}" >&2
  exit 1
fi

if [[ ! -f "${PROD_DB_PATH}" ]]; then
  echo "Production database not found: ${PROD_DB_PATH}" >&2
  exit 1
fi

if [[ ! -f "${PROD_ENV_PATH}" ]]; then
  echo "Production environment file not found: ${PROD_ENV_PATH}" >&2
  exit 1
fi

mkdir -p "${TEST_DEPLOY_DIR}" "${TEST_DB_DIR}"

# Keep runtime data out of the source sync. The deployment directory is stable,
# unlike the GitHub Actions checkout directory used by a self-hosted runner.
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.test' \
  --exclude='node_modules/' \
  --exclude='vendor/' \
  --exclude='var/' \
  "${SOURCE_DIR}/" "${TEST_DEPLOY_DIR}/"

cp "${PROD_ENV_PATH}" "${TEST_DEPLOY_DIR}/.env.test"
chmod 600 "${TEST_DEPLOY_DIR}/.env.test"

# The application container runs as UID/GID 1000. The deployment tree itself
# may stay root-owned, but Composer/Laravel need a few writable bind-mounted
# directories at runtime.
mkdir -p \
  "${TEST_DEPLOY_DIR}/vendor" \
  "${TEST_DEPLOY_DIR}/bootstrap/cache" \
  "${TEST_DEPLOY_DIR}/storage/framework/cache/data" \
  "${TEST_DEPLOY_DIR}/storage/framework/sessions" \
  "${TEST_DEPLOY_DIR}/storage/framework/views" \
  "${TEST_DEPLOY_DIR}/storage/logs"

chown -R 1000:1000 \
  "${TEST_DEPLOY_DIR}/vendor" \
  "${TEST_DEPLOY_DIR}/bootstrap/cache" \
  "${TEST_DEPLOY_DIR}/storage"

# Keep production-derived secrets and database snapshots out of the Docker
# build context. The runtime mounts them explicitly instead.
cat > "${TEST_DEPLOY_DIR}/.dockerignore" <<'EOF'
.git
.env
.env.*
node_modules
vendor
var/test
database.sqlite
*.sqlite
EOF

set_env() {
  local key="$1"
  local value="$2"
  local file="${TEST_DEPLOY_DIR}/.env.test"

  if grep -qE "^${key}=" "${file}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${file}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${file}"
  fi
}

set_env APP_ENV test
set_env APP_DEBUG false
set_env APP_URL https://test.how-much-money.ru
set_env DB_CONNECTION sqlite
set_env DB_DATABASE /var/db/database.sqlite
set_env SESSION_DOMAIN test.how-much-money.ru
set_env SESSION_COOKIE hmm_test_session
set_env YANDEX_REDIRECT_URI '"https://test.how-much-money.ru/auth/yandex/callback"'

cd "${TEST_DEPLOY_DIR}"

export HMM_TEST_IMAGE_TAG="${IMAGE_TAG}"
export TEST_BASIC_AUTH

# Build an authenticated proxy URL without printing credentials. URL-encoding is
# required so passwords containing @, :, #, etc. remain valid in the URL.
PROXY_URL="$(
  TEST_PROXY_HOST="${TEST_PROXY_HOST}" \
  TEST_PROXY_USERNAME="${TEST_PROXY_USERNAME}" \
  TEST_PROXY_PASSWORD="${TEST_PROXY_PASSWORD}" \
  python3 - <<'PY'
import os
from urllib.parse import quote, urlsplit, urlunsplit

raw = os.environ["TEST_PROXY_HOST"]
if "://" not in raw:
    raw = "https://" + raw

parts = urlsplit(raw)
user = quote(os.environ["TEST_PROXY_USERNAME"], safe="")
password = quote(os.environ["TEST_PROXY_PASSWORD"], safe="")
netloc = f"{user}:{password}@{parts.hostname}"
if parts.port:
    netloc += f":{parts.port}"

print(urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment)))
PY
)"

export HTTP_PROXY="${PROXY_URL}"
export HTTPS_PROXY="${PROXY_URL}"
export http_proxy="${PROXY_URL}"
export https_proxy="${PROXY_URL}"
export NO_PROXY="localhost,127.0.0.1,::1,test.how-much-money.ru,how-much-money.ru"
export no_proxy="${NO_PROXY}"

pull_image() {
  local image="$1"

  for attempt in 1 2 3 4; do
    echo "Pulling ${image} (attempt ${attempt}/4)..."
    if timeout 180 docker pull "${image}"; then
      return 0
    fi

    if [[ "${attempt}" -lt 4 ]]; then
      sleep $((attempt * 10))
    fi
  done

  echo "Failed to pull ${image} after 4 attempts" >&2
  return 1
}

# Pull external build/runtime images explicitly with retries. Docker Hub/CDN can
# occasionally time out on a self-hosted runner; once cached, the build should
# not force another pull.
pull_image unit:php8.4
pull_image composer:latest
pull_image node:22-bookworm-slim

# Build the same PHP/Unit runtime used by production, but with a distinct image tag.
docker compose -f docker-compose-test.yaml build \
  --build-arg HTTP_PROXY="${HTTP_PROXY}" \
  --build-arg HTTPS_PROXY="${HTTPS_PROXY}" \
  --build-arg NO_PROXY="${NO_PROXY}" \
  hmm-test

# Install runtime PHP dependencies into the persistent deployment directory.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  -e HTTP_PROXY="${HTTP_PROXY}" \
  -e HTTPS_PROXY="${HTTPS_PROXY}" \
  -e NO_PROXY="${NO_PROXY}" \
  --entrypoint composer \
  hmm-test install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Wayfinder normally invokes PHP from the Vite process. Generate its files in
# the PHP image first, then let the Node-only container build with generation
# disabled so the frontend build does not require PHP inside the Node image.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  --user 0 \
  --entrypoint php \
  hmm-test artisan wayfinder:generate --with-form

docker run --rm \
  -e HTTP_PROXY="${HTTP_PROXY}" \
  -e HTTPS_PROXY="${HTTPS_PROXY}" \
  -e NO_PROXY="${NO_PROXY}" \
  -e SKIP_WAYFINDER=1 \
  -v "${TEST_DEPLOY_DIR}:/app" \
  -w /app \
  node:22-bookworm-slim \
  sh -lc 'npm ci && npm run build'
rm -rf "${TEST_DEPLOY_DIR}/node_modules"

# Create a transactionally consistent SQLite snapshot rather than copying a live
# database file byte-for-byte (which is unsafe when WAL/journaling is active).
rm -f "${TEST_DB_PATH}"
touch "${TEST_DB_PATH}"
chmod 0666 "${TEST_DB_PATH}"
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  -v "${PROD_DB_PATH}:/source/database.sqlite:ro" \
  --entrypoint php \
  hmm-test -r '
    $src = new SQLite3("/source/database.sqlite", SQLITE3_OPEN_READONLY);
    $dst = new SQLite3("/var/db/database.sqlite");
    if (!$src->backup($dst)) {
        fwrite(STDERR, "SQLite backup failed\n");
        exit(1);
    }
    $dst->close();
    $src->close();
  '

# Make the copied database writable only by the application user/group.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  --user 0 \
  --entrypoint sh \
  hmm-test -lc 'chown unit:unit /var/db/database.sqlite && chmod 0660 /var/db/database.sqlite'

# Apply schema changes from the test branch to the copied database only.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  --entrypoint php \
  hmm-test artisan migrate --force

# Replace the running test application with the newly built revision.
docker compose -f docker-compose-test.yaml up -d --remove-orphans hmm-test

# Fail the deployment if Traefik cannot serve the new version.
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error \
      --user "${TEST_HEALTHCHECK_AUTH:?TEST_HEALTHCHECK_AUTH must be user:password}" \
      --max-time 10 \
      https://test.how-much-money.ru/ >/dev/null; then
    echo "Test deployment is healthy: https://test.how-much-money.ru"
    exit 0
  fi
  sleep 3
done

echo "Test deployment health check failed" >&2
docker compose -f docker-compose-test.yaml logs --tail=200 hmm-test >&2
exit 1
