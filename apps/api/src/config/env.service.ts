import { type EnvConfig, validateEnv } from './env.schema.js';

/**
 * Tekshirilgan env. DI'ga `ConfigModule` factory orqali beradi
 * (`new EnvService(process.env)`); testlarda istalgan obyekt bilan yaratiladi.
 */
export class EnvService {
  private readonly config: EnvConfig;

  constructor(raw: Record<string, unknown>) {
    this.config = validateEnv(raw);
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /** OpenAPI `/docs` faqat local/test/staging'da (T-004 AC). */
  get docsEnabled(): boolean {
    return this.config.NODE_ENV !== 'production';
  }
}
