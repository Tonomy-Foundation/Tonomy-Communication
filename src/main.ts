import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setSettings } from '@tonomy/tonomy-id-sdk';
import settings from './settings';
import { setupAsyncApi, setupOpenApi } from './api';
import helmet from 'helmet';

setSettings({
  blockchainUrl: settings.config.blockchainUrl,
  loggerLevel: settings.config.loggerLevel,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await setupOpenApi(app);
  await setupAsyncApi(app);

  await app.listen(5000);
}

bootstrap();
