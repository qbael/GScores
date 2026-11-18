import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
const require = createRequire(import.meta.url);
const { statistics } = require("../apps/api/dist/reports/statistics.js");
const {
  parseResult,
  csvHeaders,
} = require("../apps/api/dist/seed/parse-result.js");
const {
  SubjectsService,
} = require("../apps/api/dist/subjects/subjects.service.js");
const { YearPipe } = require("../apps/api/dist/common/year.pipe.js");
const { databaseUrl } = require("../apps/api/dist/prisma/database-url.js");
const subjects = new SubjectsService();

test("score bands, inclusive final bins, weighted median and population deviation", () => {
  const report = statistics(
    [0, 4, 6, 8, 10].map((score) => ({ score, count: 1 })),
  );
  assert.deepEqual(report.bands, [1, 1, 1, 2]);
  assert.equal(report.bins.length, 20);
  assert.equal(report.bins.at(-1).count, 1);
  assert.equal(
    report.bins.reduce((sum: number, b: { count: number }) => sum + b.count, 0),
    5,
  );
  assert.equal(report.mean, 5.6);
  assert.equal(report.median, 6);
  assert.ok(Math.abs(report.std - Math.sqrt(11.84)) < 1e-12);
  assert.equal(report.zero, 1);
  assert.equal(report.ten, 1);
  assert.equal(
    statistics([
      { score: 4, count: 2 },
      { score: 8, count: 2 },
    ]).median,
    6,
  );
  assert.equal(statistics([{ score: 6, count: 1 }]).std, 0);
  const empty = statistics([]);
  assert.equal(empty.mean, null);
  assert.equal(empty.median, null);
  assert.equal(empty.std, null);
  assert.deepEqual(empty.bands, [0, 0, 0, 0]);
  assert.ok(empty.bins.every((b: { count: number }) => b.count === 0));
  const total = statistics(
    [
      { score: 0, count: 1 },
      { score: 29.99, count: 2 },
      { score: 30, count: 1 },
    ],
    30,
    1,
  );
  assert.equal(total.bins.length, 30);
  assert.equal(total.bins[0].count, 1);
  assert.equal(total.bins.at(-1).count, 3);
  assert.equal(total.bins.at(-1).upperInclusive, true);
});

test("CSV validation keeps leading zeros, exact decimals, zero and null separate", () => {
  const row = Object.fromEntries(csvHeaders.map((key: string) => [key, ""]));
  Object.assign(row, {
    sbd: "01000001",
    toan: "0",
    ngu_van: "6.75",
    ngoai_ngu: "10.00",
    ma_ngoai_ngu: "N1",
  });
  const result = parseResult(row, 2, subjects);
  assert.equal(result.registrationNumber, "01000001");
  assert.equal(result.mathematics, "0");
  assert.equal(result.literature, "6.75");
  assert.equal(result.physics, null);
  for (const value of ["-1", "11", "NaN", "1e1", "6.125", " 6", "6."])
    assert.throws(() => parseResult({ ...row, toan: value }, 3, subjects));
  assert.throws(() => parseResult({ ...row, sbd: "1000001" }, 3, subjects));
  assert.throws(() => parseResult({ ...row, ma_ngoai_ngu: "" }, 3, subjects));
  assert.throws(() => parseResult({ ...row, ma_ngoai_ngu: "N8" }, 3, subjects));
  assert.throws(() => parseResult({ ...row, ngoai_ngu: "" }, 3, subjects));
});

test("subject and year values use fixed allowlists", () => {
  assert.equal(subjects.all.length, 9);
  assert.equal(subjects.get("toan"), subjects.get("mathematics"));
  assert.throws(() => subjects.get("mathematics; DROP TABLE exam_results"));
  const pipe = new YearPipe();
  assert.equal(pipe.transform(undefined), 2024);
  assert.equal(pipe.transform("2024"), 2024);
  for (const value of ["2023", "2024x", "", ["2024", "2024"]])
    assert.throws(() => pipe.transform(value));
});

test("database credentials have one source, are URL-encoded and support overrides", () => {
  const keys = ["DATABASE_URL", "POSTGRES_PASSWORD", "POSTGRES_USER", "POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_PORT"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    assert.throws(databaseUrl, /POSTGRES_PASSWORD is required/);
    process.env.POSTGRES_PASSWORD = "p@ss:/?#%";
    assert.equal(databaseUrl(), "postgresql://g_scores:p%40ss%3A%2F%3F%23%25@127.0.0.1:5432/g_scores?schema=public");
    process.env.POSTGRES_USER = "user@name";
    process.env.POSTGRES_DB = "exam/results";
    process.env.POSTGRES_HOST = "db";
    process.env.POSTGRES_PORT = "5433";
    assert.equal(databaseUrl(), "postgresql://user%40name:p%40ss%3A%2F%3F%23%25@db:5433/exam%2Fresults?schema=public");
    process.env.DATABASE_URL = "postgresql://explicit-connection";
    assert.equal(databaseUrl(), process.env.DATABASE_URL);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
