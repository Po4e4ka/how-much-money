FROM unit:php8.4

RUN apt update && apt install -y \
    zip \
    git \
    libicu-dev \
    libzip-dev \
    vim

RUN pecl install \
    redis

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install \
    pdo_mysql \
    mysqli \
    zip \
    pcntl \
    intl \
    && docker-php-ext-enable \
    mysqli \
    redis

RUN mkdir /home/unit
WORKDIR /home/unit

RUN groupmod -g 1000 unit  \
    && usermod -d /home/unit/ -u 1000 unit

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY --chown=unit:unit ./composer.* ./

RUN chown unit:unit /var/www/
RUN chown -R unit:unit /var/lib/unit /var/run/ /home/unit

# Изменение группы 20 чтобы работало на macOS
RUN groupmod -g 31 dialout

ARG USER_ID
ARG GROUP_ID
WORKDIR /var/www

COPY ./composer* ./
RUN --mount=type=ssh,uid=$USER_ID,gid=$GROUP_ID composer install --no-scripts

RUN cp /usr/local/bin/docker-entrypoint.sh /docker-entrypoint.d/entrypoint.sh

RUN chown -R unit:unit /var/www

USER unit

RUN echo export PATH=~/.composer/vendor/bin:$PATH > ~/.bashrc

