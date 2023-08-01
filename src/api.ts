import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export async function setupOpenApi(app: any) {
  const config = new DocumentBuilder()
    .setTitle('Tonomy Communication service')
    .setDescription(
      'Communication service connects client browser to the app and sends notification to the tonomy id app',
    )
    .addServer('http://localhost:5000')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  document.paths['/socket.io'] = {
    get: {
      summary: 'Socket.io connection',
      parameters: [
        {
          name: 'EIO',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['4'],
          },
        },
        {
          name: 'transport',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['websocket'],
          },
        },
      ],
      responses: {
        101: {
          description: 'Switching Protocols',
        },
      },
    },
  };
  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: '/openapi.json',
  });
}

export async function setupAsyncApi(app: any) {
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
}
