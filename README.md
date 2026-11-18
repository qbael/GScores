# Project Bootstrap

Startup scaffold: React, TypeScript, Tailwind CSS, NestJS, Prisma, PostgreSQL, and Docker Compose. Business features, database models, CSV import, and dashboard UI are not implemented.

See [architecture and project structure](docs/ARCHITECTURE.md) and [planned features](docs/FEATURES.md).

UI design: [interactive prototype and screen documentation](docs/design/README.md) (design only; not wired into the React application).

Planned startup: a seed service imports `data/diem_thi_thpt_2024.csv` only when `exam_results` is empty. Existing data skips import; no separate model or table stores import metadata.

For local development, use **Node.js 24**, npm, and Docker Compose. Only PostgreSQL runs in Docker; React and NestJS run on the host:

```sh
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm ci
# Match POSTGRES_PASSWORD in .env with DATABASE_URL in apps/api/.env.
docker compose up -d db
npm run dev
```

Open [React](http://localhost:5173); a blank page is expected. Vite proxies `/api` requests to NestJS on port 3000. The API has no routes yet; unknown `/api` paths return JSON 404 responses. `npm run dev` generates Prisma Client, builds the API, and starts both applications with automatic reload. The API loads `apps/api/.env`; Vite loads `apps/web/.env`. No migration or seed is needed yet.

Configuration belongs to its workspace:

| Location | Purpose |
|---|---|
| `.env` | Shared Docker Compose settings: PostgreSQL credentials, `POSTGRES_PORT`, and Docker `APP_PORT`. |
| `apps/api/.env` | Local API `PORT` and `DATABASE_URL`. Never put database credentials in the frontend environment. |
| `apps/api/prisma.config.ts`, `apps/api/prisma/` | Prisma CLI configuration, schema, and migrations. |
| `apps/api/tsconfig.json` | Backend TypeScript compilation. |
| `apps/web/.env` | Vite's server-side `API_PROXY_TARGET`, default `http://127.0.0.1:3000`. |
| `apps/web/vite.config.ts`, `apps/web/tsconfig.json` | Frontend development and compilation. |

The root package only coordinates npm workspaces; the shared Dockerfile builds and packages both applications.

If port 5432 is busy, change `POSTGRES_PORT` in the root `.env` and the URL port in `apps/api/.env` together. If the local API port changes, update `PORT` in `apps/api/.env` and `API_PROXY_TARGET` in `apps/web/.env`, then restart development servers. `APP_PORT` sets the browser port for the Docker application (default 3000). Changing PostgreSQL credentials after the database volume has been initialized does not update existing database users.

Press Ctrl+C to stop React and NestJS. Stop PostgreSQL while keeping its data:

```sh
docker compose stop db
```

To run the full application in Docker instead:

```sh
docker compose up --build -d
```

Then open [http://localhost:3000](http://localhost:3000). Docker serves the compiled React application through NestJS. PostgreSQL 18 stores its data in the named `pgdata` volume.

Run checks locally:

```sh
npm run check
npm run build
npm test
```

Stop any running local dev servers before `npm test` (also available as `npm run test:dev`); it uses ports 3000 and 5173 and checks startup, API proxying, reload, and shutdown without requiring PostgreSQL. Docker bootstrap checks remain available with `docker build --target test -t g-scores-bootstrap-check .`.

Assignment requirements for later implementation:

---

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
