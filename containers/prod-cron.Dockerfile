FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    default-mysql-client \
    nano \
    curl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN touch /var/log/cron.log
