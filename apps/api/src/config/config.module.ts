import { type DynamicModule, Global, Module } from '@nestjs/common';
import { EnvService } from './env.service.js';

/**
 * `forRoot(env)` — ilova bitta tekshirilgan `EnvService` bilan ishlaydi
 * (Fastify sozlamalari ham, DI ham shu nusxadan).
 */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: EnvService): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: EnvService, useValue: env }],
      exports: [EnvService],
    };
  }
}
