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

  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: '/openapi.json',
  });
}
