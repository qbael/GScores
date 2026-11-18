# G-Scores

A small learning project for looking up and analyzing the 2024 Vietnamese national high school exam results. Built with React Hooks, TypeScript, **Tailwind CSS**, **Chart.js**, NestJS, Prisma 7 and PostgreSQL 18.

## Implemented

- Dashboard with overall candidate, subject, valid-score and missing-score totals; detailed charts and tables stay on Reports and Rankings.
- Eight-digit registration number lookup, preserving leading zeros, missing scores and valid zero scores.
- Subject reports with mean, median, population standard deviation, 20 half-point intervals, four score bands and an overview table for all nine subjects.
- A00, A01, B00, C00, D01 and D07 rankings, 30 one-point intervals and deterministic top 10. English combinations require language code N1.
- Responsive desktop/mobile screens, accessible tables beside Chart.js charts, loading/empty/error states and Retry.
- Validated streaming CSV import at startup. Import runs atomically only when the results table is empty; existing rows are never replaced.

See [architecture](docs/ARCHITECTURE.md), [feature rules](docs/FEATURES.md), and the [reference UI design](docs/design/README.md).

## Local development

Requirements: Node.js 24, npm, Docker Engine and Docker Compose.

```sh
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm ci
# Match POSTGRES_PASSWORD in .env with DATABASE_URL in apps/api/.env.
docker compose up -d db
# If the full Docker app is already running, stop it to free port 3000.
docker compose stop app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to NestJS on port 3000. The first `npm run dev` applies committed migrations, builds the API and starts both apps. The API then imports `data/diem_thi_thpt_2024.csv` before accepting requests. The first import of 1,061,605 rows took about 106 seconds on the development machine; later starts skip it. Wait for the `API:` startup log before using the UI.

React and NestJS reload automatically. Use Ctrl+C to stop both. PostgreSQL data stays in the Docker volume:

```sh
docker compose stop db
```

Configuration is local to each workspace:

| File | Purpose |
|---|---|
| `.env` | Docker PostgreSQL credentials, `POSTGRES_PORT` and `APP_PORT`. |
| `apps/api/.env` | Host API `PORT` and `DATABASE_URL`. |
| `apps/web/.env` | Vite proxy `API_PROXY_TARGET`, default `http://127.0.0.1:3000`. No database credentials here. |
| `apps/api/prisma/` | Prisma schema and committed SQL migrations. |

If port 5432 is occupied, change `POSTGRES_PORT` and the port in `DATABASE_URL` together. If the API port changes, update `PORT` and `API_PROXY_TARGET`. Changing PostgreSQL credentials after initializing the volume does not change the existing database user.

## Full Docker application

```sh
docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000). The app waits for PostgreSQL, applies migrations, imports the CSV if necessary, and serves React and `/api` from NestJS. The source CSV is mounted read-only and is never served as a public asset.

```sh
docker compose logs -f app
```

Ordinary stops and rebuilds preserve the `pgdata` volume. A failed import rolls back all rows and fails startup; correct the source/configuration and start again. No web upload or manual seeding command is needed.

## Checks

```sh
npm run check
npm run build
# Requires the local PostgreSQL service and apps/api/.env.
# Stop any host Vite development server first: test:dev uses port 5173.
npm test
```

`npm test` applies migrations, builds the backend, runs domain tests, creates a separate temporary database for API/import tests, then checks development startup, proxying, reload and shutdown. The PostgreSQL test user needs permission to create a database; the supplied local Docker user has this permission. Only the generated test database is cleared and dropped. `test:dev` uses API port 3002 and web port 5173 and imports the local dataset on first startup if it has not been seeded yet.

For unit tests without PostgreSQL, after building the backend:

```sh
npm run test:unit
```

Browser checks require an app running on port 5173 with the provided full dataset and an installed Chrome:

```sh
# Terminal 1
npm run dev
# Terminal 2
npm run test:web
# Optional overrides: WEB_BASE_URL and CHROME_BIN.
```

Browser checks cover all routes at desktop/tablet/mobile sizes, Chart.js rendering, subject/combination selection, lookup, validation, missing/zero scores, request states, summary-only dashboard rendering and retry. Screenshots are saved under the system temporary directory in `g-scores-ui`.

The Docker test target builds both apps and runs domain tests without needing PostgreSQL:

```sh
docker build --target test -t g-scores-check .
```

Verified against the full CSV: all nine subjects' statistics/bands/bins and all six combinations' eligibility counts, histograms and top 10 match the UI design snapshot. Local report requests took roughly 0.5–1.3 seconds; no cache, background worker or extra analytics tables are needed for this learning project.

## API

All routes are read-only. `year` defaults to 2024; other years are rejected.

| Route | Response |
|---|---|
| `GET /api/subjects` | Nine subject codes and English labels. |
| `GET /api/combinations` | Six supported combinations and their subject codes. |
| `GET /api/scores/:registrationNumber` | All nine scores and the foreign-language code. |
| `GET /api/reports/levels` | Dataset total and all nine subjects' summaries, bands and histogram bins. |
| `GET /api/reports/subjects/:subject/histogram` | One subject's histogram and statistics. |
| `GET /api/reports/combinations/:code` | Eligibility, mean/highest total, histogram and top 10. |
| `GET /api/dashboard?subject=toan&combination=A00` | Subject summaries plus the selected subject and combination report. |

Subject identifiers accept CSV codes (`toan`, `ngu_van`, etc.) or the matching Prisma field names (`mathematics`, `literature`, etc.). Invalid identifiers/year/registration format return 400; an absent registration returns 404; database failures return a safe 503 response. Unknown `/api` routes remain JSON 404 responses. Frontend routes support direct links and refreshes in Docker.

No public deployment has been made. Authentication, administration, CSV web uploads, exports and extra exam years are outside this project scope.

---

## Original assignment

# G-Scores

Web developer intern assignment at [Golden Owl](https://goldenowl.asia).

![UI mockup](./mockup-ui.png)

# Requirements

Save the raw data ([diem_thi_thpt_2024.csv](./data/diem_thi_thpt_2024.csv)) into a database with an appropriate structure.

### Must have:

- The conversion of raw data into the database must be coded and located in this source code. (**hint**: recommend use migration and seeder)
- Write a feature to check score from registration number input
- Write a feature report. There will be 4 levels including: >=8 points, 8 points > && >=6 points, 6 points > && >= 4 points, < 4 points
    - Statistics of the number of students with scores in the above 4 levels by subjects. (Chart)
- List top 10 students of group A including (math, physics, chemistry)

### Nice to have:

- Responsive design (look good on all devices: desktops, tablets & mobile phones).
- Setup project use Docker.
- Deploy the application to go live.

# Technical Requirements

### Frontend

Any frontend framework or plain HTML, CSS, and JavaScript is allowed. React implementations must use Hooks.

### Backend

Any backend framework is allowed.

- **Mandatory** use of **OOP programming** for managing subjects.
- Need form validation and logic tightening.
- For NodeJs, use TypeScript is a plus.
- Use ORM for interacting with Database.
- Database: You can use postgreSQL, Mysql, mongoDB... to manage or cache the data.

# Submission

Push the source code to a remote repository and submit its link. Include local setup instructions and a demo link in `README.md`.

# Contributors

- Edric Cao (from GO)
