<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.0.1 (PATCH: English translation; no governance changes).
- Modified principles (titles, rules, and rationales translated without semantic changes):
  - I. Accurate Data and Safe Imports.
  - II. Consistent Statistical Rules.
  - III. Modular Monolith and OOP Subject Management.
  - IV. Safe Contracts and Accessible Interfaces.
  - V. Small Changes and Verification Based on Risk.
- Updated sections: Technical Constraints and Scope; Development and Verification Workflow;
  Governance. All content, including this report, is now in English.
- Added sections: none.
- Removed sections: none.
- Follow-up TODOs: none.
- Dependent templates/commands: unchanged; Spec Kit commands read the constitution at runtime.
- Review note: remove this Sync Impact Report comment after review, before committing.
-->

# G-Scores Constitution

## Core Principles

**MUST** and **MUST NOT** indicate mandatory requirements. This document governs
G-Scores development; it does not claim that the features are already implemented.

### I. Accurate Data and Safe Imports

- Registration numbers MUST remain strings of exactly eight digits, preserving leading zeros.
  Records MUST be keyed by exam year and registration number. Missing scores MUST be `NULL`;
  zero is a valid score. Non-null scores MUST be within 0–10 and have at most two decimal
  places; values MUST NOT be rounded to make invalid input acceptable.
- Foreign-language codes MUST be preserved and checked for consistency with foreign-language
  scores. Candidate details or admission outcomes absent from the source MUST NOT be inferred.
- CSV conversion code MUST be committed to the repository, stream input with bounded memory,
  validate headers and individual fields, and record the exam year, source filename, SHA-256,
  row count, and successful import timestamp.
- All results and metadata for an import MUST commit or roll back together. Reimporting the
  same year and checksum MUST succeed without changing data; the same year with a different
  checksum MUST be rejected. Duplicate rows, invalid data, file changes, and concurrent imports
  for the same year MUST be detected and handled safely.
- Migrations MUST be committed to the repository. Imported data MUST NOT be automatically
  reset, deleted, or replaced. Import failures MUST return a nonzero exit code and an
  actionable error message.

Rationale: a conversion error can corrupt both individual lookups and every report.

### II. Consistent Statistical Rules

- Each subject MUST use its own valid-score count as the denominator; `NULL` MUST NOT count
  as zero. The four bands MUST be `0 <= x < 4`, `4 <= x < 6`, `6 <= x < 8`, and
  `8 <= x <= 10`; their counts MUST sum to the subject's valid-score count.
- Subject histograms MUST contain all 20 half-point intervals; combination histograms MUST
  contain all 30 one-point intervals. The last interval MUST include the maximum score of
  10 or 30; empty intervals MUST have a count of zero. Charts and summary statistics MUST
  use the same filtered population.
- The median MUST average the two middle values for an even-sized population; standard
  deviation MUST use the population formula. With no valid scores, counts MUST be zero and
  derived statistics MUST be `null`; with one valid score, standard deviation MUST be zero.
- Combinations MUST require all three scores and use their unweighted sum; combinations
  requiring English MUST accept only `ma_ngoai_ngu = 'N1'`. Zero remains eligible.
  Priority points and certificate conversions MUST NOT be added, and pooled foreign-language
  scores MUST NOT be labeled as English.
- The top 10 MUST sort by total descending, then registration number ascending, return at
  most 10 candidates, and explain the tie-breaking rule. This is a dataset leaderboard,
  not an admission result.
- Calculations and rankings MUST preserve decimal precision; displayed statistics MUST be
  rounded only for presentation, to two decimal places. Statistical rules, combination
  definitions, and reconciliation baselines are maintained in `docs/FEATURES.md`.

Rationale: lookups, dashboards, charts, and rankings must produce reconcilable results.

### III. Modular Monolith and OOP Subject Management

- One NestJS application MUST serve the React SPA and REST API from the same origin.
  Business logic MUST be organized into `subjects`, `scores`, `reports`, and `rankings`,
  sharing `PrismaService`.
- Business request flow MUST be Controller → Service → Concrete Repository → PrismaService.
  Controllers handle HTTP and DTOs; services handle business rules; repositories handle
  queries, aggregation, and transactions. Business services MUST NOT call Prisma directly
  or contain SQL.
- Subject management MUST use OOP through `SubjectsService`, with one trusted registry for
  the nine subjects. The fixed registry does not need its own repository or Subject table.
- Aggregation and ranking MUST run in PostgreSQL. The entire candidate dataset MUST NOT be
  loaded into Node.js or the browser to calculate reports.
- Existing structures and types MUST be reused where appropriate. A generic BaseRepository,
  an interface for every class, or duplicate ORM models MUST NOT be introduced without a
  concrete need.

Rationale: clear boundaries support testing and satisfy the OOP requirement without needless layers.

### IV. Safe Contracts and Accessible Interfaces

- User input MUST be validated in forms and on the server. The server MUST validate the
  registration-number format, available years, and allowed subjects and combinations.
  Queries MUST be parameterized; column names and expressions MUST come only from trusted
  definitions.
- APIs MUST use `/api`, return JSON, and distinguish 400 for invalid input, 404 for a valid
  registration number that does not exist, and 503 for an unavailable database or dataset.
  Missing API routes MUST return JSON 404 responses; SPA routes MUST work after refresh.
- Responses MUST explicitly serialize Decimal/bigint values into JSON-compatible values,
  preserve `null`, and reject non-finite numbers. Secrets, connection details, and stack
  traces MUST NOT leak through the frontend, responses, or logs. The CSV file MUST NOT be
  served as a public asset.
