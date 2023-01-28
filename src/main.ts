import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';
import { AppModule } from './app.module';
import { UsersModule } from './users/users.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('Tonomy Communication service')
    .setDescription(
      'Communication service connects client browser to the app and sends notification to the tonomy id app',
    )
    .setVersion('0.0.1')
    .setDefaultContentType('application/json')
    // .addSecurity('user-password', { type: 'userPassword' })
    .addServer('users', {
      protocol: 'socket.io',
      url: 'localhost:3002',
    })
    .build();

  const asyncapiDocument = await AsyncApiModule.createDocument(
    app,
    asyncApiOptions,
    {
      include: [UsersModule],
      deepScanRoutes: true,
    },
  );
  await AsyncApiModule.setup('/api', app, asyncapiDocument);

  await app.listen(3002);
}
bootstrap();
