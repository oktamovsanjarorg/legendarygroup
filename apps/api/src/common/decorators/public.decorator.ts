import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'lg:isPublic';

/**
 * Foydalanuvchi autentifikatsiyasi va `@RequirePermission` talab qilinmaydigan endpoint
 * (health, internal — o'z guard'i bilan). T-008 dagi "dekoratorsiz endpoint" CI tekshiruvi
 * `@Public()` yoki `@RequirePermission` dan birini talab qiladi.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
