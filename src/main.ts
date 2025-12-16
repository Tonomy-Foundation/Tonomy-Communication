import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setSettings } from '@tonomy/tonomy-id-sdk';
import settings from './settings';
import { setupOpenApi } from './api';
import helmet from 'helmet';

setSettings({
  environment: settings.env,
  blockchainUrl: settings.config.blockchainUrl,
  accountSuffix: settings.config.accountSuffix,
  currencySymbol: settings.config.currencySymbol,
  loggerLevel: settings.config.loggerLevel,
  basePrivateKey: settings.secrets.basePrivateKey,
  baseNetwork: settings.config.baseNetwork,
  baseRpcUrl: settings.config.baseRpcUrl,
  baseTokenAddress: settings.config.baseTokenAddress,
  baseMintBurnAddress: settings.config.baseMintBurnAddress,
  safeApiKey: settings.secrets.safeApiKey,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: '*', // Allow all origins; tighten this in production if possible
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Authorization, Accept, Origin, X-Requested-With',
    exposedHeaders: 'Content-Length, Content-Type',
    credentials: false,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await setupOpenApi(app);

  await app.listen(5000);
}

bootstrap();
