import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { EnvService } from './config/env.service.js';

export function setupOpenApi(app: INestApplication, env: EnvService): void {
  if (env.isProduction) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Legendary Group API')
    .setDescription('Oʻquv markazi avtomatlashtirish tizimi API spetsifikatsiyasi')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Internal-Token', in: 'header' }, 'internal-token')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
    yamlDocumentUrl: 'docs/yaml',
  });
}
