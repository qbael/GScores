import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  Logger.log(`API: ${await app.getUrl()}/api`, 'Bootstrap');
}

void bootstrap().catch(() => {
  console.error('Application startup failed. Check server configuration and logs.');
  process.exitCode = 1;
});
