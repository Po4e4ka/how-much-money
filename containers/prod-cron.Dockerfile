FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    default-mysql-client \
    nano \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

CMD ["cron", "-f"]
