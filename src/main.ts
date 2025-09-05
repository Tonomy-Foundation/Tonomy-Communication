import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setSettings } from '@tonomy/tonomy-id-sdk';
import settings from './settings';
import { setupOpenApi } from './api';
import helmet from 'helmet';
import {
  dbConnection,
  setupDatabase,
  veramo,
  veramo2,
} from '@tonomy/tonomy-id-sdk';
import Debug from 'debug';

const debug = Debug('tonomy-communication:main');

async function testVeramo() {
  debug('testVeramo() called');
  await setupDatabase();
  debug('Database setup');
  await veramo();
  debug('veramo() called');
  await veramo2();
  debug('veramo2() called');
  const entities = dbConnection.entityMetadatas;

  for (const entity of entities) {
    const repository = dbConnection.getRepository(entity.name);

    await repository.clear(); // This clears all entries from the entity's table.
  }

  debug('Database cleared');
}

// testVeramo();

setSettings({
  blockchainUrl: settings.config.blockchainUrl,
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
