import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@lg/contracts';

export const PERMISSIONS_KEY = 'lg:permissions';
export const AUTHENTICATED_KEY = 'lg:authenticated';

/**
 * Endpoint ruxsati (02 §1, 1-qatlam RBAC): faol rolda **barcha** ko'rsatilgan ruxsatlar bo'lishi
 * shart. Scope (o'z obyekti) — service'da, policy (vaqt/holat) — `@lg/domain/policies`.
 */
export const RequirePermission = (...permissions: [Permission, ...Permission[]]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Faqat tizimga kirgan bo'lish yetarli (o'z profili, o'z sessiyalari). Scope = joriy foydalanuvchi.
 * Biznes ma'lumotiga tegadigan endpoint'da ishlatilmaydi — `@RequirePermission`.
 */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
