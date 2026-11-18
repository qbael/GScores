# G-Scores

A React frontend and NestJS backend for looking up and analyzing 2024 Vietnamese national high school exam scores.

Choose either local run method. **Both use PostgreSQL in Docker and share the same persistent database volume.**

| Method | Application runtime | Frontend URL |
|---|---|---|
| npm | React and NestJS run on your machine | [http://localhost:5173](http://localhost:5173) |
| Docker | Separate `web`, `api` and `db` containers | [http://localhost:3000](http://localhost:3000) |

## Requirements

- Docker Engine or Docker Desktop with Docker Compose, with Docker running.
- Node.js 24 and npm for the npm method. The Docker method does not require them on your machine.
- The dataset at `data/diem_thi_thpt_2024.csv`.

Run all commands below from the project root, where `compose.yaml` is located.

## 1. Configure the application environment files

Each application manages its own configuration, dependencies and Docker build:

| Application | Environment file | Dockerfile | Dependency directory |
|---|---|---|---|
| Backend and database | `apps/api/.env` | `apps/api/Dockerfile` | `apps/api/node_modules` |
| Frontend | `apps/web/.env` | `apps/web/Dockerfile` | `apps/web/node_modules` |

There is no root `.env` or Dockerfile. Compose commands must explicitly load the application environment files with the two `--env-file` options shown below.

On the first run, create both files. If they already exist, keep them and edit their values instead of overwriting them:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Backend and database: `apps/api/.env`

```dotenv
PORT=3000
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=g_scores
POSTGRES_USER=g_scores
POSTGRES_PASSWORD='your_local_password'
```

Replace `your_local_password` before starting a new database. **Set the database password only here.** PostgreSQL and the backend use the same value. Prisma and the backend generate the connection URL automatically, including credential encoding, so you do not need to maintain a separate `DATABASE_URL`.

For an existing database volume, use its current credentials. Editing this file does not change the username or password already stored in PostgreSQL.

An explicit `DATABASE_URL` is still supported for external databases and tests; it takes precedence over the `POSTGRES_*` values. Remove a stale `DATABASE_URL` when using the local database configuration above.

### Frontend: `apps/web/.env`

```dotenv
WEB_PORT=3000
API_PROXY_TARGET=http://127.0.0.1:3000
```

- `WEB_PORT` controls the published Docker frontend port.
- `API_PROXY_TARGET` is the Vite development proxy target. Match it to the backend `PORT`.
- Vite itself listens on port 5173. The frontend does not need database credentials.

## 2A. Run the application with npm

Complete the environment setup above, then start PostgreSQL and wait until it is ready:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  up -d --wait db
```

If the Docker application is running, stop its application services to free port 3000. Then install dependencies and start both development servers:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  stop api web
npm run setup
npm run dev
```

`npm run setup` runs `npm ci` separately in each application. Run it on initial setup and when you need to reinstall dependencies or a lockfile changes.

`npm run dev` applies database migrations, builds the backend and starts React and NestJS with automatic reload. On the first start, the backend imports the CSV if the database is empty. This can take a few minutes; wait for the `API:` log message before using the application. Later starts skip import when data already exists.

- Open the frontend at [http://localhost:5173](http://localhost:5173).
- Check the API at [http://localhost:3000/api/subjects](http://localhost:3000/api/subjects).

Press `Ctrl+C` in the development terminal to stop both applications. To stop PostgreSQL as well:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  stop db
```

## 2B. Run everything with Docker

Complete the environment setup above. If the npm development servers are running, stop them with `Ctrl+C` to free port 3000.

Build and start all three services:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  up --build -d --remove-orphans
```

Compose builds the backend from `apps/api/Dockerfile` and the frontend from `apps/web/Dockerfile`. The API waits for PostgreSQL to pass its readiness check, then applies migrations and imports the CSV if the database is empty.

Follow application logs and wait for the `API:` message:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  logs -f api web
```

Open [http://localhost:3000](http://localhost:3000), or the `WEB_PORT` configured in `apps/web/.env`. Nginx serves React and proxies `/api` to NestJS. The backend is available through that proxy and has no separately published host port.

Compose sets container network addresses automatically: PostgreSQL at `db:5432`, NestJS on internal port 3000, and the frontend proxy target at `http://api:3000`. Keep the local addresses in the application `.env` files; Compose overrides these values for containers.

Pressing `Ctrl+C` while viewing logs stops following the logs; it does not stop the containers.

### Rebuild after changes

Rerun the `up --build` command after code changes. To rebuild both images without using the build cache:

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  build --no-cache api web && \
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  up -d --force-recreate api web
```

Each Dockerfile can also build its image independently:

```sh
docker build -t g-scores-api apps/api
docker build -t g-scores-web apps/web
```

Use Compose to run the stack with its environment files, networking and data volume.

### Stop the Docker stack

```sh
docker compose --env-file apps/api/.env --env-file apps/web/.env \
  down
```

This removes the containers and network while preserving database data in `pgdata`.

## Ports, existing installations and data

- If port 5432 is occupied, change `POSTGRES_PORT` in `apps/api/.env`. The local backend follows this setting automatically; Docker services still connect to internal port 5432.
- If port 3000 is occupied, change backend `PORT` and frontend `API_PROXY_TARGET` for the npm method, or frontend `WEB_PORT` for the Docker method.
- When switching from Docker to npm, stop `api` and `web` as shown in method 2A. When switching back, stop `npm run dev` with `Ctrl+C`. Both methods keep using the same database.
- When upgrading from the old layout, move database settings from the root `.env` into `apps/api/.env`, remove its old `DATABASE_URL`, move `APP_PORT` to `WEB_PORT` in `apps/web/.env`, and remove the root `.env`. Keep the existing database credentials. `--remove-orphans` removes the former `app` container.
- Changing `.env` credentials does not update an existing PostgreSQL account. Update the account in PostgreSQL if you intend to change its password.
- Adding `-v` to the `down` command deletes the database volume and all imported data. Use it only for an intentional database reset.
