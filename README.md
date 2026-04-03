# ЗАРЯ — Платформа мониторинга контейнерных площадок

Полноценный operator/admin web application для системы мониторинга контейнерных площадок с камерами и AI-анализом изображений.

## Быстрый старт (Docker Compose)

```bash
# Клонировать репозиторий
git clone <repo-url>
cd MGS_ZARYA_WEB

# Скопировать env-файл (опционально для локальной разработки)
cp .env.example .env

# Запустить всё
docker compose up --build
```

После запуска:
- **Frontend**: http://localhost
- **Backend API + Swagger**: http://localhost:8000/api/docs
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)

## Demo-аккаунты

| Login | Пароль | Роль |
|-------|--------|------|
| `admin` | `admin12345` | Администратор |
| `operator` | `operator12345` | Оператор |
| `operator2` | `operator12345` | Оператор |

## Локальная разработка (без Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Требуется PostgreSQL на localhost:5432
# Создать БД: zarya_db / user: zarya / pass: zarya_pass

# Миграции
alembic upgrade head

# Seed-данные
python -m app.seeds.seed_data

# Запуск
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend доступен на http://localhost:5173, прокси на backend настроен в vite.config.ts.

## Переменные окружения

### Backend
| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://zarya:zarya_pass@localhost:5432/zarya_db` | Async DB URL |
| `DATABASE_URL_SYNC` | `postgresql://zarya:zarya_pass@localhost:5432/zarya_db` | Sync DB URL (миграции) |
| `JWT_SECRET_KEY` | `change-me-in-production` | Секрет JWT |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `S3_BUCKET` | `zarya-images` | S3 bucket |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Разрешённые origins |

### Frontend
| Переменная | Описание |
|---|---|
| `VITE_API_URL` | URL backend API (пустой при использовании proxy) |
| `VITE_WS_URL` | URL WebSocket |
| `VITE_YANDEX_MAPS_API_KEY` | Ключ Яндекс Карт API |

## Стек

### Backend
- **FastAPI** — REST API + WebSocket
- **SQLAlchemy 2.0** — async ORM
- **Alembic** — миграции БД
- **PostgreSQL 16** — база данных
- **Pydantic v2** — валидация и схемы
- **JWT** — аутентификация (access + refresh в httpOnly cookie)

### Frontend
- **React 18** + **TypeScript**
- **Vite** — сборка
- **React Router 6** — маршрутизация
- **TanStack Query** — серверное состояние
- **Zustand** — клиентское состояние
- **Recharts** — графики
- **Yandex Maps JS API** — карта города
- **CSS Variables** — дизайн-токены из бренда ЗАРЯ

## Архитектура

```
MGS_ZARYA_WEB/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/    # auth, dashboard, sites, cameras, alerts, reports, health, ws
│   │   │   └── admin/        # users, cameras, sites, settings, audit-log
│   │   ├── core/             # config, database, security, deps
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # audit logging
│   │   └── seeds/            # seed data (30 площадок Майкопа)
│   ├── alembic/              # DB migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # HTTP client
│   │   ├── components/
│   │   │   ├── ui/           # StatusBadge, FillBar, Button, Input, Modal, Card, Loader, Toast
│   │   │   ├── layout/       # TopBar, AppLayout, AdminLayout, ProtectedRoute
│   │   │   └── map/          # YandexMap
│   │   ├── pages/            # all route pages
│   │   │   └── admin/        # admin section pages
│   │   ├── stores/           # zustand (auth, app)
│   │   ├── hooks/            # useWebSocket
│   │   ├── styles/           # tokens.css, global.css
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # formatting helpers
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Маршруты

### Операторские
| Маршрут | Описание |
|---|---|
| `/login` | Авторизация |
| `/forgot-password` | Восстановление пароля |
| `/dashboard` | Главный мониторинг (карта + список + панель) |
| `/sites` | Список площадок |
| `/sites/:id` | Детальная страница площадки |
| `/alerts` | Тревоги |
| `/reports` | Отчёты |
| `/cameras` | Камеры |
| `/settings` | Настройки профиля |

### Административные (только admin)
| Маршрут | Описание |
|---|---|
| `/admin` | Обзор системы |
| `/admin/users` | Управление пользователями |
| `/admin/sites` | Управление площадками |
| `/admin/cameras` | Управление камерами |
| `/admin/settings` | Настройки платформы |
| `/admin/system` | Состояние системы |
| `/admin/audit-log` | Журнал действий |

## API Endpoints

Полная документация: http://localhost:8000/api/docs

### Auth
- `POST /api/auth/login` — вход
- `POST /api/auth/refresh` — обновление токена
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Operator
- `GET /api/dashboard/summary`
- `GET /api/sites` — список площадок (фильтры: status, district, search)
- `GET /api/sites/:id` — площадка
- `GET /api/sites/:id/observations` — наблюдения
- `GET /api/sites/:id/alerts` — тревоги площадки
- `GET /api/cameras` — список камер
- `GET /api/alerts` — все тревоги (фильтры: type, status, severity)
- `PATCH /api/alerts/:id` — обновить статус тревоги
- `GET /api/reports/summary` — сводный отчёт

### Admin
- `GET/POST /api/admin/users` — пользователи
- `GET/PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/reset-password|deactivate|activate`
- `GET/POST /api/admin/cameras`
- `GET/PATCH /api/admin/cameras/:id`
- `POST /api/admin/cameras/:id/assign-site|unassign-site`
- `GET/POST /api/admin/sites`
- `GET/PATCH /api/admin/sites/:id`
- `POST /api/admin/sites/:id/archive`
- `GET/PATCH /api/admin/settings`
- `GET /api/admin/system/status`
- `GET /api/admin/audit-log`

### WebSocket
- `ws://localhost:8000/ws/live` — live-обновления (site_update, new_alert)

## Seed Data

30 контейнерных площадок Майкопа с реалистичными координатами, различными статусами, камерами (80% online), историческими наблюдениями и тревогами. Данные находятся в `backend/app/seeds/seed_data.py`.

## Дизайн

Визуальный стиль наследован от [zarya.mkgtu.ru](https://zarya.mkgtu.ru):
- Шрифты: **Gros Ventre** (заголовки), **Steppe** (текст)
- Акцентный цвет: `#882426`
- Тёмные панели: `#111111`
- Фон: `#f5f3ef`
- Индустриально-цифровая эстетика, uppercase-заголовки, control panel UX

## Что легко расширить

- **Реальные камеры**: заменить mock source_url на RTSP/MJPEG, добавить frame capture service
- **AI-модуль**: интегрировать inference pipeline, писать результаты в observations
- **Уведомления**: email/telegram push при новых тревогах
- **PDF-экспорт**: добавить сервис генерации PDF отчётов
- **Кластеризация карты**: добавить ymaps clusterer для 100+ точек
- **Real-time**: заменить simulator на реальные события из message queue
- **Роли**: расширить RBAC до гранулярных permissions
- **Мультигород**: параметризовать center карты и districts
