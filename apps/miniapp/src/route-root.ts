import { createRootRoute } from '@tanstack/react-router';
import { AppLayout, ForbiddenPage } from './layout.js';

/** Barcha marshrutlarning ildizi (router.tsx va rol bo'yicha marshrut fayllari uchun umumiy). */
export const root = createRootRoute({ component: AppLayout, notFoundComponent: ForbiddenPage });
