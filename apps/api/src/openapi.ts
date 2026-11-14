import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INTERNAL_TOKEN_HEADER } from './common/guards/internal-token.guard.js';

export const DOCS_PATH = 'api/docs';

/** OpenAPI `/api/docs` (+ `/api/docs/json`) — faqat production'dan tashqari (T-004 AC). */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Legendary Group API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: INTERNAL_TOKEN_HEADER, in: 'header' }, 'internal-token')
    .build();

  SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: `${DOCS_PATH}/json`,
  });
}
