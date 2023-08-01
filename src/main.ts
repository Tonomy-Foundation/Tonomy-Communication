import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';
import { AppModule } from './app.module';
import { setSettings } from '@tonomy/tonomy-id-sdk';
import settings from './settings';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

setSettings({
  blockchainUrl: settings.config.blockchainUrl,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Tonomy Communication service')
    .setDescription(
      'Communication service connects client browser to the app and sends notification to the tonomy id app',
    )
    .addServer('http://localhost:5000')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: '/openapi.json',
  });

  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('Tonomy Communication service')
    .setDescription(
      'Communication service connects client browser to the app and sends notification to the tonomy id app',
    )
    .setDefaultContentType('application/json')
    .addServer('users', {
      protocol: 'socket.io',
      url: 'localhost:5000',
    })
    .build();
  const asyncapiDocument = await AsyncApiModule.createDocument(
    app,
    asyncApiOptions,
  );

  await AsyncApiModule.setup('/asyncapi', app, asyncapiDocument);

  await app.listen(5000);
}

bootstrap();
