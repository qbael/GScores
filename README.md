# G-Scores

An application for looking up and analyzing 2024 Vietnamese national high school exam scores, with a React frontend and a NestJS backend.

There are two ways to run the project locally. Both use PostgreSQL through Docker Compose and share the data stored in the `pgdata` volume.

## Shared setup

- Install Docker Engine or Docker Desktop with Docker Compose, and start Docker.
- For method 1, also install Node.js 24 and npm on your machine.
- Make sure the dataset is available at `data/diem_thi_thpt_2024.csv`.
- Run all commands below from the project root, where `compose.yaml` is located.

### 1. Configure the database

On the first run, create the configuration file. If `.env` already exists, keep it and check its values instead:

```sh
cp .env.example .env
```

Example `.env` contents:

```dotenv
APP_PORT=3000
POSTGRES_PORT=5432
POSTGRES_DB=g_scores
POSTGRES_USER=g_scores
POSTGRES_PASSWORD=your_local_password
```

Replace `your_local_password` with your own password. With the current connection configuration, use letters, numbers, `_` or `-` to avoid having to encode special characters in the URL.

### 2. Start PostgreSQL with Docker

```sh
docker compose up -d db
docker compose exec db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Continue only when the readiness check reports `accepting connections`. If the database is not ready, wait a few seconds and run the check again.

## Method 1: Run the frontend and backend with npm

### 1. Configure the application

On the first run, create the two configuration files. If they already exist, keep them and update them as needed:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

In `apps/api/.env`, set the connection details to match the root `.env` file:

```dotenv
PORT=3000
DATABASE_URL=postgresql://g_scores:your_local_password@127.0.0.1:5432/g_scores?schema=public
```

Adjust the password, username, database name and port to match your configuration. Since the backend runs on your machine, it connects to PostgreSQL through `127.0.0.1` and `POSTGRES_PORT`.

In `apps/web/.env`:

```dotenv
API_PROXY_TARGET=http://127.0.0.1:3000
```

If you change the backend `PORT`, update `API_PROXY_TARGET` accordingly.

### 2. Install dependencies and start the application

Stop the application container if you previously used method 2, to free port 3000:

```sh
docker compose stop app
npm run setup
npm run dev
```

`npm run setup` installs dependencies separately in `apps/api/node_modules` and `apps/web/node_modules`. Run it again when you need to reinstall dependencies or a lockfile changes.

`npm run dev` automatically applies migrations, builds the backend and starts both the backend and frontend. If the database is empty, the backend imports the CSV before accepting requests; wait for the `API:` log message. Subsequent starts skip the import when data already exists.

- Frontend: [http://localhost:5173](http://localhost:5173).
- API check: [http://localhost:3000/api/subjects](http://localhost:3000/api/subjects).

The frontend and backend reload automatically when you edit the code. Press `Ctrl+C` in the terminal running `npm run dev` to stop both. To stop the database as well:

```sh
docker compose stop db
```

## Method 2: Run everything with Docker

Complete **Shared setup** first. This method only requires Docker on your machine; dependencies are installed and the application is built inside the image.

If method 1 is running, press `Ctrl+C` in its terminal to free port 3000. Then run:

```sh
docker compose up --build -d
docker compose logs -f app
```

Docker builds both the frontend and backend. The application automatically applies migrations and imports the CSV if the database is empty. Wait for the `API:` log message, then open [http://localhost:3000](http://localhost:3000), or use the `APP_PORT` configured in `.env`.

Pressing `Ctrl+C` only stops following the logs; the containers keep running. Compose supplies the database connection automatically through the hostname `db`, so this method does not require `.env` files in `apps/api` or `apps/web`.

After changing the code, run `docker compose up --build -d` again to rebuild and update the containers. To rebuild completely without the build cache:

```sh
docker compose build --no-cache app && docker compose up -d --force-recreate app
```

To stop and remove the containers while keeping the database data:

```sh
docker compose down
```

## Ports and data persistence

- If port 5432 is occupied, change `POSTGRES_PORT` in `.env`. For method 1, also update the port in `DATABASE_URL` in `apps/api/.env`.
- If port 3000 is occupied, stop the application using it or change the configuration: method 1 uses `PORT` and `API_PROXY_TARGET`; method 2 uses `APP_PORT` in `.env`.
- Data persists when you stop or recreate containers or rebuild the image. Switching between methods uses the same database.
- Changing the username or password in `.env` after the volume has been initialized does not update the PostgreSQL credentials automatically. Use the existing credentials or update the database account.
- `docker compose down -v` deletes the database volume and all imported data. Use it only when you intentionally want to reset the data.
