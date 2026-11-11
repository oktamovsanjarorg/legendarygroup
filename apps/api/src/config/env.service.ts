import { Injectable, Optional } from '@nestjs/common';
import type { EnvConfig } from './env.schema.js';
import { validateEnv } from './env.schema.js';

@Injectable()
export class EnvService {
  private readonly config: EnvConfig;

  constructor(@Optional() customEnv?: Record<string, unknown>) {
    this.config = validateEnv(customEnv ?? process.env);
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  getAll(): Readonly<EnvConfig> {
    return this.config;
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}
