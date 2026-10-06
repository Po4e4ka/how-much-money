FROM unit:php8.4

LABEL org.opencontainers.image.source="https://github.com/Po4e4ka/how-much-money"
LABEL org.opencontainers.image.description="How Much Money test runtime image"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev \
        libzip-dev \
    && pecl install redis \
    && docker-php-ext-install \
        zip \
        pcntl \
        intl \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/unit \
    && groupmod -g 1000 unit \
    && usermod -d /home/unit -u 1000 unit \
    && chown -R unit:unit /home/unit /var/lib/unit /var/run

WORKDIR /var/www

COPY --chown=unit:unit . /var/www
COPY containers/configs/php/php.ini /usr/local/etc/php/conf.d/php.ini
COPY containers/configs/unit/unit.json /docker-entrypoint.d/unit.json

RUN mkdir -p \
        /var/db \
        /var/www/bootstrap/cache \
        /var/www/storage/framework/cache/data \
        /var/www/storage/framework/sessions \
        /var/www/storage/framework/views \
        /var/www/storage/logs \
    && chown -R unit:unit \
        /var/db \
        /var/www/bootstrap/cache \
        /var/www/storage

USER unit

CMD ["unitd", "--no-daemon", "--control", "unix:/var/run/control.unit.sock"]
