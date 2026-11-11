import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@lg/i18n';

/**
 * Ilova xatosi: faqat `code` (+ ixtiyoriy `details`). Foydalanuvchi matni koddan
 * `@lg/i18n` orqali olinadi — kodga matn yozilmaydi.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    readonly details?: unknown,
  ) {
    super({ code, details }, status);
  }
}
