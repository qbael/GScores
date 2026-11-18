# G-Scores architecture

Implemented as a small modular monolith: React in the browser calls a single NestJS application. In Docker, a separate Nginx container serves the compiled frontend and proxies `/api` to the NestJS container. PostgreSQL is the only persistent service.

Backend and frontend each own their `.env`, Dockerfile, `.dockerignore`, lockfile and `node_modules` under `apps/api` and `apps/web`. PostgreSQL credentials live only in `apps/api/.env`; both Prisma CLI and the API derive their connection URL from those values. The root package only delegates development, build and check commands; it has no dependencies.

[Feature rules](FEATURES.md) · [Local setup](../README.md)

## Proposed cloud deployment

Presentation diagram for the proposed Vercel + EC2 + RDS deployment; these cloud resources have not been provisioned.

![Proposed Vercel, EC2 and RDS deployment](diagrams/g-scores-cloud-deployment.png)

[Presentation PNG, 2652 × 1094](diagrams/g-scores-cloud-deployment.png)

The diagram follows the revised draw.io version, with English labels and compact service blocks. This PNG is the only retained diagram artifact and includes its editable draw.io data; open the PNG in diagrams.net to edit it.

AWS resources are deployed only in **ap-southeast-1 (Singapore)**. Vercel remains the managed frontend host; its built-in content delivery still applies, and no separate CDN or deployment in another AWS region is included. See [Vercel static content and regions](https://vercel.com/docs/functions/configuring-functions/region).

- Vercel serves the React/Vite build. The browser keeps the existing same-origin `/api/*` requests; an external rewrite forwards them to `https://<api-domain>/api/*`, preserving NestJS's `/api` prefix. Configure the API rewrite before the SPA fallback to `/index.html`. See [Vercel rewrites](https://vercel.com/docs/routing/rewrites).
- EC2 runs Nginx for HTTPS on port 443, proxying to NestJS on internal port 3000. Its public subnet needs an internet-gateway route and a public address; the API origin also needs DNS and a valid TLS certificate. Port 3000 stays internal.
- RDS runs PostgreSQL in a private DB subnet group spanning two Availability Zones within the same VPC in ap-southeast-1 (Singapore). Set public access to **No**; allow inbound TCP 5432 on `SG-DB` only from the EC2 security group `SG-API`. The subnet group does not itself imply a Multi-AZ database deployment. See [RDS in a VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html).
- Before deployment, configure the rewrites, HTTPS proxy, database TLS with the RDS CA, backend-only database credentials, migrations and the existing CSV seed process. Those runtime and infrastructure changes are outside this diagram update. A single EC2 instance is a single point of failure.

## Stack

- TypeScript, React Hooks and Vite.
- Tailwind CSS for layout, responsive behavior, forms and tables.
- Chart.js directly, without a React chart wrapper. Charts have descriptive labels, zero-based axes, tooltips and expandable data tables. Instances are destroyed on effect cleanup.
- NestJS, Prisma ORM 7 with its PostgreSQL adapter, PostgreSQL 18.
- `csv-parse` streaming parser for quoted fields, headers and bounded-memory CSV import.
- Node.js built-in tests; installed Chrome for browser checks. No additional testing framework.

## Backend

Requests follow `Controller -> Service -> Repository -> PrismaService -> PostgreSQL`. Controllers validate transport input and serialize responses. Services hold domain rules; repositories contain database queries and transactions. There is no generic base repository or duplicate ORM entity layer.

| Module | Responsibility |
|---|---|
| Subjects | Fixed OOP registry of nine `Subject` objects, trusted column mappings and English labels. |
| Scores | Exact registration lookup with the composite primary key; decimal-to-number serialization preserves nulls. |
| Reports | Subject frequencies aggregated in PostgreSQL; weighted statistics, four bands and fixed bins from those small frequency sets. |
| Rankings | Six combinations; complete-score and N1 eligibility, exact decimal totals, frequencies and ordered top 10. |
| Seed | Startup-only CSV validation and atomic import; no HTTP endpoints. |
| Prisma | One injectable Prisma client and connection pool with shutdown cleanup. |

`YearPipe` accepts only 2024. Registration numbers require exactly eight ASCII digits. Subject/combination identifiers come from fixed registries. SQL identifiers come only from trusted `Subject` definitions; values use parameterized Prisma queries. Database exceptions return a generic retryable 503 without SQL or credentials.

## Data and calculations

`ExamResult` maps to `exam_results`, with primary key `(exam_year, registration_number)`. Registration numbers are `varchar(8)` and scores are nullable `numeric(4,2)` columns. Language codes are separate. The SQL migration checks registration format, score range and language-code consistency. There are no metadata, import-status or subject tables.

PostgreSQL groups scores into frequency sets before returning data to Node: at most 1,001 distinct scores per subject or 3,001 totals per combination. Node calculates statistics from those counts, never from the million raw candidate rows. Integer hundredths preserve exact score boundaries; display rounding happens in React. The median is weighted by counts and standard deviation is population standard deviation.

Subject histograms have 20 half-point bins; combination histograms have 30 one-point bins. The final interval includes 10/30. Empty bins remain zero and statistics for an empty population remain null. Missing scores never become zero. Top 10 uses exact decimal total descending and registration number ascending; English combinations require N1 throughout.

Full-dataset checks matched the UI reference snapshot. Measured reports take roughly 0.5–1.3 seconds locally, so there are no additional indexes, caches, workers or analytics tables.

## Startup and data safety

1. Prisma Migrate applies committed migrations (`predev`, `prestart`, or Docker startup).
2. NestJS's seed lifecycle takes a transaction-scoped advisory lock, then checks `exam_results`.
3. Any existing row skips import without opening the CSV.
4. An empty table streams the CSV, validates headers/registration/score precision/language consistency and inserts batches of 1,000 with Prisma `createMany`.
5. Empty files, malformed rows, duplicates and database errors roll back the whole transaction. Parsed and inserted counts must match before commit.
6. The API starts listening only after import finishes or is skipped.

The transaction/lock wait is capped at ten minutes. The measured full import was about 106 seconds on the development machine. The complete CSV remains outside frontend assets, read from the repository in local development or the Docker read-only `/data` mount. Data persists in `pgdata`; ordinary startup never resets or replaces it.

## Frontend

Four routes: `/`, `/scores`, `/reports`, `/rankings`. Native links plus the History API cover this small route set without another routing dependency. Query parameters preserve subject, combination and registration links. Browser Back/Forward and direct Docker URL refreshes work.

Shared components provide headings, cards, request states and reusable Chart.js rendering. Each page owns its components and data requests in `features/dashboard`, `features/reports`, `features/rankings` or `features/scores`; `app/App.tsx` owns the layout and routing. Dashboard shows only overall totals and does not load combination rankings or subject selectors. Detailed subject charts and tables belong to Reports, and combination distributions and top 10 belong to Rankings. The fetch hook uses `AbortController`, checks cancellation before committing a result and supports retrying failed requests.

Tailwind's shared tokens match the reference UI. The layout uses the dark sidebar on desktop and horizontal navigation on mobile, scrollable table regions and a light theme. No prototype snapshot, fake response delay or preview-state switch is shipped in React.

## Verification

- Domain tests: score boundaries, weighted statistics, empty data, zero/null handling, CSV precision and allowlists.
- PostgreSQL/API tests in a fresh database: concurrent seed skip, rollback after a batch, duplicate/header/column failures, constraints, eligibility, tie order, JSON status codes and sanitized database failures.
- Development lifecycle test: startup logs, Vite API proxy, reload and port release.
- Chrome checks: actual React/Chart.js UI at 1440/768/390 px, all subjects/combinations, lookup states, keyboard submission, responsive overflow, summary-only dashboard rendering and request failure/retry.

See the README for commands. Public deployment, screen-reader testing and real-device testing are not part of this implementation.
