import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
require("reflect-metadata");
const { Client } = require("pg");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("./dist/app.module.js");
const { PrismaService } = require("./dist/prisma/prisma.service.js");
const {
  DatabaseFilter,
} = require("./dist/common/database.filter.js");
const { SeedRepository } = require("./dist/seed/seed.repository.js");
const { csvHeaders } = require("./dist/seed/parse-result.js");
const { databaseUrl } = require("./dist/prisma/database-url.js");

// Only this freshly created test database is modified or dropped; the configured database is never seeded or cleared here.
test(
  "PostgreSQL import, rollback, constraints and HTTP contracts",
  { timeout: 90_000 },
  async () => {
    const original = databaseUrl();
    const admin = new Client({ connectionString: original });
    const name = "g_scores_test_" + process.pid;
    const directory = await mkdtemp(join(tmpdir(), "g-scores-test-"));
    let created = false;
    let app;
    let client;
    try {
      await admin.connect();
      await admin.query(`CREATE DATABASE "${name}"`);
      created = true;
      const url = new URL(original);
      url.pathname = "/" + name;
      process.env.DATABASE_URL = url.href;
      client = new Client({ connectionString: url.href });
      await client.connect();
      await client.query(
        await readFile(
          new URL(
            "../apps/api/prisma/migrations/20261118000000_exam_results/migration.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      app = await NestFactory.create(AppModule, { logger: false });
      const prisma = app.get(PrismaService);
      const seed = app.get(SeedRepository);
      const csv = join(directory, "scores.csv");
      const header = csvHeaders.join(",") + "\n";
      const rows = [
        "00000001,0,4,0,4,6,8,10,0,,N1",
        "00000002,4,6,8,6,8,10,0,4,6,N2",
        "00000003,6,8,8,8,10,0,4,6,8,N1",
        "00000004,8,10,10,10,0,4,6,8,10,N1",
        "00000005,10,,,10,10,,,,,",
        "00000006,0,0,0,0,0,0,0,0,0,N1",
      ];
      const valid = header + rows.join("\n") + "\n";
      await writeFile(csv, valid);
      const imports = await Promise.all([
        seed.importIfEmpty(csv),
        seed.importIfEmpty(csv),
      ]);
      assert.deepEqual(
        imports.sort((a, b) => (a ?? -1) - (b ?? -1)),
        [null, 6],
      );
      assert.equal(
        await seed.importIfEmpty(join(directory, "does-not-exist.csv")),
        null,
      );
      app.setGlobalPrefix("api");
      app.useGlobalFilters(new DatabaseFilter());
      await app.listen(0, "127.0.0.1");
      const base = await app.getUrl();
      const get = async (path: string, status = 200) => {
        const response = await fetch(base + "/api" + path);
        assert.equal(response.status, status, path);
        assert.match(response.headers.get("content-type") ?? "", /json/);
        return response.json();
      };
      assert.equal((await get("/subjects")).length, 9);
      assert.equal((await get("/combinations")).length, 6);
      const score = await get("/scores/00000001");
      assert.equal(score.sbd, "00000001");
      assert.equal(score.scores[0], 0);
      assert.equal(score.scores[8], null);
      await get("/scores/123", 400);
      await get("/scores/abcdefgh", 400);
      await get("/scores/99999999", 404);
      for (const path of [
        "/reports/levels?year=2023",
        "/reports/levels?year=2024x",
        "/reports/levels?year=2024&year=2024",
        "/reports/subjects/nope/histogram",
        "/reports/combinations/nope",
        "/dashboard?subject=nope",
      ])
        await get(path, 400);
      await get("/missing-route", 404);
      const levels = await get("/reports/levels");
      assert.equal(levels.total, 6);
      assert.equal(levels.subjects[0].valid, 6);
      assert.deepEqual(levels.subjects[0].bands, [2, 1, 1, 2]);
      const histogram = await get("/reports/subjects/mathematics/histogram");
      assert.equal(histogram.bins.length, 20);
      assert.equal(histogram.median, 5);
      assert.equal(histogram.bins.at(-1).count, 1);
      const a00 = await get("/reports/combinations/A00");
      assert.equal(a00.valid, 6);
      assert.deepEqual(
        a00.top.map((r: { sbd: string }) => r.sbd),
        [
          "00000005",
          "00000003",
          "00000002",
          "00000004",
          "00000001",
          "00000006",
        ],
      );
      assert.equal(a00.top[0].total, 30);
      assert.equal(a00.bins.at(-1).count, 1);
      assert.equal(a00.bins[0].count, 1);
      for (const key of ["A01", "D01", "D07"]) {
        const report = await get("/reports/combinations/" + key);
        assert.equal(report.valid, 4);
        assert.ok(
          report.top.every(
            (row: { sbd: string }) =>
              !["00000002", "00000005"].includes(row.sbd),
          ),
        );
        assert.equal(
          report.bins.reduce(
            (sum: number, b: { count: number }) => sum + b.count,
            0,
          ),
          4,
        );
      }
      const dashboard = await get(
        "/dashboard?subject=ngoai_ngu&combination=A01",
      );
      assert.equal(dashboard.selectedSubject.key, "ngoai_ngu");
      assert.equal(dashboard.combination.key, "A01");
      for (const statement of [
        `INSERT INTO exam_results (exam_year, registration_number, mathematics) VALUES (2024, '123', 5)`,
        `INSERT INTO exam_results (exam_year, registration_number, mathematics) VALUES (2024, '99999999', 11)`,
        `INSERT INTO exam_results (exam_year, registration_number, foreign_language) VALUES (2024, '99999999', 5)`,
      ])
        await assert.rejects(client.query(statement));
      await prisma.examResult.deleteMany();
      const empty = await get("/reports/levels");
      assert.equal(empty.ready, false);
      assert.equal(empty.total, 0);
      assert.equal(empty.subjects[0].mean, null);
      assert.equal((await get("/reports/combinations/A00")).valid, 0);
      // Force a failure after a full batch has already been written inside the transaction.
      const thousand = Array.from({ length: 1000 }, (_, i) =>
        rows[0].replace("00000001", String(i + 1).padStart(8, "0")),
      );
      await writeFile(
        csv,
        header + thousand.join("\n") + "\n00001001,11,4,0,4,6,8,10,0,,N1\n",
      );
      await assert.rejects(seed.importIfEmpty(csv));
      assert.equal(await prisma.examResult.count(), 0);
      for (const contents of [
        header,
        "unexpected,headers\n1,2\n",
        header + rows[0] + "\n" + rows[0] + "\n",
        header + rows[0] + ",extra\n",
      ]) {
        await writeFile(csv, contents);
        await assert.rejects(seed.importIfEmpty(csv));
        assert.equal(await prisma.examResult.count(), 0);
      }
      await writeFile(csv, valid.replace("00000001,0", '"00000001","0"'));
      assert.equal(await seed.importIfEmpty(csv), 6);
      // A live database failure returns a safe retryable response without SQL or credentials.
      await client.query(
        "ALTER TABLE exam_results RENAME TO results_temporarily_unavailable",
      );
      const unavailable = await get("/scores/00000001", 503);
      assert.equal(
        unavailable.message,
        "The data connection is unavailable. Please retry.",
      );
    } finally {
      await app?.close();
      await client?.end();
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      await admin.end();
      process.env.DATABASE_URL = original;
      await rm(directory, { recursive: true, force: true });
    }
  },
);
