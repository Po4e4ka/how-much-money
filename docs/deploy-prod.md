# Production GHCR deployment — manual bootstrap

This PR prepares a manual release. Automatic deployment on a master push is **not enabled**.

## Pipeline
- `workflow_dispatch` on `master` only.
- GitHub-hosted runner validates tests, Pint, ESLint and Docker Compose.
- GitHub-hosted runner installs Composer and npm dependencies, builds Laravel Wayfinder + Vite assets, and pushes a Docker runtime image tagged with the exact commit SHA to `ghcr.io/po4e4ka/how-much-money-prod`.
- The self-hosted `how-much-money` runner pulls the image and updates only the web container, keeping `hmm-cron` intact. The VPS does not build the frontend.

## Before the first manually approved release
1. Check GitHub Actions variables `PROD_ENV_PATH` and `PROD_DB_PATH` refer to the existing production root's `.env` and `database.sqlite` files. This is required to keep the old cron and test-snapshot paths.
2. Confirm the production runner has Docker access and can read the live SQLite DB and write to `<prod-root>/.deploy`, the Compose file and existing storage.
3. Confirm `production` GitHub Environment and optionally configure required reviewers.
4. Verify sufficient disk space for a new image and SQLite snapshot. Make an **independent restore-tested backup** before first switch.
5. Perform the first switch only after explicit approval, verify frontend, login, data and cron.

## Deployment and rollback
- The deploy script validates absolute paths and existing project layout and stops if anything is missing.
- The new image is verified for Vite/PWA artifacts before switching.
- Creates a consistent SQLite backup via `SQLite3::backup()` (unlike copying a live WAL database file).
- Copies the old Compose file to `.deploy/compose-before-*.yaml`.
- Runs `php artisan migrate --force` with the new image, then recreates **only** `hmm-laravel`.
- Verifies the running SHA image, landing page, JS/CSS and PWA manifest.
- On failure restores the previous Compose file and attempts to start the previous web image. The database is **never** automatically restored: schema rollback could lose new writes. Only deploy backward-compatible migrations, or plan a maintenance window.

The original production directory is initially mounted at `/var/db` to keep the SQLite database and any WAL sidecars together without moving existing data. It is **not** mounted at `/var/www`, so application code and assets come from the immutable image. Host `storage` persists separately.

## Follow-up
- Enable automatic push-to-master deployment in a **separate PR** after first verified manual switch.
- Remove tracked `public/build` files from Git only **after** migration: deleting them in this preparatory PR might break the legacy server that still deploys by Git checkout. They are ignored for future builds already.
- Fix the pre-existing cron raw SQLite file export to use a consistent snapshot in a separate migration-aware change.
