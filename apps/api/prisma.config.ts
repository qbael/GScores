import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';
import { databaseUrl } from './src/prisma/database-url';

const envFile = join(__dirname, '.env');
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() },
});