- The initial web interface and APIs MUST be read-only; CSV imports MUST use an operator
  CLI. Secrets MUST come from the environment; committed example configuration MUST contain
  no real secrets.
- Interfaces MUST distinguish loading, empty, not-found, validation, and server-error states
  where applicable; failed data requests MUST offer a retry action. Forms MUST support
  keyboard use. Charts MUST include titles, labels, counts, and alternative tables or text,
  and MUST NOT rely on color alone. Missing scores MUST be displayed as not taken/unavailable.

Rationale: data and infrastructure failures must be clear without exposing operational information.

### V. Small Changes and Verification Based on Risk

- Every change MUST have a specific scope and acceptance criteria, and update all affected
  callers, contracts, and documentation. Shared defects MUST be fixed at their root cause.
- Existing code MUST be preferred, followed by the standard library and installed
  dependencies. A new dependency or layer MUST address a current need that a simpler
  solution cannot meet.
- New business logic and business bug fixes MUST have small, meaningful tests. Imports,
  constraints, and queries MUST be verified against a test PostgreSQL database, rather than
  relying only on ORM mocks. Documentation-only changes require content and format checks.
- Import and query times MUST be measured on the full dataset before making performance
  claims or adding indexes beyond the primary key, caching, precomputed tables, or more
  complex import mechanisms.
- Known limits MUST be documented. Code shortcuts MUST use the comment format
  `shortcut: <the limit>, <when to upgrade>`. Validation, security, accessibility, and
  error handling that prevents data loss MUST NOT be cut to reduce the size of a change.

Rationale: a small change is complete only when its important behavior has been verified.

## Technical Constraints and Scope

- The stack is strict TypeScript, React Hooks, Vite, Tailwind CSS, NestJS, Prisma ORM 7,
  and PostgreSQL; the current baseline is Node.js 24 and PostgreSQL 18. npm workspaces
  MUST share one lockfile, and Prisma CLI/client/adapter versions MUST remain compatible.
- Local development MUST support PostgreSQL in Docker Compose and React/NestJS on the host.
  Full Docker execution MUST use one application image serving the API and SPA, alongside
  PostgreSQL with persistent storage. Migration/import commands use the application image
  when implemented; a persistent volume MUST NOT be treated as a backup.
- Required scope follows `docs/FEATURES.md`: import the 2024 CSV, score lookup, dashboard,
  reports for all nine subjects, histograms, and six combinations: A00, A01, B00, C00,
  D01, and D07.
- Advanced responsive polish, report export, additional combinations, and public deployment
  are optional. Settings, candidate editing/deletion, role management, and custom combination
  builders are outside the initial scope. Planned libraries MUST be added only when a
  feature needs them.
- README describes working capabilities; `docs/FEATURES.md` defines acceptance criteria;
  `docs/ARCHITECTURE.md` describes the target architecture. Scaffolding MUST be clearly
  distinguished from completed features.

## Development and Verification Workflow

1. Before implementation, requirements, acceptance criteria, data/API boundaries, and
   applicable principles MUST be identified in the corresponding spec/plan/tasks. Prioritize
   schema/import, lookup and statistics APIs, then the interfaces that depend on them.
2. Business fixtures MUST cover leading-zero registration numbers, `NULL`, zero scores,
   boundaries at 0.5/4/6/8/9.5/10, non-N1 languages, incomplete combinations, tied totals,
   and empty populations. Band/bin totals, medians, standard deviations, and top-10 order
   MUST be reconciled.
3. Imports MUST verify reimports, invalid/duplicate rows, rollback, checksums, and concurrent
   conflicts. Before accepting the data workflow, the full CSV MUST be imported and row
   counts, subject-score counts, and eligible-candidate counts MUST be reconciled against
   `docs/FEATURES.md`.
4. Code changes MUST pass the relevant build/type checks and tests using existing commands:
   `node --env-file=.env --run build` and `npm test`. Changes to local startup MUST run
   `npm run test:dev`; changes to Docker packaging or runtime MUST verify the corresponding
   Docker workflow. Completed checks and unverified limits MUST be reported.
5. Before merging, changes MUST be reviewed for constitution compliance, data safety, API
   contracts, accessibility, and scope. README and related documentation MUST reflect actual
   behavior; work MUST NOT be reported as complete while acceptance criteria remain unmet.

## Governance

- This constitution is the project's highest governance standard. Specs, plans, tasks, and
  implementation MUST comply. Conflicting documents MUST be identified and resolved in
  accordance with the constitution before related changes are merged.
- Amendments MUST state the rationale, affected principles, feature/data impact, any required
  migration plan, and the new version. Project maintainers review amendments through the
  existing review process. Exceptions MUST document their scope, rationale, and exit criteria.
- Versions follow MAJOR.MINOR.PATCH: MAJOR for incompatible principle removals or
  redefinitions; MINOR for new principles/sections or materially expanded requirements;
  PATCH for wording clarifications without semantic changes. The ratification date MUST
  remain unchanged; the last-amended date MUST reflect the change date in YYYY-MM-DD format.
- Each spec/plan and change review MUST check the applicable principles. A change is complete
  only when supported by appropriate verification evidence or explicitly documented limits
  consistent with its acceptance criteria.
- Constitution amendments MUST review the impact on dependent documents and templates, and
  record synchronization work in the Sync Impact Report. The constitution command edits only
  this file; other synchronization work is handled separately. The report comment MUST be
  removed after review, before committing.

**Version**: 1.0.1 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
