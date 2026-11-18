import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { databaseUrl } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: databaseUrl(), connectionTimeoutMillis: 5000 }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
