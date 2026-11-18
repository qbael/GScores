import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

test('readiness queries the database before reporting healthy', async () => {
  let query = '';
  const prisma = {
    $queryRaw: async (sql: TemplateStringsArray) => {
      query = sql.join('');
      return [{ value: 1 }];
    },
  } as unknown as PrismaService;

  assert.deepEqual(await new HealthService(prisma).check(), { status: 'ok', database: 'up' });
  assert.equal(query, 'SELECT 1');
});

test('readiness returns a safe 503 response when the database fails', async () => {
  const prisma = {
    $queryRaw: async () => { throw new Error('private database credentials'); },
  } as unknown as PrismaService;

  await assert.rejects(new HealthService(prisma).check(), (error: unknown) => {
    assert.ok(error instanceof ServiceUnavailableException);
    assert.equal(error.getStatus(), 503);
    assert.deepEqual(error.getResponse(), { status: 'error', database: 'down' });
    return true;
  });
});
