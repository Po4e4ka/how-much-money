# Контекст проекта

## Назначение
Это приложение для подсчета и учета денег: доходов, расходов и периодов.

## Технологический стек
- Backend: Laravel (PHP 8.2+).
- Frontend: Inertia.js + React + TypeScript.
- Сборка фронтенда: Vite.

## Правила по стеку
- Базовый продукт строится как `Laravel + Inertia` (единое fullstack-приложение).
- Серверная и клиентская части развиваются в рамках одной кодовой базы в этом репозитории.

## Развертывание
Приложение разворачивается через Docker Compose в двух режимах:

- Локально: `docker-compose.yaml`
- Продакшен: `docker-compose-prod.yaml`

Вся необходимая кодовая база и конфигурация для сборки/запуска контейнеров находится в каталоге:
- `containers/`

Ключевые файлы в `containers/`:
- `containers/Dockerfile`
- `containers/prod.Dockerfile`
- `containers/prod-cron.Dockerfile`
- `containers/percona.Dockerfile`
- `containers/configs/*`
- `containers/init-scripts/*`

## Клиентские версии
Продукт поддерживает:
- веб-версию;
- мобильную версию.

При разработке изменений нужно учитывать корректную работу интерфейса в обоих форматах.
