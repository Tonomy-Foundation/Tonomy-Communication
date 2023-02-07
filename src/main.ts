import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';
import { AppModule } from './app.module';
import { UsersModule } from './users/users.module';
import { UsersService } from './users/users.service';

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
    .addServer('users', {
      protocol: 'socket.io',
      url: 'localhost:5000',
    })
    .build();

  const asyncapiDocument = await AsyncApiModule.createDocument(
    app,
    asyncApiOptions,
  );
  await AsyncApiModule.setup('/api', app, asyncapiDocument);

  await app.listen(process.env.REACT_APP_COMMUNICATION_URL ?? 5000);
}
bootstrap();
