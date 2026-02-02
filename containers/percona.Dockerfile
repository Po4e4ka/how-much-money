FROM percona:latest

ARG USER_ID
ARG GROUP_ID

USER root

RUN usermod -u 1000 mysql
RUN groupmod -g 1000 mysql
RUN chown -R mysql:mysql /var/lib/mysql /var/run/mysqld

USER mysql
