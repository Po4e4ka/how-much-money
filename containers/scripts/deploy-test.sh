#!/usr/bin/env bash
set -Eeuo pipefail

: "${HMM_TEST_IMAGE:?HMM_TEST_IMAGE must point to the immutable GHCR image}"
: "${PROD_DB_PATH:?PROD_DB_PATH must point to the production SQLite database}"
: "${PROD_ENV_PATH:?PROD_ENV_PATH must point to the production .env file}"
: "${TEST_DEPLOY_DIR:?TEST_DEPLOY_DIR must point to the persistent test deployment directory}"
: "${TEST_BASIC_AUTH:?TEST_BASIC_AUTH must contain a Traefik basic-auth htpasswd entry}"
: "${TEST_HEALTHCHECK_AUTH:?TEST_HEALTHCHECK_AUTH must be user:password}"

SOURCE_DIR="${GITHUB_WORKSPACE:-$(pwd)}"
TEST_DB_DIR="${TEST_DEPLOY_DIR}/var/test"
TEST_DB_PATH="${TEST_DB_DIR}/database.sqlite"
TEST_DB_NEXT="${TEST_DB_DIR}/database.sqlite.next"

for path_var in PROD_DB_PATH PROD_ENV_PATH TEST_DEPLOY_DIR; do
  path_value="${!path_var}"
  if [[ "${path_value}" != /* ]]; then
    echo "${path_var} must be an absolute path: ${path_value}" >&2
    exit 1
  fi
done

PROD_DIR="$(realpath -m "$(dirname "${PROD_ENV_PATH}")")"
PROD_DB_DIR="$(realpath -m "$(dirname "${PROD_DB_PATH}")")"
PROD_DB_NAME="$(basename "${PROD_DB_PATH}")"
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
cp "${SOURCE_DIR}/docker-compose-test.yaml" "${TEST_DEPLOY_DIR}/docker-compose-test.yaml"
cp "${PROD_ENV_PATH}" "${TEST_DEPLOY_DIR}/.env.test"
chmod 600 "${TEST_DEPLOY_DIR}/.env.test"

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
set_env ASSET_URL https://test.how-much-money.ru
# Only trust forwarding headers from the Docker network containing Traefik.
trusted_proxy_subnets="$(docker network inspect web --format '{{range .IPAM.Config}}{{println .Subnet}}{{end}}' | sed '/^$/d' | paste -sd, -)"
[[ -n "${trusted_proxy_subnets}" ]] || { echo "Traefik network has no subnets" >&2; exit 1; }
set_env TRUSTED_PROXIES "${trusted_proxy_subnets}"
set_env DB_CONNECTION sqlite
set_env DB_DATABASE /var/db/database.sqlite
set_env SESSION_DOMAIN test.how-much-money.ru
set_env SESSION_COOKIE hmm_test_session
set_env YANDEX_REDIRECT_URI '"https://test.how-much-money.ru/auth/yandex/callback"'

cd "${TEST_DEPLOY_DIR}"

export HMM_TEST_IMAGE
export TEST_BASIC_AUTH

# The image is built on GitHub-hosted infrastructure. The VPS only pulls the
# immutable artifact and performs lightweight runtime deployment steps.
docker pull "${HMM_TEST_IMAGE}"

# Fail early if the immutable image does not actually contain the Vite build.
docker run --rm \
  --entrypoint sh \
  "${HMM_TEST_IMAGE}" \
  -lc 'test -f /var/www/public/build/manifest.json && test -d /var/www/public/build/assets'

# Create a consistent SQLite snapshot. Mount the production database directory
# read-only so SQLite can also see -wal/-shm sidecar files when WAL mode is used.
# Match the application UID/GID so the runner can manage the snapshot without sudo.
rm -f "${TEST_DB_NEXT}"
docker run --rm \
  --user 1000:1000 \
  -e PROD_DB_NAME="${PROD_DB_NAME}" \
  -v "${PROD_DB_DIR}:/source:ro" \
  -v "${TEST_DB_DIR}:/target" \
  --entrypoint php \
  "${HMM_TEST_IMAGE}" \
  -r '
    $source = "/source/" . getenv("PROD_DB_NAME");
    $target = "/target/database.sqlite.next";

    if (file_exists($target)) {
        unlink($target);
    }

    $src = new SQLite3($source, SQLITE3_OPEN_READONLY);
    $dst = new SQLite3($target);

    if (!$src->backup($dst)) {
        fwrite(STDERR, "SQLite backup failed\n");
        exit(1);
    }

    $dst->close();
    $src->close();
  '

# A failed/early Compose run can leave database.sqlite as a directory when the
# bind source did not exist yet. Preserve that unexpected path for inspection,
# then replace it with the fresh snapshot file.
if [[ -d "${TEST_DB_PATH}" ]]; then
  invalid_path="${TEST_DB_PATH}.invalid-$(date +%s)"
  echo "database.sqlite is a directory; moving it aside to ${invalid_path}" >&2
  mv "${TEST_DB_PATH}" "${invalid_path}"
fi

mv -f "${TEST_DB_NEXT}" "${TEST_DB_PATH}"

if [[ ! -f "${TEST_DB_PATH}" ]]; then
  echo "Test database snapshot is not a regular file: ${TEST_DB_PATH}" >&2
  ls -ld "${TEST_DB_PATH}" >&2 || true
  exit 1
fi

chown 1000:1000 "${TEST_DB_DIR}" "${TEST_DB_PATH}"
chmod 0770 "${TEST_DB_DIR}"
chmod 0660 "${TEST_DB_PATH}"

# Apply schema changes from the test image to the copied production database.
docker compose -f docker-compose-test.yaml run --rm --no-deps \
  --entrypoint php \
  hmm-test artisan migrate --force

# Recreate the web container on the immutable image from this exact commit.
docker compose -f docker-compose-test.yaml up -d --remove-orphans hmm-test

# Verify the rendered page uses this environment's assets and authenticated manifest.
healthcheck_html="$(mktemp)"
trap 'rm -f "${healthcheck_html}"' EXIT
verify_page_assets() {
  python3 - "${healthcheck_html}" <<'PY_CHECK'
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

origin = "https://test.how-much-money.ru"
class PageAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.manifest = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type") == "module" and attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link":
            rel = attrs.get("rel", "").split()
            if any(r in rel for r in ["stylesheet", "modulepreload"]):
                href = attrs.get("href", "")
                if "/build/" in href:
                    self.assets.append(href)
            if "manifest" in rel:
                self.manifest = attrs.get("crossorigin") == "use-credentials"
parser = PageAssets()
with open(sys.argv[1]) as f:
    parser.feed(f.read())
expected = urlsplit(origin)
if not parser.assets or not parser.manifest:
    print("Missing module assets or authenticated manifest link", file=sys.stderr)
    sys.exit(1)
for asset in parser.assets:
    actual = urlsplit(urljoin(origin, asset))
    if (actual.scheme, actual.netloc) != (expected.scheme, expected.netloc):
        print("Page references assets outside the test HTTPS origin", file=sys.stderr)
        sys.exit(1)
PY_CHECK
}

verify_dashboard_redirect() {
  local redirect_url
  redirect_url="$(curl --fail --silent --show-error \
    --user "${TEST_HEALTHCHECK_AUTH}" --max-time 10 \
    --output /dev/null --write-out '%{redirect_url}' \
    https://test.how-much-money.ru/dashboard)" || return 1
  [[ "${redirect_url}" == "https://test.how-much-money.ru/login" ]]
}

# Verify that Traefik serves the new deployment through Basic Auth.
for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error \
      --user "${TEST_HEALTHCHECK_AUTH}" \
      --max-time 10 \
      https://test.how-much-money.ru/ >"${healthcheck_html}" \
    && verify_page_assets \
    && verify_dashboard_redirect \
    && curl --fail --silent --show-error \
      --user "${TEST_HEALTHCHECK_AUTH}" \
      --max-time 10 \
      https://test.how-much-money.ru/build/manifest.webmanifest >/dev/null; then
    echo "Test deployment is healthy: https://test.how-much-money.ru"

    # The VPS has little disk space; remove old, unused SHA-tagged test images.
    image_repo="${HMM_TEST_IMAGE%:*}"
    while read -r image_ref; do
      [[ -z "${image_ref}" || "${image_ref}" == "${HMM_TEST_IMAGE}" ]] && continue
      docker image rm "${image_ref}" >/dev/null 2>&1 || true
    done < <(docker images "${image_repo}" --format '{{.Repository}}:{{.Tag}}')

    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 3
done

echo "Test deployment health check failed" >&2
docker compose -f docker-compose-test.yaml logs --tail=200 hmm-test >&2
exit 1
