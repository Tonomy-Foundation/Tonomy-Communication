import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setSettings } from '@tonomy/tonomy-id-sdk';
import settings from './settings';
import { setupOpenApi } from './api';
import helmet from 'helmet';

setSettings({
  blockchainUrl: settings.config.blockchainUrl,
  accountSuffix: settings.config.accountSuffix,
  loggerLevel: settings.config.loggerLevel,
  basePrivateKey: settings.secrets.basePrivateKey,
  baseNetwork: settings.config.baseNetwork,
  baseRpcUrl: settings.config.baseRpcUrl,
  baseTokenAddress: settings.config.baseTokenAddress,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await setupOpenApi(app);

  await app.listen(5000);
}

bootstrap();
