import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../../public'),
      exclude: ['/api', '/api/{*path}'],
    }),
    PrismaModule,
  ],
})
export class AppModule {}
