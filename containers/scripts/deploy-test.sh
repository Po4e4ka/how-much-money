#!/usr/bin/env bash
set -Eeuo pipefail

: "${PROD_DB_PATH:?PROD_DB_PATH must point to the production SQLite database}"
: "${PROD_ENV_PATH:?PROD_ENV_PATH must point to the production .env file}"
: "${TEST_DEPLOY_DIR:?TEST_DEPLOY_DIR must point to the persistent test deployment directory}"
: "${TEST_BASIC_AUTH:?TEST_BASIC_AUTH must contain a Traefik basic-auth htpasswd entry}"

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
  --exclude='var/test/' \
  "${SOURCE_DIR}/" "${TEST_DEPLOY_DIR}/"

cp "${PROD_ENV_PATH}" "${TEST_DEPLOY_DIR}/.env.test"
chmod 600 "${TEST_DEPLOY_DIR}/.env.test"

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

# Build the same PHP/Unit runtime used by production, but with a distinct image tag.
docker compose -f docker-compose-test.yaml build --pull hmm-test

# Install runtime PHP dependencies into the persistent deployment directory.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  --entrypoint composer \
  hmm-test install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Build Vite assets in an isolated Node container.
docker run --rm \
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
